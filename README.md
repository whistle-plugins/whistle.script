# whistle.script

1. 获取钩子方法：
    ``` js
    const getHandlers = async (name) => {
        if (!name) {
            return;
        }
        // 判断 name 是否在配置里面
        // 如果没有
        // 1. 绝对路径，判断该路径是否存在
        return 不存在 ? null : name;

        // 2. 非绝对路径，判断是否在 `${os.homedir()}/whistle_script_modules` 且包含 package.json (main, index.js) （支持通过 w2 exec ism moduleName）
        return 不存在 ? null : path.join(`${os.homedir()}/whistle_script_modules`, name);
    };
    ```
1. 提供钩子
    ``` js
    modules.exports = (options, utils) => {
        // utils.getReqId(); // 获取请求 id
        // utils.getReqSession(); // return promise
        // utils.getSession(); // return promise
        // utils.request(); // 基于 axios 实现，并作为 pluginReq 通过 whistle 转发出去
        // utils.getBody(stream); // 获取请求或响应内容
        // 其它常用工具方法， 构建自己的 whistle 工具库

        return {
            // 1. 请求阶段动态设置规则
            handleReqRules: async (req) => {},
            // 2. 请求阶段异步获取请求信息
            handleReqStats: async (req) => {},
            // 3. 处理请求内容
            handleReqBody: async (req) => {},
            // 4. 处理经过 Whistle 后可能被处理过的请求内容
            handleProcessedReqBody: async (req) => {},
            // 5. 处理 WebSocket 或 Tunnel 的请求帧数据
            handleReqFrame: async (req) => {},
            // 6. 处理经过 Whistle 后可能被处理过的 WebSocket 或 Tunnel 的请求帧数据
            handleProcessedReqFrame: async (req) => {},
            // 7. 响应阶段动态设置规则
            handleResRules: async (res) => {},
            // 8. 响应阶段异步获取响应信息
            handleResStats: async (res) => {},
            // 9. 处理响应内容
            handleResBody: async (res) => {},
            // 10. 处理经过 Whistle 后可能被处理过的响应内容
            handleProcessedResBody: async (res) => {},
            // 11. 处理 WebSocket 或 Tunnel 的响应帧数据
            handleResFrame: async (res) => {},
            // 12. 处理经过 Whistle 后可能被处理过的 WebSocket 或 Tunnel 的响应帧数据
            handleProcessedResFrame: async (res) => {},
        };
    };

    ```
