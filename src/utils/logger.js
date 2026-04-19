const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (err) => console.error(`[ERROR] ${new Date().toISOString()} -`, err),
};

module.exports = logger;
