import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 这一节讲危险动作是怎么被拦下的，以及那一下拦不住什么。
 *
 * demo 里 approval 是一个真正的环绕式中间件：它用 ctx.intercept 排进 tool/decide
 * 的队列，不调 next 就把这次调用接管掉。短路在 npm run demo 的输出里数得出来：
 * read_file 三行齐全，delete_file 到 tool/decide 就断了。
 *
 * 后半节是「拦不住什么」，它和前半节一样重要，因为读者最容易得出的结论是
 * 「装了审批就安全了」。四条边界全部有 demo 代码或真实输出撑着。
 * 真实 Harness 多出来的那几道关，出处是 demo/mini-harness/README.md 的差距表。
 */

const nodes: StageNode[] = [
  { id: "profile", label: "装配单", sub: "这次拦哪几个", col: 0, row: 0, kind: "data" },
  { id: "loop", label: "循环", sub: "不认识权限", col: 0, row: 1, kind: "plugin" },
  { id: "approval", label: "审批插件", sub: "队里的一个", col: 1, row: 0, kind: "plugin" },
  { id: "queue", label: "拦截队列", sub: "tool/decide", col: 1, row: 1, kind: "data" },
  { id: "user", label: "人", sub: "被问的那个", col: 2, row: 0, kind: "external" },
  { id: "tool", label: "工具本体", sub: "run 真的跑", col: 2, row: 1, kind: "plugin" },
  { id: "model", label: "模型", sub: "只收到一句话", col: 3, row: 1, kind: "external" },
];

const edges: StageEdge[] = [
  { from: "loop", to: "queue", label: "交出决定" },
  { from: "profile", to: "approval", label: "发下名单" },
  { from: "queue", to: "approval", label: "轮到它" },
  { from: "approval", to: "user", label: "问一句" },
  { from: "approval", to: "tool", label: "调 next" },
  { from: "approval", to: "model", label: "不调 next" },
  { from: "tool", to: "model", label: "结果回灌" },
];

const columnLabels = ["谁发起的", "谁在排队", "谁真动手", "谁收到结果"];

