const express = require('express');
const {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  updateIncidentStatus,
  deleteIncident,
  getIncidentStats
} = require('../controllers/incidentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Stats route must come before /:id to avoid being swallowed by the param matcher
router.get('/stats', protect, getIncidentStats);

router
  .route('/')
  .get(protect, getIncidents)
  .post(protect, createIncident);

router
  .route('/:id')
  .get(protect, getIncident)
  .put(protect, updateIncident)
  .delete(protect, authorize('admin'), deleteIncident);

router.patch('/:id/status', protect, updateIncidentStatus);

module.exports = router;
