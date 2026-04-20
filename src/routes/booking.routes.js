const router = require('express').Router();
const ctrl = require('../controllers/booking.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/orders', asyncHandler(ctrl.listOrders));
router.post('/', asyncHandler(ctrl.create));
router.patch('/:id/status', asyncHandler(ctrl.updateStatus));
router.patch('/:id/cancel', asyncHandler(ctrl.cancel));

module.exports = router;
