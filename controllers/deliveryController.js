const asyncHandler    = require('../middleware/async');
const ErrorResponse   = require('../utils/errorResponse');
const DeliveryCompany = require('../models/DeliveryCompany');
const DeliveryVehicle = require('../models/DeliveryVehicle');
const DeliveryDriver  = require('../models/DeliveryDriver');
const DeliveryOrder   = require('../models/DeliveryOrder');
const Parcel          = require('../models/Parcel');
const ProofOfDelivery = require('../models/ProofOfDelivery');

// ─── DeliveryCompany ──────────────────────────────────────────────────────────

// @desc    List all delivery companies
// @route   GET /api/v1/delivery/companies
// @access  Private
exports.getCompanies = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const companies = await DeliveryCompany.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: companies.length, data: companies });
});

// @desc    Get single delivery company
// @route   GET /api/v1/delivery/companies/:id
// @access  Private
exports.getCompany = asyncHandler(async (req, res, next) => {
  const company = await DeliveryCompany.findById(req.params.id);
  if (!company) return next(new ErrorResponse('Delivery company not found', 404));
  res.status(200).json({ success: true, data: company });
});

// @desc    Create delivery company
// @route   POST /api/v1/delivery/companies
// @access  Private (admin)
exports.createCompany = asyncHandler(async (req, res) => {
  const company = await DeliveryCompany.create(req.body);
  res.status(201).json({ success: true, data: company });
});

// @desc    Update delivery company
// @route   PUT /api/v1/delivery/companies/:id
// @access  Private (admin)
exports.updateCompany = asyncHandler(async (req, res, next) => {
  const company = await DeliveryCompany.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!company) return next(new ErrorResponse('Delivery company not found', 404));
  res.status(200).json({ success: true, data: company });
});

// @desc    Delete delivery company
// @route   DELETE /api/v1/delivery/companies/:id
// @access  Private (admin)
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const company = await DeliveryCompany.findByIdAndDelete(req.params.id);
  if (!company) return next(new ErrorResponse('Delivery company not found', 404));
  res.status(200).json({ success: true, data: {} });
});

// ─── DeliveryVehicle ──────────────────────────────────────────────────────────

// @desc    List delivery vehicles (filter by ?company= or ?status=)
// @route   GET /api/v1/delivery/vehicles
// @access  Private
exports.getDeliveryVehicles = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.company) filter.company = req.query.company;
  if (req.query.status)  filter.status  = req.query.status;
  const vehicles = await DeliveryVehicle.find(filter).populate('company', 'name').sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
});

// @desc    Get single delivery vehicle
// @route   GET /api/v1/delivery/vehicles/:id
// @access  Private
exports.getDeliveryVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await DeliveryVehicle.findById(req.params.id).populate('company', 'name');
  if (!vehicle) return next(new ErrorResponse('Delivery vehicle not found', 404));
  res.status(200).json({ success: true, data: vehicle });
});

// @desc    Create delivery vehicle
// @route   POST /api/v1/delivery/vehicles
// @access  Private (admin)
exports.createDeliveryVehicle = asyncHandler(async (req, res) => {
  const vehicle = await DeliveryVehicle.create(req.body);
  res.status(201).json({ success: true, data: vehicle });
});

// @desc    Update delivery vehicle
// @route   PUT /api/v1/delivery/vehicles/:id
// @access  Private (admin)
exports.updateDeliveryVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await DeliveryVehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!vehicle) return next(new ErrorResponse('Delivery vehicle not found', 404));
  res.status(200).json({ success: true, data: vehicle });
});

// @desc    Delete delivery vehicle
// @route   DELETE /api/v1/delivery/vehicles/:id
// @access  Private (admin)
exports.deleteDeliveryVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await DeliveryVehicle.findByIdAndDelete(req.params.id);
  if (!vehicle) return next(new ErrorResponse('Delivery vehicle not found', 404));
  res.status(200).json({ success: true, data: {} });
});

// ─── DeliveryDriver ───────────────────────────────────────────────────────────

