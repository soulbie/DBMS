const analyticsModel = require('../models/analytics.model');

async function getRevenue(startDate, endDate) {
  return await analyticsModel.getRevenueByDateRange(startDate, endDate);
}

async function getRevenueByCategory(startDate, endDate, categoryName) {
  return await analyticsModel.getRevenueByCategory(startDate, endDate, categoryName);
}

async function getRevenueActualVsExpected(startDate, endDate) {
  return await analyticsModel.getRevenueActualVsExpected(startDate, endDate);
}

async function getTopBestSellingToursByMonth(year, month, limit) {
  return await analyticsModel.getTopBestSellingToursByMonth(year, month, limit);
}

async function getTourOccupancyByName(tourTitle) {
  return await analyticsModel.getTourOccupancyByName(tourTitle);
}

async function getTopCancelledTours(limit) {
  return await analyticsModel.getTopCancelledTours(limit);
}

async function getHighInventoryTours(daysAhead) {
  return await analyticsModel.getHighInventoryTours(daysAhead);
}

async function getTopVIPCustomers(limit, mode) {
  return await analyticsModel.getTopVIPCustomers(limit, mode);
}

async function getCustomerDemographicStats(type, orderStatus) {
  return await analyticsModel.getCustomerDemographicStats(type, orderStatus);
}

async function getCustomerRetentionRate(orderStatus) {
  return await analyticsModel.getCustomerRetentionRate(orderStatus);
}

module.exports = { 
  getRevenue, getRevenueByCategory, getRevenueActualVsExpected,
  getTopBestSellingToursByMonth, getTourOccupancyByName, getTopCancelledTours,
  getHighInventoryTours, getTopVIPCustomers, getCustomerDemographicStats,
  getCustomerRetentionRate
};
