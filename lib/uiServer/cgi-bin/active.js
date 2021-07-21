
module.exports = (ctx) => {
  const { name } = ctx.request.body;
  if (name && typeof name === 'string') {
    ctx.storage.setProperty('activeName', name);
  }
  ctx.body = { ec: 0 };
};
