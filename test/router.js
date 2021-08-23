/* eslint-disable no-console */
module.exports = (router) => {
  router.get('/auth2', (ctx) => {
    ctx.body = { auth: false };
  });
  router.get('/auth', (ctx) => {
    ctx.body = {
      headers: {
        'x-whistle-test': '222222',
      },
    };
  });
  router.get('/req-rules', (ctx) => {
    ctx.body = {
      rules: '* file://(hello)',
    };
  });
  router.get('/res-rules', (ctx) => {
    ctx.body = {
      rules: '* status://666',
    };
  });
  router.get('/stats', (ctx) => {
    console.log(ctx.headers);
    ctx.body = '';
  });
  router.post('/data', (ctx) => {
    const { req } = ctx;
    let body;
    req.on('data', (chunk) => {
      body = body ? Buffer.concat([chunk, body]) : chunk;
    });
    req.on('end', () => {
      console.log(body && JSON.parse(body.toString()));
    });
    ctx.body = '';
  });
};
