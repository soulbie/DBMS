const adminService = require('../services/admin.service');
const { ok } = require('../utils/response');

exports.profile = async (req, res) => {
  const adminId = req.user ? req.user.id : 1; // mocked
  const profile = await adminService.getAdminProfile(adminId);
  return ok(res, profile, 'Admin profile fetched successfully');
};

exports.createAdminRole = async (req, res) => {
  const { fullName, email, password, roleId } = req.body;
  const result = await adminService.createAdmin(fullName, email, password, roleId);
  return ok(res, result, 'Admin created successfully');
};

exports.getAuditLogs = async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  const logs = await adminService.getAuditLogs(limit);
  return ok(res, logs, 'Audit logs fetched successfully');
};
