import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 动手课：读者自己把 tool-count 这个插件写出来。
 *
 * 七步都要求打开终端。先从装配单里删掉它、跑一遍看坏成什么样，
 * 再一行行写回去，最后给它加一份配置。
 * 运行记录全部来自 npm run demo，包括改过装配单之后那几份。
 */

const nodes: StageNode[] = [
  { id: "profile", label: "装配单", sub: "装谁 + 配什么", col: 0, row: 1, kind: "data" },
  { id: "kernel", label: "内核", sub: "排队、调 setup", col: 1, row: 1, kind: "core" },
  { id: "plugin", label: "你的插件", sub: "tool-count", col: 2, row: 1, kind: "plugin" },
  { id: "registry", label: "工具登记处", sub: "tools 服务", col: 3, row: 0, kind: "plugin" },
  { id: "cleanup", label: "清理函数", sub: "拆时倒着跑", col: 3, row: 2, kind: "core" },
  { id: "approval", label: "审批", sub: "看危险标记", col: 1, row: 3, kind: "plugin" },
  { id: "loop", label: "循环", sub: "取整张工具表", col: 2, row: 3, kind: "plugin" },
  { id: "model", label: "模型", sub: "只看得见说明书", col: 3, row: 3, kind: "external" },
];

const edges: StageEdge[] = [
  { from: "profile", to: "kernel", label: "照单装" },
  { from: "kernel", to: "plugin", label: "调 setup" },
  { from: "plugin", to: "registry", label: "注册工具" },
  { from: "plugin", to: "cleanup", label: "交清理" },
  { from: "registry", to: "loop", label: "取工具表" },
  { from: "loop", to: "model", label: "带说明书" },
  { from: "model", to: "loop", label: "点名要它" },
  { from: "loop", to: "approval", label: "先问一句" },
  { from: "registry", to: "approval", label: "看危险标记" },
];

/** 总览去掉模型那条回程边，剩下的都是稳定关系 */
const overviewEdges: StageEdge[] = edges
  .filter((edge) => !(edge.from === "model" && edge.to === "loop"))
  .map(({ from, to }) => ({ from, to, curve: "straight" as const }));

