const adminModel = require('../models/admin.model');
const { AppError } = require('../utils/errors');

async function getAdminProfile(adminId) {
  const admin = await adminModel.getAdminById(adminId);
  if (!admin) throw new AppError('Admin not found', 404);
  return admin;
}

async function createAdmin(fullName, email, password, roleId) {
  return await adminModel.createAdminWithRole(fullName, email, password, roleId);
}

async function getAuditLogs(limit) {
  return await adminModel.getAuditLogs(limit);
}

async function getAllAdmins() {
  return await adminModel.getAllAdmins();
}

module.exports = { getAdminProfile, createAdmin, getAllAdmins, getAuditLogs };
