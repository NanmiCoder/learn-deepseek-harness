# dsh-plugin-example

一个能装进 DeepSeek Harness 的最小插件，全部源码 4 个文件、约 200 行（含注释）。

教程前面几节讲原理，用的是 `demo/mini-harness/`——我们自己写的仿制品。
这个目录是另一件事：它是**真的 DSH 插件**，用真实的包、真实的字段名、真实的构建链。
读者照着它抄，抄出来的东西能装。

它做的事被压到了最小：记便签。模型调一个工具记一条，浏览器右上角浮层把便签列出来。
功能没有价值，结构才有——一个插件该有的接缝，它每样演示一次。

## 目录里有什么

```
package.json           双 manifest：一个包同时是 host 插件和浏览器模块
cordis.patch.yml       把这个包挂成 host 组合树里的一行
tsconfig.json          host 侧的编译配置
tsconfig.client.json   client 侧的编译配置（必须是第二个 program）
tsdown.config.ts       把 client 打成浏览器能加载的一个文件
scripts/link-dsh.mjs   把 DSH 的包链接进 node_modules（npm 上装不到）
src/
  index.ts             host 入口：name / inject / Config / apply
  notes.ts             便签簿，插件的全部状态
  event-types.ts       会话事件的类型，零 import
  client/index.tsx     浏览器浮层，1 秒轮询一次 host 路由
```

## 工作原理

这个插件用到了 DSH 的四条接缝：

| DSH 能力 | 本例的用法 | 在哪 |
|---|---|---|
| `ctx.tools` 工具登记处 | 注册一个 `example_note` 工具 | `src/index.ts` |
| 会话日志 | 每记一条便签，往调用者会话追加一条 `plugin-example/note-added` | `src/index.ts` + `src/event-types.ts` |
| `ctx.httpServer` 路由 | 开一条 `/plugins/dsh-plugin-example/notes` 取数据 | `src/index.ts` |
| 浏览器插件位 | 往 body 上挂一个浮层，轮询上面那条路由 | `src/client/index.tsx` |

数据流一句话：模型调工具 → 便签进内存 → 事件进会话日志 → 浏览器轮询路由 → 浮层重画。

### 写 host 插件最容易漏的一件事

`inject` 和类型是两回事，要各写一遍。

`inject = ['tools', 'httpServer']` 管的是**运行时**：框架据此排加载顺序，保证服务就绪了才调 `apply`。
但 `ctx.httpServer` 这个**属性在类型上存不存在**，是另一套机制决定的——
DSH 的每个包用 `declare module` 往 `Context` 上加自己的成员，
而 TypeScript 只对「已经加载进编译程序」的模块做这种合并。

所以包必须被加载进来。两种写法都算：

- 你本来就要用那个包里的东西，正常 import 就够了。本例的 `tools` 就是这样——
  `import { defineTool } from '@deepseek-ai/dsh-tools'` 顺带把声明带进来了。
- 你不需要它的任何导出，只要那个类型。写 `import type {} from '<包名>'`，
  本例的 `httpServer` 就是这样（`src/index.ts:20`）。这行不产生任何运行时代码。

漏了会怎样：把 `src/index.ts:20` 那行删掉，编译立刻报
`TS2339: Property 'httpServer' does not exist on type 'Context'`，
外加两条 `TS7006`（`req` / `res` 推不出类型了）。这条是实测的。

一个包两个身份：`main` 指向的 `lib/index.js` 是 host 插件，
`exports["./client"]` 指向的 `lib/client.js` 是浏览器模块。
两者跑在不同的进程里，不共享内存，只通过 HTTP 说话。

## package.json 逐字段

JSON 写不了注释，所以字段的理由列在这里。

| 字段 | 为什么必须有 |
|---|---|
| `type: "module"` | DSH 全栈 ESM |
| `main` / `types` | host 插件的入口和声明 |
| `exports["."]` | 同上，供 `exports` 优先的解析使用 |
| `exports["./client"]` | 浏览器扫描名册时按它找 bundle。缺了就整包不收，且不报错 |
| `exports["./cordis.patch.yml"]` | 让补丁文件能被按子路径解析 |
| `dsh.bundle.patch` | 安装命令靠它认出这是 bundle，才会加进 profile 的 bundles 层 |
| `dsh.client` | 新格式的浏览器 manifest |
| `dshClient` | 旧格式，内容和上面一样。两种都写，见「已知限制」 |
| `files` | 发包时带上 `lib` 和 `cordis.patch.yml`，少一个就装不起来 |
| `peerDependencies` | DSH 的包由 profile 提供，插件不重复安装一份 |

## 构建

需要 TypeScript 5.7 以上。低于 5.7，`rewriteRelativeImportExtensions` 不认识，emit 会报错。

`@deepseek-ai/*` 这些包目前不在 npm 上，`pnpm install` 装不到。
所以装依赖分两步：npm 上有的正常装，DSH 的包链接到本地检出。

