const db = require('../config/db');

async function getAllCategories() {
  const [rows] = await db.query('SELECT * FROM Category WHERE CategoryStatus = 1');
  return rows;
}

async function applyCategoryDiscount(categoryId, discountPercent, adminId) {
  const [rows] = await db.query('CALL sp_ApplyCategoryDiscount(?, ?, ?)', [categoryId, discountPercent, adminId]);
  return rows[0];
}

async function mergeCategories(oldCategoryId, newCategoryId, adminId) {
  const [rows] = await db.query('CALL sp_MergeCategories(?, ?, ?)', [oldCategoryId, newCategoryId, adminId]);
  return rows[0];
}

module.exports = { getAllCategories, applyCategoryDiscount, mergeCategories };
