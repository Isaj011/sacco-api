const express = require('express')
const {
  getSaccoOperators, getSaccoOperator,
  createSaccoOperator, updateSaccoOperator,
  deleteSaccoOperator, assignUser,
} = require('../controllers/saccoOperatorController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

router.route('/')
  .get(authorize('admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSaccoOperators)
  .post(authorize('admin'), createSaccoOperator)

router.route('/:id')
  .get(authorize('admin', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSaccoOperator)
  .put(authorize('admin'), updateSaccoOperator)
  .delete(authorize('admin'), deleteSaccoOperator)

router.post('/:id/assign-user', authorize('admin'), assignUser)

module.exports = router
