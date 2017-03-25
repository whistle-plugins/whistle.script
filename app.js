const http = require('http');
const startUIServer = require('./lib').uiServer;

const server = http.createServer().listen(9999);
startUIServer(server, {});