```sh
cd demo/dsh-plugin-example

# 1. npm 上能装到的部分
pnpm add -D typescript@^5.9 tsdown@0.22.2
pnpm add react@^18 react-dom@^18 -D @types/react@~18.3 @types/node

# 2. DSH 的包，指向你本地的源码检出
node scripts/link-dsh.mjs <你的 DSH 检出目录>

# 3. 构建
pnpm typecheck   # 两个 program 分别检查
pnpm build       # tsc host → tsc client → tsdown
```

`link-dsh.mjs` 不写死对方的目录结构。它扫一遍检出，按 `package.json` 里的 `name`
建表再链接，所以对方改了布局也不影响。

构建产物：

- `lib/index.js` 等——host 侧，tsc 直接产出，不打包
- `lib/client.js`——浏览器侧，tsdown 打包成一个自注册的文件

## 安装到 profile

```sh
dsh plugin --profile <profile 名> add /绝对路径/demo/dsh-plugin-example
```

这条命令把包装进该 profile，并把它加进 profile manifest 的 bundles 层列表。

装完必须重启 dsh 服务。补丁层是在启动时组合的，热更新只更配置，不会加载新插件行。

## 配置

| 字段 | 默认值 | 说明 |
|---|---|---|
| `maxNotes` | `20` | 便签最多留几条，超了丢最旧的 |

配置写在 `cordis.patch.yml` 的 `config` 下：

```yaml
- insert:
    - id: plugin-example
      name: dsh-plugin-example
      config:
        maxNotes: 20
```

## 验证

分三层。第 0 层是已经发生过的事实，第 1 层是你可以复现的，第 2 层还没有人做过。

### 0. 已经真实跑通的

环境：TypeScript 5.9.3；`@deepseek-ai/*` 用符号链接指向本地 DSH 源码检出；
构建在临时目录里进行，没有改动教程仓库以外的任何东西。

- `tsc -p tsconfig.json --noEmit`：0 错误
- `tsc -p tsconfig.client.json --noEmit`：0 错误
- `tsc` 两个 program 均正常 emit；`lib/index.js` 里 `from './notes.ts'` 已重写为 `'./notes.js'`
- `tsdown`：产出 `lib/client.js`（2.42 kB），首行是 `window.__ModuleLoader__.load({ id: "dsh-plugin-example", factory: (require) => {`，末尾是 `return module.exports; } });`
- `node -e "import('./lib/index.js')..."`：导出 `Config, apply, inject, name` 四项
- 独立 scratch profile 上 `dsh --profile <scratch> --dump-config`：组合树里出现了

  ```
  - id: plugin-example
    name: dsh-plugin-example
    config:
      maxNotes: 20
  ```

  验证后该 profile 已删除；全程未触碰任何运行中的实例。

### 1. 你可以复现的（离线，不启动服务）

```sh
cd demo/dsh-plugin-example
node scripts/link-dsh.mjs <你的 DSH 检出目录>
pnpm typecheck
pnpm build
node -e "import('./lib/index.js').then(m => console.log(Object.keys(m)))"   # 应打印四个导出
head -1 lib/client.js                                                       # 应是 __ModuleLoader__ 那一行
```

### 2. 还没有人做过的（需要重启服务，请自行安排时机）

下面这些**没有验证过**，写在这里是告诉你还差哪几步：

- 没有装进任何真实 profile 跑过，`dsh plugin add` 这条命令本例没执行过
- 没有让模型真的调用过 `example_note`
- `plugin-example/note-added` 事件没有真的写进过任何会话日志
- `/plugins/dsh-plugin-example/notes` 这条路由没有被真实请求过
- `lib/client.js` 没有在浏览器里加载过，浮层没有被真实渲染过

要验的话，顺序是：装进一个独立 profile → 重启 → curl 首页确认名册里有这个包
→ curl `/plugins/dsh-plugin-example/client.js` 应为 200 → 让模型记一条便签 → 看浮层。

## 已知限制

- **状态是进程内的，重启就没了。** 便签存在 `src/notes.ts` 的数组里。
  真实插件一般落在工作区的文件里，还要把读-改-写串行化。那部分是普通 Node 代码，
  和 DSH 无关，为了把例子压小砍掉了。
- **状态不分会话。** 所有会话看到同一份便签。按会话隔离需要用 `exec.agent.session` 的 id 分桶。
- **`package.json` 里浏览器 manifest 写了两遍。** 新版本读嵌套的 `dsh.client`，
  当前部署的版本读顶层的 `dshClient`。只写一种，名册扫描会判空，
  而且不报错——现象是浮层永远不出现。两种都写是目前的唯一解。
- **教程仓库的 `npm run typecheck` 覆盖不到这个目录。** 根上的 `tsconfig.demo.json`
  已经把本目录排除掉了——它自带两份 tsconfig，且依赖只在 DSH 检出里链得到。
  想检查这里的类型，按上面「构建」一节单独跑。
- **浮层的位置是写死的。** Web 界面没有右上角的挂载槽位，浮层只能自己用固定定位摆。
  和别的浮层插件装在一起会叠。
