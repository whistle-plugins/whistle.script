
module.exports = function () {
  const storage = this.storage;
  this.body = {
    list: storage.getFileList(),
    activeName: storage.getProperty('activeName'),
    fontSize: storage.getProperty('fontSize'),
    showLineNumbers: storage.getProperty('showLineNumbers'),
    theme: storage.getProperty('theme'),
  };
};
