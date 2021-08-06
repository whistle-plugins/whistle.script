# whistle.script
whistle.script为[whistle](https://github.com/avwo/whistle)的一个扩展脚本插件，可以直接在界面上引用全局安装的Node模块及Node的内容模块编写脚本操作请求及其响应，所有正常Node程序可以实现的功能，都可以通过该插件实现，包括：

1. HTTP[s]:
   - 动态设置[whistle规则](https://avwo.github.io/whistle/rules/)
   - 拦截请求响应
   - 控制请求响应速度
   - 修改请求url、请求方法、请求头、请求内容
   - 修改响应状态码、响应头、响应内容
   - 在插件界面的Console上显示脚本程序 `console.xxx` 的内容，如果可以打印响应的内容或调试信息等
2. WebSocket:
   - 动态设置[whistle规则](https://avwo.github.io/whistle/rules/)
   - 拦截请求响应
   - 修改发送或收到的数据
   - 直接向WebSocket客户端或服务端发送数据
   - 在插件界面的Console上显示脚本程序 `console.xxx` 的内容，如果可以打印发送和接收到的数据或调试信息等，从而通过该插件可以直接查看WebSocket的数据
3. Tunnel: 基本功能同WebSocket，可以用来直接操作Socket请求，如Protobuf协议的请求等

# 安装

1. 安装Node(>=6): [官网下载安装最新版本(LTS和Stable都可以)](https://nodejs.org/)
2. 安装最新版的[whistle](https://github.com/avwo/whistle)。

		npm install -g whistle
		
		# Mac、Linux用户可能需要加sudo
		sudo npm install -g whistle

3. 安装script插件:

		npm install -g whistle.script
		# Mac、Linux用户可能需要加sudo
		sudo npm install -g whistle.script

# 使用

打开script插件的界面，创建一个名字为 `test` 的脚本:

1. 可以通过 `Plugins->Home->script`打开或右键并选择 `在新标签页中打开` 
2. 直接访问 [http://local.whistlejs.com/plugin.script](http://local.whistlejs.com/plugin.script/)

 ![whistle.script界面](https://user-images.githubusercontent.com/11450939/126302159-0c533ea7-3bc0-484a-bd30-698d5a7881df.gif)

#### 设置规则

1. 设置HTTP或HTTPs请求的[whistle规则](https://avwo.github.io/whistle/rules/)(操作HTTPs需要[开启HTTPs拦截](https://avwo.github.io/whistle/webui/https.html))

	在界面中的`test` 脚本输入(也可以在其它编辑器编辑后再copy进来):
	
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
	
	分别访问[http://www.ifeng.com](http://www.ifeng.com)和[http://www.qq.com](http://www.qq.com)，前者可以正常访问，后者输出 `Hello world.`。
	
	具体效果见图：[demo1](https://user-images.githubusercontent.com/11450939/126302225-2598772c-d6a3-45e3-97d6-685fbed1ba37.gif)
	
	如果需要通过配置给脚本传递一些额外参数，可以如下配置(注意中间不能有空格):
	
		whistle.script://test(a,b,c) www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
	
	可以在脚本中通过 `process.args` 获取:
	
		exports.handleRequestRules = (ctx) => {
		  console.log(process.args); // output: ["a", "b", "c"]
		  ctx.rules = ['www.qq.com file://{test.html}'];
		  ctx.values = { 'test.html': 'Hello world.' };
		};

2. 设置WebSocket请求的规则(需要[开启HTTPs拦截](https://avwo.github.io/whistle/webui/https.html)):

		exports.handleWebSocketRules = (ctx) => {
		  // ctx.fullUrl 可以获取请求url
		  // ctx.headers 可以获取请求头
		  // ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请求方法、设置的规则等
		  this.rules = '127.0.0.1 echo.websocket.org';
		};

	接下来的操作同上。

3. 设置Tunnel请求的规则(要测试可以暂时[关闭HTTPs拦截](https://avwo.github.io/whistle/webui/https.html)):

		exports.handleTunnel = (ctx) => {
		  // ctx.fullUrl 可以获取请求url
		  // ctx.headers 可以获取请求头
		  // ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请求方法、设置的规则等
		  this.rules = '127.0.0.1 www.baidu.com';
		};


	接下来的操作同上。

#### 操作请求

1. 操作HTTP或HTTPs请求(操作HTTPs需要[开启HTTPs拦截](https://avwo.github.io/whistle/webui/https.html))

		exports.handleRequest = async (ctx, next) => {
		  // ctx.fullUrl 可以获取请求url
		  // ctx.headers 可以获取请求头
		  // ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请设置的规则等
		  // ctx.method 获取和设置请求方法
		  // const reqBody = await ctx.getReqBody(); 获取请求body的Buffer数据，如果没有数据返回null
		  // const reqText = await ctx.getReqText();  获取请求body的文本，如果没有返回''
		  // const formData = await ctx.getReqForm(); 获取表单对象，如果不是表单，返回空对象{}
		  // console.log(ctx.method, ctx.headers, reqBody);
		  // ctx.req.body = String| Buffer | Stream | null，修改请求的内容
		  // 只有执行next方法后才可以把正常的请求发送出去
		  // 如果需要自定义请求，可以通过全局的request方法操作
		  // console.log(request); // TODO 
		  // next方法可以设置next({ host, port });
		  const { statusCode, headers } = await next(); 
		  console.log(ctx.fullUrl, statusCode, headers);
		  // const resBody = await ctx.getResBody();
		  // const resText = await ctx.getResText();
		  // ctx.status = 404; 修改响应状态码
		  // ctx.set(headers); 批量修改响应头
		  // ctx.set('x-test', 'abc'); 修改响应头
		  // ctx.body = String| Buffer | Stream | null; 修改响应内容
		};
		
	在whistle的Rules配置界面上输入规则:
	
		# 这里不能用whistle.script，否则请求不会转发到handleRequest
		# whistle.script只会执行handleXxxRules
		# 你也可以通过在handleXxxRules里面设置 script://test(a,b,c)，实现转发
		script://test www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
	
	分别访问[http://www.ifeng.com](http://www.ifeng.com)和[http://www.qq.com](http://www.qq.com)，可以在script的界面中的Consle看到打印出来的请求的url、响应状态吗和头部。
	
	具体效果见图：[demo2](https://user-images.githubusercontent.com/11450939/126302210-e3aa0b56-9001-4e03-83c8-8986d8f544ff.gif)
	
	需要在配置中带上参数，可以参考上面的规则设置

2. 操作WebSocket请求(需要[开启HTTPs拦截](https://avwo.github.io/whistle/webui/https.html))
``` js
exports.handleWebSocket = async (ctx, connect) => {
  const { socket } = ctx;
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
    svrSocket.disconnect(code, message, opts);
  });
  // 正常断开 WebSocket 连接
  svrSocket.on('disconnect', (code, message, opts) => {
    console.log(code, 'server disconnect');
    socket.disconnect(code, message, opts);
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

		exports.handleTunnel = async (req, connect) => {
		 // connect方法可以设置connect({ host, port });
		 const res = await connect();
		 req.pipe(res).pipe(req);
		 // 也可以参考上面操作WebSocket，自己监听data和write方法处理，这样就可以直接修改和打印内容
		};

	whistle规则配置同上

# License

[MIT](https://github.com/whistle-plugins/whistle.script/blob/master/LICENSE)






