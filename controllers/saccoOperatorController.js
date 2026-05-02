const SaccoOperator = require('../models/SaccoOperator')
const User = require('../models/User')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')

exports.getSaccoOperators = asyncHandler(async (req, res) => {
  const operators = await SaccoOperator.find().sort('name')
  res.status(200).json({ success: true, count: operators.length, data: operators })
})

exports.getSaccoOperator = asyncHandler(async (req, res, next) => {
  const operator = await SaccoOperator.findById(req.params.id)
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  res.status(200).json({ success: true, data: operator })
})

exports.createSaccoOperator = asyncHandler(async (req, res) => {
  const operator = await SaccoOperator.create(req.body)
  res.status(201).json({ success: true, data: operator })
})

exports.updateSaccoOperator = asyncHandler(async (req, res, next) => {
  const operator = await SaccoOperator.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  })
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  res.status(200).json({ success: true, data: operator })
})

exports.deleteSaccoOperator = asyncHandler(async (req, res, next) => {
  const operator = await SaccoOperator.findById(req.params.id)
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  await operator.deleteOne()
  res.status(200).json({ success: true, data: {} })
})

exports.assignUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.body
  if (!userId) return next(new ErrorResponse('Please provide userId', 400))
  const [operator, user] = await Promise.all([
    SaccoOperator.findById(req.params.id),
    User.findById(userId),
  ])
  if (!operator) return next(new ErrorResponse(`SaccoOperator not found: ${req.params.id}`, 404))
  if (!user) return next(new ErrorResponse(`User not found: ${userId}`, 404))
  user.saccoOperator = operator._id
  await user.save()
  res.status(200).json({ success: true, data: user })
})
