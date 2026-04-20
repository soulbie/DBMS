const db = require('../config/db');

async function createBooking(userId, tourId, quantity, paymentMethod, note) {
  const [rows] = await db.query(
    'CALL sp_CreateBooking(?, ?, ?, ?, ?)',
    [userId, tourId, quantity, paymentMethod, note]
  );
  return rows[0];
}

async function findTourById(tourId) {
  const [rows] = await db.query(
    'SELECT * FROM Tour WHERE TourID = ? AND TourStatus = 1', [tourId]
  );
  return rows[0] ?? null;
}

async function updateOrderStatus(orderId, newStatus, adminId) {
  const [rows] = await db.query('CALL sp_UpdateOrderStatus(?, ?, ?)', [orderId, newStatus, adminId]);
  return rows[0];
}

async function cancelBooking(orderId, adminId, reason) {
  const [rows] = await db.query('CALL sp_CancelBooking(?, ?, ?)', [orderId, adminId || null, reason || '']);
  return rows[0];
}

module.exports = { createBooking, findTourById, updateOrderStatus, cancelBooking };
