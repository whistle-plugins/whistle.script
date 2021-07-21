
module.exports = (ctx) => {
  const { name, value } = ctx.request.body;
  if (name && typeof name === 'string') {
    ctx.storage.writeFile(name, value);
    ctx.scripts.set(name, value);
  }
  ctx.body = { ec: 0 };
};
