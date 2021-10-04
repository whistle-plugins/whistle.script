const scripts = require('./scripts');
const { getRemoteUrl, getContext, getFn, request, SNI_URL, isRemote } = require('./util');

module.exports = async (req, options) => {
  if (!isRemote(req)) {
    const ctx = getContext(req);
    const { sniCallback, SNICallback } = scripts.getHandler(ctx);
    const sniCb = getFn(sniCallback, SNICallback);
    return sniCb && sniCb(req, options);
  }
  const sniUrl = getRemoteUrl(req, SNI_URL);
  if (sniUrl) {
    const result = await request(sniUrl, req.headers);
    return (result === false || result.cert === false) ? false : result;
  }
};
