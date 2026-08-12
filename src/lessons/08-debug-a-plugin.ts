import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 动手课：五种「什么都没发生」，一种一种制造出来再定位。
 *
 * 五处故障都是我照着课文改 demo 跑出来的，运行记录是那几次的真实输出。
 * 读者照着改能得到同样的结果——这一节的价值就在于他真的去改。
 */

const nodes: StageNode[] = [
  { id: "yours", label: "你的插件", sub: "改了没生效", col: 0, row: 1, kind: "plugin" },
  { id: "queue", label: "候补队列", sub: "缺依赖的在这", col: 1, row: 0, kind: "data" },
  { id: "kernel", label: "内核", sub: "装载与回收", col: 1, row: 2, kind: "core" },
  { id: "services", label: "服务表", sub: "谁挂上了什么", col: 2, row: 0, kind: "core" },
  { id: "registry", label: "工具登记处", sub: "tools 服务", col: 2, row: 2, kind: "plugin" },
  { id: "listeners", label: "监听表", sub: "名字对上才响", col: 2, row: 3, kind: "core" },
  { id: "log", label: "运行记录", sub: "你唯一的眼睛", col: 3, row: 1, kind: "data" },
];

const edges: StageEdge[] = [
  { from: "yours", to: "queue", label: "缺依赖就停" },
  { from: "queue", to: "kernel", label: "齐了才装" },
  { from: "kernel", to: "yours", label: "调 setup" },
  { from: "yours", to: "services", label: "取服务" },
  { from: "yours", to: "registry", label: "注册工具" },
  { from: "yours", to: "listeners", label: "挂监听" },
  { from: "kernel", to: "log", label: "打事件" },
  { from: "registry", to: "log", label: "打事件" },
];

const overviewEdges: StageEdge[] = edges.map(({ from, to }) => ({
  from,
  to,
  curve: "straight" as const,
}));

