const db     = require('../config/db');
const buffer = require('../utils/queryBuffer');

// TTL constants (ms)
const TTL_TOUR = 60_000;  // tours ít thay đổi → 60s

async function getAllTours() {
  const key    = 'tours:all';
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query(`
    SELECT v.*, t.CostPerPerson, t.TourThumbnail, t.Duration, t.DeparturePlace, c.Name AS CategoryName 
    FROM vw_TourOccupancy v 
    JOIN Tour t ON v.TourID = t.TourID 
    LEFT JOIN Category c ON v.CategoryID = c.CategoryID 
    WHERE (v.DepartureDate > NOW() OR v.DepartureDate IS NULL) AND v.RemainingSeats > 0 
    ORDER BY t.TourID DESC LIMIT 50
  `);
  buffer.set(key, rows, TTL_TOUR);
  return rows;
}

async function getTourById(id) {
  const key    = `tours:id:${id}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT * FROM vw_TourCatalogue WHERE TourID = ?', [id]);
  const result = rows[0] ?? null;
  if (result) buffer.set(key, result, TTL_TOUR);
  return result;
}

async function createTourWithImage(title, vehicle, departurePlace, cost, maxParticipants, categoryId, imageSource) {
  const [rows] = await db.query(
    'CALL sp_CreateTourWithImage(?, ?, ?, ?, ?, ?, ?)',
    [title, vehicle, departurePlace, cost, maxParticipants, categoryId, imageSource]
  );
  // Invalidate tour cache sau khi tạo mới
  buffer.invalidate('tours:');
  return rows[0];
}

async function safeDeleteTour(tourId, adminId) {
  const [rows] = await db.query('CALL sp_SafeDeleteTour(?, ?)', [tourId, adminId]);
  // Invalidate tour cache sau khi xóa
  buffer.invalidate('tours:');
  return rows[0];
}

module.exports = { getAllTours, getTourById, createTourWithImage, safeDeleteTour };
