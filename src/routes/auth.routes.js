const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const asyncHandler = require('../utils/asyncHandler');

router.post('/login', asyncHandler(ctrl.login));
router.post('/register', asyncHandler(ctrl.register));
router.post('/admin-login', asyncHandler(ctrl.adminLogin));

module.exports = router;
