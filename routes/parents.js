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
    .get(authorize('admin', 'manager', 'supervisor'), getParents)
    .post(authorize('admin', 'manager'), createParent);

router.route('/:id')
    .get(authorize('admin', 'manager', 'supervisor'), getParent)
    .put(authorize('admin', 'manager'), updateParent)
    .delete(authorize('admin'), deleteParent);

module.exports = router;
