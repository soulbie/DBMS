const ok      = (res, data, msg = 'Success')  => res.status(200).json({ success: true,  message: msg, data });
const created = (res, data, msg = 'Created')  => res.status(201).json({ success: true,  message: msg, data });
const fail    = (res, msg,  code = 400)       => res.status(code).json({ success: false, message: msg, data: null });

module.exports = { ok, created, fail };
