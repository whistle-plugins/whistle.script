
module.exports = (ctx) => {
  const { name } = ctx.request.body;
  if (name && typeof name === 'string') {
    ctx.storage.removeFile(name);
    ctx.scripts.remove(name);
  }
  ctx.body = { ec: 0 };
};
