const express = require('express');
const {
  getStops,
  getStop,
  createStop,
  updateStop,
  deleteStop
} = require('../controllers/stopController');

const router = express.Router();

router
  .route('/')
  .get(getStops)
  .post(createStop);

router
  .route('/:id')
  .get(getStop)
  .put(updateStop)
  .delete(deleteStop);

module.exports = router; 