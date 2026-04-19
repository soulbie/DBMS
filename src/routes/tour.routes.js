const router = require('express').Router();
const ctrl = require('../controllers/tour.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(ctrl.list));
router.post('/', asyncHandler(ctrl.create));
router.get('/:id', asyncHandler(ctrl.detail));
router.delete('/:id', asyncHandler(ctrl.delete));

module.exports = router;
