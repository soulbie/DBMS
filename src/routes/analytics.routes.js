const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/revenue', asyncHandler(ctrl.revenue));
router.get('/revenue/category', asyncHandler(ctrl.revenueByCategory));
router.get('/revenue/actual-vs-expected', asyncHandler(ctrl.revenueActualVsExpected));
router.get('/tours/best-selling', asyncHandler(ctrl.bestSellingTours));
router.get('/tours/occupancy', asyncHandler(ctrl.tourOccupancy));
router.get('/tours/cancelled', asyncHandler(ctrl.cancelledTours));
router.get('/tours/high-inventory', asyncHandler(ctrl.highInventoryTours));
router.get('/customers/vip', asyncHandler(ctrl.vipCustomers));
router.get('/customers/demographics', asyncHandler(ctrl.customerDemographics));
router.get('/customers/retention', asyncHandler(ctrl.customerRetention));

module.exports = router;
