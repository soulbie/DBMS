const db     = require('../config/db');
const buffer = require('../utils/queryBuffer');

const TTL_USER = 30_000;

async function findUserByEmail(email) {
  const key    = `user:email:${email}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT * FROM User WHERE Email = ?', [email]);
  const result = rows[0] ?? null;
  if (result) buffer.set(key, result, TTL_USER);
  return result;
}

async function createUser(fullName, email, password, phone = '') {
  const [lastIdResult] = await db.query('SELECT COALESCE(MAX(UserID), 0) + 1 AS nextId FROM User');
  const nextId = lastIdResult[0].nextId;
  
  await db.query(
    'INSERT INTO User (UserID, FullName, Email, Password, PhoneNumber, Status) VALUES (?, ?, ?, ?, ?, 1)',
    [nextId, fullName, email, password, phone]
  );

  // Invalidate user cache sau khi tạo mới
  buffer.invalidate('user:');
  return { UserID: nextId, FullName: fullName, Email: email };
}

module.exports = { findUserByEmail, createUser };
