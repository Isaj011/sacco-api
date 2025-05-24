const express = require('express');
const {
  getPerformances,
  getPerformance,
  createPerformance,
  updatePerformance,
  deletePerformance
} = require('../controllers/performanceController');

const router = express.Router();

router
  .route('/')
  .get(getPerformances)
  .post(createPerformance);

router
  .route('/:id')
  .get(getPerformance)
  .put(updatePerformance)
  .delete(deletePerformance);

module.exports = router; 