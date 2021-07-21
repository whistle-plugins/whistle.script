
module.exports = (ctx) => {
  const { showLineNumbers } = ctx.request.body;
  ctx.storage.setProperty('showLineNumbers', showLineNumbers === '1');
  ctx.body = { ec: 0 };
};
