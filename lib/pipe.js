const iconv = require('iconv-lite');
const scripts = require('./scripts');
const util = require('./util');

const getHandlerName = (name) => {
  return `handle${name[0].toUpperCase()}${name.substring(1)}`;
};

module.exports = (name) => {
  const eventName = name[0] === 'r' ? 'request' : 'connect';
  return (server, options) => {
    options = Object.assign({
      getCharset: util.getCharset,
      isText: util.isText,
      iconv,
    }, options);
    server.on(eventName, async (req, res) => {
      const oReq = req.originalReq;
      oReq.ruleValue = oReq.ruleValue || oReq.pipeValue;
      const handleRequest = scripts.getHandler({ req })[getHandlerName(name)];
      if (!util.isFunction(handleRequest)) {
        return req.pipe(res);
      }
      try {
        await handleRequest(req, res, options);
      } catch (err) {
        req.emit('error', err);
        console.error(err); // eslint-disable-line
      }
    });
  };
};
