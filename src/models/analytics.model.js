const db = require('../config/db');

async function getRevenueByDateRange(startDate, endDate) {
  const [rows] = await db.query('CALL sp_GetRevenueByDateRange(?, ?)', [startDate, endDate]);
  return rows[0];
}

async function getRevenueByCategory(startDate, endDate, categoryName) {
  const [rows] = await db.query('CALL sp_GetRevenueByCategory(?, ?, ?)', [startDate, endDate, categoryName || null]);
  return rows[0];
}

async function getRevenueActualVsExpected(startDate, endDate) {
  const [rows] = await db.query('CALL sp_RevenueActualVsExpected(?, ?)', [startDate, endDate]);
  return rows[0];
}

async function getTopBestSellingToursByMonth(year, month, limit) {
  const [rows] = await db.query('CALL sp_GetTopBestSellingToursByMonth(?, ?, ?)', [year, month, limit || 10]);
  return rows[0];
}

async function getTourOccupancyByName(tourTitle) {
  const [rows] = await db.query('CALL sp_GetTourOccupancyByName(?)', [tourTitle || '']);
  return rows[0];
}

async function getTopCancelledTours(limit) {
  const [rows] = await db.query('CALL sp_TopCancelledTours(?)', [limit || 5]);
  return rows[0];
}

async function getHighInventoryTours(daysAhead) {
  const [rows] = await db.query('CALL sp_HighInventoryTours(?)', [daysAhead || 14]);
  return rows[0];
}

async function getTopVIPCustomers(limit, mode) {
  const [rows] = await db.query('CALL GetTopVIPCustomers(?, ?)', [limit || 10, mode || 1]);
  return rows[0];
}

async function getCustomerDemographicStats(type, orderStatus) {
  const [rows] = await db.query('CALL GetCustomerDemographicStats(?, ?)', [type || 'AGE', orderStatus || 2]);
  return rows[0];
}

async function getCustomerRetentionRate(orderStatus) {
  const [rows] = await db.query('CALL GetCustomerRetentionRate(?)', [orderStatus || 2]);
  return rows[0];
}

module.exports = { 
  getRevenueByDateRange, getRevenueByCategory, getRevenueActualVsExpected,
  getTopBestSellingToursByMonth, getTourOccupancyByName, getTopCancelledTours,
  getHighInventoryTours, getTopVIPCustomers, getCustomerDemographicStats,
  getCustomerRetentionRate
};
