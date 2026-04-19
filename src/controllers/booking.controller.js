const bookingService = require('../services/booking.service');
const { ok, created } = require('../utils/response');

exports.create = async (req, res) => {
  const { tourId, quantity, paymentMethod, note, userId: bodyUserId } = req.body;
  // Use userId from body if sent from frontend
  const userId = req.user ? req.user.id : (bodyUserId || 1);
  const result = await bookingService.createBooking(
    userId, tourId, quantity, paymentMethod, note
  );
  return created(res, result, 'Đặt tour thành công!');
};

exports.updateStatus = async (req, res) => {
  const adminId = req.user ? req.user.id : 1; 
  const { status } = req.body;
  const result = await bookingService.updateStatus(req.params.id, status, adminId);
  return ok(res, result, 'Cập nhật trạng thái thành công!');
};

exports.cancel = async (req, res) => {
  const adminId = req.user ? req.user.id : 1;
  const { reason } = req.body;
  const result = await bookingService.cancelBooking(req.params.id, adminId, reason);
  return ok(res, result, 'Hủy tour thành công!');
};
