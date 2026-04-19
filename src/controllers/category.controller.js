const categoryService = require('../services/category.service');
const { ok } = require('../utils/response');

exports.list = async (req, res) => {
  const categories = await categoryService.getCategories();
  return ok(res, categories, 'Categories fetched successfully');
};

exports.discount = async (req, res) => {
  const adminId = req.user ? req.user.id : 1;
  const { discountPercent } = req.body;
  const result = await categoryService.applyDiscount(req.params.id, discountPercent, adminId);
  return ok(res, result, 'Category discounted successfully');
};

exports.merge = async (req, res) => {
  const adminId = req.user ? req.user.id : 1;
  const { oldCategoryId, newCategoryId } = req.body;
  const result = await categoryService.mergeCategory(oldCategoryId, newCategoryId, adminId);
  return ok(res, result, 'Categories merged successfully');
};
