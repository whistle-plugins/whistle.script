# whistle.script
whistle.script 为 [whistle](https://github.com/avwo/whistle) 的一个扩展脚本插件，可以直接在界面上引用全局安装的Node模块及Node的内容模块编写脚本操作请求及其响应，所有正常 Node 程序可以实现的功能，都可以通过该插件实现，包括：

1. HTTP[s]:
   - 动态设置 [whistle 规则](https://avwo.github.io/whistle/rules/)
   - 拦截请求响应
   - 控制请求响应速度
   - 修改请求url、请求方法、请求头、请求内容
   - 修改响应状态码、响应头、响应内容
   - 在插件界面的Console上显示脚本程序 `console.xxx` 的内容，如果可以打印响应的内容或调试信息等
2. WebSocket:
   - 动态设置 [ whistle 规则](https://avwo.github.io/whistle/rules/)
   - 拦截请求响应
   - 修改发送或收到的数据
   - 直接向 WebSocket 客户端或服务端发送数据
   - 在插件界面的 Console 上显示脚本程序 `console.xxx` 的内容，如果可以打印发送和接收到的数据或调试信息等，从而通过该插件可以直接查看WebSocket的数据
3. Tunnel: 基本功能同 WebSocket，可以用来直接操作 Socket 请求，如 Protobuf 协议的请求等

# 安装

1. 安装Node: [官网下载安装最新版本(LTS和Stable都可以)](https://nodejs.org/)
2. 安装最新版的 [whistle](https://github.com/avwo/whistle)。
``` sh
  npm install -g whistle
```
   > Mac 或 Linux 用户可能需要加 sudo：`sudo npm install -g whistle`

3. 安装 script 插件:
``` sh
  w2 i whistle.script
```

# 使用

打开script插件的界面，创建一个名字为 `test` 的脚本:

1. 可以通过 `Plugins -> Home -> script` 打开或右键并选择 `在新标签页中打开` 
2. 直接访问 [http://local.whistlejs.com/plugin.script](http://local.whistlejs.com/plugin.script/)

 ![whistle.script 界面](https://user-images.githubusercontent.com/11450939/126302159-0c533ea7-3bc0-484a-bd30-698d5a7881df.gif)

#### 设置规则

1. 设置 HTTP 或 HTTPS 请求的 [whistle 规则](https://avwo.github.io/whistle/rules/)(操作 HTTPS 需要[开启 HTTPS 拦截](https://avwo.github.io/whistle/webui/https.html))

	在界面中的 `test` 脚本输入(也可以在其它编辑器编辑后再copy进来):
	
		exports.handleRequestRules = (ctx) => {
			// ctx.fullUrl 可以获取请求url
			// ctx.headers 可以获取请求头
			// ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请求方法、设置的规则等
			ctx.rules = ['www.qq.com file://{test.html}'];
		 	ctx.values = { 'test.html': 'Hello world.' };
		};
	
	Note: 如果里面包含一些异步方法可以采用 async 函数，即：`exports.handleRequestRules = async () => {}`
	
	在whistle的Rules配置界面上输入规则:
	
		whistle.script://test www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
	
	分别访问 [http://www.ifeng.com](http://www.ifeng.com) 和 [http://www.qq.com](http://www.qq.com)，前者可以正常访问，后者输出 `Hello world.`。
	
	具体效果见图：[demo1](https://user-images.githubusercontent.com/11450939/126302225-2598772c-d6a3-45e3-97d6-685fbed1ba37.gif)
	
	如果需要通过配置给脚本传递一些额外参数，可以如下配置(注意中间不能有空格):
	
		whistle.script://test(a,b,c) www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
	
	可以在脚本中通过 `process.args` 获取:
	
		exports.handleRequestRules = (ctx) => {
		  console.log(process.args); // output: ["a", "b", "c"]
		  ctx.rules = ['www.qq.com file://{test.html}'];
		  ctx.values = { 'test.html': 'Hello world.' };
		};

2. 设置WebSocket请求的规则(需要[开启 HTTPS 拦截](https://avwo.github.io/whistle/webui/https.html)):

		exports.handleWebSocketRules = (ctx) => {
		  // ctx.fullUrl 可以获取请求url
		  // ctx.headers 可以获取请求头
		  // ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请求方法、设置的规则等
		  this.rules = '127.0.0.1 echo.websocket.org';
		};

	接下来的操作同上。

3. 设置Tunnel请求的规则(要测试可以暂时[关闭 HTTPS 拦截](https://avwo.github.io/whistle/webui/https.html)):

		exports.handleTunnel = (ctx) => {
		  // ctx.fullUrl 可以获取请求url
		  // ctx.headers 可以获取请求头
		  // ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请求方法、设置的规则等
		  this.rules = '127.0.0.1 www.baidu.com';
		};


	接下来的操作同上。

#### 操作请求

1. 操作HTTP或 HTTPS 请求(操作 HTTPS 需要[开启 HTTPS 拦截](https://avwo.github.io/whistle/webui/https.html))
	``` js
	exports.handleRequest = (ctx, request) => {
		// ctx.fullUrl 可以获取请求url
		// ctx.headers 可以获取请求头
		// ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请设置的规则等
		// ctx.method 获取和设置请求方法
		// ctx.req
		// ctx.res
		const {req, res} = ctx;
		const client = request((svrRes) => {
			// 由于内容长度可能有变，删除长度自动改成 chunked
			delete svrRes.headers['content-length'];
			delete req.headers['accept-encoding'];
			let body;
			svrRes.on('data', (data) => {
				body = body ? Buffer.concat([body, data]) : data;
			});
			svrRes.on('end', () => {
				try {
					// 获取到服务器返回体json格式，进行你想要的处理
					const jsonBody = JSON.parse(body.toString())
					const wrappedBody = {
						code: body.code || svrRes.statusCode,
						result: jsonBody
					}
					res.end(Buffer.from(JSON.stringify(wrappedBody)))
				} catch(e) {
					res.end(body);
				}      
			});
		});
		req.pipe(client);
	};
	```
	在whistle的Rules配置界面上输入规则:
	``` txt
	# 这里不能用whistle.script，否则请求不会转发到handleRequest
	# whistle.script只会执行handleXxxRules
	# 你也可以通过在handleXxxRules里面设置 script://test(a,b,c)，实现转发
	script://test www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
	```
	分别访问[http://www.ifeng.com](http://www.ifeng.com)和[http://www.qq.com](http://www.qq.com)，可以在script的界面中的Consle看到打印出来的请求的url、响应状态吗和头部。

	具体效果见图：[demo2](https://user-images.githubusercontent.com/11450939/126302210-e3aa0b56-9001-4e03-83c8-8986d8f544ff.gif)

	需要在配置中带上参数，可以参考上面的规则设置
2. 操作 WebSocket 请求(需要[开启 HTTPS 拦截](https://avwo.github.io/whistle/webui/https.html))
	``` js
	exports.handleWebSocket = async (socket, connect) => {
		// 与服务器建立连接
		const svrSocket = await connect();
		// 客户端 pong 服务端
		socket.on('pong', (data) => {
			svrSocket.pong(data);
		});
		// 客户端 ping 服务pong 端
		socket.on('ping', (data) => {
			svrSocket.ping(data);
		});
		// 服务端 ping 客户端
		svrSocket.on('ping', (data) => {
			socket.ping(data);
		});
		// 服务端 pong 客户端
		svrSocket.on('pong', (data) => {
			socket.pong(data);
		});
		// 正常断开 WebSocket 连接
		socket.on('disconnect', (code, message, opts) => {
			console.log(code, 'client disconnect');
			svrSocket.disconnect(code, opts);
		});
		// 正常断开 WebSocket 连接
		svrSocket.on('disconnect', (code, message, opts) => {
			console.log(code, 'server disconnect');
			socket.disconnect(code, opts);
		});
		// 获取客户端解析后的帧数据
		socket.on('message', (data, opts) => {
			console.log(data, 'client data');
			svrSocket.send(data, opts);
		});
		// 获取服务端解析后的帧数据
		svrSocket.on('message', (data, opts) => {
			console.log(data, 'server data');
			socket.send(data, opts);
		});
	};
	
	```

		whistle规则配置同上，访问[https://www.websocket.org/echo.html](https://www.websocket.org/echo.html)，点击下面的connect按钮及send按钮，可以如下效果：[demo3](https://user-images.githubusercontent.com/11450939/126302243-26c8b4af-851c-4b00-87b9-3286e9e67251.gif)
3. 操作Tunnel请求
	``` js
	exports.handleTunnel = async (socket, connect) => {
		const svrSocket = await connect();
		socket.pipe(svrSocket).pipe(socket);
	};
	```
	whistle规则配置同上

4. 鉴权
插件 `v1.2.0` 版本开始支持自定义鉴权方法（要求 Whistle 版本 >= `v2.7.16`）：
``` js
exports.auth = async (req, options) => {
	// 给请求添加自定义头，必须与 `x-whistle-` 开头
	// 这样可以在插件的其他 hook 里面获取到该请求头（除了 http 请求的 reqRead 钩子）
	req.setHeader('x-whistle-test', '1111111111');
	// return false; // 直接返回 403
};
```

5. pipe
插件 `v1.2.1` 版本开始支持自定义 pipe 方法：
``` js

exports.handleReqRead = (req, res, options) => {
  req.pipe(res);
};

exports.handleReqWrite = (req, res, options) => {
  req.pipe(res);
};

exports.handleResRead = (req, res, options) => {
  req.pipe(res);
};

exports.handleResWrite = (req, res, options) => {
  req.pipe(res);
};

exports.handleWsReqRead = (req, res, options) => {
  req.pipe(res);
};

exports.handleWsReqWrite = (req, res, options) => {
  req.pipe(res);
};

exports.handleWsResRead = (req, res, options) => {
  req.pipe(res);
};

exports.handleWsResWrite = (req, res, options) => {
  req.pipe(res);
};

exports.handleTunnelReqRead = (req, res, options) => {
  req.pipe(res);
};

exports.handleTunnelReqWrite = (req, res, options) => {
  req.pipe(res);
};

exports.handleTunnelResRead = (req, res, options) => {
  req.pipe(res);
};

exports.handleTunnelResWrite = (req, res, options) => {
  req.pipe(res);
};

```

# 如何引入第三方模块
使用绝对路径引入，如假设你的模块安装路径为 `/Users/test/node_modules/xxx`，则可以在脚本里面通过 `require('/Users/test/node_modules/xxx')` 引入。

# License

[MIT](./LICENSE)

