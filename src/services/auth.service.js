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

module.exports = { login, register };
