const express = require('express');
const {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');

const router = express.Router();

router
  .route('/')
  .get(getSchedules)
  .post(createSchedule);

router
  .route('/:id')
  .get(getSchedule)
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router; 