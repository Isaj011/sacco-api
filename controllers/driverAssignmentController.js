const Driver = require('../models/Driver');
const DriverAssignment = require('../models/DriverAssignment');
const Vehicle = require('../models/Vehicle');

// Create administrative assignment
exports.createAssignment = async (req, res) => {
  try {
    const driverId = req.params.id;
    const assignmentData = req.body;

    // Check if driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Check if driver already has an active assignment
    const existingAssignment = await DriverAssignment.findOne({ 
      driverId,
      isActive: true 
    });
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Driver already has an active assignment'
      });
    }

    // Check if vehicle exists and get its details
    const vehicle = await Vehicle.findById(assignmentData.vehicleAssignment.busNumber)
      .populate('assignedRoute');
    
    if (!vehicle) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Ensure vehicleAssignment has all required fields
    const vehicleAssignment = {
      ...assignmentData.vehicleAssignment,
      vehicleType: vehicle.vehicleModel,
      routeAssigned: vehicle.assignedRoute ? vehicle.assignedRoute._id : assignmentData.vehicleAssignment.routeAssigned,
      assignedBy: req.user.id
    };

    // Create new assignment with complete vehicleAssignment data
    const assignment = new DriverAssignment({
      driverId,
      isActive: true,
      ...assignmentData,
      vehicleAssignment
    });

    await assignment.save();

    // Update driver status
    driver.status = 'assigned';
    await driver.save();

    // Update vehicle status
    vehicle.status = 'in_use';
    await vehicle.save();

    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error in createAssignment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update administrative assignment
exports.updateAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.id;  // This is actually the assignment ID
    const updates = req.body;

    console.log('Assignment ID from URL:', assignmentId);
    console.log('Driver ID from request body:', updates.driverId);

    // Check if driver exists with more detailed error handling
    const driver = await Driver.findById(updates.driverId).exec();
    if (!driver) {
      console.log('Driver not found with ID:', updates.driverId);
      return res.status(404).json({
        success: false,
        error: 'Driver not found',
        details: {
          driverId: updates.driverId,
          message: 'No driver exists with this ID'
        }
      });
    }

    console.log('Found driver:', driver.driverName);

    let assignment = await DriverAssignment.findOne({ 
      _id: assignmentId,
      isActive: true 
    });

    // If no active assignment exists, create a new one
    if (!assignment) {
      // Check if vehicle exists
      const vehicle = await Vehicle.findById(updates.vehicleAssignment.busNumber);
      if (!vehicle) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle not found'
        });
      }

      // Create new assignment
      assignment = new DriverAssignment({
        driverId: updates.driverId,
        isActive: true,
        ...updates
      });

      await assignment.save();

      // Update driver status
      driver.status = 'assigned';
      await driver.save();

      // Update vehicle status
      vehicle.status = 'in_use';
      await vehicle.save();

      return res.status(201).json({
        success: true,
        data: assignment
      });
    }

    // If vehicle is being changed, update vehicle statuses
    if (updates.vehicleAssignment?.busNumber && 
        updates.vehicleAssignment.busNumber !== assignment.vehicleAssignment.busNumber) {
      const vehicle = await Vehicle.findById(updates.vehicleAssignment.busNumber);
      if (!vehicle) {
        return res.status(400).json({
          success: false,
          error: 'New vehicle not found'
        });
      }

      // Update old vehicle status
      const oldVehicle = await Vehicle.findById(assignment.vehicleAssignment.busNumber);
      if (oldVehicle) {
        oldVehicle.status = 'available';
        await oldVehicle.save();
      }

      // Update new vehicle status
      vehicle.status = 'in_use';
      await vehicle.save();
    }

    const updatedAssignment = await DriverAssignment.findOneAndUpdate(
      { _id: assignmentId, isActive: true },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedAssignment
    });
  } catch (error) {
    console.error('Error in updateAssignment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        message: 'Error occurred while updating assignment',
        stack: error.stack
      }
    });
  }
};

