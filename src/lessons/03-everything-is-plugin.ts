import type { Lesson } from "../tutorial/types";

export const everythingIsPlugin: Lesson = {
  id: "everything-is-plugin",
  index: "03",
  title: "一切皆插件",
  summary: "连权限都是插件",
  eyebrow: "设计思想",
  readingMinutes: 10,
  oneLiner: "循环里没有「权限」两个字。它只在动手前喊一嗓子，谁想拦谁拦。",
  analogy:
    "把内核想成工地上的包工头。他自己不刷墙不通电，只做三件事：记住谁会干什么活、让缺料的师傅先等着、师傅走时把梯子收回来。叫谁来干活，写在一张单子上。最有意思的是：拆墙之前包工头会朝屋里喊一嗓子「要拆了啊」，谁不同意谁出声——他并不认识安全员。把安全员从单子上划掉，活照干，只是没人拦了。",
  concepts: [
    {
      term: "插件",
      plain: "一个普通对象：叫什么名字、要用到哪些能力、装上时干什么。",
      source: "demo/mini-harness/kernel.ts · Plugin",
    },
    {
      term: "服务",
      plain: "挂在一个名字下的能力。别人按名字取，不用认识是谁提供的。",
      source: "demo/mini-harness/kernel.ts · provide() / get()",
    },
    {
      term: "事件",
      plain: "一个人喊一嗓子，所有在听的人都收到。喊的人不认识听的人。",
      source: "demo/mini-harness/kernel.ts · emit() / on()",
    },
    {
      term: "清理函数",
      plain: "插件被拆时要执行的收尾动作。登记一次，内核帮你记着。",
      source: "demo/mini-harness/kernel.ts · effect()",
    },
  ],
  stage: {
    nodes: [
      { id: "count", label: "计数插件", sub: "后来才加的", col: 2, row: 0, kind: "plugin" },
      { id: "list", label: "装配单", sub: "一行一个插件", col: 0, row: 1, kind: "data" },
      { id: "kernel", label: "内核", sub: "装上 排队 回收", col: 1, row: 1, kind: "core" },
      { id: "tools", label: "工具登记处", sub: "挂在 tools 名下", col: 2, row: 1, kind: "plugin" },
      { id: "loop", label: "循环", sub: "动手前喊一嗓子", col: 3, row: 1, kind: "core" },
      { id: "queue", label: "排队等着", sub: "依赖还没齐", col: 1, row: 3, kind: "data" },
      { id: "files", label: "文件工具", sub: "读文件 删文件", col: 2, row: 3, kind: "plugin" },
      { id: "approval", label: "审批插件", sub: "听见危险就拦", col: 3, row: 3, kind: "plugin" },
    ],
    edges: [
      { from: "list", to: "kernel", label: "照单装" },
      { from: "kernel", to: "tools", label: "装上" },
      { from: "kernel", to: "queue", label: "缺依赖先等" },
      { from: "queue", to: "files", label: "齐了就装" },
      { from: "files", to: "tools", label: "注册工具" },
      { from: "count", to: "tools", label: "也来注册" },
      { from: "tools", to: "loop", label: "取清单" },
      { from: "loop", to: "approval", label: "喊一嗓子" },
      { from: "approval", to: "loop", label: "拦下" },
      { from: "kernel", to: "count", label: "拆掉它" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "插件长什么样",
      detail:
        "插件不是什么特别的东西，就是一个普通对象。三样：叫什么名字、要用到谁、装上时干什么。没有基类，没有装饰器。",
      activeNodes: ["list"],
      activeEdges: [],
      log: [
        { kind: "state", text: "装配单 main.ts：一行一个插件，这次装 7 个" },
        { kind: "state", text: "logger / tool-files / tools / history / model-fake / approval / tool-count" },
        { kind: "state", text: "想去掉哪个功能，把那一行删掉就行" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:23",
        highlight: [5, 7],
        content: `export interface Plugin {
  /** 名字，出错时好定位 */
  name: string
  /** 我要用到哪些服务。它们都到齐了，setup 才会被调用。 */
  needs?: string[]
  /** 装载时执行一次。ctx 是这个插件专属的把手。 */
  setup(ctx: Context): void
}`,
        note: "needs 只写要用到的能力名，不写谁提供，也不 import 它。",
      },
    },
    {
      id: "s2",
      title: "缺依赖就先等",
      detail:
        "文件工具要用「工具登记处」这个能力。装配单里登记处写在它后面，现在还没有。内核不报错，也不重排，让它先在队里等着。",
      activeNodes: ["list", "kernel", "queue"],
      activeEdges: ["list->kernel", "kernel->queue"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "state", text: "它进了等待队列，setup 一行都没跑" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:59",
        highlight: [2],
        content: `use(plugin: Plugin): void {
  this.waiting.push({ plugin, provided: [], cleanups: [], active: false })
  if (!this.ready(plugin)) {
    this.announce('plugin/wait', {
      name: plugin.name,
      missing: (plugin.needs ?? []).filter((name) => !this.services.has(name)),
    })
  }
  this.drain()
}`,
        note: "不管依赖齐没齐，先进队列。所以装配单顺序随便写。",
      },
    },
    {
      id: "s3",
      title: "齐了就自动装",
      detail:
        "登记处装好，它挂上的能力立刻可用。内核回头再扫一遍队列，看见文件工具不缺东西了，就把它装上。你不用管顺序。",
      activeNodes: ["kernel", "tools", "queue", "files"],
      activeEdges: ["kernel->tools", "queue->files"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "装配单顺序和启动顺序，是两回事" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:94",
        highlight: [7, 9],
        content: `private drain(): void {
  // ...
  let progress = true
  while (progress) {
    progress = false
    for (const scope of [...this.waiting]) {
      if (!this.ready(scope.plugin)) continue
      this.waiting = this.waiting.filter((item) => item !== scope)
      this.start(scope)
      progress = true
    }
  }
}`,
        note: "装完一个可能又满足了别人，所以要一直扫到扫不出新的。",
      },
    },
    {
      id: "s4",
      title: "挂能力，取能力",
      detail:
        "登记处插件把自己挂在 tools 这个名字下。文件工具按这个名字取它，往里塞两个工具。两个文件谁也没 import 谁。",
      activeNodes: ["tools", "files", "count"],
      activeEdges: ["files->tools", "count->tools"],
      log: [
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=delete_file }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tools.ts:13",
        highlight: [12],
        content: `setup(ctx) {
  const registry = new Map<string, Tool>()

  const service: Tools = {
    register(tool) {
      registry.set(tool.name, tool)
      ctx.emit('tool/register', { name: tool.name })
    },
    // ...
  }

  ctx.provide('tools', service)
}`,
        note: "provide 挂上去，别人一句 ctx.get('tools') 就拿到了。",
      },
    },
    {
      id: "s5",
      title: "循环只喊一嗓子",
      detail:
        "打开 loop.ts 搜「权限」，一个字都没有。它动手前发一个 tool/before 事件，事件里带一个 block 函数。谁想拦，就调它。",
      activeNodes: ["tools", "loop"],
      activeEdges: ["tools->loop", "loop->approval"],
      log: [
        { kind: "call", text: 'tool/before { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "state", text: "循环并不知道有没有人在听" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:61",
        highlight: [5],
        content: `let blockedReason = ''
ctx.emit('tool/before', {
  name: call.name,
  args: call.args,
  block: (reason: string) => { blockedReason = reason },
})

if (blockedReason) {
  // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
  ctx.emit('tool/blocked', { name: call.name, reason: blockedReason })
  return blockedReason
}

const output = await tool.run(call.args)`,
        note: "循环只发事件，带一个 block 函数。谁调它，这次就不干了。",
      },
    },
    {
      id: "s6",
      title: "谁想拦谁拦",
      detail:
        "审批插件在听这个事件。看到工具带着危险标记，就调 block 拦下来。拒绝理由当成工具结果还给模型，它才知道发生了什么。",
      activeNodes: ["loop", "approval"],
      activeEdges: ["approval->loop"],
      log: [
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:25",
        highlight: [4, 12],
        content: `setup(ctx) {
  const tools = ctx.get<Tools>('tools')

  ctx.on('tool/before', (payload) => {
    const event = payload as {
      name: string
      block: (reason: string) => void
    }
    const tool = tools.find(event.name)
    if (!tool?.needsApproval) return
    // ...
    event.block('用户拒绝了这次操作。')
  })
}`,
        note: "把这个插件从装配单删掉，demo 照样跑，只是没人拦了。",
      },
    },
    {
      id: "s7",
      title: "拆掉，收干净",
      detail:
        "拆插件时，内核倒着跑它登记的清理函数，再把它挂的能力摘掉，监听也一起取消。没登记过的东西，内核看不见，收不走。",
      activeNodes: ["kernel", "count"],
      activeEdges: ["kernel->count"],
      log: [
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "warn", text: "count_files 还留在登记处：那笔注册没经过 ctx" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:71",
        highlight: [7, 8],
        content: `remove(name: string): void {
  const index = this.scopes.findIndex((scope) => scope.plugin.name === name)
  if (index === -1) return
  const scope = this.scopes[index]

  // 倒着执行清理函数：后登记的先收，和装的时候反过来
  for (let i = scope.cleanups.length - 1; i >= 0; i--) scope.cleanups[i]()
  for (const serviceName of scope.provided) this.services.delete(serviceName)

  scope.active = false
  this.scopes.splice(index, 1)
  this.announce('plugin/remove', { name })
}`,
        note: "内核只收两样：登记过的清理函数，和它挂上去的能力。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "一切皆插件，就是说没有内核，什么都能拆。",
      right:
        "内核就是 kernel.ts 这一个文件，它拆不掉。它只管三件事：谁提供了什么能力、谁在等什么能力、拆一个插件时怎么把它留下的东西收干净。读文件、问权限、跑模型，一件都不在里面。所以这句话准确的说法是：内核之上的一切都是插件。",
    },
    {
      wrong: "装配单里写在前面的，就先启动。",
      right:
        "不是。启动顺序由 needs 排出来，装配单的顺序不参与。demo 故意把文件工具写在登记处前面，运行记录第一行就是它在等：plugin/wait { name=tool-files, missing=[\"tools\"] }。等登记处装好，内核回头把它装上。",
    },
    {
      wrong: "插件一拆，它干过的一切都会自动消失。",
      right:
        "只有走 ctx 的那部分会。ctx.provide 挂的能力、ctx.on 的监听、ctx.effect 登记的清理函数，内核都记在这个插件名下，拆的时候一起收。绕过 ctx 做的事它看不见——tool-count 拆掉之后，它塞进登记处的 count_files 还在，因为那笔注册没经过 ctx，effect 里也没写退掉它。",
    },
  ],
  takeaways: [
    {
      title: "换来了什么",
      intro: "每条都能在 demo 里当场验证，不是泛泛的「解耦」。",
      items: [
        {
          label: "删一行，就少一个功能",
          text: "main.ts 就是一张装配单，一行一个插件。把 approval 那行删掉再跑，运行记录里直接就是 tool/after { name=delete_file, output=已删除 notes.txt }，没人拦了，其余一行不用改。（模型最后那句「你不让删」是假模型写死的剧本，不用管它。）",
          hint: "demo/mini-harness/main.ts:30",
        },
        {
          label: "加功能不用改老代码",
          text: "tool-count 给模型多加了一个数文件的工具。循环、工具登记处、审批插件，一个字都没动。",
          hint: "demo/mini-harness/plugins/tool-count.ts",
        },
        {
          label: "同一个名字可以换实现",
          text: "model 这个名字下现在挂的是一个按剧本回答的假模型，所以每次跑结果都一样。换成真模型只改装配单一行，循环那边取用的写法不变。",
          hint: "demo/mini-harness/plugins/model-fake.ts",
        },
        {
          label: "顺序不用你操心",
          text: "装配单谁先谁后都行。缺依赖的先排队，缺的东西一到就自动装上。你不用去想哪个该写在前面。",
          hint: "demo/mini-harness/kernel.ts · drain()",
        },
        {
          label: "规则可以外挂",
          text: "审批插件不提供任何能力，只听一个事件。它不在场，循环照跑；它在场，危险动作就被拦下。规则和主流程是分开的。",
          hint: "demo/mini-harness/plugins/approval.ts",
        },
      ],
    },
    {
      title: "代价是什么",
      intro: "只讲好处不讲代价，这节课就成软文了。下面四条也都能在 demo 里看见。",
      items: [
        {
          label: "一件事散在好几个文件里",
          text: "「删文件被拦下」这一件事，要看四个文件才拼得起来：循环发事件、文件工具打危险标记、审批插件拦下、日志插件才让你看见。出问题时，排查链路就是这么长。",
          hint: "loop.ts / tool-files.ts / approval.ts / logger.ts",
        },
        {
          label: "依赖名写错，插件不吭声",
          text: "把 needs 里的 'tools' 写成 'tool'，内核不报错，它就一直在队里等，setup 永远不跑。demo 专门留了 kernel.pending() 让你查还有谁在等，就是为这个。",
          hint: "demo/mini-harness/kernel.ts · pending()",
        },
        {
          label: "代码里看不出谁在拦你",
          text: "loop.ts 里搜不到 approval 三个字，只有一个 emit。想知道有谁在听这个事件，代码里翻不出来，只能看日志，或者回装配单数一遍。",
          hint: "demo/mini-harness/loop.ts:62",
        },
        {
          label: "内核只收它管得着的东西",
          text: "绕过 ctx 做的注册，得你自己在 ctx.effect 里写一句退掉。写漏了，插件拆了它还在——count_files 就是这么留下来的。",
          hint: "demo/mini-harness/plugins/tool-count.ts:33",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "把 approval 从装配单里删掉，再跑一遍 demo，会怎么样？",
      options: [
        "循环找不到审批这个能力，删文件那步报错停下",
        "删文件直接执行，其余照跑，因为没人听那个事件了",
        "内核发现少了一个插件，拒绝启动",
      ],
      answer: 1,
      explain:
        "循环从头到尾没提过 approval，它只是发了个 tool/before。没人监听，blockedReason 就一直是空的，工具照常执行。内核也不知道该有几个插件。",
    },
    {
      question: "tool-count 被拆掉后，它注册的 count_files 还在不在工具登记处？",
      options: [
        "不在了，内核会把它注册过的东西全撤掉",
        "还在，内核只收 ctx 上挂过的东西，这笔注册没经过 ctx",
        "要等下一轮循环才会被清掉",
      ],
      answer: 1,
      explain:
        "remove() 只做两件事：倒着跑清理函数、删掉它挂上去的能力。count_files 存在登记处自己的 Map 里，内核看不见，tool-count 的 effect 里也没写退掉它。",
    },
  ],
  bridge:
    "插件装上了，能力也接好了。下一节看它们真的伸手碰外面时——读文件、跑命令——会多出哪些麻烦。",
};
