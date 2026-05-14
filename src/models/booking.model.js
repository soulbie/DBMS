const db     = require('../config/db');
const buffer = require('../utils/queryBuffer');

const TTL_ORDER = 15_000; // orders thay đổi thường xuyên → TTL ngắn 15s
const TTL_TOUR  = 30_000;

async function createBooking(userId, tourId, quantity, paymentMethod, note) {
  const [rows] = await db.query(
    'CALL sp_CreateBooking(?, ?, ?, ?, ?)',
    [userId, tourId, quantity, paymentMethod, note]
  );
  // Invalidate orders và tour (slot còn lại thay đổi)
  buffer.invalidate('orders:');
  buffer.invalidate('tours:');
  return rows[0][0];
}

async function findTourById(tourId) {
  const key    = `tours:id:${tourId}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query(
    'SELECT * FROM Tour WHERE TourID = ? AND TourStatus = 1', [tourId]
  );
  const result = rows[0] ?? null;
  if (result) buffer.set(key, result, TTL_TOUR);
  return result;
}

async function updateOrderStatus(orderId, newStatus, adminId) {
  const [rows] = await db.query('CALL sp_UpdateOrderStatus(?, ?, ?)', [orderId, newStatus, adminId]);
  buffer.invalidate('orders:');
  return rows[0][0];
}

async function cancelBooking(orderId, adminId, reason) {
  const [rows] = await db.query('CALL sp_CancelBooking(?, ?, ?)', [orderId, adminId || null, reason || '']);
  buffer.invalidate('orders:');
  buffer.invalidate('tours:');
  return rows[0][0];
}

async function getAllOrders() {
  const key    = 'orders:all';
  const cached = buffer.get(key);
  if (cached) return cached;

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
  buffer.set(key, rows, TTL_ORDER);
  return rows;
}

async function getOrderById(orderId) {
  const key    = `orders:id:${orderId}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query(`
    SELECT 
      o.OrderID, o.OrderDate, o.OrderStatus, o.PaymentMethod, o.Note,
      t.Title AS TourName, t.TourThumbnail, t.DepartureDate, t.Duration,
      bd.Quantity, bd.PriceAtBooking, (bd.Quantity * bd.PriceAtBooking) AS LineTotal,
      CASE o.OrderStatus 
        WHEN 0 THEN 'Cancelled'
        WHEN 1 THEN 'Pending'
        WHEN 2 THEN 'Completed'
        ELSE 'Unknown'
      END AS StatusLabel
    FROM \`Order\` o
    JOIN BookedTour bd ON o.OrderID = bd.OrderID
    JOIN Tour t ON bd.TourID = t.TourID
    WHERE o.OrderID = ?
  `, [orderId]);
  const result = rows[0] ?? null;
  if (result) buffer.set(key, result, TTL_ORDER);
  return result;
}

module.exports = { createBooking, findTourById, getAllOrders, getOrderById, updateOrderStatus, cancelBooking };
