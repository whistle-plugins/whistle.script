const scripts = require('./scripts');
const { getRemoteUrl, getContext, getFn, request, SNI_URL, isSni } = require('./util');

module.exports = async (req, options) => {
  if (!isSni(req)) {
    const oReq = req.originalReq;
    oReq.ruleValue = oReq.sniValue || oReq.ruleValue;
    const ctx = getContext(req);
    const { sniCallback, SNICallback } = scripts.getHandler(ctx);
    const sniCb = getFn(sniCallback, SNICallback);
    return sniCb && sniCb(req, options);
  }
  const sniUrl = getRemoteUrl(req, SNI_URL);
  if (sniUrl) {
    const result = await request(sniUrl, req.headers);
    if (result === false || result.cert === false) {
      return false;
    }
    if (result === true || result.cert === true) {
      return true;
    }
    return result;
  }
};
