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



# 使用



# API



#　例子



\# License

[MIT](https://github.com/whistle-plugins/whistle.rules/blob/master/LICENSE)






