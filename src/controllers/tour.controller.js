const tourService = require('../services/tour.service');
const { ok } = require('../utils/response');

exports.list = async (req, res) => {
  const tours = await tourService.getTours();
  return ok(res, tours, 'Tours fetched successfully');
};

exports.detail = async (req, res) => {
  const tour = await tourService.getTourDetails(req.params.id);
  return ok(res, tour, 'Tour fetched successfully');
};

exports.create = async (req, res) => {
  const result = await tourService.createTour(req.body);
  return ok(res, result, 'Tour created successfully');
};

exports.delete = async (req, res) => {
  const adminId = req.user ? req.user.id : 1; 
  const result = await tourService.deleteTour(req.params.id, adminId);
  return ok(res, result, 'Tour deleted successfully');
};
