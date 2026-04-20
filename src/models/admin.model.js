const db = require('../config/db');

async function getAdminById(adminId) {
  const [rows] = await db.query('SELECT * FROM Admin WHERE AdminID = ? AND Status = 1', [adminId]);
  return rows[0] ?? null;
}

async function findAdminByEmail(email) {
  const [rows] = await db.query('SELECT * FROM Admin WHERE Email = ?', [email]);
  return rows[0] ?? null;
}

async function getAllAdmins() {
  const [rows] = await db.query('SELECT AdminID, FullName, RoleName, PermissionType FROM vw_AdminAccessControl ORDER BY AdminID DESC LIMIT 10');
  return rows;
}

async function createAdminWithRole(fullName, email, password, roleId) {
  const [rows] = await db.query('CALL sp_CreateAdminWithRole(?, ?, ?, ?)', [fullName, email, password, roleId]);
  return rows[0][0];
}

async function getAuditLogs(limit = 100) {
  const [rows] = await db.query(`
    SELECT LogID, AdminID, Action, TargetTable, TargetID, ActionTimestamp, Details 
    FROM AuditLog 
    ORDER BY ActionTimestamp DESC 
    LIMIT ?
  `, [limit]);
  return rows;
}

module.exports = { getAdminById, findAdminByEmail, getAllAdmins, createAdminWithRole, getAuditLogs };
