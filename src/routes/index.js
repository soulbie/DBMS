const router = require('express').Router();

router.use('/auth',      require('./auth.routes'));
router.use('/bookings',  require('./booking.routes'));
router.use('/tours',     require('./tour.routes'));
router.use('/categories',require('./category.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/admin',     require('./admin.routes'));

module.exports = router;
