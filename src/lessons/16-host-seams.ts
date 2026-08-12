import type { Lesson } from "../tutorial/types";

export const hostSeams: Lesson = {
  id: "host-seams",
  index: "16",
  title: "host 面的三条接缝：工具、会话事件、HTTP 路由",
  summary: "往插件里塞三样东西",
  eyebrow: "实战",
  group: "real-world",
  readingMinutes: 12,
  kind: "read",
  oneLiner: "一个工具、一条记录、一个接口，是 host 那半最常用的三条接缝。",
  positioning:
    "上一节把插件的壳搭好了，它还什么都不做。这一节往壳里塞三样东西，也是 host 那半最常用的三条接缝。三样各管各的，坏一样不影响另外两样。",
  concepts: [
    {
      term: "defineTool",
      plain: "定义一个工具：名字、说明、参数、输出、干活的函数。",
      source: "demo/dsh-plugin-example/src/index.ts:72",
    },
    {
      term: "exec.agent",
      plain: "调用这个工具的那个 Agent，当前会话挂在它身上。",
      source: "demo/dsh-plugin-example/src/index.ts:98",
    },
    {
      term: "会话事件",
      plain: "往会话日志里追加一行。留痕用的，不是业务本身。",
      source: "demo/dsh-plugin-example/src/event-types.ts:32",
    },
    {
      term: "ctx.effect",
      plain: "交出注销函数。插件重载时靠它把上次注册的收掉。",
      source: "demo/dsh-plugin-example/src/index.ts:110",
    },
  ],
  stage: {
    columnLabels: ["模型", "插件", "状态", "外面"],
    nodes: [
      { id: "model", label: "模型", sub: "决定调哪个", col: 0, row: 1, kind: "external" },
      { id: "registry", label: "工具登记处", sub: "ctx.tools", col: 1, row: 0, kind: "plugin" },
      { id: "tool", label: "你的工具", sub: "example_note", col: 1, row: 2, kind: "plugin" },
      { id: "session", label: "会话日志", sub: "留痕", col: 2, row: 0, kind: "core" },
      { id: "store", label: "便签簿", sub: "插件的状态", col: 2, row: 2, kind: "data" },
      { id: "route", label: "HTTP 路由", sub: "ctx.httpServer", col: 3, row: 2, kind: "plugin" },
      { id: "outside", label: "外面的人", sub: "浏览器或命令行", col: 3, row: 0, kind: "external" },
    ],
    edges: [
      { from: "tool", to: "registry", label: "注册" },
      { from: "registry", to: "model", label: "告诉它" },
      { from: "model", to: "tool", label: "调用" },
      { from: "tool", to: "store", label: "写进去" },
      { from: "tool", to: "session", label: "追加一条" },
      { from: "store", to: "route", label: "读出来" },
      { from: "route", to: "outside", label: "返回" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "工具的四件套",
      detail:
        "名字、说明、参数、输出。说明和参数是模型唯一的判断依据，写含糊它就不知道什么时候该调。",
      activeNodes: ["tool", "registry"],
      activeEdges: ["tool->registry"],
      log: [
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "state", text: "demo 里注册工具是这个样子，真实 DSH 多了一层参数校验" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:72",
        highlight: [2, 3, 5],
        content: `ctx.tools.register(defineTool({
    name: 'example_note',
    description: 'Record a short note for the user. Use it when the user asks to remember something.',
    parameters: {
      text: { type: 'string', required: true, description: 'The note text to record.' },
    },`,
        note: "description 写给模型看，不是写给人看。它决定模型调不调、什么时候调。",
      },
    },
    {
      id: "s2",
      title: "输出先说好形状",
      detail: "返回值按 schema 校验一遍，再由 render 翻译成模型看得懂的内容。两件事分开做。",
      activeNodes: ["registry", "model"],
      activeEdges: ["registry->model"],
      log: [
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
        { kind: "state", text: "模型看到的是工具表，不是你的代码" },
        { kind: "io", text: "tool/after { name=count_files, output=工作区里有 2 个文件。（这个工具被调用了 1 次） }" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:78",
        highlight: [2, 11],
        content: `    output: {
      // 工具返回值的形状。execute 的返回值会按这个 schema 校验。
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'number', required: true },
        },
      },
      // 把返回值翻译成模型看得懂的内容。
      render: (_args, value) => [{ type: 'text', text: \`note recorded, \${value.total} in total\` }],
    },`,
        note: "value 的类型是从 schema 推出来的，不用自己标注。手写标注反而会把推导盖掉。",
      },
    },
    {
      id: "s3",
      title: "干活的那个函数",
      detail: "execute 收到校验过的参数，还收到一个 exec。调用者的 Agent 就挂在 exec 上。",
      activeNodes: ["model", "tool", "store"],
      activeEdges: ["model->tool"],
      log: [
        { kind: "call", text: "tool/before { name=count_files, args={} }" },
        { kind: "state", text: "args 已经按 parameters 校验过了，不用自己再查一遍" },
        { kind: "state", text: "exec.agent 可能是空的，非 Agent 发起的调用就没有它" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:90",
        highlight: [1, 2],
        content: `    async execute(args, exec) {
      const note = addNote(args.text, maxNotes)`,
        note: "args 的类型是从上面的 parameters 推出来的。把 text 写成 txt，编译报 Property 'txt' does not exist on type '{ text: string; }'。",
      },
    },
    {
      id: "s4",
      title: "顺手留个痕",
      detail: "往调用者会话追加一条事件。它是留痕不是业务，所以写失败也不能让工具跟着失败。",
      activeNodes: ["tool", "session"],
      activeEdges: ["tool->session"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=4, type=tool }" },
        { kind: "state", text: "demo 里一次工具调用往日志里追加的就是这样一行" },
        { kind: "warn", text: "追加失败只降级成一条警告，工具照常返回结果" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:93",
        highlight: [4, 6],
        content: `      // ── 接缝二：会话事件 ──────────────────────────────────────
      // exec.agent 是调用这个工具的 Agent，它身上挂着当前会话。
      // 写事件是留痕，不是业务本身——写失败也不能让工具跟着失败。
      const data: ExampleNoteAddedData = { id: note.id, text: note.text, ts: note.ts }
      try {
        exec.agent?.session.append('plugin-example/note-added', data)
      } catch (error: unknown) {
        ctx.logger.warn(\`plugin-example: append event failed: \${String(error)}\`)
      }`,
        note: "包一层 try 是有意的。日志坏了不该把用户的正事一起带崩。",
      },
    },
    {
      id: "s5",
      title: "事件名要先登记",
      detail: "事件名不能随便写，得先并进 DSH 的会话事件表。本例这个文件零 import，因为两个编译程序共用它。",
      activeNodes: ["session"],
      activeEdges: [],
      log: [
        { kind: "state", text: "demo 的日志里每条事件也都有一个 type" },
        { kind: "state", text: "session/append { session=s1, seq=2, type=step/start }" },
        { kind: "state", text: "浏览器那半要重放事件，靠的就是这张表" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/event-types.ts:32",
        highlight: [1, 7],
        content: `declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * 记下了一条便签。
     * @param data - 便签的 id、正文和时间。
     */
    'plugin-example/note-added': ExampleNoteAddedData
  }
}`,
        note: "这张表谁都可以往里加一行，加完 append 就认识这个事件名了。本例这个文件零 import，是因为 host 和浏览器两个程序都要加载它——从这里 import host 侧的包，浏览器那半就会被污染。只有 host 那半的插件没这个约束。",
      },
    },
    {
      id: "s6",
      title: "开一条路由",
      detail: "注册路由会返回一个注销函数，必须交给 ctx.effect。不交的话插件重载时旧路由还在。",
      activeNodes: ["store", "route", "outside"],
      activeEdges: ["tool->store", "store->route", "route->outside"],
      log: [
        { kind: "state", text: "便签存在插件自己的内存里，重启就没了" },
        { kind: "io", text: "GET /plugins/dsh-plugin-example/notes" },
        { kind: "state", text: '应该返回 { "notes": [ ... ] }，这条路由本身还没有人真的请求过' },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:110",
        highlight: [1, 11],
        content: `  ctx.effect(() => ctx.httpServer.register({
    kind: 'exact',
    path: '/plugins/dsh-plugin-example/notes',
    handler: async (_req, res) => {
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(JSON.stringify({ notes: listNotes() }))
    },
  }), 'plugin-example: notes route')`,
        note: "和 demo 里 ctx.effect 交清理函数是同一件事：内核只认得从 ctx 交出去的东西。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "event-types.ts 是个普通类型文件，缺什么 import 什么。",
      right:
        "约束不来自「加事件」，来自「两个程序共用这个文件」。本例它同时属于两个编译程序，跑 Node 那半和跑浏览器那半都要用它。一旦它 import 了 host 侧的包，浏览器那半的类型就被污染，报出来的错和真正的原因对不上。所以本例把它写成零 import，加载目标模块的事交给用得着它的那个文件去做。反过来说，只有 host 那半、不带浏览器面板的插件，事件类型文件照常 import 就行。",
    },
    {
      wrong: "ctx.httpServer.register 直接调就行，返回值用不上。",
      right:
        "返回的是注销函数，必须交给 ctx.effect。不交的话插件重载时旧路由还留着，第二次注册就撞车。凡是「注册完会还给你一个撤销函数」的接口都是这个规矩，和 demo 里 ctx.effect 收定时器是同一套思路。",
    },
    {
      wrong: "工具的 description 随便写几个字，能跑就行。",
      right:
        "它是模型唯一的判断依据。模型看不到你的代码，只看得到这段说明和参数表。写含糊了，现象是工具明明注册上了，模型就是不调它——不报错，也没有任何日志告诉你为什么。",
    },
    {
      wrong: "会话事件写失败了，工具应该跟着报错，不然数据就不一致了。",
      right:
        "反过来。事件是留痕，用户要的是工具本身干成的事。日志写不进去就降级成一条警告，别把用户的正事带崩。代价是磁盘上的真相和事件流可能短暂对不上，所以面板类界面应该以磁盘为准，别拿事件流当唯一真相。",
    },
  ],
  takeaways: [
    {
      title: "三条接缝速查",
      intro: "host 那半的活基本就这三样，各配一个入口。",
      items: [
        { label: "注册工具", text: "ctx.tools.register 加 defineTool，四件套是名字、说明、参数、输出。", hint: "demo/dsh-plugin-example/src/index.ts:72" },
        { label: "留一条痕", text: "exec.agent 上挂着当前会话，append 一条事件。包 try，失败只警告。", hint: "demo/dsh-plugin-example/src/index.ts:96" },
        { label: "登记事件名", text: "先并进会话事件表。这个文件两个程序共用，所以零 import；只有 host 那半的插件不受这条限制。", hint: "demo/dsh-plugin-example/src/event-types.ts:32" },
        { label: "开一条路由", text: "register 的返回值交给 ctx.effect，否则重载时撞车。", hint: "demo/dsh-plugin-example/src/index.ts:110" },
      ],
    },
    {
      title: "本例砍掉了什么",
      intro: "为了把例子压到最小，这几样真实插件通常要做的事没写。看的时候心里有数。",
      items: [
        { label: "状态没落盘", text: "便签存在进程内的数组里，重启就没了。真实插件一般写在工作区的文件里。" },
        { label: "读改写没串行化", text: "两个工具调用同时改同一份数据会互相盖。真实插件要用一把进程内的锁。" },
        { label: "状态不分会话", text: "所有会话看到同一份便签。按会话隔离要拿会话 id 分桶。" },
        { label: "路由没做鉴权", text: "这条路由谁都能读。放真实数据之前要想清楚这件事。" },
      ],
    },
  ],
  quiz: [
    {
      question: "在 event-types.ts 里加一行 import，把 host 侧会话包的类型引进来，会怎么样？",
      options: [
        "没影响，类型导入编译后会被擦掉",
        "浏览器那半的编译会被 host 的类型污染，报一堆和真正原因对不上的错",
        "编译更快，因为类型能复用",
      ],
      answer: 1,
      explain:
        "擦不擦得掉是运行时的事，这里出问题的是编译期。那个文件两个编译程序都要加载，带进去的 host 声明会和浏览器侧的同名声明打架，最后只有先加载的那份生效。",
      wrongExplains: [
        "擦不擦得掉是运行时的事，这里出问题的是编译期。类型导入照样会把那个模块的声明拉进编译程序，污染就是这么发生的。",
        "",
        "编译不会更快。多拉进来的声明只会让浏览器那半看见本不该看见的 host 类型，然后和自己那份打架。",
      ],
    },
    {
      question: "工具注册上了，模型就是不调它。先查哪个？",
      options: [
        "会话事件有没有写进去",
        "HTTP 路由通不通",
        "工具的 description 和 parameters 写清楚了没有",
      ],
      answer: 2,
      explain:
        "模型看不到你的代码，只看得到工具表里的说明和参数。事件和路由是给人和界面看的，跟模型调不调这个工具没有关系。",
      wrongExplains: [
        "会话事件是写给人和界面看的留痕。模型决定调不调工具的时候根本不看它，日志里有没有那条记录都一样。",
        "路由是给浏览器取数据用的。模型不走 HTTP，它看到的是工具表。",
        "",
      ],
    },
  ],
  evidence:
    "运行记录里 demo 那几行来自 npm run demo，逐行可核对。真实 DSH 那半只验证到类型检查和构建这一层：这个工具没有被模型真的调用过，事件也没有真的写进过任何会话日志，路由没有被真实请求过。",
  bridge:
    "数据已经能被外面读到了，但还得有人去读。下一节讲同一个包的另一半：跑在浏览器里、有界面的那一半，以及它是怎么被找到的。",
};
