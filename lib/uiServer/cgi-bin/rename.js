
module.exports = (ctx) => {
  const { name, newName } = ctx.request.body;
  if (name && newName) {
    ctx.storage.renameFile(name, newName);
    ctx.scripts.set(newName, ctx.scripts.get(name));
    ctx.scripts.remove(name);
  }
  ctx.body = { ec: 0 };
};
