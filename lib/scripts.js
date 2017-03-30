const util = require('./util');

const scripts = {};

exports.get = (name) => {
  return scripts[name];
};

const set = (name, text) => {
  scripts[name] = typeof text === 'string' ? util.getScript(text) : text;
};
exports.set = set;

exports.remove = (name) => {
  delete scripts[name];
};

exports.load = (storage) => {
  storage.getFileList().forEach(({ name, data }) => {
    set(name, data);
  });
};
