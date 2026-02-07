# 🧩 whistle.script - Script Extension Plugin

[中文](./README.md) · English

> Environment Requirement: Whistle version must be 2.10.0 or higher.

whistle.script is a script extension plugin for [Whistle](https://github.com/avwo/whistle). By writing Node.js scripts in the Web interface, you can inject dynamic logic into Whistle, achieving **programmatic deep control** over network requests, responses, and protocols like WebSocket.

## 🎯 Core Features

### HTTP/HTTPS Processing
- **Dynamic Rule Generation** - Generate and inject Whistle matching rules in real-time based on request URL, headers, and other information.
- **Request/Response Interception & Modification** - Fully intercept HTTP(S) request and response streams, supporting modification of URL, method, headers, status code, and response body.
- **Debugging & Logging** - Outputs from `console.log` within scripts are displayed in the plugin console in real-time, facilitating debugging.

### WebSocket Processing
- **Bidirectional Communication Interception** - Intercept WebSocket handshakes and data frames between client and server.
- **Dynamic Message Processing** - View, modify, or forward `ping`, `pong`, `message`, and control frames in real-time.
- **Direct Data Transmission** - Can actively send data to or disconnect from either end.

### Tunnel / Raw Socket Processing
- **Transparent Pipeline Operation** - Handle raw TCP connections like HTTPS tunnels, enabling low-level data stream forwarding or modification.
- **High Flexibility** - Provides an API similar to WebSocket for handling non-HTTP protocols.

## 📦 Installation Guide

### 1. Install the Whistle Runtime
**Recommended Method (Desktop Users)**: Download and install the visual client for easier management.  
👉 [Whistle Client Download](https://github.com/avwo/whistle-client)

**Command Line Method**:
1.  **Install Node.js (>= 8.8)**  
    Download and install the latest LTS version from the [Node.js official website](https://nodejs.org/).
2.  **Install Whistle Globally**
    ```bash
    npm install -g whistle
    ```
    > **Note**: If you encounter permission issues during installation, you can try using `sudo` (not recommended) or refer to the official documentation to configure the npm global installation path.

### 2. Install the whistle.script Plugin
After Whistle is running, execute the following command:
```bash
w2 i whistle.script
```
**Or install via the Management Interface**:
1.  Start Whistle and open the management interface (default is `http://127.0.0.1:8899`).
2.  Go to the **Plugins** page.
3.  Click the `Install` button at the top.
4.  Enter `whistle.script` and confirm installation.

## 🚀 Quick Start

### 1. Open the Plugin Interface
-   In the Whistle management interface, navigate via the menu `Plugins -> script`.
-   Or directly visit: [http://local.whistlejs.com/plugin.script/](http://local.whistlejs.com/plugin.script/).

### 2. Create and Associate Your First Script
1.  Click **Create** in the plugin interface to create a script named `test`.
2.  In the editor on the right, enter the following sample code:
    ```javascript
    exports.handleRequestRules = (ctx) => {
        console.log('Request received:', ctx.fullUrl);
        ctx.rules = ['www.example.com 127.0.0.1:8080']; // Forward request to local port 8080
    };
    ```
3.  In Whistle's **Rules** configuration page, add the rule:
    ```txt
    www.example.com whistle.script://test
    ```
4.  Now, requests to `http://www.example.com` will be processed by the script, and logs can be viewed in the plugin's **Console** tab.

![Plugin Interface Operation Demo](https://user-images.githubusercontent.com/11450939/126302159-0c533ea7-3bc0-484a-bd30-698d5a7881df.gif)

## 📖 Feature Details

### 1. Dynamic Rule Setting
This mode allows the script to dynamically return the Whistle rules (string or array) to be executed based on request information. These rules will be merged and executed with the original rules configured via `whistle.script://`.

#### HTTP/HTTPS Rules
> **Important**: To intercept HTTPS requests, you must first [enable and install Whistle's HTTPS root certificate](https://wproxy.org/docs/gui/https.html).

**Script Example (`test`)**:
```javascript
exports.handleRequestRules = (ctx) => {
    // Dynamically return a local file based on the request path
    if (ctx.fullUrl.includes('/api/test')) {
        ctx.rules = ['api.example.com/api/test file://{mockData.json}'];
        ctx.values = {
            'mockData.json': JSON.stringify({ code: 200, data: 'mocked' })
        };
    }
};
```
**Whistle Rule Configuration**:
```txt
# Handles requests for multiple domains to the `test` script
whistle.script://test www.test.com api.example.com
```

#### Passing Parameters to Scripts
You can pass parameters to scripts within rules (avoid spaces within parameters).
```txt
whistle.script://test(prod,env1) www.example.com
```
Access them within the script as follows:
```javascript
exports.handleRequestRules = (ctx) => {
    console.log(process.args); // Output: ["prod", "env1"]
    console.log(ctx.scriptValue); // Output (v1.3.0+): "prod,env1"
    // Execute different logic based on parameters
    ctx.rules = 'www.test.com 127.0.0.1:8080';
};
```

#### WebSocket Rule Setting
```javascript
exports.handleWebSocketRules = (ctx) => {
    // Dynamically decide which WebSocket connections should be processed by this plugin
    this.rules = 'echo.websocket.org statusCode://101';
};
```

### 2. Direct Manipulation of Requests and Responses
This mode grants the script full control over network traffic, allowing it to manually initiate requests, read, and modify data.

#### HTTP/HTTPS Request Handling
Trigger this mode using the `script://` protocol.

```javascript
exports.handleRequest = (ctx, request) => {
    const { req, res } = ctx;
    
    req.passThrough({
        // Optional
        transformReq: function(req, next) {
          // getBuffer, getText, getJson can all be used to get the request body, with the same parameter and callback usage
          req.getJson(function(err, data) {
            if (err) {
              return next();
            }
            // data.a.b.c = 'test';
            next(JSON.stringify(data));
          });
        },
        // Optional
        transformRes: function(svrRes, next) {
          // getBuffer, getText, getJson can all be used to get the request body, with the same parameter and callback usage
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
**Association Rule**:
```txt
# Note: Use script:// here to trigger the handleRequest method
www.example.com/api script://test
```

#### WebSocket Connection Handling
```javascript
exports.handleWebSocket = async (socket, connect) => {
    console.log('WebSocket connection established');
    
    // Connect to the original backend server
    const serverSocket = await connect();
    
    // Listen for client messages, forward to server
    socket.on('message', (data, opts) => {
        console.log('<< From client:', data);
        // Data can be modified here
        serverSocket.send(`[Relay] ${data}`, opts);
    });
    
    // Listen for server messages, forward to client
    serverSocket.on('message', (data, opts) => {
        console.log('>> From server:', data);
        socket.send(data, opts);
    });
    
    // Handle connection closure
    socket.on('disconnect', (code, reason) => {
        console.log(`Client disconnected [${code}]: ${reason}`);
        serverSocket.disconnect(code, reason);
    });
};
```

#### Tunnel (Raw TCP) Handling

Used to handle tunnels established by the `CONNECT` method (e.g., HTTPS).
```javascript
exports.handleTunnel = async (clientSocket, connect) => {
    const targetSocket = await connect();
    // Establish a bidirectional transparent pipeline
    clientSocket.pipe(targetSocket).pipe(clientSocket);
    
    // Can listen to the data event for lower-level binary data operations
};
```

### 3. Advanced Features

#### Request Authentication (`auth`)
Perform identity verification before a request enters other processing stages.
```javascript
exports.auth = async (req, options) => {
    const token = req.headers['x-auth-token'];
    // 1. Add internal passthrough headers (starting with x-whistle-)
    req.setHeader('x-whistle-req-id', Date.now());
    
    // 2. Perform asynchronous verification
    // const isValid = await verifyToken(token);
    // return isValid; // Returning false will directly respond with 403 Forbidden
    
    // 3. Allow to pass by default
    return true;
};
```

#### Pipeline Hooks
Perform lightweight interception at different lifecycle stages of request/response.
```javascript
// Process before the request body is read by the Whistle rule engine
exports.handleReqRead = (req, res, options) => {
    // Can be used to log the original request body or perform early modifications
    req.pipe(res); // Usually direct pipe transmission
};

// Process after the request body is processed by the Whistle rule engine, before being sent to the target server
exports.handleReqWrite = (req, res, options) => {
    // Can be used for final modifications based on rule results
    req.pipe(res);
};
// Similar hooks: handleResRead, handleResWrite, handleWsReqRead, etc.
```

## 🔗 More Resources
- [Whistle Core Documentation](https://wproxy.org/)
- [Whistle Rule Configuration Syntax](https://wproxy.org/docs/rules/rule.html)
- [Whistle GitHub Repository](https://github.com/avwo/whistle)
- [Plugin Development Type Definition Reference](https://github.com/avwo/lack/blob/master/assets/ts/src/types/global.d.ts)

## 📄 License
This project is open source under the [MIT License](./LICENSE).
