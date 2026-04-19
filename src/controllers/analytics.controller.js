const analyticsService = require('../services/analytics.service');
const { ok } = require('../utils/response');

exports.revenue = async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await analyticsService.getRevenue(startDate, endDate);
  return ok(res, data, 'Revenue fetched successfully');
};

exports.revenueByCategory = async (req, res) => {
  const { startDate, endDate, categoryName } = req.query;
  const data = await analyticsService.getRevenueByCategory(startDate, endDate, categoryName);
  return ok(res, data, 'Revenue by category fetched successfully');
};

exports.revenueActualVsExpected = async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await analyticsService.getRevenueActualVsExpected(startDate, endDate);
  return ok(res, data, 'Actual vs expected revenue fetched successfully');
};

exports.bestSellingTours = async (req, res) => {
  const { year, month, limit } = req.query;
  const data = await analyticsService.getTopBestSellingToursByMonth(year, month, limit);
  return ok(res, data, 'Best selling tours fetched successfully');
};

exports.tourOccupancy = async (req, res) => {
  const { tourTitle } = req.query;
  const data = await analyticsService.getTourOccupancyByName(tourTitle);
  return ok(res, data, 'Tour occupancy fetched successfully');
};

exports.cancelledTours = async (req, res) => {
  const { limit } = req.query;
  const data = await analyticsService.getTopCancelledTours(limit);
  return ok(res, data, 'Top cancelled tours fetched successfully');
};

exports.highInventoryTours = async (req, res) => {
  const { daysAhead } = req.query;
  const data = await analyticsService.getHighInventoryTours(daysAhead);
  return ok(res, data, 'High inventory tours fetched successfully');
};

exports.vipCustomers = async (req, res) => {
  const { limit, mode } = req.query;
  const data = await analyticsService.getTopVIPCustomers(limit, mode);
  return ok(res, data, 'VIP customers fetched successfully');
};

exports.customerDemographics = async (req, res) => {
  const { type, orderStatus } = req.query;
  const data = await analyticsService.getCustomerDemographicStats(type, orderStatus);
  return ok(res, data, 'Customer demographics fetched successfully');
};

exports.customerRetention = async (req, res) => {
  const { orderStatus } = req.query;
  const data = await analyticsService.getCustomerRetentionRate(orderStatus);
  return ok(res, data, 'Customer retention fetched successfully');
};
