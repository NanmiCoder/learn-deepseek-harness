import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 工具的说明书写给谁看、模型凭它做什么决定。
 *
 * demo 里那五个工具的 describe 都只说了「它是什么」，没说「什么时候用它」，
 * 这一节就拿它们当反面材料，对照 demo/dsh-plugin-example 里那句写法。
 * 那个例子本仓库跑不起来，所以只引它的文字，不描述它的运行时。
 */

const nodes: StageNode[] = [
  { id: "yours", label: "你的工具", sub: "说明书 + run", col: 0, row: 1, kind: "plugin" },
  { id: "outside", label: "别人的工具", sub: "demo 里没写", col: 0, row: 3, kind: "external" },
  { id: "registry", label: "工具登记处", sub: "一张表，不分内外", col: 1, row: 2, kind: "plugin" },
  { id: "loop", label: "循环", sub: "打包这一整包", col: 2, row: 1, kind: "plugin" },
  { id: "model", label: "模型", sub: "只看得见说明书", col: 3, row: 1, kind: "external" },
  { id: "run", label: "run 函数", sub: "留在你这边", col: 2, row: 3, kind: "core" },
  { id: "result", label: "工具结果", sub: "一段给模型的文字", col: 3, row: 3, kind: "data" },
];

const edges: StageEdge[] = [
  { from: "yours", to: "registry", label: "登记" },
  { from: "outside", to: "registry", label: "同一个入口" },
  { from: "registry", to: "loop", label: "取整张表" },
  { from: "loop", to: "model", label: "带说明书" },
  { from: "model", to: "loop", label: "点名要它" },
  { from: "loop", to: "run", label: "才真的跑" },
  { from: "run", to: "result", label: "吐一段文字" },
  { from: "result", to: "loop", label: "接回历史" },
];

/** 总览去掉模型那条回程边，剩下的都是稳定关系 */
const overviewEdges: StageEdge[] = edges
  .filter((edge) => !(edge.from === "model" && edge.to === "loop"))
  .map(({ from, to }) => ({ from, to, curve: "straight" as const }));

