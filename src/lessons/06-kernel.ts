import type { Lesson } from "../tutorial/types";

/**
 * 承接旧的 07-cordis.ts。改了标题：原来叫「核心框架 Cordis」，
 * 正文却整节都在讲我们自己写的 kernel.ts，标题和交付对不上。
 *
 * 现在标题讲实现，Cordis 放在最后一组课后补充里交代，
 * 并且用 demo/mini-harness/README.md 末尾那张差距表说清真实容器多了什么。
 *
 * 和第 05 节的分工：那一节讲插件的契约和对外行为，这一节只讲内核的实现，
 * 所以七步全部贴 kernel.ts，不重复贴插件侧的文件。
 */

export const kernelThreeJobs: Lesson = {
  id: "kernel",
  index: "06",
  title: "内核只做三件事：排队、记账、回收",
  summary: "插件容器怎么实现的",
  eyebrow: "拆开来看",
  group: "take-apart",
  readingMinutes: 11,
  oneLiner: "内核不认识模型也不认识工具。它只管排队、记账、回收这三件事。",
  analogy:
    "装修队进你家干活，先在地上铺一层地垫。工具、锯末、边角料，全落在垫子上。撤场时把地垫一卷，东西全带走，不用一样样清点。进场也有讲究：电还没通，工人就在门口等着，一根线都不接——不是不干，是干了也没用。内核对每件插件做的就是这两件事。",
  concepts: [
    {
      term: "上下文 ctx",
      plain: "插件跟内核说话的口子。和模型的上下文不是一回事，别搞混。",
      source: "demo/mini-harness/kernel.ts · Context",
    },
    {
      term: "作用域",
      plain: "一件插件在内核里占的那块地。拆它的时候，照着这块地收。",
      source: "demo/mini-harness/kernel.ts · Scope",
    },
    {
      term: "依赖等待",
      plain: "依赖没到齐，插件就先在队里躺着，一行代码都不跑。",
      source: "demo/mini-harness/kernel.ts · drain()",
    },
    {
      term: "清理函数",
      plain: "插件被拆时要执行的收尾动作。登记一次，内核帮你记着。",
      source: "demo/mini-harness/kernel.ts · effect()",
    },
  ],
  stage: {
    nodes: [
      { id: "plugin", label: "一件插件", sub: "name needs setup", col: 0, row: 0, kind: "plugin" },
      { id: "queue", label: "候补队列", sub: "依赖还没齐", col: 0, row: 2, kind: "data" },
      { id: "drain", label: "反复扫", sub: "齐了就装", col: 1, row: 1, kind: "core" },
      { id: "remove", label: "撤场", sub: "倒着收干净", col: 1, row: 3, kind: "core" },
      { id: "ctx", label: "专属把手", sub: "每件插件一个", col: 2, row: 0, kind: "core" },
      { id: "scope", label: "那块地", sub: "记你挂过什么", col: 2, row: 2, kind: "data" },
      { id: "services", label: "服务表", sub: "名字 → 实现", col: 3, row: 0, kind: "data" },
      { id: "listeners", label: "监听表", sub: "事件 → 谁在听", col: 3, row: 1, kind: "data" },
    ],
    edges: [
      { from: "plugin", to: "queue", label: "先排队" },
      { from: "queue", to: "drain", label: "反复扫" },
      { from: "services", to: "drain", label: "叫醒等着的" },
      { from: "drain", to: "ctx", label: "齐了才装" },
      { from: "ctx", to: "services", label: "挂上 / 取用" },
      { from: "ctx", to: "listeners", label: "登记监听" },
      { from: "ctx", to: "scope", label: "全记一笔" },
      { from: "scope", to: "remove", label: "倒着收" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "先排队，不急着装",
      detail:
        "清单里文件工具写在登记处前面，它要的东西还没人提供。内核不报错也不跑它，先塞进候补队列。",
      activeNodes: ["plugin", "queue"],
      activeEdges: ["plugin->queue"],
      log: [
        { kind: "call", text: "kernel.use(toolFiles)" },
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "state", text: "它进了候补队列，setup 一行都没跑" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:75",
        highlight: [2, 9],
        content: `  use(plugin: Plugin, config: Record<string, unknown> = {}): void {
    this.waiting.push({ plugin, config, provided: [], cleanups: [], active: false })
    if (!this.ready(plugin)) {
      this.announce('plugin/wait', {
        name: plugin.name,
        missing: (plugin.needs ?? []).filter((name) => !this.services.has(name)),
      })
    }
    this.drain()
  }`,
        note: "不管依赖齐没齐，第 2 行都先进队列。真正开始装的是最后那行。",
      },
    },
    {
      id: "s2",
      title: "依赖齐了才装",
      detail:
        "登记处装上之后，内核回头再扫一遍队列。这回文件工具不缺东西了，立刻装它。扫到扫不出新的为止。",
      activeNodes: ["queue", "drain", "services"],
      activeEdges: ["queue->drain", "services->drain"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "state", text: "回头再扫一遍候补队列" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "所以清单的顺序无所谓，写反了它自己会绕回来" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:110",
        highlight: [7, 13],
        content: `  private drain(): void {
    if (this.busy) return
    this.busy = true

    try {
      let progress = true
      while (progress) {
        progress = false
        for (const scope of [...this.waiting]) {
          if (!this.ready(scope.plugin)) continue
          // 先从队列里摘掉，再装。不然装的过程中又会扫到它自己。
          this.waiting = this.waiting.filter((item) => item !== scope)
          this.start(scope)`,
        note: "装完一件可能又满足了别人，所以第 7 行那个循环要一直转到没有新进展。",
      },
    },
    {
      id: "s3",
      title: "每件插件发一块自己的地",
      detail:
        "内核不是直接调插件的 setup，而是现造一个 ctx 交给它。这个 ctx 记着自己属于谁，回收就靠它。",
      activeNodes: ["drain", "ctx"],
      activeEdges: ["drain->ctx"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "state", text: "现造一个 ctx，把 tools 那块地绑进去" },
        { kind: "state", text: "下一件插件拿到的是另一个 ctx，绑的是它自己那块地" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:132",
        highlight: [5, 10],
        content: `  private start(scope: Scope): void {
    scope.active = true
    this.scopes.push(scope)
    this.announce('plugin/start', { name: scope.plugin.name })
    scope.plugin.setup(new Context(this, scope), scope.config)
  }
// ...
export class Context {
  private kernel: Kernel
  /** 这个 ctx 属于哪个插件。回收就是按它来的。 */
  private scope: { provided: string[]; cleanups: Cleanup[] }`,
        note: "第 5 行现造一个 ctx，把这件插件的那块地绑进去，顺手把配置递过去。",
      },
    },
    {
      id: "s4",
      title: "挂一个能力，同时记一笔",
      detail:
        "登记处插件把自己挂到 tools 这个名字下。内核干两件事：写进服务表，再在这件插件名下记一笔。",
      activeNodes: ["ctx", "services", "scope"],
      activeEdges: ["ctx->services", "ctx->scope"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "state", text: "服务表：tools → 工具登记处" },
        { kind: "state", text: "tools 那块地上记了一笔：挂过 tools 这个名字" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:199",
        highlight: [4],
        content: `  /** 把一个能力挂上去，别人按名字取用 */
  provide(name: string, value: unknown): void {
    this.kernel.setService(name, value)
    this.scope.provided.push(name)
  }`,
        note: "第 4 行是关键：挂出去的同时，在自己名下记一笔。这笔就是将来回收的凭据。",
      },
    },
    {
      id: "s5",
      title: "按名字取，取不到当场报错",
      detail:
        "文件工具只认 tools 这个名字，不认背后是谁写的。换一个实现，它一行不用改。取不到就当场抛错。",
      activeNodes: ["ctx", "services"],
      activeEdges: ["ctx->services"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=stat_file }" },
        { kind: "ok", text: "tool/register { name=delete_file }" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:205",
        highlight: [4],
        content: `  /** 按名字取一个能力。取不到就报错，因为多半是忘了写 needs。 */
  get<T>(name: string): T {
    if (!this.kernel.hasService(name)) {
      throw new Error(\`没有找到服务 "\${name}"。是不是忘了在 needs 里声明？\`)
    }
    return this.kernel.getService(name) as T
  }`,
        note: "不给你一个空值让你带着跑，直接抛。报错那句话就把下一步该改哪儿写出来了。",
      },
    },
    {
      id: "s6",
      title: "听和清理，写进同一张单子",
      detail:
        "计数插件注册完工具，交出一个清理函数。听事件也一样：内核顺手把「取消这次监听」也写进同一张单子。",
      activeNodes: ["ctx", "listeners", "scope"],
      activeEdges: ["ctx->listeners", "ctx->scope"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "state", text: "这件插件那块地上，清理单子现在有 1 条" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:213",
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
        note: "第 4 行和第 8 行干的是同一件事：往同一张清理单子上写一条。",
      },
    },
    {
      id: "s7",
      title: "撤场，倒着收",
      detail:
        "拆掉计数插件。单子上的清理函数倒着跑一遍，后登记的先收；再把它挂的服务从表里删掉。别人没被碰到。",
      activeNodes: ["scope", "remove", "services", "listeners"],
      activeEdges: ["scope->remove"],
      log: [
        { kind: "call", text: "kernel.remove('tool-count')" },
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "ok", text: "进程没重启，其余八件插件照常在跑" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:86",
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
        note: "第 8 行倒着跑清理，第 9 行删服务。两行都只认这块地上记着的那些。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "所有插件共用同一个 ctx 对象。",
      right:
        "每件插件拿到的都是现造的。start() 里写着 setup(new Context(this, scope), scope.config)，装一件就造一个。它们看到的服务表是同一张，但各自记着自己是谁。正因为这样，你挂的东西才算得到你头上，拆你的时候才收得准。",
    },
    {
      wrong: "内核只做排队、记账、回收，事件是插件之间自己传的。",
      right:
        "事件也走内核。ctx.on 和 ctx.intercept 都是把你的函数存进内核里的两张表，发的时候由内核挨个叫。但它对内容一无所知：事件名就是个字符串，它不检查有没有人在听，也不检查名字拼没拼错。所以事件名写错，发的人和听的人两边都不会报错。这两张表的账同样记在那块地上，拆你的时候一起撤。",
    },
    {
      wrong: "拆掉一件插件，它注册过的工具会自动消失。",
      right:
        "不一定。内核只回收记在这块地上的三样：provide 挂的服务、on 和 intercept 登记的监听、effect 交出来的清理函数。demo 里计数插件的 effect 只发了一句 count/bye，没有交出「把 count_files 从工具表里摘掉」这个动作，所以拆完之后那个工具还在。要真收干净，得自己在 effect 里写。",
    },
    {
      wrong: "A 要 B、B 要 A 的时候，内核会检测出循环依赖并报错。",
      right:
        "这个内核里一行环检测的代码都没有。装谁不装谁完全由「服务在不在」推动，两件互相等的插件就一直躺在队列里，不报错、不执行，也不占 CPU。想知道谁卡住了就调 kernel.pending()，它会把还在排队的插件和各自缺的东西列出来。",
    },
  ],
  takeaways: [
    {
      title: "ctx 上有哪些把手",
      intro: "这个 demo 里的全部把手都在这儿。写插件时对着查。",
      items: [
        {
          label: "provide(name, value)",
          text: "把一个能力挂上去，让别人按名字取。同时在你名下记一笔。",
          hint: "demo/mini-harness/kernel.ts:200",
        },
        {
          label: "get(name)",
          text: "按名字取一个能力。没有就当场抛错，顺便提醒你可能漏写了 needs。",
          hint: "demo/mini-harness/kernel.ts:206",
        },
        {
          label: "on(event, fn)",
          text: "听一个事件。拆你的时候监听会自动取消，不用你操心。",
          hint: "demo/mini-harness/kernel.ts:214",
        },
        {
          label: "emit(event, payload)",
          text: "发一个事件，通知所有在听的人。发完就走，不等回复，也拿不到结果。",
          hint: "demo/mini-harness/kernel.ts:220",
        },
        {
          label: "intercept(event, fn)",
          text: "排进一个队列。你手上多一个「往下传」，不传这件事就归你说了算。",
          hint: "demo/mini-harness/kernel.ts:243",
        },
        {
          label: "waterfall(event, value, base)",
          text: "发起那种排队的事件，拿回最终结果。没人拦就落到 base，那是真正干活的那段。",
          hint: "demo/mini-harness/kernel.ts:258",
        },
        {
          label: "effect(cleanup)",
          text: "交出一个清理函数。定时器、连接这类东西必须走它。",
          hint: "demo/mini-harness/kernel.ts:229",
        },
        {
          label: "plugin(p)",
          text: "在你的上下文里再装一件插件。插件套插件就靠它。",
          hint: "demo/mini-harness/kernel.ts:234",
        },
      ],
    },
    {
      title: "什么会被自动收走，什么不会",
      intro: "判断标准只有一条：这件事有没有经过 ctx。",
      items: [
        { label: "会收", text: "provide 挂上去的服务。拆插件时从服务表里删掉。" },
        { label: "会收", text: "on 和 intercept 登记的监听。拆插件时自动取消，不会留下幽灵监听器。" },
        { label: "会收", text: "effect 交出来的清理函数。倒着跑一遍，后登记的先收。" },
        { label: "不收", text: "你自己开的定时器、连接、临时文件。内核压根不知道它存在。" },
        { label: "不收", text: "你借别人的服务留下的痕迹，比如往工具表里塞的那个工具。" },
        { label: "所以", text: "凡是「做了就必须记得撤」的动作，都用 effect 把撤的那一步交出来。" },
      ],
    },
    {
      title: "内核不替你做的四件事",
      intro: "上面那些是它管的。下面这四件它不管，代价都由你自己付。",
      items: [
        {
          label: "不告诉你谁卡住了",
          text: "缺依赖的插件安安静静躺在队列里，不报错也不占 CPU。想知道有谁在等，得自己调 kernel.pending()。",
          hint: "demo/mini-harness/kernel.ts · pending()",
        },
        {
          label: "不检查事件名",
          text: "发的人和听的人各写各的字符串。写错一个字母，事件照发、监听照挂，就是永远对不上，两边都不报错。",
        },
        {
          label: "不收绕过它做的事",
          text: "往别人的服务里塞的东西，它看不见。要收就自己在 effect 里写一句撤销。写漏了，插件拆了它还在。",
          hint: "demo/mini-harness/plugins/tool-count.ts:33",
        },
        {
          label: "拆掉不等于没装过",
          text: "remove 干的是从服务表里删掉那条映射。已经取走过那个对象的人，手里那份引用还在。",
          hint: "demo/mini-harness/kernel.ts:94",
        },
      ],
    },
    {
      title: "真实的容器多了什么",
      intro: "这两百多行的形状是对的，规模不是。差距有三处。",
      items: [
        {
          label: "它有名字，叫 Cordis",
          text: "DeepSeek Harness 的插件容器用的是一个通用开源框架，叫 Cordis，不是为这个 agent 专门写的。它被整份复制进了 DeepSeek Harness 自己的仓库来维护，所以框架层的行为由它自己说了算：能审计、能打补丁、能锁版本。",
        },
        {
          label: "事件分发不止两种",
          text: "这里只有「发完就走」和「排队环绕」两种。真实容器还分要不要等所有人跑完、有没有返回值，几种分发方式语义不同，一个事件用哪种是它公开约定的一部分。",
        },
        {
          label: "插件挂成一棵树",
          text: "这里的插件是平的一排，拆也只能一件件拆。真实容器里插件有层级，一整棵子树能整体装上、整体卸掉。",
        },
        {
          label: "装配单是配置文件，改完不用重启",
          text: "这里的装配单是一段 JS，改完要重跑。真实的是一组配置文件，分层叠加，改完热重载。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "装配单里把 tool-files 写在 tools 前面，跑起来会怎样？",
      options: [
        "启动就报错，提示 tools 还没准备好",
        "tool-files 照常执行，取 tools 时拿到一个空值",
        "tool-files 先进队列等着，tools 装好后内核回头装它",
      ],
      answer: 2,
      explain:
        "use 只负责把插件塞进队列，装谁由那轮反复扫决定。不报错是因为依赖可能晚一点才到；不执行是因为跑了也没用。",
      wrongExplains: [
        "内核连「应该有哪些服务」都不知道，没法判断这算不算错。它只记一句 plugin/wait，然后接着往下走。",
        "setup 压根没被调用。依赖不齐的插件连 start 那一步都进不去，谈不上取到空值——真取不到时 get 是直接抛错的。",
        "",
      ],
    },
    {
      question: "插件在 setup 里开了个定时器，没有交给 ctx.effect()。拆掉这件插件后会怎样？",
      options: [
        "内核扫一遍运行时，自动把这个定时器停掉",
        "定时器继续跑，因为它没进那张清理单子",
        "拆的时候内核会检测到并报错",
      ],
      answer: 1,
      explain:
        "remove 只认这块地上那张单子。没登记过的东西内核根本不知道它存在，既不会清也不会报错——这就是 effect 存在的理由。",
      wrongExplains: [
        "内核手上只有三样东西：服务表、监听表、每件插件那张清理单子。它没有任何办法「扫一遍运行时」。",
        "",
        "它连有没有定时器都不知道，拿什么检测。demo 里 count_files 就是这么留下来的：插件拆完了，那个工具还在登记处。",
      ],
    },
  ],
  bridge:
    "内核就这三件事，别的全在插件里。下一节你自己写一件挂上去，给模型加一个它现在没有的工具。",
};