// Deactivate assignment
exports.deactivateAssignment = async (req, res) => {
  try {
    const driverId = req.params.id;

    const assignment = await DriverAssignment.findOne({ 
      driverId,
      isActive: true 
    });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Active assignment not found'
      });
    }

    // Update assignment status
    assignment.isActive = false;
    await assignment.save();

    // Update driver status
    const driver = await Driver.findById(driverId);
    if (driver) {
      driver.status = 'inactive';
      await driver.save();
    }

    // Update vehicle status
    const vehicle = await Vehicle.findById(assignment.vehicleAssignment.busNumber);
    if (vehicle) {
      vehicle.status = 'available';
      await vehicle.save();
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get current assignment details
exports.getAssignment = async (req, res) => {
  try {
    const driverId = req.params.id;

    const assignment = await DriverAssignment.findOne({ driverId })
      .populate('vehicleAssignment.busNumber', '-__v')
      .populate('vehicleAssignment.routeAssigned', '-__v')
      .populate('vehicleAssignment.assignedBy', '-__v');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Transform the response to include route information
    const assignmentObj = assignment.toObject();
    const { vehicleAssignment, ...rest } = assignmentObj;
    const { routeAssigned, ...vehicleAssignmentRest } = vehicleAssignment;

    const transformedAssignment = {
      ...rest,
      vehicleAssignment: {
        ...vehicleAssignmentRest,
        route: routeAssigned // Include route information
      }
    };

    res.status(200).json({
      success: true,
      data: transformedAssignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create leave request
exports.createLeaveRequest = async (req, res) => {
  try {
    const driverId = req.params.id;
    const leaveData = req.body;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    // Check for overlapping leave requests
    const overlappingLeave = assignment.leaveRecords.find(leave => 
      leave.status === 'approved' &&
      ((leaveData.startDate >= leave.startDate && leaveData.startDate <= leave.endDate) ||
       (leaveData.endDate >= leave.startDate && leaveData.endDate <= leave.endDate))
    );

    if (overlappingLeave) {
      return res.status(400).json({
        success: false,
        error: 'Leave request overlaps with existing approved leave'
      });
    }

    assignment.leaveRecords.push(leaveData);
    await assignment.save();

    res.status(201).json({
      success: true,
      data: assignment.leaveRecords[assignment.leaveRecords.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update leave status
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { driverId, leaveId } = req.params;
    const { status, approvedBy } = req.body;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    const leaveRecord = assignment.leaveRecords.id(leaveId);
    if (!leaveRecord) {
      return res.status(404).json({
        success: false,
        error: 'Leave record not found'
      });
    }

    leaveRecord.status = status;
    if (status === 'approved') {
      leaveRecord.approvedBy = approvedBy;
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      data: leaveRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get leave history
exports.getLeaveHistory = async (req, res) => {
  try {
    const driverId = req.params.id;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: assignment.leaveRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add disciplinary record
exports.addDisciplinaryRecord = async (req, res) => {
  try {
    const driverId = req.params.id;
    const recordData = req.body;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    assignment.disciplinaryRecords.push(recordData);
    await assignment.save();

    res.status(201).json({
      success: true,
      data: assignment.disciplinaryRecords[assignment.disciplinaryRecords.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get disciplinary records
exports.getDisciplinaryRecords = async (req, res) => {
  try {
    const driverId = req.params.id;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: assignment.disciplinaryRecords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create grievance record
exports.createGrievance = async (req, res) => {
  try {
    const driverId = req.params.id;
    const grievanceData = req.body;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    assignment.grievanceHistory.push(grievanceData);
    await assignment.save();

    res.status(201).json({
      success: true,
      data: assignment.grievanceHistory[assignment.grievanceHistory.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update grievance status
exports.updateGrievanceStatus = async (req, res) => {
  try {
    const { driverId, grievanceId } = req.params;
    const { status, resolution } = req.body;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    const grievance = assignment.grievanceHistory.id(grievanceId);
    if (!grievance) {
      return res.status(404).json({
        success: false,
        error: 'Grievance record not found'
      });
    }

    grievance.status = status;
    if (resolution) {
      grievance.resolution = resolution;
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      data: grievance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get grievance history
exports.getGrievanceHistory = async (req, res) => {
  try {
    const driverId = req.params.id;

    const assignment = await DriverAssignment.findOne({ driverId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: assignment.grievanceHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all driver assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await DriverAssignment.find()
      .populate({
        path: 'driverId',
        select: '-__v', // Select all fields except __v
        model: 'Driver'
      })
      .populate('vehicleAssignment.busNumber', '-__v')
      .populate('vehicleAssignment.routeAssigned', '-__v')
      .populate('vehicleAssignment.assignedBy', '-__v');

    // Transform the response to include route information
    const transformedAssignments = assignments.map(assignment => {
      const assignmentObj = assignment.toObject();
      const { vehicleAssignment, ...rest } = assignmentObj;
      const { routeAssigned, ...vehicleAssignmentRest } = vehicleAssignment;
      
      return {
        ...rest,
        driver: assignmentObj.driverId,
        driverId: undefined, // Remove the old field
        vehicleAssignment: {
          ...vehicleAssignmentRest,
          route: routeAssigned // Include route information
        }
      };
    });

    res.status(200).json({
      success: true,
      count: transformedAssignments.length,
      data: transformedAssignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 