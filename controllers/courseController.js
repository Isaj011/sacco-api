const Course = require('../models/Course');
const Stop = require('../models/Stop');
const Schedule = require('../models/Schedule');
const Fare = require('../models/Fare');
const Performance = require('../models/Performance');
const AssignedVehicle = require('../models/AssignedVehicle');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }
    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private
exports.createCourse = async (req, res) => {
  try {
    // Create related documents first
    const stops = await Promise.all(
      req.body.stops.map(stop => Stop.create(stop))
    );
    const schedule = await Schedule.create(req.body.schedule);
    const fare = await Fare.create(req.body.fare);
    const performance = await Performance.create(req.body.performance);
    const assignedVehicles = await Promise.all(
      req.body.assignedVehicles.map(vehicle => AssignedVehicle.create(vehicle))
    );

    // Create course with references
    const course = await Course.create({
      ...req.body,
      stops: stops.map(stop => stop._id),
      schedule: schedule._id,
      fare: fare._id,
      performance: performance._id,
      assignedVehicles: assignedVehicles.map(vehicle => vehicle._id)
    });

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Update related documents if provided
    if (req.body.stops) {
      await Promise.all(
        req.body.stops.map(stop => 
          Stop.findByIdAndUpdate(stop._id, stop, { new: true, runValidators: true })
        )
      );
    }
    if (req.body.schedule) {
      await Schedule.findByIdAndUpdate(course.schedule, req.body.schedule, {
        new: true,
        runValidators: true
      });
    }
    if (req.body.fare) {
      await Fare.findByIdAndUpdate(course.fare, req.body.fare, {
        new: true,
        runValidators: true
      });
    }
    if (req.body.performance) {
      await Performance.findByIdAndUpdate(course.performance, req.body.performance, {
        new: true,
        runValidators: true
      });
    }
    if (req.body.assignedVehicles) {
      await Promise.all(
        req.body.assignedVehicles.map(vehicle =>
          AssignedVehicle.findByIdAndUpdate(vehicle._id, vehicle, {
            new: true,
            runValidators: true
          })
        )
      );
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: updatedCourse
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Delete related documents
    await Promise.all([
      Stop.deleteMany({ _id: { $in: course.stops } }),
      Schedule.findByIdAndDelete(course.schedule),
      Fare.findByIdAndDelete(course.fare),
      Performance.findByIdAndDelete(course.performance),
      AssignedVehicle.deleteMany({ _id: { $in: course.assignedVehicles } })
    ]);

    // Delete course
    await course.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 