export const writeAPlugin: Lesson = {
  id: "write-a-plugin",
  index: "07",
  title: "写一个插件，给模型加一个工具",
  summary: "亲手写一个能跑的插件",
  eyebrow: "动手写插件",
  readingMinutes: 11,
  group: "hands-on-stage",
  kind: "hands-on",
  oneLiner: "插件是四样东西：名字、要用的服务、装载函数，还有一份配置。",
  positioning:
    "第 06 节讲了内核装一个插件时做的三件事，这一节你自己写一个。七步全要打开终端：先把 tool-count 从装配单里删掉、跑一遍看它坏成什么样，再一行行写回去，最后给它加一份配置。写完，你手上有一个模型真的调用过的插件。",
  concepts: [
    {
      term: "setup",
      plain: "内核给插件的唯一入口，装上时跑一次。第二个参数是装配单发下来的配置。",
      source: "demo/mini-harness/kernel.ts · Plugin.setup",
    },
    {
      term: "describe 与 params",
      plain: "写给模型看的说明书。模型照着它判断什么时候调、参数填什么。",
      source: "demo/mini-harness/types.ts · Tool",
    },
    {
      term: "配置",
      plain: "装配单发给这一个插件的那份数据。同一个插件，配置不同，行为不同。",
      source: "demo/mini-harness/profile.ts · Layer.config",
    },
    {
      term: "needsApproval",
      plain: "工具给自己贴的危险标记。审批插件看到它才可能拦，拦不拦另说。",
      source: "demo/mini-harness/types.ts · Tool.needsApproval",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels: ["装什么", "谁来装", "装上之后", "谁在用它"],
    legendLabels: { core: "内核的东西", plugin: "插件", data: "装配单", external: "外面" },
    overview: {
      nodes,
      edges: overviewEdges,
      columnLabels: ["装什么", "谁来装", "装上之后", "谁在用它"],
      summary: "装配单点名，内核调 setup，你在里面登记工具、交清理，模型才看得见它",
    },
  },
  steps: [
    {
      id: "s1",
      title: "先把它删掉，看坏成什么样",
      detail:
        "打开 main.ts 第 28 行，把 use 数组里的 toolCount 删掉再跑。工具表从 5 件变 4 件，模型点名的那个工具不见了。",
      activeNodes: ["profile", "registry", "loop", "model"],
      activeEdges: ["registry->loop", "loop->model", "model->loop"],
      log: [
        { kind: "io", text: "npm run demo（删掉 toolCount 之后）" },
        { kind: "call", text: "model/request { round=2, toolCount=4, messageCount=3 }" },
        { kind: "warn", text: "tool/decide、tool/before、tool/after 三行一行都没有" },
        { kind: "state", text: "session/append { session=s1, seq=7, type=tool }" },
        { kind: "state", text: "那条 tool 消息是循环塞的：没有叫 count_files 的工具。" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:26",
        highlight: [3],
        content: `const base: Layer = {
  name: '底座',
  use: [logger, toolFiles, tools, session, modelFake, approval, toolCount, subagent, loop],
  config: { approval: { deny: ['delete_file'] } },
}`,
        note: "文件是 demo/mini-harness/main.ts。工具不存在时循环不报错，它把一句话当成这次的工具结果还给模型。",
      },
    },
    {
      id: "s2",
      title: "第一样：名字",
      detail:
        "插件不用继承什么，也不用去哪报到。它就是一个普通对象，第一个字段是 name。运行记录里 name= 后面那个字符串，就是它。",
      activeNodes: ["plugin"],
      activeEdges: [],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "state", text: "这两行里的 tool-count，就是你写的那个字符串" },
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
        note: "装配单里 import 的 toolCount 是变量名，name 里的 tool-count 才是它对内核报的名字。拆插件时用的是后者。",
      },
    },
    {
      id: "s3",
      title: "第二样：要用到谁",
      detail:
        "工具登记处是别的插件挂上来的。要用它就得在 needs 里写一句。它没到齐，内核让你在队列里等，setup 一次也不跑。",
      activeNodes: ["kernel", "plugin", "registry"],
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
        highlight: [6],
        content: `export const toolCount: Plugin = {
  // 1. 名字。出错时靠它定位是谁的问题。
  name: 'tool-count',

  // 2. 我要用到 tools 这个服务。它没就位，下面的 setup 不会被调用。
  needs: ['tools'],

  setup(ctx) {
    // 下面几步往这里填
  },
}`,
        note: "needs 里写了谁，setup 跑的时候那个服务一定在。名字写错就一直等着，下一节专治这个。",
      },
    },
    {
      id: "s4",
      title: "第三样：装载时干的活",
      detail:
        "setup 是内核给你的唯一入口，装上时跑一次。一个工具先写四样：叫什么、干什么、收哪些参数、真正干活的函数。",
      activeNodes: ["plugin", "registry", "loop", "model"],
      activeEdges: ["plugin->registry", "registry->loop", "loop->model"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
        { kind: "call", text: "tool/decide { name=count_files, args={} }" },
        {
          kind: "io",
          text: "tool/after { name=count_files, output=工作区里有 2 个文件。（这个工具被调用了 1 次） }",
        },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts",
        partial: true,
        highlight: [6, 7, 8],
        content: `setup(ctx) {
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
        note: "params 写空对象表示不收参数。describe 和 params 是模型唯一的判断依据，怎么写第 09 节专门讲。",
      },
    },
    {
      id: "s5",
      title: "走的时候要收干净",
      detail:
        "内核只认得从 ctx 挂上去的东西。定时器、连接这类它看不见，得你用 ctx.effect 把清理函数交出去。拆插件时倒着执行。",
      activeNodes: ["plugin", "cleanup", "kernel"],
      activeEdges: ["plugin->cleanup"],
      log: [
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "state", text: "这两行是 npm run demo 最后那段：先跑清理，再宣布拆完" },
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
        note: "补上这几行，你的文件就和 demo 里那份一字不差了。calls=1 是插件里那个计数器最后的值。",
      },
    },
    {
      id: "s6",
      title: "装回装配单，跑通它",
      detail:
        "插件不会被自动发现，得自己写进装配单。把 toolCount 加回 use 数组。只要 needs 写对了，位置随便放，依赖没齐的会自己排队等。",
      activeNodes: ["profile", "kernel", "plugin", "registry"],
      activeEdges: ["profile->kernel", "kernel->plugin", "plugin->registry"],
      log: [
        { kind: "io", text: "npm run demo" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "state", text: "还在排队等依赖的： 没有" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:35",
        highlight: [4],
        content: `const standard = compose([base])
const kernel = new Kernel()
const ctx = kernel.root()
for (const plugin of standard.use) kernel.use(plugin, standard.config[plugin.name])`,
        note: "kernel.use 的第二个参数，就是装配单里 config 那一格按插件名取出来的东西。下一步用它。",
      },
    },
    {
      id: "s7",
      title: "第四样：配置",
      detail:
        "名字、依赖、装载函数之外还有一样。同一个插件装进不同的装配单，行为可以不同。给它加一个开关。",
      activeNodes: ["profile", "kernel", "plugin", "registry", "approval", "loop"],
      activeEdges: ["kernel->plugin", "registry->approval", "loop->approval"],
      log: [
        { kind: "state", text: 'approval/config { deny=["delete_file","count_files"] }' },
        { kind: "call", text: "tool/decide { name=count_files, args={} }" },
        { kind: "io", text: "approval/ask { name=count_files }" },
        { kind: "ok", text: "approval/allow { name=count_files }" },
        { kind: "call", text: "tool/before { name=count_files, args={} }" },
        { kind: "state", text: "中间那两行是配置改出来的，之前 tool/decide 直接接 tool/before" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts",
        partial: true,
        highlight: [1, 4, 10],
        content: `setup(ctx, config) {
  const tools = ctx.get<Tools>('tools')
  // 4. 装配单发下来的配置：这次要不要把它当成危险动作
  const needsApproval = config.needsApproval === true

  tools.register({
    name: 'count_files',
    describe: '数一数工作区里有几个文件',
    params: {},
    needsApproval,
    // run 同上
  })
},`,
        note: "还要改 main.ts 第 29 行：config 里加一格 'tool-count': { needsApproval: true }，并把 count_files 写进 approval 的 deny。两处都改才看得到上面那两行。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "学会这个，就会写 DeepSeek Harness 的插件了。",
      right:
        "形状不一样。你写的是一个对象字面量，字段叫 name、needs、setup。真实 DSH 插件是一组模块级的命名导出：装载函数叫 apply，依赖声明叫 inject，配置要单独声明一个 Config。骨架是同一套——声明要用什么、装载时跑一次、走的时候收干净——只有名字那一项照搬，别的都换了名字。第 15 节把这几处一条条对上。",
    },
    {
      wrong: "setup 里得先判断一下 tools 在不在，免得取不到。",
      right:
        '不用判。needs 里写了 tools，内核保证它到齐了才调你的 setup。真忘了写，ctx.get 会直接抛「没有找到服务 "tools"。是不是忘了在 needs 里声明？」，不会悄悄给你一个 undefined。但这一条只保证服务在，不保证服务里的东西齐了——下一节讲这个区别。',
    },
    {
      wrong: "插件一拆，它做过的事就全撤销了。",
      right:
        "只撤销记过账的：ctx.provide 挂的服务、ctx.on 挂的监听、ctx.effect 交的清理函数。这个 demo 的 tools.register 没登记撤销动作，所以 tool-count 拆掉之后，把工具表打出来还能看到 count_files 在里面。想让它一起走，得由 tools 那边先提供一个撤销的口子。",
    },
  ],
  takeaways: [
    {
      title: "你刚写的，和真实 DSH 插件差在哪",
      intro: "同一套骨架，三处不一样。第 15 节会把它们一条条对上。",
      items: [
        {
          label: "形状",
          text: "你写的是一个对象字面量，三个字段加一份配置。真实那边是一组模块级的命名导出，name、inject、Config、apply 各占一行，没有外面那层大括号。",
          hint: "demo/dsh-plugin-example/src/index.ts",
        },
        {
          label: "配置",
          text: "你这份配置是个普通对象，谁都能往里塞什么。真实那边要单独声明一个 Config，装载器按它校验类型、补默认值。那个例子自己的注释里写着：填错类型会在启动时报错。",
          hint: "demo/dsh-plugin-example/src/index.ts",
        },
        {
          label: "交付",
          text: "你的插件是本项目里的一个文件，改完存盘再跑一次就生效。真实那边是一个能单独安装的包，包自己声明该插在装配单的哪一行，装完必须重启。",
          hint: "demo/dsh-plugin-example/cordis.patch.yml",
        },
      ],
    },
    {
      title: "ctx 上一共就这几个方法",
      intro: "这个 demo 里你会用到的全部把手，都在这里。真实框架的 ctx 比这个大不少，这八个是地基。",
      items: [
        {
          label: "ctx.get(name)",
          text: "按名字取一个服务。取不到就抛错，不会给你 undefined。",
          hint: "demo/mini-harness/kernel.ts · get()",
        },
        {
          label: "ctx.provide(name, value)",
          text: "把自己的能力挂上去，别的插件就能按这个名字取到它。",
          hint: "demo/mini-harness/kernel.ts · provide()",
        },
        {
          label: "ctx.on(event, fn)",
          text: "监听一个事件。这个监听在拆插件时会自动摘掉，不用你管。",
          hint: "demo/mini-harness/kernel.ts · on()",
        },
        {
          label: "ctx.emit(event, payload)",
          text: "发一个事件，通知所有监听的人。没人听也不报错。",
          hint: "demo/mini-harness/kernel.ts · emit()",
        },
        {
          label: "ctx.effect(fn)",
          text: "交一个清理函数。拆插件时倒着执行，后交的先跑。",
          hint: "demo/mini-harness/kernel.ts · effect()",
        },
        {
          label: "ctx.plugin(plugin)",
          text: "在这里再装一个插件。插件套插件也是可以的。",
          hint: "demo/mini-harness/kernel.ts · plugin()",
        },
        {
          label: "ctx.intercept(event, fn)",
          text: "第 06 节那种环绕式监听。想左右一件事的结果，用它而不是 on。",
          hint: "demo/mini-harness/kernel.ts · intercept()",
        },
        {
          label: "ctx.waterfall(event, value, base)",
          text: "发一个环绕式事件并拿回最终结果。审批能拦住工具，靠的就是它。",
          hint: "demo/mini-harness/kernel.ts · waterfall()",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "把 needs 里的 tools 手滑写成 toolz，跑 npm run demo 会看到什么？",
      options: [
        "setup 照跑，ctx.get 那一行拿到 undefined",
        "多一行 plugin/wait，这个插件的 setup 一次也不跑，别的照常",
        "内核报错退出，整个 demo 起不来",
      ],
      answer: 1,
      explain:
        '内核只在 needs 全到齐时才调 setup。没人提供 toolz，这个插件就一直在队列里等着，运行记录里留下 plugin/wait { name=tool-count, missing=["toolz"] }，最后那句「还在排队等依赖的」也会把它列出来。demo 照样跑到底。',
      wrongExplains: [
        "ctx.get 取不到是直接抛错，不会退化成 undefined——kernel.ts 里那句「是不是忘了在 needs 里声明？」就是它抛的。何况这里 setup 根本没跑到那一行：依赖没齐，setup 一次都不会被调用。",
        "",
        "内核不会因为有人在等就退出，它只是把这个插件留在候补队列里，别的插件照常装、demo 照常跑完。这正是这类错难查的原因：什么都没坏，只是你的东西没了。",
      ],
    },
    {
      question: "只给 tool-count 配上 needsApproval: true，approval 那份 deny 一个字不改，会怎样？",
      options: [
        "count_files 被拦下，模型收到一句拒绝",
        "运行记录和改之前一模一样，审批不会问",
        "启动时报错：deny 里没有这个工具",
      ],
      answer: 1,
      explain:
        "两份配置各管各的。工具上的 needsApproval 只是给自己贴了个危险标记，拦不拦由审批插件那份 deny 说了算。它没写 count_files 就直接往下传，工具照跑。要看到 approval/ask 那两行，两处都得改。",
      wrongExplains: [
        "贴标记和拦下来是两件事。审批插件的第一个判断是「这个名字在不在我的 deny 里」，不在就往下传。而且 demo 里那个假用户对 delete_file 之外一律同意，就算问到它也是放行。",
        "",
        "装配单只是按插件名把配置发下去，不做交叉校验。deny 里写一个根本不存在的工具名，也不会有人吭声。",
      ],
    },
  ],
  bridge:
    "你这个插件跑通了。下一节反过来：改完存盘、跑一遍，什么都没发生——先学会三步之内分清是没装上、没触发，还是触发了你看不见。至于你刚写的这个形状和真实 DSH 插件差在哪，第 15 节一条条对上。",
};
