import type { Lesson } from "../tutorial/types";

export const cordis: Lesson = {
  id: "cordis",
  index: "07",
  title: "核心框架 Cordis",
  summary: "插件容器是怎么实现的",
  eyebrow: "底层原理",
  readingMinutes: 12,
  oneLiner: "内核给每个插件发一块专属把手。你在上面挂的、听的、开的，拆插件时一次全收走。",
  analogy:
    "装修队进你家干活，先在地上铺一层地垫。工具、锯末、边角料，全落在垫子上。撤场时把地垫一卷，东西全带走，不用一样样清点。内核对每个插件做的就是这件事。DeepSeek Harness 的底座是 Cordis 这个开源框架，本节不看它的源码，只用我们自己写的那个两百行小内核，把同样的原理讲清楚。",
  concepts: [
    {
      term: "上下文（ctx）",
      plain: "插件拿到的那个把手。它记着你是谁，你挂的东西都算在你头上。",
      source: "demo/mini-harness/kernel.ts · Context",
    },
    {
      term: "服务",
      plain: "一个能力占一个名字。别人按名字取，不管背后是谁实现的。",
      source: "demo/mini-harness/kernel.ts · provide() / get()",
    },
    {
      term: "依赖等待",
      plain: "依赖没到齐，插件就先在队列里躺着，一行代码都不跑。",
      source: "demo/mini-harness/kernel.ts · use() / drain()",
    },
    {
      term: "作用域",
      plain: "一个插件在内核里占的那块地。拆它的时候，照着这块地收。",
      source: "demo/mini-harness/kernel.ts · Scope",
    },
  ],
  stage: {
    nodes: [
      { id: "plugin", label: "插件", sub: "name / needs / setup", col: 0, row: 0, kind: "plugin" },
      { id: "queue", label: "候补队列", sub: "waiting", col: 0, row: 2, kind: "data" },
      { id: "drain", label: "扫描装配", sub: "drain()", col: 1, row: 1, kind: "core" },
      { id: "ctx", label: "专属把手", sub: "Context", col: 2, row: 0, kind: "core" },
      { id: "scope", label: "那块地垫", sub: "provided / cleanups", col: 2, row: 2, kind: "data" },
      { id: "services", label: "服务表", sub: "名字 → 实现", col: 3, row: 0, kind: "data" },
      { id: "listeners", label: "监听表", sub: "事件 → 监听器", col: 3, row: 1, kind: "data" },
      { id: "remove", label: "撤场回收", sub: "remove(name)", col: 1, row: 3, kind: "core" },
    ],
    edges: [
      { from: "plugin", to: "queue", label: "先排队" },
      { from: "queue", to: "drain", label: "反复扫" },
      { from: "drain", to: "ctx", label: "齐了才装" },
      { from: "ctx", to: "services", label: "挂上 / 取用" },
      { from: "ctx", to: "listeners", label: "登记监听" },
      { from: "ctx", to: "scope", label: "全记一笔" },
      { from: "services", to: "drain", label: "叫醒还在等的" },
      { from: "scope", to: "remove", label: "倒着收干净" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "先排队，不急着装",
      detail:
        "装配单里 tool-files 写在 tools 前面。它要的 tools 还没人提供。内核不报错也不跑它，先塞进候补队列等着。",
      activeNodes: ["plugin", "queue"],
      activeEdges: ["plugin->queue"],
      log: [
        { kind: "call", text: "kernel.use(toolFiles)" },
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "state", text: "waiting: [tool-files]" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:59",
        highlight: [2, 9],
        content: `  use(plugin: Plugin): void {
    this.waiting.push({ plugin, provided: [], cleanups: [], active: false })
    if (!this.ready(plugin)) {
      this.announce('plugin/wait', {
        name: plugin.name,
        missing: (plugin.needs ?? []).filter((name) => !this.services.has(name)),
      })
    }
    this.drain()
  }`,
        note: "不管依赖齐没齐，先塞进队列。最后那行 drain() 才真正开始装。",
      },
    },
    {
      id: "s2",
      title: "依赖齐了才装",
      detail:
        "tools 装上之后，内核回头再扫一遍队列。这回 tool-files 的依赖齐了，立刻装它。扫到扫不出新的为止，所以装配单的顺序无所谓。",
      activeNodes: ["queue", "drain", "services"],
      activeEdges: ["services->drain", "queue->drain"],
      log: [
        { kind: "call", text: "kernel.use(tools)" },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "state", text: "drain() 回头再扫一遍 waiting" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:94",
        highlight: [6, 11],
        content: `  private drain(): void {
    if (this.busy) return
    this.busy = true
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
      }`,
        note: "装完一个可能又满足了别人，所以要一直扫到扫不出新的为止。",
      },
    },
    {
      id: "s3",
      title: "发一块专属把手",
      detail:
        "内核不是直接调用插件，而是现造一个 ctx 交给它。这个 ctx 记着自己属于哪个插件。所以你在上面挂什么，内核都知道该算在谁头上。",
      activeNodes: ["drain", "ctx"],
      activeEdges: ["drain->ctx"],
      log: [
        { kind: "call", text: "scope.plugin.setup(new Context(this, scope))" },
        { kind: "state", text: "这个 ctx 的 scope 指向 tool-files 那块地" },
        { kind: "state", text: "scopes: [logger, tools, tool-files]" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:116",
        highlight: [5, 11],
        content: `  private start(scope: Scope): void {
    scope.active = true
    this.scopes.push(scope)
    this.announce('plugin/start', { name: scope.plugin.name })
    scope.plugin.setup(new Context(this, scope))
  }
// ...
export class Context {
  private kernel: Kernel
  /** 这个 ctx 属于哪个插件。回收就是按它来的。 */
  private scope: { provided: string[]; cleanups: Cleanup[] }`,
        note: "第 5 行现造一个 ctx，把这个插件的地垫绑进去。",
      },
    },
    {
      id: "s4",
      title: "挂上一个能力",
      detail:
        "tools 插件把工具登记处挂到 tools 这个名字下。内核干两件事：写进服务表，再在这个插件名下记一笔。这一笔就是将来回收的凭据。",
      activeNodes: ["ctx", "services", "scope"],
      activeEdges: ["ctx->services", "ctx->scope"],
      log: [
        { kind: "call", text: "ctx.provide('tools', service)" },
        { kind: "state", text: "服务表: 'tools' -> 工具登记处" },
        { kind: "state", text: "scope(tools).provided: ['tools']" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:176",
        highlight: [4],
        content: `  /** 把一个能力挂上去，别人按名字取用 */
  provide(name: string, value: unknown): void {
    this.kernel.setService(name, value)
    this.scope.provided.push(name)
  }`,
        note: "第 4 行是关键：挂出去的同时，在自己名下记一笔。",
      },
    },
    {
      id: "s5",
      title: "按名字取能力",
      detail:
        "tool-files 只认 tools 这个名字，不认背后是谁实现的。换一个实现，它一行都不用改。取不到就当场报错，不会悄悄给你一个空值。",
      activeNodes: ["ctx", "services"],
      activeEdges: ["ctx->services"],
      log: [
        { kind: "call", text: "const tools = ctx.get<Tools>('tools')" },
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=delete_file }" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:182",
        highlight: [4],
        content: `  /** 按名字取一个能力。取不到就报错，因为多半是忘了写 needs。 */
  get<T>(name: string): T {
    if (!this.kernel.hasService(name)) {
      throw new Error(\`没有找到服务 "\${name}"。是不是忘了在 needs 里声明？\`)
    }
    return this.kernel.getService(name) as T
  }`,
        note: "报错这句话直接告诉你下一步该改哪儿。",
      },
    },
    {
      id: "s6",
      title: "登记和清理",
      detail:
        "tool-count 注册完工具，交出一个清理函数。监听事件也一样，内核顺手把「取消这次监听」也存进同一张清单。地垫上现在有东西了。",
      activeNodes: ["ctx", "listeners", "scope"],
      activeEdges: ["ctx->listeners", "ctx->scope"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "call", text: "ctx.effect(() => ctx.emit('count/bye', { calls }))" },
        { kind: "state", text: "scope(tool-count).cleanups: 1 条" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:190",
        highlight: [4, 8],
        content: `  /** 监听事件。拆插件时会自动取消。 */
  on(event: string, fn: Listener): void {
    this.kernel.addListener(event, fn)
    this.scope.cleanups.push(() => this.kernel.listenersOf(event)?.delete(fn))
  }
// ...
  effect(cleanup: Cleanup): void {
    this.scope.cleanups.push(cleanup)
  }`,
        note: "第 4 行和第 8 行做的是同一件事：往同一张清单上写。",
      },
    },
    {
      id: "s7",
      title: "撤场，倒着收",
      detail:
        "拆掉 tool-count。清单上的清理函数倒着跑一遍，后登记的先收；再把它挂的服务从表里删掉。别的插件一点没被碰到，这就是热插拔。",
      activeNodes: ["scope", "remove", "services", "listeners"],
      activeEdges: ["scope->remove"],
      log: [
        { kind: "call", text: "kernel.remove('tool-count')" },
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "ok", text: "其余六个插件照常在跑" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:70",
        highlight: [8, 9],
        content: `  /** 拆一个插件。它挂的服务、登记的清理函数，全部回收。 */
  remove(name: string): void {
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
        note: "第 8 行倒着跑清理，第 9 行删服务。两行都只认这块地垫。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "所有插件共用同一个 ctx 对象。",
      right:
        "每个插件拿到的都是现造的。start() 里写着 setup(new Context(this, scope))，装一次就造一个。它们看到的服务表是同一张，但各自记着自己是谁。正因为这样，你挂的东西才算得到你头上，拆你的时候才收得准。",
    },
    {
      wrong: "拆掉一个插件，它注册过的工具会自动消失。",
      right:
        "不一定。内核只回收记在这块地垫上的三样东西：provide 挂的服务、on 登记的监听、effect 交出来的清理函数。demo 里 tool-count 的 effect 只发了一句 count/bye，没有交出「把 count_files 从工具表里摘掉」这个动作，所以拆完之后那个工具还在。要真收干净，得自己在 effect 里写。",
    },
    {
      wrong: "A 要 B、B 要 A 的时候，内核会检测出循环依赖并报错。",
      right:
        "内核里一行环检测的代码都没有。装谁不装谁完全由「服务在不在」推动，两个互相等的插件就一直躺在队列里，不报错、不执行，也不占 CPU。想知道谁卡住了就调 kernel.pending()，它会把还在排队的插件和各自缺的东西列出来。",
    },
  ],
  takeaways: [
    {
      title: "ctx 上的六个方法",
      intro: "插件能对内核做的事全在这儿了。写插件时对着查。",
      items: [
        {
          label: "provide(name, value)",
          text: "把一个能力挂上去，让别人按名字取。同时在你名下记一笔。",
          hint: "demo/mini-harness/kernel.ts:177",
        },
        {
          label: "get(name)",
          text: "按名字取一个能力。没有就当场报错，顺便提醒你可能漏写了 needs。",
          hint: "demo/mini-harness/kernel.ts:183",
        },
        {
          label: "on(event, fn)",
          text: "听一个事件。拆你的时候监听会自动取消，不用你操心。",
          hint: "demo/mini-harness/kernel.ts:191",
        },
        {
          label: "emit(event, payload)",
          text: "发一个事件，通知所有在听的人。发完就走，不等回复。",
          hint: "demo/mini-harness/kernel.ts:197",
        },
        {
          label: "effect(cleanup)",
          text: "交出一个清理函数。定时器、连接这类东西必须走它。",
          hint: "demo/mini-harness/kernel.ts:206",
        },
        {
          label: "plugin(p)",
          text: "在你的上下文里再装一个插件。插件套插件就靠它。",
          hint: "demo/mini-harness/kernel.ts:211",
        },
      ],
    },
    {
      title: "什么会被自动收走，什么不会",
      intro: "判断标准只有一条：这件事有没有经过 ctx。",
      items: [
        { label: "会收", text: "provide 挂上去的服务。拆插件时从服务表里删掉。" },
        { label: "会收", text: "on 登记的监听。拆插件时自动取消，不会有幽灵监听器。" },
        { label: "会收", text: "effect 交出来的清理函数。倒着跑一遍，后登记的先收。" },
        { label: "不收", text: "你自己开的定时器、连接、临时文件。内核压根不知道它存在。" },
        { label: "不收", text: "你借别人的服务留下的痕迹，比如往工具表里塞的那个工具。" },
        { label: "所以", text: "凡是「做了就必须记得撤」的动作，都用 effect 把撤的那一步交出来。" },
      ],
    },
  ],
  quiz: [
    {
      question: "装配单里把 tool-files 写在 tools 前面，跑起来会怎样？",
      options: [
        "启动就报错，提示 tools 还没准备好",
        "tool-files 照常执行，取 tools 时拿到 undefined",
        "tool-files 先进队列等着，tools 装好后内核回头装它",
      ],
      answer: 2,
      explain:
        "use 只负责把插件塞进队列，装谁由 drain 反复扫决定。不报错是因为依赖可能晚一点才到；不执行是因为跑了也没法用。",
    },
    {
      question: "插件在 setup 里用 setInterval 开了个定时器，没有交给 ctx.effect()。拆掉这个插件后会怎样？",
      options: [
        "内核扫一遍运行时，自动把这个定时器停掉",
        "定时器继续跑，因为它没进那张清理清单",
        "拆的时候内核会检测到并报错",
      ],
      answer: 1,
      explain:
        "remove 只认 scope.cleanups 这一张清单。没登记过的东西内核根本不知道它存在，既不会清也不会报错——这就是 effect 存在的理由。",
    },
  ],
  bridge:
    "七节到这儿走完了。你现在知道 Harness 是什么、一个回合是怎么转起来的、为什么一切都做成插件、插件怎么碰到外面的世界、自己动手写一个要写哪几样，也知道了托着这一切的容器底下是什么样子。接下来把 demo/mini-harness 整个跑一遍，然后动手改装配单：删掉 approval，看危险动作会变成什么样；再照着 tool-count 加一个你自己的工具插件。这套骨架看懂了，再去读任何一个真实 Harness 的源码，你会发现它们长得都差不多。",
};
