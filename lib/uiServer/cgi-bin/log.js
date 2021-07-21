
module.exports = (ctx) => {
  ctx.body = ctx.getLogs(ctx.request.query.id);
};
