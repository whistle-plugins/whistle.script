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

   ```
 npm install -g whistle

 # Mac、Linux用户可能需要加sudo

 sudo npm install -g whistle
   ```

3. 安装script插件:

```
npm install -g whistle.script
# Mac、Linux用户可能需要加sudo
sudo npm install -g whistle.script
```

# 使用

打开script插件的界面，创建一个名字为 `test` 的脚本:

1. 可以通过 `Plugins->Home->script`打开或右键并选择 `在新标签页中打开` 
2. 直接访问 [http://local.whistlejs.com/plugin.script](http://local.whistlejs.com/plugin.script/)

效果见图: [whistle.script界面]()

#### 设置规则

1. 设置HTTP或HTTPs请求的[whistle规则](https://avwo.github.io/whistle/rules/)(操作HTTPs需要[开启HTTPs拦截](https://avwo.github.io/whistle/webui/https.html))

   在界面中的`test` 脚本输入(也可以在其它编辑器编辑后再copy进来):

   ```
   exports.handleRequestRules = (ctx) => {
   	// ctx.fullUrl 可以获取请求url
   	// ctx.headers 可以获取请求头
   	// ctx.options 里面包含一些特殊的请求头字段，分别可以获取一些额外信息，如请求方法、设置的规则等
   	ctx.rules = ['www.qq.com file://{test.html}'];
     	ctx.values = { 'test.html': 'Hello world.' };
   };
   ```

   *Note: 如果里面包含一些异步方法可以采用generator函数或async函数，即：`exports.handleRequestRules = function\* (ctx) {}` 或 `exports.handleRequestRules = async () => {}`*

   在whistle的Rules配置界面上输入规则:

   ```
   whistle.script://test www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
   ```

   分别访问[http://www.ifeng.com](http://www.ifeng.com)和[http://www.qq.com](http://www.qq.com)，前者可以正常访问，后者输出 `Hello world.`。

   具体效果见图：[demo1]()

   如果需要通过配置给脚本传递一些额外参数，可以如下配置(注意中间不能有空格):

   ```
   whistle.script://test(a,b,c) www.ifeng.com www.qq.com www.baidu.com echo.websocket.org
   ```

   可以在脚本中通过 `process.args` 获取:

   ```
   exports.handleRequestRules = (ctx) => {
   	console.log(process.args); // output: ["a", "b", "c"]
   	ctx.rules = ['www.qq.com file://{test.html}'];
     	ctx.values = { 'test.html': 'Hello world.' };
   };
   ```

2. 设置WebSocket请求的规则(需要[开启HTTPs拦截](https://avwo.github.io/whistle/webui/https.html)):

   ```
   exports.handleWebSocket = (ctx) => {
     this.rules = '127.0.0.1 echo.websocket.org';
   };
   ```

   接下来的操作同上。

3. 设置Tunnel请求的规则(要测试可以暂时[关闭HTTPs拦截](https://avwo.github.io/whistle/webui/https.html)):

   ```
   exports.handleTunnel = (ctx) => {
     this.rules = '127.0.0.1 www.baidu.com';
   };
   ```

   接下来的操作同上。

#　例子



\# License

[MIT](https://github.com/whistle-plugins/whistle.rules/blob/master/LICENSE)






