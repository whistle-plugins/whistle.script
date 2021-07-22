
function getKey(key) {
  return 'whistle.script/' + key;
}

exports.get = function(key) {
  try {
    return window.localStorage.getItem(getKey(key));
  } catch (e) {}
};

exports.remove = function(key) {
  try {
    return window.localStorage.removeItem(getKey(key));
  } catch (e) {}
};

exports.set = function(key, value) {
  try {
    return window.localStorage.setItem(getKey(key), String(value || ''));
  } catch (e) {}
};
