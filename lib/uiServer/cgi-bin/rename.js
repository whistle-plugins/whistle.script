
module.exports = function () {
  const body = this.request.body;
  const name = body.name;
  const newName = body.newName;
  if (name && newName) {
    this.storage.renameFile(name, newName);
    this.scripts.set(newName, this.scripts.get(name));
    this.scripts.remove(name);
  }
  this.body = { ec: 0 };
};
