const util = require('./util');
const scripts = require('./scripts');
/* eslint-disable no-empty */

module.exports = (server, options) => {
  server.on('connect', async (req, socket) => {
    const { url, headers } = req;
    socket.headers = headers;
    socket.options = options;
    const { handleTunnel } = scripts.getHandler(socket);
    if (!util.isFunction(handleTunnel)) {
      return req.passThrough();
    }
    const { dataSource, clearup } = util.getDataSource();
    socket.req = req;
    socket.dataSource = dataSource;
    socket.url = url;
    socket.on('error', clearup);
    socket.on('close', clearup);
    const connect = (opts) => {
      return new Promise((resolve, reject) => {
        const client = req.connect(opts, resolve) || req;
        client.on('error', reject);
      });
    };
    try {
      await handleTunnel(socket, connect);
    } catch (err) {
      socket.emit('error', err);
    }
  });
};
