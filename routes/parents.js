const express = require('express');
const {
    getParents,
    getParent,
    createParent,
    updateParent,
    deleteParent
} = require('../controllers/parentsController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getParents)
    .post(authorize('admin', 'staff'), createParent);

router.route('/:id')
    .get(authorize('admin', 'staff', 'ntsa_officer', 'ntsa_inspector', 'ntsa_analyst'), getParent)
    .put(authorize('admin', 'staff'), updateParent)
    .delete(authorize('admin'), deleteParent);

module.exports = router;
