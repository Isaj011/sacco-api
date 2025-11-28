const express = require('express');
const {
    addStudentToSchool,
    removeStudentFromSchool,
    getSchoolStudents,
    updateSchoolStudent,
    getSchoolStudent
} = require('../controllers/schoolStudentController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .post(authorize('admin', 'manager'), addStudentToSchool)
    .get(authorize('admin', 'manager', 'supervisor'), getSchoolStudents);

router.route('/:studentId')
    .get(authorize('admin', 'manager', 'supervisor'), getSchoolStudent)
    .put(authorize('admin', 'manager'), updateSchoolStudent)
    .delete(authorize('admin'), removeStudentFromSchool);

module.exports = router;
