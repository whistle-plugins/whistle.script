const scripts = require('./scripts');
const { getContext, getFn } = require('./util');

module.exports = async (req, options) => {
  const ctx = getContext(req);
  const { auth, verify } = scripts.getHandler(ctx);
  const check = getFn(auth, verify);
  return check && check(req, options);
};
