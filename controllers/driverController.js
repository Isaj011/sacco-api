const Driver = require('../models/Driver');
const DriverAssignment = require('../models/DriverAssignment');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { validateDriverData } = require('../utils/validators');

// Register new driver
exports.registerDriver = async (req, res) => {
  try {
    const driverData = req.body;
    
    // Validate driver data
    const validationError = validateDriverData(driverData);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Check if driver with same national ID exists
    const existingDriver = await Driver.findOne({ nationalId: driverData.nationalId });
    if (existingDriver) {
      return res.status(400).json({ error: 'Driver with this National ID already exists' });
    }

    // Handle photo upload if provided
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path);
      driverData.photo = {
        url: uploadResult.secure_url,
        uploadDate: new Date()
      };
    }

    const driver = new Driver(driverData);
    await driver.save();

    res.status(201).json({
      success: true,
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all drivers with pagination and filtering
exports.getAllDrivers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { driverName: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } }
      ];
    }

    const drivers = await Driver.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Driver.countDocuments(query);

    res.status(200).json({
      success: true,
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single driver by ID
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Get driver assignment if exists
    const assignment = await DriverAssignment.findOne({ driverId: driver._id });

    res.status(200).json({
      success: true,
      data: {
        ...driver.toObject(),
        assignment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update driver information
exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    const updates = req.body;
    
    // Handle photo upload if provided
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path);
      updates.photo = {
        url: uploadResult.secure_url,
        uploadDate: new Date()
      };
    }

    // Prevent status from being updated directly
    delete updates.status;

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedDriver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Soft delete driver
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Soft delete by updating status to inactive
    driver.status = 'inactive';
    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Driver successfully deactivated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Upload driver documents
exports.uploadDocuments = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded'
      });
    }

    const documentType = req.body.documentType;
    const uploadResult = await uploadToCloudinary(req.files.document.path);

    // Update the appropriate document field based on documentType
    switch (documentType) {
      case 'training':
        driver.trainingCertificates.push({
          certificateType: req.body.certificateType,
          issueDate: req.body.issueDate,
          expiryDate: req.body.expiryDate,
          documentUrl: uploadResult.secure_url
        });
        break;
      case 'policeClearance':
        driver.policeClearance = {
          certificateNumber: req.body.certificateNumber,
          issueDate: req.body.issueDate,
          expiryDate: req.body.expiryDate,
          documentUrl: uploadResult.secure_url
        };
        break;
      // Add more cases for other document types
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
    }

    await driver.save();

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get driver documents
exports.getDocuments = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    const documents = {
      driverLicense: driver.driverLicense,
      psvLicense: driver.psvLicense,
      medicalCertificate: driver.medicalCertificate,
      policeClearance: driver.policeClearance,
      trainingCertificates: driver.trainingCertificates
    };

    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete specific document
exports.deleteDocument = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    const { documentType, documentId } = req.params;

    switch (documentType) {
      case 'training':
        driver.trainingCertificates = driver.trainingCertificates.filter(
          cert => cert._id.toString() !== documentId
        );
        break;
      case 'policeClearance':
        driver.policeClearance = null;
        break;
      // Add more cases for other document types
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid document type'
        });
    }

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Document successfully deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 