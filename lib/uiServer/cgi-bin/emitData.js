/* eslint-disable no-empty */
module.exports = (ctx) => {
  let { type, args } = ctx.request.body;
  if (args && type && typeof type === 'string') {
    try {
      args = JSON.parse(args);
      if (Array.isArray(args)) {
        const { dataSource } = ctx;
        dataSource.emit('data', type, args);
      }
    } catch (e) {}
  }
  ctx.body = { ec: 0 };
};
