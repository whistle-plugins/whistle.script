
module.exports = (ctx) => {
  const { storage } = ctx;
  /* eslint-disable prefer-arrow-callback */
  ctx.body = {
    list: storage.getFileList().map((item) => {
      return { name: item.name, value: item.data };
    }),
    activeName: storage.getProperty('activeName'),
    fontSize: storage.getProperty('fontSize'),
    showLineNumbers: storage.getProperty('showLineNumbers') !== false,
    theme: storage.getProperty('theme'),
  };
};
