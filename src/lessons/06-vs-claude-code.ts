import type { Lesson } from "../tutorial/types";

export const vsClaudeCode: Lesson = {
  id: "vs-claude-code",
  index: "06",
  title: "跟 Claude Code 的区别",
  summary: "最本质的那一个差异",
  eyebrow: "横向对比",
  readingMinutes: 8,
  oneLiner:
    "一边是封好的成品机，外壳上留了几个插口；一边是摊开的散件，连主循环都能换。",
  analogy:
    "想象两台电脑。一台是品牌机，机箱封着，前面板留了几个 USB 口。鼠标、硬盘都能插上去。但里面的 CPU 换不了，那是厂商的事。另一台是摊开的散件，附一张装机清单，一行一个零件。想换 CPU，改清单里那一行。前一台是 Claude Code，后一台是 DeepSeek Harness 这类框架。",
  concepts: [
    {
      term: "装配单",
      plain: "一份清单，一行一个零件。写上就有，删掉就没。",
      source: "demo/mini-harness/main.ts:25 · 那七行 kernel.use()",
    },
    {
      term: "固定插口",
      plain: "成品留在外壳上的接口。你能往上接东西，改不了里面。",
      source: "demo 里没有对应物：它只有装配单，没有外壳",
    },
    {
      term: "按名字取用",
      plain: "循环只认服务的名字，不认背后是谁。所以换人不用改循环。",
      source: "demo/mini-harness/loop.ts:19 · ctx.get()",
    },
    {
      term: "可拆",
      plain: "拆掉一个插件，它挂上去的东西会被内核收回去。",
      source: "demo/mini-harness/kernel.ts:71 · remove()",
    },
  ],
  stage: {
    nodes: [
      { id: "cc-yours", label: "你写的工具", sub: "跑在自己的进程里", col: 0, row: 1, kind: "external" },
      { id: "cc-slot", label: "固定插口", sub: "MCP、hooks 等", col: 1, row: 0, kind: "external" },
      { id: "cc-inside", label: "成品内部", sub: "产品自己维护", col: 1, row: 2, kind: "core" },
      { id: "mh-yours", label: "你写的插件", sub: "和自带的一样", col: 2, row: 0, kind: "plugin" },
      { id: "mh-list", label: "装配单", sub: "main.ts", col: 2, row: 1, kind: "data" },
      { id: "mh-parts", label: "自带的插件", sub: "审批、模型、工具", col: 2, row: 2, kind: "plugin" },
      { id: "mh-loop", label: "循环", sub: "也能整个换掉", col: 3, row: 0, kind: "core" },
      { id: "mh-kernel", label: "内核", sub: "只管装和拆", col: 3, row: 1, kind: "core" },
    ],
    edges: [
      { from: "cc-yours", to: "cc-slot", label: "接上去" },
      { from: "cc-slot", to: "cc-inside", label: "产品接进去" },
      { from: "mh-yours", to: "mh-list", label: "加一行" },
      { from: "mh-parts", to: "mh-list", label: "删一行就没" },
      { from: "mh-list", to: "mh-kernel", label: "照单装" },
      { from: "mh-kernel", to: "mh-loop", label: "服务按名取" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "边界画在哪",
      detail:
        "两边都能扩展，区别是边界画在哪。成品把边界画在外壳上，插口就那么几个，固定的。可拆框架没有外壳，装配单上写几行，就有几个零件。",
      activeNodes: ["cc-slot", "cc-inside", "mh-list", "mh-kernel"],
      activeEdges: ["cc-slot->cc-inside", "mh-list->mh-kernel"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=approval }" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "state", text: "装配单上七行 kernel.use，装的就是这七个零件" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:25",
        highlight: [6],
        content: `kernel.use(logger)
kernel.use(toolFiles)
kernel.use(tools)
kernel.use(history)
kernel.use(modelFake)
kernel.use(approval)
kernel.use(toolCount)`,
        note: "整个 demo 的零件就这七行。删一行，那个功能就没了。",
      },
    },
    {
      id: "s2",
      title: "加一个工具",
      detail:
        "在可拆框架这边，加工具就是写一个插件。声明你要用 tools 服务，拿到它，注册一个工具。写完在装配单里加一行。",
      activeNodes: ["mh-yours", "mh-list", "mh-kernel"],
      activeEdges: ["mh-yours->mh-list", "mh-list->mh-kernel"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
        { kind: "io", text: "tool/after { name=count_files, output=工作区里有 2 个文件。（这个工具被调用了 1 次） }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts:18",
        highlight: [5],
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
  })`,
        note: "tools.register 这一行就是全部。循环每轮重新问一遍有哪些工具。",
      },
    },
    {
      id: "s3",
      title: "成品那边呢",
      detail:
        "成品是闭源的，你塞不进代码。给外部工具留的口是 MCP：工具跑在你自己的进程里，产品按公开协议问它有哪些工具，再并进工具列表。",
      activeNodes: ["cc-yours", "cc-slot", "cc-inside"],
      activeEdges: ["cc-yours->cc-slot", "cc-slot->cc-inside"],
      log: [
        { kind: "io", text: "你的工具跑在自己的进程里" },
        { kind: "call", text: "产品按 MCP 协议问它有哪些工具" },
        { kind: "state", text: "内置工具和你的工具一起交给模型" },
        { kind: "warn", text: "这一步没有代码可贴：产品内部不开源" },
      ],
    },
    {
      id: "s4",
      title: "删掉一行",
      detail:
        "现在换个方向：不是加，是拆。demo 跑到删文件那一步被拦住了。拦它的不是循环，是 approval 插件。把装配单里那一行删掉，就没人拦了。",
      activeNodes: ["mh-parts", "mh-list", "mh-kernel"],
      activeEdges: ["mh-parts->mh-list", "mh-list->mh-kernel"],
      log: [
        { kind: "call", text: 'tool/before { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "删掉 kernel.use(approval)，上面这三行就不会出现" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:28",
        highlight: [1, 11],
        content: `ctx.on('tool/before', (payload) => {
  const event = payload as {
    name: string
    block: (reason: string) => void
  }

  const tool = tools.find(event.name)
  if (!tool?.needsApproval) return
  // ...
  ctx.emit('approval/deny', { name: event.name })
  event.block('用户拒绝了这次操作。')
})`,
        note: "循环只发了个 tool/before 事件。拦不拦，是这个插件的事。",
      },
    },
    {
      id: "s5",
      title: "换掉模型",
      detail:
        "同一招推到极限。demo 里的模型是假的，按剧本回答。换成真模型，只改装配单里 modelFake 那一行。循环不用动，它只认「model」这个名字。",
      activeNodes: ["mh-parts", "mh-list", "mh-kernel", "mh-loop"],
      activeEdges: ["mh-parts->mh-list", "mh-list->mh-kernel", "mh-kernel->mh-loop"],
      log: [
        { kind: "call", text: "model/request { round=1, toolCount=3, messageCount=1 }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
        { kind: "state", text: "循环只调 model.ask，不关心背后是假模型还是真模型" },
        { kind: "state", text: "循环自己也是 main.ts 里的一行 import，照样能整个换掉" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:20",
        highlight: [1],
        content: `const model = ctx.get<Model>('model')
// ...
const reply = await model.ask({
  system: SYSTEM,
  tools: tools.list(),
  messages: history.all(),
})`,
        note: "循环按名字取「model」。谁提供的它不管，换人不用改这里。",
      },
    },
    {
      id: "s6",
      title: "各自的账",
      detail:
        "这份自由不是白来的。装配单是你的，装什么、少装了谁，都要自己盯；出了问题，要从装配单一路查到具体插件。成品那边装上就能用。",
      activeNodes: ["cc-yours", "cc-slot", "mh-yours", "mh-list"],
      activeEdges: ["cc-yours->cc-slot", "mh-yours->mh-list"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "state", text: "装配单里 tool-files 写在 tools 前面，它排了一下队" },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "这次自己排开了。真要少装了 tools，它会一直等下去" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:23",
        highlight: [4, 5],
        content: `// 装配单。顺序随便写——依赖没齐的插件会自己排队等。
// 这里故意把 tool-files 写在 tools 前面，你可以在运行记录里看到它等了一下。
kernel.use(logger)
kernel.use(toolFiles)
kernel.use(tools)`,
        note: "顺序不重要。但少装一个零件，插件会一直等着——得你自己去查。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "Claude Code 闭源，所以扩展能力弱。",
      right:
        "不成立。MCP 是一份公开协议，一个 MCP 服务能同时给好几个 agent 产品用，不用为每家重写一遍。hooks 跑在单独的进程里，天然隔开一道边界。换成跑在同一个进程里的插件，这两条好处都会没有。",
    },
    {
      wrong: "能拆开，就一定更好用。",
      right:
        "自由度和上手成本是同一枚硬币。装配单得你自己维护：装了什么、什么顺序、有没有少装，都要自己盯。出了问题也要从装配单一路查到具体插件，链路比改一个配置开关长得多。",
    },
    {
      wrong: "这是同一个东西的两种写法，功能迟早会对齐。",
      right:
        "它们的边界画在不同地方。成品的插口由产品定义、数量固定，好处是装上就能用；可拆框架没有「产品」这一层，装什么由你决定。功能重合是结果，不是目标。",
    },
  ],
  takeaways: [
    {
      title: "两边各自的账",
      intro: "同一件事，两种代价。没有哪边天然更高级。",
      items: [
        {
          label: "成品：装上就能用",
          text: "不用先学装配单怎么写。Claude Code 还有 CLI、桌面、网页、IDE 几种形态，换个地方接着用。",
        },
        {
          label: "成品：协议是公开的",
          text: "MCP 不属于某一家产品。你写的一个 MCP 服务，能同时给好几个 agent 产品用。",
        },
        {
          label: "成品：进程隔开了",
          text: "hooks 跑在单独的进程里，天然隔开一道边界。跑在同一个进程里的插件没有这道边界。",
        },
        {
          label: "可拆：装配单是你的",
          text: "装什么、什么顺序、少装了谁，都归你管。没人替你兜底。",
          hint: "demo/mini-harness/main.ts:23",
        },
        {
          label: "可拆：排查链路更长",
          text: "一个行为不对，要先看装配单装了谁，再看是哪个插件在监听。",
          hint: "demo/mini-harness/kernel.ts:129 · pending()",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "在 demo 里，怎么让「删文件之前先问一句」这个行为消失？",
      options: [
        "去 loop.ts 里把审批那段代码注释掉",
        "把 main.ts 装配单里 kernel.use(approval) 那一行删掉",
        "给 delete_file 工具加一个「不用审批」的参数",
      ],
      answer: 1,
      explain:
        "loop.ts 里根本没有审批代码，它只在动手前发了个 tool/before 事件，所以第一个选项没东西可注释。拦是 approval 插件干的，删掉装配单那一行，就没人监听这个事件了。",
    },
    {
      question: "同样是给 agent 加一个自己的工具，两边最大的区别在哪？",
      options: [
        "成品那边工具跑在自己的进程里、按公开协议接进去；可拆框架那边你的插件和自带的走同一条路",
        "成品那边加不了工具，只能用内置的那些",
        "可拆框架那边加工具，得先改内核的代码",
      ],
      answer: 0,
      explain:
        "成品加得了工具，靠的就是 MCP 这种留好的口，所以第二个选项不对。可拆框架这边也不用改内核：tool-count 是普通插件，和自带的 tool-files 一样，都是装配单上的一行。",
    },
  ],
  bridge:
    "这节反复在说「装配单里加一行」「删一行」。下一节拆开内核，看这一行到底做了什么：插件怎么被装上去，拆的时候又怎么把它留下的东西收干净。",
};
