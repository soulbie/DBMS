const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const server = http.createServer(app);

server.listen(config.app.port, () => {
  logger.info(`Server listening on port ${config.app.port} in ${config.app.env} mode`);
});
