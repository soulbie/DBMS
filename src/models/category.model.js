const db     = require('../config/db');
const buffer = require('../utils/queryBuffer');

const TTL_CAT = 60_000; // categories ít thay đổi → 60s

async function getAllCategories() {
  const key    = 'categories:all';
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT * FROM Category WHERE CategoryStatus = 1');
  buffer.set(key, rows, TTL_CAT);
  return rows;
}

async function applyCategoryDiscount(categoryId, discountPercent, adminId) {
  const [rows] = await db.query('CALL sp_ApplyCategoryDiscount(?, ?, ?)', [categoryId, discountPercent, adminId]);
  buffer.invalidate('categories:');
  buffer.invalidate('tours:'); // giá tour có thể thay đổi theo category discount
  return rows[0];
}

async function mergeCategories(oldCategoryId, newCategoryId, adminId) {
  const [rows] = await db.query('CALL sp_MergeCategories(?, ?, ?)', [oldCategoryId, newCategoryId, adminId]);
  buffer.invalidate('categories:');
  buffer.invalidate('tours:');
  return rows[0];
}

module.exports = { getAllCategories, applyCategoryDiscount, mergeCategories };
