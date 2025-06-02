const crypto = require('crypto')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const sendEmail = require('../utils/sendEmail')
const User = require('../models/User')

// @desc      Register user
// @route     Post  /api/v1/auth/register
// @access    public

exports.register = asyncHandler(async (req, res, next) => {
  //generate a random password
  const password = crypto.randomBytes(10).toString('hex')

  //create user
  const user = await User.create({
    ...req.body,
    password,
  })

  // Prepare email content
  const message = `Your account has been created successfully. Your temporary password is: ${password}
   Please log in and change your password as soon as possible.`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Account Registration - Temporary Password',
      message,
    })

    sendTokenResponse(user, 200, res, true)
  } catch (err) {
    console.log(err)
    return next(
      new ErrorResponse('Could not send email. Registration failed.', 500)
    )
  }
})

// @desc      Login user
// @route     POST  /api/v1/auth/login
// @access    public

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  //Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400))
  }

  //check user
  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401))
  }

  //check if password matches
  const isMatch = await user.matchPassword(password)

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401))
  }

  //check if the user is first login
  const isFirstLogin = user.isFirstLogin

  //if it is the first login, update the flag
  if (isFirstLogin) {
    user.isFirstLogin = false
    await user.save()
  }

  sendTokenResponse(user, 200, res, isFirstLogin)
})

// @desc      Get current logged in user
// @route     POST  /api/v1/auth/me
// @access    private

exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
  res.status(200).json({
    success: true,
    data: user,
  })
  console.log(user)
})

// @desc      update user details
// @route     PUT  /api/v1/auth/updatedetails
// @access    private

exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  }

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  })

  res.status(200).json({
    success: true,
    data: user,
  })
  console.log(user)
})

// @desc      update password
// @route     PUT  /api/v1/auth/updatepassword
// @access    private

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password')

  //check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('password is incorrect', 401))
  }

  user.password = req.body.newPassword
  await user.save()

  sendTokenResponse(user, 200, res, false)
})

// @desc      Forgot password
// @route     POST  /api/v1/auth/forgotpassword
// @access    public

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email })

  if (!user) {
    return next(new ErrorResponse(` There is no user with that email`, 404))
  }

  //Get reset token
  const resetToken = user.getResetPasswordToken()

  await user.save({ validateBeforeSave: false })

  //create reset url
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/resetpassword/${resetToken}`

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to : \n\n ${resetUrl}`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message,
    })

    res.status(200).json({
      success: true,
      data: 'Email sent',
    })
  } catch (err) {
    console.log(err)
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save({ validateBeforeSave: false })

    return next(new ErrorResponse('Email could not be sent', 500))
  }
})

// @desc      Reset password
// @route     PUT  /api/v1/auth/resetpassword/:resettoken
// @access    public

exports.resetPassword = asyncHandler(async (req, res, next) => {
  //get token hashed
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400))
  }
  //set new password
  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  sendTokenResponse(user, 200, res, false)
})

//Get token from model, response
const sendTokenResponse = (user, statusCode, res, isFirstLogin) => {
  //create token
  const token = user.getSignedJwtToken()

  res
    .status(statusCode)
    .json({ success: true, token, isFirstLogin, id: user._id })
}
