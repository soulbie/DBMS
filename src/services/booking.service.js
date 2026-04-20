const bookingModel = require('../models/booking.model');
const { AppError } = require('../utils/errors');
const logger       = require('../utils/logger');

async function createBooking(userId, tourId, quantity, paymentMethod, note) {
  const tour = await bookingModel.findTourById(tourId);
  if (!tour) throw new AppError('Tour không tồn tại', 404);
  if (tour.MaxParticipants < quantity) {
    throw new AppError('Không đủ chỗ trống', 400);
  }

  const result = await bookingModel.createBooking(userId, tourId, quantity, paymentMethod, note);
  logger.info(`Booking created: orderId=${result.OrderID_Created}, userId=${userId}`);
  return result;
}

async function updateStatus(orderId, newStatus, adminId) {
  const result = await bookingModel.updateOrderStatus(orderId, newStatus, adminId);
  logger.info(`Order ${orderId} status updated to ${newStatus} by admin ${adminId}`);
  return result;
}

async function cancelBooking(orderId, adminId, reason) {
  const result = await bookingModel.cancelBooking(orderId, adminId, reason);
  logger.info(`Order ${orderId} cancelled by admin ${adminId}. Reason: ${reason}`);
  return result;
}

async function getAllOrders() {
  return await bookingModel.getAllOrders();
}

module.exports = { createBooking, getAllOrders, updateStatus, cancelBooking };
