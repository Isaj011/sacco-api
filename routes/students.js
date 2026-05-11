const express = require('express');
const {
    createStudent: addStudentToSchool,
    deleteStudent: removeStudentFromSchool,
    getStudents:   getSchoolStudents,
    updateStudent: updateSchoolStudent,
    getStudent:    getSchoolStudent
} = require('../controllers/schoolStudentController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .post(authorize('admin', 'staff'), addStudentToSchool)
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSchoolStudents);

router.route('/:studentId')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getSchoolStudent)
    .put(authorize('admin', 'staff'), updateSchoolStudent)
    .delete(authorize('admin'), removeStudentFromSchool);

module.exports = router;
