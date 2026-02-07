# 🧩 whistle.script - 脚本扩展插件

中文 · [English](./README-en_US.md)

> 环境要求：Whistle 版本需为 2.10.0 或更高。

whistle.script 是 [Whistle](https://github.com/avwo/whistle) 的脚本扩展插件。通过在 Web 界面编写 Node.js 脚本，您可以为 Whistle 注入动态逻辑，实现对网络请求、响应及 WebSocket 等协议的**编程式深度控制**。

## 🎯 核心功能

### HTTP/HTTPS 处理
- **动态规则生成** - 根据请求URL、头部等信息，实时生成并注入 Whistle 匹配规则。
- **请求/响应拦截与修改** - 完整拦截 HTTP(S) 请求流与响应流，支持修改 URL、方法、头部、状态码及响应体。
- **调试与日志** - 脚本内的 `console.log` 等输出会实时显示在插件控制台中，便于调试。

### WebSocket 处理
- **双向通信拦截** - 拦截客户端与服务器之间的 WebSocket 握手及数据帧。
- **消息动态处理** - 实时查看、修改或转发 `ping`、`pong`、`message` 及控制帧。
- **直接数据发送** - 可主动向任一端发送数据或断开连接。

### Tunnel / 原始 Socket 处理
- **透明管道操作** - 处理如 HTTPS 隧道等原始 TCP 连接，实现底层数据流转发或修改。
- **灵活性高** - 提供与 WebSocket 类似的 API，用于处理非 HTTP 协议。

## 📦 安装指南

### 1. 安装 Whistle 运行时
**推荐方式（桌面用户）**：下载并安装可视化客户端，管理更便捷。  
👉 [Whistle 客户端下载](https://github.com/avwo/whistle-client)

**命令行方式**：
1.  **安装 Node.js (>= 8.8)**  
    请从 [Node.js 官网](https://nodejs.org/) 下载并安装最新的 LTS 版本。
2.  **全局安装 Whistle**
    ```bash
    npm install -g whistle
    ```
    > **提示**：若安装过程提示权限不足，可尝试使用 `sudo`（不推荐）或参考官方文档配置 npm 全局安装路径。

### 2. 安装 whistle.script 插件
在 Whistle 运行后，执行以下命令：
```bash
w2 i whistle.script
```
**或通过管理界面安装**：
1.  启动 Whistle 并打开管理界面（默认为 `http://127.0.0.1:8899`）。
2.  进入 **Plugins** 页面。
3.  点击顶部的 `Install` 按钮。
4.  输入 `whistle.script` 并确认安装。

## 🚀 快速开始

### 1. 打开插件界面
-   在 Whistle 管理界面，通过菜单 `Plugins -> script` 进入。
-   或直接访问地址：[http://local.whistlejs.com/plugin.script/](http://local.whistlejs.com/plugin.script/)。

### 2. 创建并关联你的第一个脚本
1.  在插件界面点击 **Create**，创建一个名为 `test` 的脚本。
2.  在右侧编辑器中，输入以下示例代码：
    ```javascript
    exports.handleRequestRules = (ctx) => {
        console.log('收到请求：', ctx.fullUrl);
        ctx.rules = ['www.example.com 127.0.0.1:8080']; // 将请求转发到本地8080端口
    };
    ```
3.  在 Whistle 的 **Rules** 配置页面，添加规则：
    ```txt
    www.example.com whistle.script://test
    ```
4.  现在，访问 `http://www.example.com` 的请求将被脚本处理，并可在插件 **Console** 标签页查看日志。

![插件界面操作演示](https://user-images.githubusercontent.com/11450939/126302159-0c533ea7-3bc0-484a-bd30-698d5a7881df.gif)

## 📖 功能详解

### 1. 规则动态设置
此模式允许脚本根据请求信息，动态返回需要执行的 Whistle 规则（字符串或数组），规则会与 `whistle.script://` 配置的原始规则合并执行。

#### HTTP/HTTPS 规则
> **重要**：如需拦截 HTTPS 请求，须先[开启并安装 Whistle 的 HTTPS 根证书](https://wproxy.org/docs/gui/https.html)。

**脚本示例 (`test`)**：
```javascript
exports.handleRequestRules = (ctx) => {
    // 根据请求路径动态返回本地文件
    if (ctx.fullUrl.includes('/api/test')) {
        ctx.rules = ['api.example.com/api/test file://{mockData.json}'];
        ctx.values = {
            'mockData.json': JSON.stringify({ code: 200, data: 'mocked' })
        };
    }
};
```
**Whistle 规则配置**：
```txt
# 将多个域名的请求交给 `test` 脚本处理
whistle.script://test www.test.com api.example.com
```

#### 向脚本传递参数
可以在规则中向脚本传递参数（参数内请避免使用空格）。
```txt
whistle.script://test(prod,env1) www.example.com
```
脚本内通过以下方式获取：
```javascript
exports.handleRequestRules = (ctx) => {
    console.log(process.args); // 输出：["prod", "env1"]
    console.log(ctx.scriptValue); // 输出 (v1.3.0+)："prod,env1"
    // 可根据参数执行不同逻辑
    ctx.rules = 'www.test.com 127.0.0.1:8080';
};
```

#### WebSocket 规则设置
```javascript
exports.handleWebSocketRules = (ctx) => {
    // 动态决定哪些 WebSocket 连接需要被本插件处理
    this.rules = 'echo.websocket.org statusCode://101';
};
```

### 2. 请求与响应的直接操作
此模式赋予脚本对网络流量的完全控制权，可以手动发起请求、读取和修改数据。

#### HTTP/HTTPS 请求处理
使用 `script://` 协议触发此模式。

```javascript
exports.handleRequest = (ctx, request) => {
    const { req, res } = ctx;
    
    req.passThrough({
        // 可选
        transformReq: function(req, next) {
          // getBuffer, getText, getJson 都可以用来获取请求体，参数和回调函数的用法也完全一样
          req.getJson(function(err, data) {
            if (err) {
              return next();
            }
            // data.a.b.c = 'test';
            next(JSON.stringify(data));
          });
        },
        // 可选
        transformRes: function(svrRes, next) {
          // getBuffer, getText, getJson 都可以用来获取请求体，参数和回调函数的用法也完全一样
          svrRes.getText(function(err, text) {
            if (err) {
              return next();
            }
            next('[' + text + ', 123' + ']');
          });
        }
      });
};
```
**关联规则**：
```txt
# 注意：此处使用 script:// 触发 handleRequest 方法
www.example.com/api script://test
```

#### WebSocket 连接处理
```javascript
exports.handleWebSocket = async (socket, connect) => {
    console.log('WebSocket 连接已建立');
    
    // 连接到原始后端服务器
    const serverSocket = await connect();
    
    // 监听客户端消息，转发至服务器
    socket.on('message', (data, opts) => {
        console.log('<< 来自客户端:', data);
        // 可在此处修改 data
        serverSocket.send(`[中转] ${data}`, opts);
    });
    
    // 监听服务器消息，转发至客户端
    serverSocket.on('message', (data, opts) => {
        console.log('>> 来自服务器:', data);
        socket.send(data, opts);
    });
    
    // 处理连接关闭
    socket.on('disconnect', (code, reason) => {
        console.log(`客户端断开连接 [${code}]: ${reason}`);
        serverSocket.disconnect(code, reason);
    });
};
```

#### Tunnel (原始TCP) 处理

用于处理 `CONNECT` 方法建立的隧道（如 HTTPS）。
```javascript
exports.handleTunnel = async (clientSocket, connect) => {
    const targetSocket = await connect();
    // 建立双向透明管道
    clientSocket.pipe(targetSocket).pipe(clientSocket);
    
    // 可监听 data 事件进行更底层的二进制数据操作
};
```

### 3. 高级功能

#### 请求鉴权 (`auth`)
在请求进入其他处理阶段前，进行身份验证。
```javascript
exports.auth = async (req, options) => {
    const token = req.headers['x-auth-token'];
    // 1. 添加内部透传头 (以 x-whistle- 开头)
    req.setHeader('x-whistle-req-id', Date.now());
    
    // 2. 进行异步验证
    // const isValid = await verifyToken(token);
    // return isValid; // 返回 false 将直接响应 403 Forbidden
    
    // 3. 默认允许通过
    return true;
};
```

#### 管道钩子 (Pipe Hooks)
在请求/响应的不同生命周期阶段进行轻量拦截。
```javascript
// 在请求体被 Whistle 规则引擎读取前处理
exports.handleReqRead = (req, res, options) => {
    // 可用于记录原始请求体或进行早期修改
    req.pipe(res); // 通常直接管道传输
};

// 在请求体被 Whistle 规则引擎处理后、发送到目标服务器前处理
exports.handleReqWrite = (req, res, options) => {
    // 可用于基于规则结果进行最终修改
    req.pipe(res);
};
// 类似钩子：handleResRead, handleResWrite, handleWsReqRead 等
```

## 🔗 更多资源
- [Whistle 核心文档](https://wproxy.org/)
- [Whistle 规则配置语法](https://wproxy.org/docs/rules/rule.html)
- [Whistle GitHub 仓库](https://github.com/avwo/whistle)
- [插件开发类型定义参考](https://github.com/avwo/lack/blob/master/assets/ts/src/types/global.d.ts)

## 📄 许可证
本项目基于 [MIT License](./LICENSE) 开源。
