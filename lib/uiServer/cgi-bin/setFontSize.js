
module.exports = (ctx) => {
  const { fontSize } = ctx.request.body;
  if (fontSize && typeof fontSize === 'string') {
    ctx.storage.setProperty('fontSize', fontSize);
  }
  ctx.body = { ec: 0 };
};
