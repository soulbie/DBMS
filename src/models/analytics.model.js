const db     = require('../config/db');
const buffer = require('../utils/queryBuffer');

// Analytics reports ít thay đổi → TTL dài hơn (120s)
const TTL_ANALYTICS = 120_000;

async function getRevenueByDateRange(startDate, endDate) {
  const key    = `analytics:revenue:${startDate}:${endDate}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_GetRevenueByDateRange(?, ?)', [startDate, endDate]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getRevenueByCategory(startDate, endDate, categoryName) {
  const key    = `analytics:revenueCat:${startDate}:${endDate}:${categoryName ?? 'all'}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_GetRevenueByCategory(?, ?, ?)', [startDate, endDate, categoryName || null]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getRevenueActualVsExpected(startDate, endDate) {
  const key    = `analytics:actualVsExpected:${startDate}:${endDate}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_RevenueActualVsExpected(?, ?)', [startDate, endDate]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getTopBestSellingToursByMonth(year, month, limit) {
  const key    = `analytics:bestSelling:${year}:${month}:${limit ?? 10}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_GetTopBestSellingToursByMonth(?, ?, ?)', [year, month, limit || 10]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getTourOccupancyByName(tourTitle) {
  const key    = `analytics:occupancy:${tourTitle ?? ''}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_GetTourOccupancyByName(?)', [tourTitle || '']);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getTopCancelledTours(limit) {
  const key    = `analytics:cancelled:${limit ?? 5}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_TopCancelledTours(?)', [limit || 5]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getHighInventoryTours(daysAhead) {
  const key    = `analytics:highInventory:${daysAhead ?? 14}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL sp_HighInventoryTours(?)', [daysAhead || 14]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getTopVIPCustomers(limit, mode) {
  const key    = `analytics:vip:${limit ?? 10}:${mode ?? 1}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL GetTopVIPCustomers(?, ?)', [limit || 10, mode || 1]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getCustomerDemographicStats(type, orderStatus) {
  const key    = `analytics:demographics:${type ?? 'AGE'}:${orderStatus ?? 2}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL GetCustomerDemographicStats(?, ?)', [type || 'AGE', orderStatus || 2]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

async function getCustomerRetentionRate(orderStatus) {
  const key    = `analytics:retention:${orderStatus ?? 2}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('CALL GetCustomerRetentionRate(?)', [orderStatus || 2]);
  buffer.set(key, rows[0], TTL_ANALYTICS);
  return rows[0];
}

module.exports = { 
  getRevenueByDateRange, getRevenueByCategory, getRevenueActualVsExpected,
  getTopBestSellingToursByMonth, getTourOccupancyByName, getTopCancelledTours,
  getHighInventoryTours, getTopVIPCustomers, getCustomerDemographicStats,
  getCustomerRetentionRate
};