// @desc    List delivery drivers (filter by ?company= or ?status=)
// @route   GET /api/v1/delivery/drivers
// @access  Private
exports.getDeliveryDrivers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.company) filter.company = req.query.company;
  if (req.query.status)  filter.status  = req.query.status;
  const drivers = await DeliveryDriver.find(filter).populate('company', 'name').sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: drivers.length, data: drivers });
});

// @desc    Get single delivery driver
// @route   GET /api/v1/delivery/drivers/:id
// @access  Private
exports.getDeliveryDriver = asyncHandler(async (req, res, next) => {
  const driver = await DeliveryDriver.findById(req.params.id).populate('company', 'name');
  if (!driver) return next(new ErrorResponse('Delivery driver not found', 404));
  res.status(200).json({ success: true, data: driver });
});

// @desc    Create delivery driver
// @route   POST /api/v1/delivery/drivers
// @access  Private (admin)
exports.createDeliveryDriver = asyncHandler(async (req, res) => {
  const driver = await DeliveryDriver.create(req.body);
  res.status(201).json({ success: true, data: driver });
});

// @desc    Update delivery driver
// @route   PUT /api/v1/delivery/drivers/:id
// @access  Private (admin)
exports.updateDeliveryDriver = asyncHandler(async (req, res, next) => {
  const driver = await DeliveryDriver.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!driver) return next(new ErrorResponse('Delivery driver not found', 404));
  res.status(200).json({ success: true, data: driver });
});

// @desc    Delete delivery driver
// @route   DELETE /api/v1/delivery/drivers/:id
// @access  Private (admin)
exports.deleteDeliveryDriver = asyncHandler(async (req, res, next) => {
  const driver = await DeliveryDriver.findByIdAndDelete(req.params.id);
  if (!driver) return next(new ErrorResponse('Delivery driver not found', 404));
  res.status(200).json({ success: true, data: {} });
});

// ─── DeliveryOrder ────────────────────────────────────────────────────────────

// @desc    List delivery orders (filter by ?status=, ?company=, ?driver=)
// @route   GET /api/v1/delivery/orders
// @access  Private
exports.getOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.company) filter.company = req.query.company;
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.driver)  filter.driver  = req.query.driver;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const orders = await DeliveryOrder.find(filter)
    .populate('company', 'name')
    .populate('driver', 'firstName lastName')
    .populate('vehicle', 'registrationNumber vehicleType')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Get single delivery order
