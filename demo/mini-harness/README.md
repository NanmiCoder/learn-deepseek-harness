# mini-harness

一个能跑的最小 Harness，约 350 行。教程里所有代码都来自这里。

它是**自己写的**，不是任何真实项目的源码。目的只有一个：把 Harness 的核心思路用尽可能少的代码讲清楚。

```bash
npm run demo
```

## 里面有什么

```
kernel.ts               内核：插件容器。服务、依赖、事件、作用域回收
loop.ts                 循环：问模型 → 执行工具 → 结果回灌 → 再问
types.ts                几个共用类型
main.ts                 装配单：把零件装到一起跑一遍
plugins/
  history.ts            会话历史（模型没记忆，全靠它）
  model-fake.ts         假模型，按剧本回答，每次跑结果都一样
  tools.ts              工具登记处
  tool-files.ts         读文件、删文件两个工具
  tool-count.ts         第 5 课要你亲手写的那个插件
  approval.ts           危险动作先问人
  logger.ts             把发生的每件事打出来
```

## 三个值得注意的地方

**内核很小。** `kernel.ts` 只管三件事：谁提供了什么、谁在等什么、拆的时候怎么收干净。读文件、跑模型、问权限，一件都不在内核里。

**循环不认识权限。** 打开 `loop.ts` 搜「权限」，一个字都没有。它只在动手前发一个 `tool/before` 事件，事件里带一个 `block` 函数。`approval.ts` 监听这个事件，看到危险工具就调 `block`。把 `approval` 从装配单里删掉，demo 照样跑，只是没人拦了。

**装配单的顺序无所谓。** `main.ts` 里故意把 `tool-files` 写在 `tools` 前面。它依赖的服务还没有，就先排队等着；`tools` 装好之后内核会自动回头把它装上。运行记录第一行就是这个：

```
warn  plugin/wait { name=tool-files, missing=["tools"] }
ok    plugin/start { name=tools }
ok    plugin/start { name=tool-files }
```

## 它没做什么

这是教学用的骨架，不是能用的产品。真实的 Harness 还要处理：真的网络请求和流式返回、上下文太长时的压缩、崩溃后从磁盘恢复会话、并发工具调用、子进程与沙箱、多个界面共用一套内核。这些都会让代码长十倍，但骨架还是这个骨架。