export const approvalBoundary: Lesson = {
  id: "approval",
  index: "12",
  group: "advanced",
  title: "危险动作怎么拦，以及审批拦不住什么",
  summary: "拦得住哪些，拦不住哪些",
  eyebrow: "安全边界",
  readingMinutes: 9,
  oneLiner: "循环里没有「权限」两个字。拦住它的那个插件，也拦不住多少东西。",
  positioning:
    "危险动作要有人管，第 01 节提过一句。这一节看那一下怎么发生：循环发个事件，审批在队里把它接管掉。后半节更要紧：同一段代码，拦得住什么、拦不住什么。",
  concepts: [
    {
      term: "动手前的那个事件",
      plain: "循环真去执行之前发的一个环绕式事件。想拦的人排它队里。",
      source: "demo/mini-harness/loop.ts · runTool 里那次 waterfall",
    },
    {
      term: "短路",
      plain: "不往下传。后面排队的人和工具的 run 都不跑，你说了算。",
      source: "demo/mini-harness/plugins/approval.ts · 不调 next 那一支",
    },
    {
      term: "危险动作标记",
      plain: "工具自己标 needsApproval，意思是这一件动手前要问。没标的不问。",
      source: "demo/mini-harness/types.ts · Tool 里那个字段",
    },
    {
      term: "拦截名单",
      plain: "装配单发给审批插件的配置：这次要拦哪几个工具的名字。",
      source: "demo/mini-harness/main.ts · 底座层那份 config",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels,
    legendLabels: { plugin: "插件", data: "配置与队列", external: "循环外面的" },
    overview: {
      nodes,
      edges: edges.map(({ from, to }) => ({ from, to, curve: "straight" as const })),
      columnLabels,
      summary: "循环把决定交出去，队里的人放行或者接管，两条路都回到模型",
    },
  },
  steps: [
    {
      id: "s1",
      title: "循环不认识权限",
      detail: "真去动手之前，循环先把这次调用交出去。它不知道队里有谁。",
      activeNodes: ["loop", "queue"],
      activeEdges: ["loop->queue"],
      log: [
        { kind: "call", text: "tool/decide { name=read_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "state", text: "循环的代码里没有一处在判断权限，文件头自己写着这一条" },
        { kind: "state", text: "它只知道有个队列，队里站着谁跟它无关" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:85",
        content: `  ctx.emit('tool/decide', { name: call.name, args: call.args })
  const decision = ctx.waterfall<ToolDecision>(
    'tool/decide',
    { name: call.name, args: call.args, blocked: '' },
    // 没人拦的时候，最后落到这里：原样放行
    (final) => final,
  )`,
        note: "第 1 行只是打给你看的。真正排队的是下面那个，它会把最终决定还回来。",
        highlight: [2, 6],
      },
    },
    {
      id: "s2",
      title: "审批排在队里",
      detail: "审批就是队里的一个。它先看两样：工具标没标，名单里有没有它。",
      activeNodes: ["profile", "queue", "approval"],
      activeEdges: ["queue->approval", "profile->approval"],
      log: [
        { kind: "ok", text: "plugin/start { name=approval }" },
        { kind: "state", text: "approval/config { deny=[\"delete_file\"] }" },
        { kind: "state", text: "名单是装配单发下来的，不是写死在插件里的" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:35",
        content: `    ctx.intercept('tool/decide', (value, next) => {
      const decision = value as ToolDecision
      const tool = tools.find(decision.name)

      // 不在这次要拦的名单里，我没意见，往下传
      if (!tool?.needsApproval || !deny.includes(decision.name)) return next(decision)`,
        note: "最后那行是两个条件：工具标了危险，而且名字在这次名单里。差一个就放行。",
        highlight: [6],
      },
    },
    {
      id: "s3",
      title: "不调 next 就是接管",
      detail: "问过之后不同意，就不调 next。后面的人和工具的 run 全不跑。",
      activeNodes: ["approval", "user", "model"],
      activeEdges: ["approval->user", "approval->model"],
      log: [
        { kind: "call", text: "tool/decide { name=delete_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:42",
        content: `      ctx.emit('approval/ask', { name: decision.name })
      if (askUser(decision.name)) {
        ctx.emit('approval/allow', { name: decision.name })
        return next(decision)
      }

      // 不调 next：这次调用到此为止，工具的 run 一次都不会跑
      ctx.emit('approval/deny', { name: decision.name })
      return { ...decision, blocked: '用户拒绝了这次操作。' }
    })`,
        note: "同意那支调 next 往下传，不同意那支直接返回。差别只在调不调它。",
        highlight: [4, 9],
      },
    },
    {
      id: "s4",
      title: "数一数少了几行",
      detail: "read_file 三行齐全。delete_file 到 tool/decide 就断了。",
      activeNodes: ["approval", "tool", "model"],
      activeEdges: ["approval->tool", "tool->model"],
      log: [
        { kind: "call", text: "tool/decide { name=read_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "call", text: "tool/before { name=read_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
        { kind: "call", text: "tool/decide { name=delete_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "state", text: "第二组没有 tool/before，也没有 tool/after" },
      ],
    },
    {
      id: "s5",
      title: "拒绝也要说出来",
      detail: "拦下的理由要还给模型。它读到那句话，才知道自己为什么没删成。",
      activeNodes: ["approval", "model"],
      activeEdges: [],
      log: [
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "session/append { session=s1, seq=10, type=tool }" },
        { kind: "io", text: "notes.txt 里写的是「记得写测试」，工作区一共 2 个文件。你不让删，我就没删。" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:93",
        content: `  if (decision.blocked) {
    // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
    ctx.emit('tool/blocked', { name: call.name, reason: decision.blocked })
    return decision.blocked
  }`,
        note: "和上一节的报错走同一条路：返回一个字符串，变成一条 tool 事件进日志。",
        highlight: [4],
      },
    },
    {
      id: "s6",
      title: "它拦不住什么",
      detail: "同一个插件，装配单换一层就一个都不拦。它管的比你以为的窄。",
      activeNodes: ["profile", "approval", "tool"],
      activeEdges: [],
      log: [
        { kind: "state", text: "approval/config { deny=[\"delete_file\"] }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "approval/config { deny=[] }" },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
        { kind: "warn", text: "同一份剧本，同一个插件。第二遍它真的删了" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:29",
        content: `  setup(ctx, config) {
    const tools = ctx.get<Tools>('tools')
    // 装配单发下来的配置：哪些工具要拦。没配就一个都不拦。
    const deny = (config.deny as string[]) ?? []
    ctx.emit('approval/config', { deny })`,
        note: "「没配就一个都不拦」。审批有多严，答案不在这个文件里，在装配单里。",
        highlight: [4],
      },
    },
  ],
  misconceptions: [
    {
      wrong: "装了审批插件，危险动作就都被管住了。",
      right:
        "审批只看两样：工具自己标没标危险，以及这次名单里有没有它的名字。两个条件写在同一行，缺一个就放行。read_file 没标过，所以它读哪个路径，审批一个字都不问。",
    },
    {
      wrong: "审批是内核给权限留的一个口子。",
      right:
        "它是装配单里的一行，和工具、日志、循环没区别。把它从装配单删掉，demo 照样跑，只是没人拦了。循环那边一行都不用改，因为循环从来就不认识它。",
    },
    {
      wrong: "把活分给另一个 agent 去做，审批那一关就绕过去了。",
      right:
        "这个 demo 回答不了这个问题。运行记录里第 6 次请求是 toolCount=0，接手那位手里一个工具都没有。那条路上一次工具调用都没发生过，审批自然也没登过场。所以拿这个 demo 既证不出绕得过去，也证不出绕不过去。别拿它当依据。",
    },
  ],
  takeaways: [
    {
      title: "拦得住什么，拦不住什么",
      intro: "第一条是它真管得住的。后面四条是边界，每条都能在 demo 里当场看到。",
      items: [
        {
          label: "拦得住：标了记号的那几个工具",
          text: "工具自己标了危险，名字又在这次名单里，那就问一句。不同意就短路，run 一次都不跑。",
          hint: "demo/mini-harness/plugins/approval.ts:40",
        },
        {
          label: "拦不住：没标记号的工具",
          text: "read_file 没标，审批连看都不看。它读哪个路径、读到什么，审批那边一个字都不知道。",
        },
        {
          label: "拦不住：参数",
          text: "它判断的是工具的名字。delete_file 被拦，是因为名字在名单里，不是因为它这次要删 notes.txt。要检查参数，得工具自己动手。",
        },
        {
          label: "拦不住：换一层装配单",
          text: "名单换成空的，同一个插件一个都不拦。demo 第二遍就是这么跑的，delete_file 真的删掉了。严不严由装配的人定，不由写插件的人定。",
          hint: "demo/mini-harness/main.ts:33",
        },
        {
          label: "拦不住：放行之后的事",
          text: "它能拿到的最多是工具最后返回的那句话。run 里干了什么、开了什么进程、写了哪个文件，它看不到也管不着。",
        },
        {
          label: "代价：读代码读不出会不会被拦",
          text: "循环的代码里没有一处在判断权限。工具那边只有一个 needsApproval 记号，看不出谁会拿它做什么。想知道这次到底会不会被拦，得回头看装配单这回装了谁、名单里写了什么。",
        },
      ],
    },
    {
      title: "真实 Harness 这一块还多了什么",
      intro: "demo 只有一道关，一个监听器要么放行要么短路。第一、二、四条出自 demo/mini-harness/README.md 的差距表，另外两条出自 DeepSeek Harness 自带文档。",
      items: [
        {
          label: "一次调用要过好几道关",
          text: "先是可以放行、拒绝或者问人的那道，再是只能拒绝的那道，然后才是超时重试这类包在外面的一层。demo 把这些压成了一道。",
        },
        {
          label: "有一道的拒绝翻不回来",
          text: "只能拒绝或者弃权，排在后面的插件没法把它改回允许。安全决定只许收紧不许放松，这是故意设计成这样的。",
        },
        {
          label: "问不到人算拒绝",
          text: "没人接、超时、界面根本不在，一律按不同意处理。默认值取的是拒绝那一边，不是放行那一边。",
        },
        {
          label: "沙箱是另一条线",
          text: "它管的是被启动出去的进程能碰到什么，和上面这几道关不是一回事。工具流水线放行了，进程那边照样有自己的限制。",
        },
        {
          label: "看得见不等于能用",
          text: "真实系统里有一套按 agent 挑工具表的机制，它决定这次列给模型看哪几个。那是可见性，不是权限。别把「没让它看见」当成一道安全措施。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "read_file 那次 tool/decide、tool/before、tool/after 三行齐全。delete_file 那次后面两行都没有。为什么？",
      options: [
        "delete_file 这个工具没注册成功",
        "审批插件没往下传，工具的 run 一次都没跑",
        "循环在 delete_file 那一步之前就退出了",
      ],
      answer: 1,
      explain:
        "环绕式事件里不调 next 就是短路。后面排队的人和真正干活的那段都不跑，插件返回的那个值直接成了这次调用的结果。所以 tool/before 和 tool/after 两行都没有机会发出来。",
      wrongExplains: [
        "注册是装载时的事。运行记录开头有一行 tool/register { name=delete_file }，说明它注册好了；模型也确实点名了它，tool/decide 那一行就是证据。",
        "",
        "循环没退出。tool/blocked 之后紧接着是 session/append 和 step/start，模型又被问了一次，最后还答了一句「你不让删，我就没删」。",
      ],
    },
    {
      question: "模型给 read_file 传了一个不该读的路径。审批插件会拦吗？",
      options: [
        "会，审批在每次工具调用前都会检查参数",
        "不会，审批只看工具名和记号，参数不在它的判断范围里",
        "会，把那个路径写进拦截名单就行",
      ],
      answer: 1,
      explain:
        "审批那一行判断两个条件：这个工具自己标没标危险，以及这次名单里有没有它的名字。两个说的都是工具，不是参数。read_file 一个记号都没标，审批直接往下传。",
      wrongExplains: [
        "参数确实在那个决定里传着，tool/decide 那行还把 args 打了出来。但审批没读它。检查参数是工具自己的活，真实 Harness 里读写文件那类工具内部还有自己的门。",
        "",
        "名单里装的是工具名，不是路径。demo 里它长这样：deny 里写着 delete_file。给它一个路径，它匹配不上任何工具。",
      ],
    },
  ],
  evidence: "真实 Harness 那几道关，出处是 demo/mini-harness/README.md 的差距表和 DeepSeek Harness 自带文档",
  bridge:
    "被拦下的那一句、工具报错那一句、压缩省下的那一段，这三节里发生的事都往同一个地方记了一笔。下一节看那个地方：跑完一次到底留下了什么，那份东西除了喂模型还能拿去干什么。",
};
