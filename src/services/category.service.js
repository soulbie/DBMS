const categoryModel = require('../models/category.model');

async function getCategories() {
  return await categoryModel.getAllCategories();
}

async function applyDiscount(categoryId, discountPercent, adminId) {
  return await categoryModel.applyCategoryDiscount(categoryId, discountPercent, adminId);
}

async function mergeCategory(oldCategoryId, newCategoryId, adminId) {
  return await categoryModel.mergeCategories(oldCategoryId, newCategoryId, adminId);
}

module.exports = { getCategories, applyDiscount, mergeCategory };
