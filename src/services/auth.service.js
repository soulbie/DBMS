const authModel = require('../models/auth.model');
const { AppError } = require('../utils/errors');

async function login(email, password) {
  const user = await authModel.findUserByEmail(email);
  if (!user) throw new AppError('Email không tồn tại', 404);
  
  if (user.Password !== password) {
    throw new AppError('Mật khẩu không chính xác', 401);
  }
  
  // Exclude password from payload
  const { Password, ...userPayload } = user;
  return userPayload;
}

async function register(payload) {
  const { fullName, email, password, phone } = payload;
  
  const existingUser = await authModel.findUserByEmail(email);
  if (existingUser) throw new AppError('Email này đã được đăng ký', 400);
  
  const newUser = await authModel.createUser(fullName, email, password, phone);
  return newUser;
}

async function adminLogin(email, password) {
  const adminModel = require('../models/admin.model');
  const admin = await adminModel.findAdminByEmail(email);
  if (!admin) throw new AppError('Email Admin không tồn tại', 404);
  if (admin.Password !== password) throw new AppError('Mật khẩu không chính xác', 401);
  if (admin.Status !== 1) throw new AppError('Tài khoản Admin đã bị vô hiệu hóa', 403);
  const { Password, ...adminPayload } = admin;
  return { ...adminPayload, role: 'admin' };
}

module.exports = { login, register, adminLogin };
