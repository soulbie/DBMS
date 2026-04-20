const db = require('../config/db');

async function createBooking(userId, tourId, quantity, paymentMethod, note) {
  const [rows] = await db.query(
    'CALL sp_CreateBooking(?, ?, ?, ?, ?)',
    [userId, tourId, quantity, paymentMethod, note]
  );
  return rows[0][0];
}

async function findTourById(tourId) {
  const [rows] = await db.query(
    'SELECT * FROM Tour WHERE TourID = ? AND TourStatus = 1', [tourId]
  );
  return rows[0] ?? null;
}

async function updateOrderStatus(orderId, newStatus, adminId) {
  const [rows] = await db.query('CALL sp_UpdateOrderStatus(?, ?, ?)', [orderId, newStatus, adminId]);
  return rows[0][0];
}

async function cancelBooking(orderId, adminId, reason) {
  const [rows] = await db.query('CALL sp_CancelBooking(?, ?, ?)', [orderId, adminId || null, reason || '']);
  return rows[0][0];
}

async function getAllOrders() {
  const [rows] = await db.query(`
    SELECT 
      o.OrderID, o.OrderDate, o.PaymentMethod, o.Note,
      o.OrderStatus,
      CASE o.OrderStatus 
        WHEN 0 THEN 'Cancelled'
        WHEN 1 THEN 'Pending'
        WHEN 2 THEN 'Completed'
        ELSE 'Unknown'
      END AS StatusLabel,
      bd.UserID, bd.TourID, bd.Quantity, bd.PriceAtBooking, bd.LineTotal
    FROM \`Order\` o
    LEFT JOIN vw_BookingDetails bd ON o.OrderID = bd.OrderID
    ORDER BY o.OrderID DESC
    LIMIT 20
  `);
  return rows;
}

module.exports = { createBooking, findTourById, getAllOrders, updateOrderStatus, cancelBooking };