export const debugAPlugin: Lesson = {
  id: "debug-a-plugin",
  index: "08",
  title: "插件没生效，怎么查",
  summary: "三步分清是哪一类",
  eyebrow: "动手排查",
  readingMinutes: 10,
  group: "hands-on-stage",
  kind: "hands-on",
  oneLiner: "没装上、装上了没触发、触发了你看不见。症状一样，查法不一样。",
  positioning:
    "上一节那个插件一次就跑通了，真实情况通常不是。这一节把「改完存盘、跑一遍、什么都没发生」拆成五个问题，每个问题只看运行记录里的一行。五处故障你都能自己造出来：照着改，跑，看它坏在哪。",
  concepts: [
    {
      term: "候补队列",
      plain: "依赖没齐的插件待的地方。它不报错、不退出，就是不装。",
      source: "demo/mini-harness/kernel.ts · pending()",
    },
    {
      term: "服务在，内容未必齐",
      plain: "你要的服务已经挂上，不等于别人往它里面注册的东西已经注册完。",
      source: "demo/mini-harness/plugins/approval.ts · 回调里才 find",
    },
    {
      term: "事件表",
      plain: "日志插件只打印它认得的事件名。你发的名字不在这张表里，一行都不出。",
      source: "demo/mini-harness/plugins/logger.ts · TAGS",
    },
    {
      term: "记过账的东西",
      plain: "只有走过 ctx 的服务、监听、清理函数会被回收。别的拆完还留着。",
      source: "demo/mini-harness/kernel.ts · Scope",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels: ["出问题的东西", "内核这一侧", "它挂到哪去了", "你能看见什么"],
    legendLabels: { core: "内核的东西", plugin: "插件", data: "队列与记录", external: "外面" },
    overview: {
      nodes,
      edges: overviewEdges,
      columnLabels: ["出问题的东西", "内核这一侧", "它挂到哪去了", "你能看见什么"],
      summary: "一个插件从排队到装上、再到挂东西出去，每一段断掉都长成同一副样子",
    },
  },
  steps: [
    {
      id: "s1",
      title: "第一问：它装上了没有",
      detail:
        "运行记录里搜 plugin/start，看有没有你那个名字。没有就是没装上。demo 还会把还在排队的插件单独列一行。",
      activeNodes: ["yours", "queue", "kernel", "log"],
      activeEdges: ["queue->kernel", "kernel->yours"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "还在排队等依赖的： 没有" },
        { kind: "state", text: "tool-files 等了一下就装上了，所以最后这行说没人在排队" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:40",
        highlight: [2],
        content: `console.log('--- 装好了，现在有这些插件在跑 ---')
console.log('还在排队等依赖的：', kernel.pending().length === 0 ? '没有' : kernel.pending())
console.log()`,
        note: "pending() 返回还在排队的插件，以及它们各自缺哪个服务。查插件没生效，先看这一行。",
      },
    },
    {
      id: "s2",
      title: "依赖名写错一个字母",
      detail:
        "把 tool-count 的 needs 改成 toolz，跑一遍。它不报错、不退出，只是永远排在队里，别的插件照常。",
      activeNodes: ["yours", "queue", "log"],
      activeEdges: ["yours->queue"],
      log: [
        { kind: "io", text: "npm run demo（needs 写成 toolz 之后）" },
        { kind: "warn", text: 'plugin/wait { name=tool-count, missing=["toolz"] }' },
        { kind: "state", text: "还在排队等依赖的： [ { name: 'tool-count', missing: [ 'toolz' ] } ]" },
        { kind: "warn", text: "没有 plugin/start { name=tool-count }，也没有 tool/register" },
        { kind: "state", text: "demo 跑到最后一行，退出码是 0" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:144",
        highlight: [5],
        content: `  /** 还在排队的插件，以及它们各自缺什么。调试时用。 */
  pending(): { name: string; missing: string[] }[] {
    return this.waiting.map((scope) => ({
      name: scope.plugin.name,
      missing: (scope.plugin.needs ?? []).filter((name) => !this.services.has(name)),
    }))
  }`,
        note: "missing 里那个名字就是没人提供的服务名。对着它查是谁该提供、装配单里有没有那一行。",
      },
    },
    {
      id: "s3",
      title: "漏写 needs：这个更坏",
      detail:
        "把 needs 整行删掉再跑，一切正常——因为 tool-count 排在 tools 后面。再把它挪到 use 数组第一个，当场炸。",
      activeNodes: ["yours", "services", "kernel", "log"],
      activeEdges: ["yours->services"],
      log: [
        { kind: "io", text: "npm run demo（删掉 needs，位置不动）" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "state", text: "一切正常。顺序碰巧对了，就看不出错" },
        { kind: "io", text: "npm run demo（把 toolCount 挪到 use 数组第一个）" },
        { kind: "warn", text: 'Error: 没有找到服务 "tools"。是不是忘了在 needs 里声明？' },
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
        note: "能跑不等于写对了。靠装配单顺序凑巧成立的依赖，别人改一次顺序就崩，而且崩在他那边。",
      },
    },
    {
      id: "s4",
      title: "装上了，要的东西却是空的",
      detail:
        "在 setup 里打印两次查询的结果再跑。needs 满足了、tools 服务也在，可 delegate 拿到的是 undefined。",
      activeNodes: ["yours", "registry", "log"],
      activeEdges: ["yours->registry"],
      log: [
        { kind: "io", text: "npm run demo（在 tool-count 的 setup 里加两行打印）" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "state", text: "探针 read_file = read_file" },
        { kind: "warn", text: "探针 delegate  = undefined" },
        { kind: "ok", text: "plugin/start { name=subagent }" },
        { kind: "ok", text: "tool/register { name=delegate }" },
        { kind: "state", text: "delegate 晚两行才注册进去。同一个服务，同一刻，两个答案" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:35",
        highlight: [3],
        content: `    ctx.intercept('tool/decide', (value, next) => {
      const decision = value as ToolDecision
      const tool = tools.find(decision.name)

      // 不在这次要拦的名单里，我没意见，往下传
      if (!tool?.needsApproval || !deny.includes(decision.name)) return next(decision)`,
        note: "审批插件的查询写在回调里，第一次真要用的时候才查。setup 里查要看装载顺序，用的时候查不用。",
      },
    },
    {
      id: "s5",
      title: "事件名写错，两边都不吭声",
      detail:
        "把监听写成 tool/befor，少一个 e。内核不校验事件名，ctx.on 照收，这个监听器一次也不会触发。",
      activeNodes: ["yours", "listeners", "log"],
      activeEdges: ["yours->listeners"],
      log: [
        { kind: "io", text: "npm run demo（监听 tool/befor）" },
        { kind: "state", text: "运行记录一个字都没多，也没有任何报错" },
        { kind: "warn", text: "回调里那句打印，出现了 0 次" },
        { kind: "state", text: "发的一方写错名字，症状一模一样：没人收，也没人吭声" },
        { kind: "state", text: "定位：数一数那个事件在运行记录里出现过几次，再核对两边的字符串" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:213",
        highlight: [2],
        content: `  /** 监听事件。拆插件时会自动取消。 */
  on(event: string, fn: Listener): void {
    this.kernel.addListener(event, fn)
    this.scope.cleanups.push(() => this.kernel.listenersOf(event)?.delete(fn))
  }`,
        note: "event 只是个普通字符串，写错没人管。日志插件也只打印它认得的名字，新事件名不在表里就一行不出。",
      },
    },
    {
      id: "s6",
      title: "拆了，但没拆干净",
      detail:
        "拆插件那行跑完，清理函数确实执行了，运行记录也宣布拆完了。可把工具表打出来，count_files 还在里面。",
      activeNodes: ["kernel", "yours", "registry", "log"],
      activeEdges: ["yours->registry", "registry->log"],
      log: [
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
        { kind: "warn", text: "打印一下工具表：read_file, stat_file, delete_file, count_files, delegate" },
        { kind: "state", text: "内核收回的只有 provide 的服务、on 的监听、effect 的清理函数" },
        { kind: "state", text: "往别人登记处塞的这一件，不在回收范围里" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tools.ts:16",
        highlight: [2, 3],
        content: `    const service: Tools = {
      register(tool) {
        registry.set(tool.name, tool)
        ctx.emit('tool/register', { name: tool.name })
      },`,
        note: "register 只往表里塞，没有反向动作。想让工具跟着插件一起走，得由 tools 这一侧先给出撤销的口子。",
      },
    },
    {
      id: "s7",
      title: "五个问题，按顺序问一遍",
      detail: "五处故障的症状都是「什么都没发生」。按下面的顺序问，最多三步就能定位到是哪一类。",
      activeNodes: ["yours", "queue", "kernel", "services", "registry", "listeners", "log"],
      activeEdges: ["kernel->log", "registry->log"],
      log: [
        { kind: "state", text: "一问：有没有 plugin/start？没有就看排队那行，多半是依赖名写错" },
        { kind: "state", text: "二问：setup 跑了吗？ctx.get 抛错，就是漏写了 needs" },
        { kind: "state", text: "三问：要的内容真拿到了吗？服务在，内容未必齐" },
        { kind: "state", text: "四问：事件触发了吗？数它在运行记录里出现过几次" },
        { kind: "state", text: "五问：拆干净了吗？没走 ctx 的东西不会被收走" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "插件没生效，先看有没有报错。",
      right:
        "这一类问题的共同点就是不报错。依赖名写错只多一行 plugin/wait；事件名写错连那一行都没有；拆不干净一点痕迹都不留。唯一一个会响的是漏写 needs 撞上顺序不对，反而最好查。入口是运行记录里「该出现而没出现」的那一行，不是错误信息。",
    },
    {
      wrong: "needs 写了 tools，setup 里就什么都拿得到了。",
      right:
        "只保证 tools 这个服务已经挂上，不保证别人往它里面注册的东西已经注册完。demo 里 tool-count 排在 subagent 前面，setup 里查 delegate 拿到的就是 undefined，一声不吭。把这类查询挪到第一次真要用的时候，就不看装载顺序了。",
    },
    {
      wrong: "改完代码存盘，跑一遍就是最新的了。",
      right:
        "对这个 demo 成立：插件是 import 进来的，每次 npm run demo 都从头装一遍。真实 DSH 那边不一样，插件是装进 profile 的一个包，组合发生在启动时，装完必须重启，它自己的说明里写着这一条。第 18 节会碰到。",
    },
    {
      wrong: "这三步能查真实 DeepSeek Harness 里的插件问题。",
      right:
        "思路通用，症状不止这些。真实那套里多出几类 demo 没有的：插件装了但服务注册晚了一步、浏览器那半没被扫进名册、类型声明没合并进来。第 18 到 20 节讲真实插件时会带上这些坑，那时候回头看这一节的三步法还是管用的。",
    },
  ],
  takeaways: [
    {
      title: "五问速查",
      intro: "按这个顺序问，每一问只看运行记录里的一处。",
      items: [
        {
          label: "装上了吗",
          text: "搜 plugin/start 加你的插件名。没有就是没装上，接着看排队那行，它会告诉你缺哪个服务。",
          hint: "demo/mini-harness/kernel.ts · pending()",
        },
        {
          label: "依赖真拿到了吗",
          text: "setup 里抛「没有找到服务」，就是漏写了 needs。这个错是响的，栈里能看到是谁的 setup。",
          hint: "demo/mini-harness/kernel.ts · get()",
        },
        {
          label: "要的内容齐了吗",
          text: "服务在不代表内容齐。把查询挪到第一次真要用的时候，别在 setup 里查。",
          hint: "demo/mini-harness/plugins/approval.ts",
        },
        {
          label: "事件触发了吗",
          text: "数一数那个事件名在运行记录里出现过几次。零次，多半是两边的字符串对不上。",
          hint: "demo/mini-harness/kernel.ts · on()",
        },
        {
          label: "拆干净了吗",
          text: "只有走过 ctx 的服务、监听、清理函数会被收走。别的得你自己在 effect 里撤。",
          hint: "demo/mini-harness/kernel.ts · effect()",
        },
      ],
    },
    {
      title: "代价：这类错为什么都不吭声",
      intro: "下面三条都能在 demo 里当场看见，是「什么都能拆能换」换来的账。",
      items: [
        {
          label: "名字是字符串，没人校验",
          text: "服务名、事件名、工具名全是字符串。内核不校验，类型检查也管不着——写错只表现为那件事没发生。",
        },
        {
          label: "同一个名字散在几个文件里",
          text: "上一节给它配上审批之后，count_files 就出现在三处：插件里注册、装配单里配置、审批的 deny 名单里。改一处不改另一处，没人提醒你。",
        },
        {
          label: "看不见不等于没发生",
          text: "日志插件只打印它那张表里认得的事件名。你发的新事件确实发出去了，运行记录里却一行都没有。",
          hint: "demo/mini-harness/plugins/logger.ts",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "needs 里写错一个字母，跑 npm run demo，怎么最快确认是不是这个原因？",
      options: [
        "看 demo 有没有报错退出",
        "看最后那行「还在排队等依赖的」，插件名和缺的服务名一起列在那",
        "在 setup 里加一行打印，看它跑没跑",
      ],
      answer: 1,
      explain:
        "内核把还在排队的插件和它们各自缺什么一起返回，demo 已经把它打印出来了。依赖名写错时那行是 [ { name: 'tool-count', missing: [ 'toolz' ] } ]，插件名和错的那个字符串一次看全。",
      wrongExplains: [
        "不会报错，也不会退出。内核只是把这个插件留在候补队列里，别的插件照常装、demo 照常跑完，退出码是 0。这正是这类错难查的地方。",
        "",
        "这一步能确认 setup 没跑，但确认不了为什么没跑。漏写 needs、依赖名写错、装配单里压根没加这一行，三种原因看到的都是「没跑」。还得回头看排队那行。",
      ],
    },
    {
      question: "needs 写了 tools，setup 第一行也取到了。这时在 setup 里查 delegate，一定拿得到吗？",
      options: [
        "一定拿得到，needs 已经保证 tools 就位了",
        "不一定。tools 服务在，不代表别的插件已经把 delegate 注册进去",
        "拿不到会抛错，所以不用管",
      ],
      answer: 1,
      explain:
        "needs 等的是「服务已经挂上」，不等「别人往这个服务里注册的内容已经注册完」。demo 里 tool-count 排在 subagent 前面，同一行代码查 read_file 拿得到、查 delegate 是 undefined。把这类查询挪到第一次真要用的时候，就不看装载顺序了。",
      wrongExplains: [
        "needs 保证的是那个名字底下已经挂了东西，不管里面装了多少。运行记录里 tool/register { name=delegate } 排在 plugin/start { name=tool-count } 后面——那一行出现的时候，你的 setup 早跑完了。",
        "",
        "查不到返回的是 undefined，不抛错。抛错的是 ctx.get，两个是不同的东西：一个查服务在不在，一个查服务里有没有那件内容。",
      ],
    },
  ],
  bridge:
    "插件装上了、事件也触发了，模型却始终不点名你那个工具——这时候问题不在插件，在你写给模型看的那几行字。下一节看工具的说明书该怎么写。",
};
