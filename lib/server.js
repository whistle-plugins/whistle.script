const iconv = require('iconv-lite');
const scripts = require('./scripts');
const setupWsServer = require('./wsServer');
const util = require('./util');

module.exports = (server, options) => {
  server.on('request', async (req, res) => {
    if (util.isRemote(req)) {
      return req.passThrough();
    }
    const ctx = util.getContext(req, res);
    ctx.getStreamBuffer = util.getStreamBuffer;
    ctx.getCharset = util.getCharset;
    ctx.isText = util.isText;
    ctx.iconv = iconv;
    ctx.options = options;
    const { handleRequest } = scripts.getHandler(ctx);
    if (!util.isFunction(handleRequest)) {
      return req.passThrough();
    }
    const { dataSource, clearup } = util.getDataSource();
    ctx.dataSource = dataSource;
    try {
      await handleRequest(ctx, req.request);
    } catch (err) {
      clearup();
      req.emit('error', err);
      console.error(err); // eslint-disable-line
    }
  });
  setupWsServer(server, options);
};
