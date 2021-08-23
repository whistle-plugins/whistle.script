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
      rules: '* reqHeaders://(hello=2222rrrrr)',
    };
  });
  router.get('/res-rules', (ctx) => {
    ctx.body = {
      rules: '* status://666 resHeaders://x-test=3333333',
    };
  });
  router.post('/stats', (ctx) => {
    const { req } = ctx;
    let body;
    req.on('data', (chunk) => {
      body = body ? Buffer.concat([body, chunk]) : chunk;
    });
    req.on('end', () => {
      try {
        body = body && JSON.parse(body.toString());
      } catch (e) {
        console.log(e, '===========');
      }
    });
    ctx.body = '';
  });
  router.post('/data', (ctx) => {
    const { req } = ctx;
    let body;
    req.on('data', (chunk) => {
      body = body ? Buffer.concat([body, chunk]) : chunk;
    });
    req.on('end', () => {
      try {
        body = body && JSON.parse(body.toString());
      } catch (e) {
        console.log(e);
      }
    });
    ctx.body = '';
  });
};
