const db = require('../config/db');

async function getAllTours() {
  const query = `
    SELECT v.*, t.CostPerPerson, t.TourThumbnail, t.Duration, t.DeparturePlace, c.Name AS CategoryName 
    FROM vw_TourOccupancy v 
    JOIN Tour t ON v.TourID = t.TourID 
    LEFT JOIN Category c ON v.CategoryID = c.CategoryID 
    WHERE (v.DepartureDate > NOW() OR v.DepartureDate IS NULL) AND v.RemainingSeats > 0 
    ORDER BY t.TourID DESC LIMIT 50
  `;
  const [rows] = await db.query(query);
  return rows;
}

async function getTourById(id) {
  const [rows] = await db.query('SELECT * FROM vw_TourCatalogue WHERE TourID = ?', [id]);
  return rows[0] ?? null;
}

async function createTourWithImage(title, vehicle, departurePlace, cost, maxParticipants, categoryId, imageSource) {
  const [rows] = await db.query(
    'CALL sp_CreateTourWithImage(?, ?, ?, ?, ?, ?, ?)',
    [title, vehicle, departurePlace, cost, maxParticipants, categoryId, imageSource]
  );
  return rows[0];
}

async function safeDeleteTour(tourId, adminId) {
  const [rows] = await db.query('CALL sp_SafeDeleteTour(?, ?)', [tourId, adminId]);
  return rows[0];
}

module.exports = { getAllTours, getTourById, createTourWithImage, safeDeleteTour };
