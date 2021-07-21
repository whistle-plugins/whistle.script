
module.exports = (ctx) => {
  const { theme } = ctx.request.body;
  if (theme && typeof theme === 'string') {
    ctx.storage.setProperty('theme', theme);
  }
  ctx.body = { ec: 0 };
};
