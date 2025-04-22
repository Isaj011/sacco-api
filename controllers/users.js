const crypto = require('crypto')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const User = require('../models/User')
const sendEmail = require('../utils/sendEmail')

// @desc      Get all users
// @route     GET  /api/v1/auth/users
// @access    private/Admin

exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults)
})

// @desc      Get single user
// @route     GET  /api/v1/auth/users/:id
// @access    private/Admin

exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)

  res.status(200).json({
    succes: true,
    data: user,
  })
})

// @desc      create  user
// @route     POST  /api/v1/auth/users
// @access    private/Admin

exports.createUser = asyncHandler(async (req, res, next) => {
  //generate a random password
  const password = crypto.randomBytes(10).toString('hex')

  //create user with the generated password

  const user = await User.create({
    ...req.body,
    password,
  })

  //send email with the generated password
  const message = `Your account has been created. Use ${user.email} and ${password} to login. Please change it after your first login.`

  try {
    await sendEmail({
      email: user.email,
      subject: 'New Account Created',
      message,
    })

    res.status(201).json({
      success: true,
      data: user,
    })
  } catch (err) {
    // If email sending fails, delete the user and return an error
    await User.findByIdAndDelete(user._id)
    return next(
      new ErrorResponse(
        'User created but unable to send email. Please try again.',
        500
      )
    )
  }
})

// @desc      Update  user
// @route     PUT  /api/v1/auth/users
// @access    private/Admin

exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })

  res.status(201).json({
    success: true,
    data: user,
  })
})

exports.deleteUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id)

  res.status(200).json({
    success: true,
    data: {},
  })
})
