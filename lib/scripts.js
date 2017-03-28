const util = require('./util');
const scripts = {};

exports.get = (name) => {
  return scripts[name];
};

exports.set = (name, text) => {
  scripts[name] = util.getScript(text);
  console.log(name, scripts[name])
};

exports.remove = (name) => {
  delete scripts[name];
};