// @route   GET /api/v1/delivery/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await DeliveryOrder.findById(req.params.id)
    .populate('company', 'name phone')
    .populate('driver', 'firstName lastName phone')
    .populate('vehicle', 'registrationNumber vehicleType')
    .populate('parcels');
  if (!order) return next(new ErrorResponse('Delivery order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// @desc    Create delivery order
// @route   POST /api/v1/delivery/orders
// @access  Private (admin)
exports.createOrder = asyncHandler(async (req, res) => {
  const order = await DeliveryOrder.create(req.body);
  res.status(201).json({ success: true, data: order });
});

// @desc    Update delivery order (general)
// @route   PUT /api/v1/delivery/orders/:id
// @access  Private (admin)
exports.updateOrder = asyncHandler(async (req, res, next) => {
  const order = await DeliveryOrder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!order) return next(new ErrorResponse('Delivery order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// @desc    Assign driver and vehicle to an order
// @route   PATCH /api/v1/delivery/orders/:id/assign
// @access  Private (admin)
exports.assignOrderDriver = asyncHandler(async (req, res, next) => {
  const { driverId, vehicleId } = req.body;
  if (!driverId || !vehicleId) {
    return next(new ErrorResponse('Both driverId and vehicleId are required', 400));
  }
  const order = await DeliveryOrder.findByIdAndUpdate(
    req.params.id,
    { driver: driverId, vehicle: vehicleId, status: 'assigned' },
    { new: true, runValidators: true }
  )
    .populate('driver', 'firstName lastName phone')
    .populate('vehicle', 'registrationNumber vehicleType');
  if (!order) return next(new ErrorResponse('Delivery order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// @desc    Update order status
// @route   PATCH /api/v1/delivery/orders/:id/status
// @access  Private (admin)
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const allowed = ['pending', 'assigned', 'picked_up', 'in_transit', 'completed', 'cancelled'];
  if (!status) {
    return next(new ErrorResponse('status field is required', 400));
  }
  if (!allowed.includes(status)) {
    return next(new ErrorResponse(`status must be one of: ${allowed.join(', ')}`, 400));
  }

  const update = { status };
  if (status === 'picked_up' && !req.body.startedAt) update['route.startedAt'] = new Date();
  if (status === 'completed' && !req.body.completedAt) update['route.completedAt'] = new Date();

  const order = await DeliveryOrder.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  )
    .populate('company', 'name')
    .populate('driver', 'firstName lastName')
    .populate('vehicle', 'registrationNumber vehicleType');
  if (!order) return next(new ErrorResponse('Delivery order not found', 404));
  res.status(200).json({ success: true, data: order });
});

// ─── Parcel ───────────────────────────────────────────────────────────────────

// @desc    List parcels (filter by ?order= or ?status=)
// @route   GET /api/v1/delivery/parcels
// @access  Private
exports.getParcels = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.order)  filter.order  = req.query.order;
  if (req.query.status) filter.status = req.query.status;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const parcels = await Parcel.find(filter)
    .populate('order', 'orderNumber status')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.status(200).json({ success: true, count: parcels.length, data: parcels });
});

// @desc    Get single parcel
// @route   GET /api/v1/delivery/parcels/:id
// @access  Private
exports.getParcel = asyncHandler(async (req, res, next) => {
  const parcel = await Parcel.findById(req.params.id)
    .populate('order', 'orderNumber status company driver')
    .populate('proof');
  if (!parcel) return next(new ErrorResponse('Parcel not found', 404));
  res.status(200).json({ success: true, data: parcel });
});

// @desc    Create parcel
// @route   POST /api/v1/delivery/parcels
// @access  Private (admin)
exports.createParcel = asyncHandler(async (req, res) => {
  const parcel = await Parcel.create(req.body);
  res.status(201).json({ success: true, data: parcel });
});

// @desc    Update parcel
// @route   PUT /api/v1/delivery/parcels/:id
// @access  Private (admin)
exports.updateParcel = asyncHandler(async (req, res, next) => {
  const parcel = await Parcel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!parcel) return next(new ErrorResponse('Parcel not found', 404));
  res.status(200).json({ success: true, data: parcel });
});

// ─── ProofOfDelivery ──────────────────────────────────────────────────────────

// @desc    Get proof of delivery for an order
// @route   GET /api/v1/delivery/orders/:id/proof
// @access  Private
exports.getProof = asyncHandler(async (req, res, next) => {
  const proof = await ProofOfDelivery.findOne({ order: req.params.id })
    .populate('parcel', 'trackingNumber status')
    .populate('driver', 'firstName lastName')
    .populate('order', 'orderNumber status');
  if (!proof) return next(new ErrorResponse('Proof of delivery not found', 404));
  res.status(200).json({ success: true, data: proof });
});

// @desc    Submit proof of delivery for an order
// @route   POST /api/v1/delivery/orders/:id/proof
// @access  Private (admin)
// @body    { parcel, driver, deliveredAt, recipientName, verificationMethod, ... }
exports.createProof = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id;

  // Verify the order exists
  const order = await DeliveryOrder.findById(orderId);
  if (!order) return next(new ErrorResponse('Delivery order not found', 404));

  // Inject the order reference and create the proof record
  req.body.order = orderId;
  const proof = await ProofOfDelivery.create(req.body);

  // Mark the referenced parcel as delivered and link the proof
  if (req.body.parcel) {
    await Parcel.findByIdAndUpdate(req.body.parcel, {
      status: 'delivered',
      proof: proof._id,
      $push: { statusHistory: { status: 'delivered', timestamp: proof.deliveredAt || new Date() } }
    });
  }

  // Mark the order itself as completed
  await DeliveryOrder.findByIdAndUpdate(orderId, {
    status: 'completed',
    'route.completedAt': proof.deliveredAt || new Date()
  });

  res.status(201).json({ success: true, data: proof });
});
