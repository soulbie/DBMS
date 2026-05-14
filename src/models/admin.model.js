const db     = require('../config/db');
const buffer = require('../utils/queryBuffer');

const TTL_ADMIN = 30_000;  // admin data → 30s
const TTL_AUDIT = 15_000;  // audit logs thay đổi thường xuyên hơn → 15s

async function getAdminById(adminId) {
  const key    = `admin:id:${adminId}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT * FROM Admin WHERE AdminID = ? AND Status = 1', [adminId]);
  const result = rows[0] ?? null;
  if (result) buffer.set(key, result, TTL_ADMIN);
  return result;
}

async function findAdminByEmail(email) {
  const key    = `admin:email:${email}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT * FROM Admin WHERE Email = ?', [email]);
  const result = rows[0] ?? null;
  if (result) buffer.set(key, result, TTL_ADMIN);
  return result;
}

async function getAllAdmins() {
  const key    = 'admin:all';
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT AdminID, FullName, RoleName, PermissionType FROM vw_AdminAccessControl ORDER BY AdminID DESC LIMIT 10');
  buffer.set(key, rows, TTL_ADMIN);
  return rows;
}

async function createAdminWithRole(fullName, email, password, roleId) {
  const [rows] = await db.query('CALL sp_CreateAdminWithRole(?, ?, ?, ?)', [fullName, email, password, roleId]);
  buffer.invalidate('admin:');
  return rows[0][0];
}

async function getAuditLogs(limit = 100) {
  const key    = `admin:auditLogs:${limit}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query(`
    SELECT LogID, AdminID, Action, TargetTable, TargetID, ActionTimestamp, Details 
    FROM AuditLog 
    ORDER BY ActionTimestamp DESC 
    LIMIT ?
  `, [limit]);
  buffer.set(key, rows, TTL_AUDIT);
  return rows;
}

async function getAdminRoles(adminId) {
  const key    = `admin:roles:${adminId}`;
  const cached = buffer.get(key);
  if (cached) return cached;

  const [rows] = await db.query('SELECT RoleName FROM vw_AdminAccessControl WHERE AdminID = ?', [adminId]);
  const result = Array.from(new Set(rows.map(row => row.RoleName)));
  buffer.set(key, result, TTL_ADMIN);
  return result;
}

module.exports = { getAdminById, findAdminByEmail, getAllAdmins, createAdminWithRole, getAuditLogs, getAdminRoles };
