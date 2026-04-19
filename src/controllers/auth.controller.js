const authService = require('../services/auth.service');
const { ok, created } = require('../utils/response');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đủ email và mật khẩu' });
  }
  const result = await authService.login(email, password);
  return ok(res, result, 'Đăng nhập thành công');
};

exports.register = async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin bắt buộc' });
  }
  const result = await authService.register(req.body);
  return created(res, result, 'Đăng ký thành công');
};
