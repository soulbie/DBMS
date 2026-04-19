const router = require('express').Router();
const ctrl = require('../controllers/category.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(ctrl.list));
router.patch('/:id/discount', asyncHandler(ctrl.discount));
router.post('/merge', asyncHandler(ctrl.merge));

module.exports = router;
