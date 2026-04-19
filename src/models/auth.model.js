const db = require('../config/db');

async function findUserByEmail(email) {
  const [rows] = await db.query('SELECT * FROM User WHERE Email = ?', [email]);
  return rows[0] ?? null;
}

async function createUser(fullName, email, password, phone = '') {
  const [lastIdResult] = await db.query('SELECT COALESCE(MAX(UserID), 0) + 1 AS nextId FROM User');
  const nextId = lastIdResult[0].nextId;
  
  await db.query(
    'INSERT INTO User (UserID, FullName, Email, Password, PhoneNumber, Status) VALUES (?, ?, ?, ?, ?, 1)',
    [nextId, fullName, email, password, phone]
  );
  
  return { UserID: nextId, FullName: fullName, Email: email };
}

module.exports = { findUserByEmail, createUser };
