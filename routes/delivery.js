const express = require('express');
const {
  getCompanies, getCompany, createCompany, updateCompany, deleteCompany,
  getDeliveryVehicles, getDeliveryVehicle, createDeliveryVehicle, updateDeliveryVehicle, deleteDeliveryVehicle,
  getDeliveryDrivers, getDeliveryDriver, createDeliveryDriver, updateDeliveryDriver, deleteDeliveryDriver,
  getOrders, getOrder, createOrder, updateOrder, assignOrderDriver, updateOrderStatus,
  getParcels, getParcel, createParcel, updateParcel,
  getProof, createProof
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// ── Companies ─────────────────────────────────────────────────────────────────
router.route('/companies')
  .get(getCompanies)
  .post(authorize('admin'), createCompany);

router.route('/companies/:id')
  .get(getCompany)
  .put(authorize('admin'), updateCompany)
  .delete(authorize('admin'), deleteCompany);

// ── Vehicles ──────────────────────────────────────────────────────────────────
router.route('/vehicles')
  .get(getDeliveryVehicles)
  .post(authorize('admin'), createDeliveryVehicle);

router.route('/vehicles/:id')
  .get(getDeliveryVehicle)
  .put(authorize('admin'), updateDeliveryVehicle)
  .delete(authorize('admin'), deleteDeliveryVehicle);

// ── Drivers ───────────────────────────────────────────────────────────────────
router.route('/drivers')
  .get(getDeliveryDrivers)
  .post(authorize('admin'), createDeliveryDriver);

router.route('/drivers/:id')
  .get(getDeliveryDriver)
  .put(authorize('admin'), updateDeliveryDriver)
  .delete(authorize('admin'), deleteDeliveryDriver);

// ── Orders ────────────────────────────────────────────────────────────────────
router.route('/orders')
  .get(getOrders)
  .post(authorize('admin'), createOrder);

router.route('/orders/:id')
  .get(getOrder)
  .put(authorize('admin'), updateOrder);

router.patch('/orders/:id/assign', authorize('admin'), assignOrderDriver);
router.patch('/orders/:id/status', authorize('admin'), updateOrderStatus);

// ── Proof of Delivery (scoped to order) ───────────────────────────────────────
router.route('/orders/:id/proof')
  .get(getProof)
  .post(authorize('admin'), createProof);

// ── Parcels ───────────────────────────────────────────────────────────────────
router.route('/parcels')
  .get(getParcels)
  .post(authorize('admin'), createParcel);

router.route('/parcels/:id')
  .get(getParcel)
  .put(authorize('admin'), updateParcel);

module.exports = router;
