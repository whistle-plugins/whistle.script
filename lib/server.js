const iconv = require('iconv-lite');
const scripts = require('./scripts');
const setupWsServer = require('./wsServer');
const util = require('./util');

module.exports = (server, options) => {
  server.on('request', async (req, res) => {
    const fullUrl = req.originalReq.url;
    const ctx = {
      iconv,
      req,
      res,
      options,
      fullUrl,
      url: fullUrl,
      headers: req.headers,
      method: req.method,
      getStreamBuffer: util.getStreamBuffer,
      getCharset: util.getCharset,
      isText: util.isText,
    };
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
    }
  });
  setupWsServer(server, options);
};
