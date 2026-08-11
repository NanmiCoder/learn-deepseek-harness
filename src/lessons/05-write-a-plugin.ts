import type { Lesson } from "../tutorial/types";

export const writeAPlugin: Lesson = {
  id: "write-a-plugin",
  index: "05",
  title: "如何开发插件",
  summary: "从零写一个能跑的插件",
  eyebrow: "动手实践",
  readingMinutes: 12,
  oneLiner: "插件就是一个普通对象。写三个字段，再往装配单里加一行，它就跑起来了。",
  analogy:
    "你去一个共享厨房做菜。进门先报名字，出了事好找人。要用的灶台没空出来，你就在门口等着。轮到你，把做好的菜端到取餐台，谁都能取。走之前把火关了——这件事得你自己交代，不然人走了火还烧着。写插件就是这四步。",
  concepts: [
    {
      term: "插件",
      plain: "一个普通对象。写上名字、要用的服务、setup 函数，就是插件。",
      source: "demo/mini-harness/kernel.ts:23 · Plugin",
    },
    {
      term: "服务",
      plain: "别的插件挂上来的能力，按名字取用。tools 就是工具登记处。",
      source: "demo/mini-harness/kernel.ts:177 · provide()",
    },
    {
      term: "上下文 ctx",
      plain: "内核递给你的把手。取服务、发事件、交清理函数，都靠它。",
      source: "demo/mini-harness/kernel.ts:166 · Context",
    },
    {
      term: "清理函数",
      plain: "插件被拆掉时要做的收尾。用 ctx.effect 交给内核，它来调。",
      source: "demo/mini-harness/kernel.ts:206 · effect()",
    },
  ],
  stage: {
    nodes: [
      { id: "main", label: "装配单", sub: "main.ts", col: 0, row: 1, kind: "data" },
      { id: "kernel", label: "内核", sub: "排队、装载", col: 1, row: 1, kind: "core" },
      { id: "plugin", label: "你的插件", sub: "tool-count", col: 2, row: 1, kind: "plugin" },
      { id: "tools", label: "工具登记处", sub: "tools 服务", col: 3, row: 0, kind: "plugin" },
      { id: "cleanup", label: "清理函数", sub: "ctx.effect", col: 3, row: 2, kind: "core" },
      { id: "loop", label: "循环", sub: "问模型、跑工具", col: 2, row: 3, kind: "core" },
      { id: "model", label: "模型", sub: "看得见这个工具", col: 3, row: 3, kind: "external" },
    ],
    edges: [
      { from: "main", to: "kernel", label: "加一行" },
      { from: "kernel", to: "plugin", label: "调 setup" },
      { from: "plugin", to: "tools", label: "注册工具" },
      { from: "plugin", to: "cleanup", label: "交清理" },
      { from: "kernel", to: "cleanup", label: "拆时执行" },
      { from: "tools", to: "loop", label: "取工具表" },
      { from: "loop", to: "model", label: "带上工具" },
      { from: "model", to: "loop", label: "我要调它" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "先给它起个名字",
      detail: "插件不用继承什么，也不用去哪里报到。它就是一个普通对象。第一个字段是 name。运行记录里每一行的 name= 后面，都是它。",
      activeNodes: ["plugin"],
      activeEdges: [],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "state", text: "这两行里的 name，就是你刚写的那个字符串" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts",
        partial: true,
        highlight: [5],
        content: `import type { Plugin } from '../kernel.ts'

export const toolCount: Plugin = {
  // 1. 名字。出错时靠它定位是谁的问题。
  name: 'tool-count',

  setup(ctx) {
    // 下面几步往这里填
  },
}`,
        note: "name 是插件的身份证。运行记录里每一行都靠它认人。",
      },
    },
    {
      id: "s2",
      title: "写清楚要用什么",
      detail: "tools 是别的插件挂上来的工具登记处。你要用它，就得先在 needs 里写一句。它没到齐，内核就让你在队列里等着，setup 一次也不会跑。",
      activeNodes: ["plugin", "kernel", "tools"],
      activeEdges: ["kernel->plugin"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "demo 里 tool-files 写在 tools 前面，就这样等了一下" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts",
        partial: true,
        highlight: [8],
        content: `import type { Plugin } from '../kernel.ts'

export const toolCount: Plugin = {
  // 1. 名字。出错时靠它定位是谁的问题。
  name: 'tool-count',

  // 2. 我要用到 tools 这个服务。它没就位，下面的 setup 不会被调用。
  needs: ['tools'],

  setup(ctx) {
    // 下面几步往这里填
  },
}`,
        note: "needs 写谁，setup 里就一定能 get 到谁。",
      },
    },
    {
      id: "s3",
      title: "在 setup 里取服务",
      detail: "setup 是内核给你的唯一入口，装上时跑一次。ctx 是你专属的把手。ctx.get('tools') 把工具登记处取出来，取不到会直接报错。",
      activeNodes: ["kernel", "plugin", "tools"],
      activeEdges: ["kernel->plugin"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "call", text: "ctx.get('tools') -> 拿到工具登记处" },
        { kind: "warn", text: '取不到会抛：没有找到服务 "tools"。是不是忘了在 needs 里声明？' },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts",
        partial: true,
        highlight: [10],
        content: `import type { Plugin } from '../kernel.ts'
import type { Tools } from '../types.ts'

export const toolCount: Plugin = {
  name: 'tool-count',
  needs: ['tools'],

  // 3. 装载时执行一次。
  setup(ctx) {
    const tools = ctx.get<Tools>('tools')
    // 拿到工具登记处了，下一步往里面登记工具
  },
}`,
        note: "ctx 记着你是谁。你在它上面挂的东西，拆插件时才收得回。",
      },
    },
    {
      id: "s4",
      title: "把工具登记上去",
      detail: "一个工具就是四样东西：叫什么、干什么、收什么参数、真正干活的函数。describe 和 params 是写给模型看的，写清楚它才知道什么时候该调。",
      activeNodes: ["plugin", "tools", "loop", "model"],
      activeEdges: ["plugin->tools", "tools->loop", "loop->model"],
      log: [
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
        { kind: "call", text: "tool/before { name=count_files, args={} }" },
        { kind: "io", text: "tool/after { name=count_files, output=工作区里有 2 个文件。（这个工具被调用了 1 次） }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts",
        partial: true,
        highlight: [7, 9],
        content: `// ... name / needs 同上
setup(ctx) {
  const tools = ctx.get<Tools>('tools')
  let calls = 0
  tools.register({
    name: 'count_files',
    describe: '数一数工作区里有几个文件',
    params: {},
    async run() {
      calls++
      return \`工作区里有 2 个文件。（这个工具被调用了 \${calls} 次）\`
    },
  })
},`,
        note: "params 空对象表示不收参数。run 的返回值原样交回给模型。",
      },
    },
    {
      id: "s5",
      title: "交出清理函数",
      detail: "内核只认得从 ctx 挂上去的东西。定时器、连接这类它看不见的，你得用 ctx.effect 把清理函数交出来。拆插件时它会倒着挨个执行。",
      activeNodes: ["plugin", "cleanup", "kernel"],
      activeEdges: ["plugin->cleanup", "kernel->cleanup"],
      log: [
        { kind: "call", text: "ctx.effect(fn) -> 记在 tool-count 这块地上" },
        { kind: "state", text: "kernel.remove('tool-count') 时，倒着执行登记过的清理函数" },
        { kind: "state", text: "count/bye { calls=1 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts:32",
        highlight: [2, 3],
        content: `    // 4. 交出清理函数。插件被拆掉时，这行会被执行。
    ctx.effect(() => {
      ctx.emit('count/bye', { calls })
    })
  },
}`,
        note: "补上这几行，你的文件就和 demo 里的成品一字不差了。",
      },
    },
    {
      id: "s6",
      title: "在装配单里加一行",
      detail: "插件不会被自动发现，得自己写进装配单。两行：一行 import，一行 kernel.use。位置随便放，写在依赖前面也行，内核会让它排队等。",
      activeNodes: ["main", "kernel", "plugin"],
      activeEdges: ["main->kernel", "kernel->plugin"],
      log: [
        { kind: "io", text: "npm run demo" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "state", text: "还在排队等依赖的： 没有" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:16",
        highlight: [1, 13],
        content: `import { toolCount } from './plugins/tool-count.ts'
// ... 其余 import 省略

const kernel = new Kernel()

// 装配单。顺序随便写——依赖没齐的插件会自己排队等。
kernel.use(logger)
kernel.use(toolFiles)
kernel.use(tools)
kernel.use(history)
kernel.use(modelFake)
kernel.use(approval)
kernel.use(toolCount)`,
        note: "kernel.use 只管排队。依赖齐了内核才回头装它。",
      },
    },
    {
      id: "s7",
      title: "跑一遍看它有没有被调用",
      detail: "跑 npm run demo。看三行就够：tool/register 是登记上了，tool/before 是模型真调了它，count/bye 是清理函数跑了。",
      activeNodes: ["main", "kernel", "plugin", "tools", "loop", "model", "cleanup"],
      activeEdges: [
        "main->kernel",
        "kernel->plugin",
        "plugin->tools",
        "tools->loop",
        "loop->model",
        "model->loop",
        "plugin->cleanup",
        "kernel->cleanup",
      ],
      log: [
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "call", text: "tool/before { name=count_files, args={} }" },
        { kind: "io", text: "tool/after { name=count_files, output=工作区里有 2 个文件。（这个工具被调用了 1 次） }" },
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:44",
        highlight: [2],
        content: `console.log('--- 拆掉 tool-count 插件 ---')
kernel.remove('tool-count')
console.log('拆完之后，它注册的清理函数已经跑过了（上面那行 count/bye）。')`,
        note: "count/bye 里的 calls=1，就是插件里那个计数器最后的值。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "setup 里得先判断一下 tools 在不在，免得取不到。",
      right:
        "不用判。needs 里写了 'tools'，内核就保证它到齐了才调你的 setup。真忘了写，ctx.get 会直接抛「没有找到服务 \"tools\"。是不是忘了在 needs 里声明？」，不会悄悄塞给你一个 undefined（demo/mini-harness/kernel.ts:183）。",
    },
    {
      wrong: "装配单得排好顺序，被依赖的插件必须写在前面。",
      right:
        "不用排。依赖没齐的插件会先进队列等着，等依赖到了内核再回头装它。demo 故意把 tool-files 写在 tools 前面，运行记录第一行的 plugin/wait 就是它在等（demo/mini-harness/kernel.ts:59）。",
    },
    {
      wrong: "插件一拆，它做过的事就全撤销了。",
      right:
        "只撤销记过账的：ctx.provide 挂的服务、ctx.on 挂的监听、ctx.effect 交的清理函数。这个 demo 的 tools.register 没登记撤销，所以插件拆了，count_files 还留在登记处。想让它一起走，自己在 ctx.effect 里删掉。",
    },
  ],
  takeaways: [
    {
      title: "常见坑速查",
      intro: "第一次写插件，最容易在这几处摔跤。",
      items: [
        {
          label: "忘了写 needs",
          text: "服务真没上线时，ctx.get 直接抛「没有找到服务 \"tools\"。是不是忘了在 needs 里声明？」。",
          hint: "demo/mini-harness/kernel.ts:185",
        },
        {
          label: "服务名写错一个字母",
          text: "插件会一直在队列里等，setup 一次也不跑，只留一行 plugin/wait。kernel.pending() 能看到它缺什么。",
          hint: "demo/mini-harness/kernel.ts:129",
        },
        {
          label: "开了定时器不交清理",
          text: "定时器不经过 ctx，内核不知道有这回事。插件拆了它还在跑。用 ctx.effect 把 clearInterval 交出去。",
          hint: "demo/mini-harness/kernel.ts:206",
        },
        {
          label: "以为拆插件会连工具一起撤",
          text: "这个 demo 的 tools.register 没登记撤销，工具会留在登记处。要撤就自己在 ctx.effect 里删。",
          hint: "demo/mini-harness/plugins/tools.ts:17",
        },
        {
          label: "工具说明写得含糊",
          text: "describe 和 params 是模型唯一的判断依据。写不清楚，模型就不知道什么时候该调它。",
          hint: "demo/mini-harness/types.ts:20",
        },
        {
          label: "两个名字搞混",
          text: "装配单里 import 的是导出的变量名 toolCount，kernel.remove 用的才是 name 字符串 'tool-count'。",
          hint: "demo/mini-harness/main.ts:45",
        },
      ],
    },
    {
      title: "ctx 上一共就这几个方法",
      intro: "写插件时你会用到的全部把手，都在这里了。",
      items: [
        {
          label: "ctx.get(name)",
          text: "按名字取一个服务。取不到就抛错，不会给你 undefined。",
          hint: "demo/mini-harness/kernel.ts:183",
        },
        {
          label: "ctx.provide(name, value)",
          text: "把自己的能力挂上去，别的插件就能 get 到它。",
          hint: "demo/mini-harness/kernel.ts:177",
        },
        {
          label: "ctx.on(event, fn)",
          text: "监听一个事件。这个监听拆插件时会自动摘掉，不用你管。",
          hint: "demo/mini-harness/kernel.ts:191",
        },
        {
          label: "ctx.emit(event, payload)",
          text: "发一个事件，通知所有监听的人。没人听也不报错。",
          hint: "demo/mini-harness/kernel.ts:197",
        },
        {
          label: "ctx.effect(fn)",
          text: "交一个清理函数。拆插件时倒着执行，后交的先跑。",
          hint: "demo/mini-harness/kernel.ts:206",
        },
        {
          label: "ctx.plugin(plugin)",
          text: "在这里再装一个插件。插件套插件也是可以的。",
          hint: "demo/mini-harness/kernel.ts:211",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "把 needs 里的 'tools' 手滑写成 'toolz'，跑 npm run demo 会看到什么？",
      options: [
        "setup 照跑，ctx.get('tools') 返回 undefined",
        "多一行 plugin/wait 警告，这个插件的 setup 一次也不跑",
        "内核报错退出，整个 demo 起不来",
      ],
      answer: 1,
      explain:
        "内核只在 needs 全到齐时才调 setup。没人提供 'toolz'，这个插件就一直在队列里等，只留下一行 plugin/wait。它不会退化成 undefined——ctx.get 取不到是直接抛错；内核也不会因为有人在等就退出，别的插件照常跑。",
    },
    {
      question: "demo 最后一行 kernel.remove('tool-count') 跑完，运行记录里为什么会多出 count/bye？",
      options: [
        "内核把这个插件发过的事件重放了一遍",
        "因为 setup 把这个函数 return 出去了",
        "因为这个函数是用 ctx.effect 交给内核的，拆插件时被执行",
      ],
      answer: 2,
      explain:
        "拆插件时，内核倒着执行这个插件登记过的清理函数，count/bye 就是在那里发出来的。内核不重放事件；setup 的返回值也没人看，清理函数必须显式用 ctx.effect 交出去才算数。",
    },
  ],
  bridge:
    "你已经能写、能装、能拆一个插件了。下一节把这套做法和 Claude Code 摆在一起看：什么都做成插件，换来了什么，又要付出什么。",
};
