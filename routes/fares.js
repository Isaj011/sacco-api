const express = require('express');
const {
  getFares,
  getFare,
  createFare,
  updateFare,
  deleteFare
} = require('../controllers/fareController');

const router = express.Router();

router
  .route('/')
  .get(getFares)
  .post(createFare);

router
  .route('/:id')
  .get(getFare)
  .put(updateFare)
  .delete(deleteFare);

module.exports = router; 