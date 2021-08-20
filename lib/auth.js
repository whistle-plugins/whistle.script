const scripts = require('./scripts');
const { getRemoteUrl, getContext, getFn, noop, request, AUTH_URL, STATS_URL, DATA_URL, isRemote } = require('./util');

module.exports = async (req, options) => {
  if (!isRemote(req)) {
    const ctx = getContext(req);
    const { auth, verify } = scripts.getHandler(ctx);
    const check = getFn(auth, verify);
    return check && check(req, options);
  }
  const authUrl = getRemoteUrl(req, AUTH_URL);
  if (authUrl) {
    const { auth, headers } = await request(authUrl, req.headers);
    if (auth === false) {
      return false;
    }
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req.set(key, headers[key]);
      });
    }
    return;
  }
  const statsUrl = getRemoteUrl(req, STATS_URL);
  const dataUrl = getRemoteUrl(req, DATA_URL);
  if (statsUrl) {
    request(statsUrl, req.headers).then(noop);
  }
  if (dataUrl) {
    req.getSession((session) => {
      if (session) {
        request(statsUrl, req.headers, session).then(noop);
      }
    });
  }
};