export const toolDescription: Lesson = {
  id: "tool-description",
  index: "09",
  title: "工具描述怎么写，模型才用得对",
  summary: "模型只看得见说明书",
  eyebrow: "工具设计",
  readingMinutes: 8,
  group: "hands-on-stage",
  oneLiner: "模型看不到你的代码。它凭三样东西决定调不调这个工具。",
  positioning:
    "上一节查的是插件装没装上。这一节换个前提：插件装上了、工具也注册了，模型就是不点名它，或者点了名参数填错。这一类问题跟你的实现没关系，只跟写给模型看的那几行字有关。demo 里那五份说明书，一个个拿出来看。",
  concepts: [
    {
      term: "工具说明书",
      plain: "名字、一句话说明、参数表。模型能看到的就这三样。",
      source: "demo/mini-harness/types.ts · Tool",
    },
    {
      term: "一整包输入",
      plain: "每问一次模型就重拼一份：系统提示、全部说明书、派生出来的历史。",
      source: "demo/mini-harness/types.ts · Request",
    },
    {
      term: "工具结果",
      plain: "干活那个函数返回的文字。它原样进历史，下一轮模型照着它决定怎么做。",
      source: "demo/mini-harness/loop.ts · runTool()",
    },
    {
      term: "外部工具",
      plain: "别人的程序提供的工具。进的是同一张登记表，调用路径和自带的一样。",
      source: "demo/mini-harness/plugins/tools.ts · register()",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels: ["谁写的", "进哪张表", "谁打的包", "谁看得见"],
    legendLabels: { core: "留在本地的", plugin: "插件", data: "回给模型的", external: "外面" },
    overview: {
      nodes,
      edges: overviewEdges,
      columnLabels: ["谁写的", "进哪张表", "谁打的包", "谁看得见"],
      summary: "说明书随每一次请求走一遍，干活的函数留在本地，回去的只有一段文字",
    },
  },
  steps: [
    {
      id: "s1",
      title: "模型看得见的只有三样",
      detail: "一个工具在代码里有五个字段。跟模型的约定只有前三样：名字、一句话说明、参数表。",
      activeNodes: ["yours"],
      activeEdges: [],
      log: [
        { kind: "state", text: "name：模型点名时写的就是这个字符串" },
        { kind: "state", text: "describe：它判断这次该不该调的唯一依据" },
        { kind: "state", text: "params：它照着这张表填参数" },
        { kind: "warn", text: "needsApproval 是给审批插件看的，干活那个是函数，都不在这份约定里" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:17",
        highlight: [3, 5, 7],
        content: `/** 一个工具的完整定义：说明书 + 干活的函数 */
export interface Tool {
  name: string
  /** 给模型看的一句话说明 */
  describe: string
  /** 参数名 -> 这个参数是干什么的。模型照着它填参数。 */
  params: Record<string, string>
  /** 危险动作标记为 true，执行前会先问人 */
  needsApproval?: boolean
  run(args: Record<string, string>): Promise<string>
}`,
        note: "五个字段，前三样写给模型，后两样写给 Harness。这条分界线是这一节全部内容的前提。",
      },
    },
    {
      id: "s2",
      title: "打包那一刻，实现被留下了",
      detail: "循环每轮重拼一份输入。工具那一栏的类型里只有三样；何况干活的是个函数，真发到网络上也带不过去。",
      activeNodes: ["registry", "loop", "model"],
      activeEdges: ["registry->loop", "loop->model"],
      log: [
        { kind: "call", text: "model/request { round=1, toolCount=5, messageCount=1 }" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
        { kind: "state", text: "toolCount=5 就是这一包里带了五份说明书" },
        { kind: "state", text: "每问一次就重发一遍，模型不记得上一轮看过它们" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:29",
        highlight: [4],
        content: `/** 模型收到的一整包输入 */
export interface Request {
  system: string
  tools: { name: string; describe: string; params: Record<string, string> }[]
  messages: Message[]
}`,
        note: "第 4 行把能带走的三样写死在类型里。模型永远看不到你的实现写了什么，只能读这三样。",
      },
    },
    {
      id: "s3",
      title: "说明只说了它是什么",
      detail: "demo 里五句 describe，有四句只说了工具干什么。三个工具都碰文件，光靠这三句模型只能挑名字最像的。",
      activeNodes: ["yours", "registry", "model"],
      activeEdges: ["yours->registry"],
      log: [
        { kind: "state", text: "describe: 读一个文件的内容" },
        { kind: "state", text: "describe: 看一个文件有多大" },
        { kind: "state", text: "describe: 删掉一个文件" },
        { kind: "warn", text: "三句都在说它是什么，没有一句说什么时候该用它" },
        { kind: "state", text: "五句里只有 delegate 那句带了条件：一件独立的小事" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-files.ts:27",
        highlight: [3],
        content: `    tools.register({
      name: 'read_file',
      describe: '读一个文件的内容',
      params: { path: '文件路径' },
      async run(args) {
        const text = workspace.get(args.path)
        return text ?? \`没有这个文件：\${args.path}\`
      },
    })`,
        note: "这一句是模型判断「这次该不该调它」的全部依据。它旁边还有两个也碰文件的工具。",
      },
    },
    {
      id: "s4",
      title: "补上一句什么时候用",
      detail: "同一个仓库里那个能装进真实 DSH 的插件，说明写成两句：前一句说干什么，后一句说什么时候该用。",
      activeNodes: ["yours", "loop", "model"],
      activeEdges: ["loop->model", "model->loop"],
      log: [
        { kind: "state", text: "第一句：Record a short note for the user." },
        { kind: "state", text: "第二句：Use it when the user asks to remember something." },
        { kind: "state", text: "后一句给的正是模型最缺的那条信息：什么时候轮到你" },
        { kind: "state", text: "它那一个参数也带了一句说明，不是只写类型" },
        { kind: "warn", text: "这个插件本仓库跑不起来，依赖的包不在公共 npm 上，只能看写法" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:72",
        highlight: [3, 5],
        content: `  ctx.tools.register(defineTool({
    name: 'example_note',
    description: 'Record a short note for the user. Use it when the user asks to remember something.',
    parameters: {
      text: { type: 'string', required: true, description: 'The note text to record.' },
    },`,
        note: "字段名和 demo 那边对不上（describe 变 description、params 变 parameters），但写法上的要求是同一条。",
      },
    },
    {
      id: "s5",
      title: "参数说明决定填得对不对",
      detail: "参数表是「参数名 → 这个参数干什么」。模型照着它填。path 那格写的是文件路径，它填进来的就是文件路径。",
      activeNodes: ["model", "loop", "run"],
      activeEdges: ["loop->run"],
      log: [
        { kind: "call", text: 'tool/decide { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "call", text: 'tool/before { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
        { kind: "state", text: "args 里那个 path，就是模型照着参数表填出来的" },
        { kind: "warn", text: "填岔了工具照跑，错要到结果里才看得出来，没人在中间拦一道" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:22",
        highlight: [2],
        content: `  /** 参数名 -> 这个参数是干什么的。模型照着它填参数。 */
  params: Record<string, string>
  /** 危险动作标记为 true，执行前会先问人 */
  needsApproval?: boolean
  run(args: Record<string, string>): Promise<string>`,
        note: "值是一句给模型看的话，不是类型声明。这一格是你唯一能告诉它「该填什么形状」的地方。",
      },
    },
    {
      id: "s6",
      title: "返回值也是写给模型看的",
      detail: "工具抛异常、被拦下、根本不存在，三种都变成一段文字接回历史。模型看得到的只有那段文字。",
      activeNodes: ["run", "result", "loop", "model"],
      activeEdges: ["run->result", "result->loop"],
      log: [
        { kind: "call", text: 'tool/decide { name=stat_file, args={"path":"missing.txt"} }' },
        { kind: "warn", text: "tool/failed { name=stat_file, reason=打不开 missing.txt }" },
        { kind: "state", text: "session/append { session=s2, seq=7, type=tool }" },
        { kind: "io", text: "模型下一轮的回答：missing.txt 打不开，我就不看它了。" },
        { kind: "state", text: "错误没变成异常栈，变成了一句模型读得懂的话" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:105",
        highlight: [7],
        content: `  } catch (error) {
    // 工具是别人写的代码，它抛异常不能把整个循环炸掉。
    // 把错误当成这次工具的结果还给模型，它下一步自己会换个做法——
    // 和「被拦下」走的是同一条路：都变成一条 tool 消息进日志。
    const reason = error instanceof Error ? error.message : String(error)
    ctx.emit('tool/failed', { name: call.name, reason })
    return \`工具 \${call.name} 出错了：\${reason}\`
  }`,
        note: "这句话原样进历史。写清楚出了什么事，模型下一步才知道该换个做法还是重试。",
      },
    },
    {
      id: "s7",
      title: "谁登记的都进同一张表",
      detail: "工具登记处只有一个入口。自己写的、别人的程序提供的，进的是同一张表，循环取的时候不分内外。",
      activeNodes: ["outside", "yours", "registry", "loop"],
      activeEdges: ["outside->registry"],
      log: [
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "ok", text: "tool/register { name=delegate }" },
        { kind: "state", text: "三行来自三个不同的插件，登记处一视同仁" },
        { kind: "warn", text: "接别人的程序这一块 demo 里没写，这五个工具全在本进程里" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tools.ts:10",
        highlight: [5, 7],
        content: `export const tools: Plugin = {
  name: 'tools',

  setup(ctx) {
    const registry = new Map<string, Tool>()

    const service: Tools = {
      register(tool) {
        registry.set(tool.name, tool)
        ctx.emit('tool/register', { name: tool.name })
      },`,
        note: "一个 Map，一个 register。谁调它都一样，没有内置和外挂两条路。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "模型不调我的工具，是模型不够聪明。",
      right:
        "先看它能看到什么。模型手上只有名字、一句话说明、参数表，你的实现它一个字看不到。demo 里五个工具有三个都在碰文件，光靠「读一个文件的内容」这种说明，它只能凭名字挑。同样一件事，先改那一句话，再怀疑模型。",
    },
    {
      wrong: "说明写得越详细越好，注意事项全写上。",
      right:
        "这几行每问一次模型就重发一遍。运行记录里 toolCount=5 那一栏，跟着每一次请求走。工具多了，光说明书就要占掉一整包里不小的一块。该补的是「什么时候用它」和「参数填什么形状」，不是把实现细节抄一遍。",
    },
    {
      wrong: "工具报错了，就该让循环停下来。",
      right:
        "demo 里 stat_file 打不开文件时直接抛异常，循环接住它，变成一句「工具 stat_file 出错了：打不开 missing.txt」还给模型，下一轮模型自己改了口。工具不存在、被拦下、抛异常，三种走的是同一条路。所以那句话是写给模型看的，不是写给你看日志用的。",
    },
    {
      wrong: "写好描述，模型就一定会用对。",
      right:
        "描述是模型唯一看得见的东西，但不是唯一变量。真实那套里，工具从被模型点名到真的跑起来，中间还要过好几道：先决定准不准跑、再执行、再加工结果。描述管的是「模型想不想调、调得对不对」这一头。第 15 节讲模型看得见什么，能把这条线补全。",
    },
  ],
  takeaways: [
    {
      title: "一份说明书该说清哪几件事",
      intro: "对着 demo 里那五个工具挨个问一遍，缺哪条补哪条。",
      items: [
        {
          label: "它干什么",
          text: "一句话说清动作和对象。这半件事 demo 里五个工具都写到了。",
          hint: "demo/mini-harness/plugins/tool-files.ts",
        },
        {
          label: "什么时候该用它",
          text: "demo 里五个工具只有 delegate 沾了个边（一件独立的小事）。那个能装进真实 DSH 的例子写足了：用户要求记点东西的时候用它。",
          hint: "demo/dsh-plugin-example/src/index.ts",
        },
        {
          label: "每个参数填什么形状",
          text: "参数表的值是一句给模型看的话，不是类型。「文件路径」是最省的写法，也最容易被填岔。",
          hint: "demo/mini-harness/types.ts",
        },
        {
          label: "结果里说清发生了什么",
          text: "返回的那段文字直接进历史。「没有叫 X 的工具。」这种话就是专门写给模型看的。",
          hint: "demo/mini-harness/loop.ts",
        },
        {
          label: "危险动作自己贴标记",
          text: "needsApproval 是给审批插件看的，模型看不到它。贴不贴和说明书写得好不好是两件事。",
          hint: "demo/mini-harness/types.ts",
        },
      ],
    },
    {
      title: "别人的工具怎么进来",
      intro: "这一段 demo 里没有对应实现，说清思路和它落在哪一行。",
      items: [
        {
          label: "同一张表",
          text: "外部程序自报有哪些工具，Harness 把它们登记进同一张表。循环取的时候不分内外，调用路径和自带的一样。",
          hint: "demo/mini-harness/plugins/tools.ts",
        },
        {
          label: "现在最通行的一版约定叫 MCP",
          text: "全称 Model Context Protocol，由 Anthropic 提出并公开。写一份这样的服务，好几家 agent 产品都能用，不必为每家重写。",
        },
        {
          label: "说明书的要求一模一样",
          text: "外部工具的名字、说明、参数表同样是模型唯一的判断依据。跨一道进程边界不会让描述变好写。",
        },
        {
          label: "多一道进程边界",
          text: "它跑在自己的进程里，同进程的插件没有这道边界。多这道是好处；工具表、参数、结果每次都要跨一趟进程，是代价。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "模型手上有 read_file、stat_file、delete_file 三个都碰文件的工具。它凭什么决定调哪个？",
      options: [
        "凭工具在登记表里的先后顺序",
        "凭那三样：名字、一句话说明、参数表",
        "凭干活那个函数里写了什么",
      ],
      answer: 1,
      explain:
        "打包发给模型的那一栏里只有名字、说明、参数表。实现留在你的进程里，它看不到。三个工具的说明越像，它挑错的机会越大——该改的是那一句话，不是代码。",
      wrongExplains: [
        "顺序只决定它们在这一包里排第几，不构成判断依据。demo 里 count_files 排在三个文件工具后面，模型照样在第二轮点名要它。",
        "",
        "那是个函数，留在你的进程里。模型收到的那一栏类型里根本没有这个字段，函数本身也发不到网络上去。",
      ],
    },
    {
      question: "stat_file 打不开文件时直接抛异常。模型是怎么知道这件事的？",
      options: [
        "循环把异常栈发给了模型",
        "循环把错误变成一句话，当成这次工具的结果放进历史",
        "模型看到没有 tool/after 就明白了",
      ],
      answer: 1,
      explain:
        "循环把工具执行整个包了一层，抓到异常之后返回「工具 stat_file 出错了：打不开 missing.txt」，这句话当成一条 tool 消息进日志。模型下一轮读到的就是它，然后回了「missing.txt 打不开，我就不看它了」。",
      wrongExplains: [
        "异常栈是给你看的，不进历史。模型只读得到派生出来的那份消息列表，里面装的是一句话形式的工具结果。",
        "",
        "tool/before、tool/after 这些是运行记录里的事件，模型一条都看不到。它看得见的只有 user、assistant、tool 三类消息。",
      ],
    },
  ],
  bridge:
    "五份说明书每问一次就重发一遍，历史也是。这一包只会越来越大，而模型一次能读进去多少是有上限的。下一节看它满了会发生什么，以及真要裁的时候动的是哪一份。",
};
