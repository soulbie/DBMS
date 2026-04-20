const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/profile', asyncHandler(ctrl.profile));
router.get('/list', asyncHandler(ctrl.listAllAdmins));
router.post('/create-admin-role', asyncHandler(ctrl.createAdminRole));
router.get('/audit-logs', asyncHandler(ctrl.getAuditLogs));

module.exports = router;
