const tourModel = require('../models/tour.model');
const { AppError } = require('../utils/errors');

async function getTours() {
  const tours = await tourModel.getAllTours();
  return tours;
}

async function getTourDetails(id) {
  const tour = await tourModel.getTourById(id);
  if (!tour) throw new AppError('Tour not found', 404);
  return tour;
}

async function createTour(payload) {
  const { title, vehicle, departurePlace, cost, maxParticipants, categoryId, imageSource } = payload;
  const result = await tourModel.createTourWithImage(
    title, vehicle, departurePlace, cost, maxParticipants, categoryId, imageSource
  );
  return result;
}

async function deleteTour(tourId, adminId) {
  const result = await tourModel.safeDeleteTour(tourId, adminId);
  return result;
}

module.exports = { getTours, getTourDetails, createTour, deleteTour };
