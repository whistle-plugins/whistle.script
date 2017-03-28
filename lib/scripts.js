const util = require('./util');
const scripts = {};

exports.get = (name) => {
  return scripts[name];
};

exports.set = (name, text) => {
  scripts[name] = typeof text === 'string' ? util.getScript(text) : text;
};

exports.remove = (name) => {
  delete scripts[name];
};
