import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 这一节回答两个问题：DeepSeek Harness 是什么，它跟 Claude Code 差在哪。
 *
 * 定位这件事只能靠对比讲清楚，所以两个问题合在一节里。
 * 这一节不贴代码：讲的是三层关系和边界，堆代码只会把它埋掉。
 * 运行记录里的每一行机器输出都是 npm run demo 的真实输出，逐行可核；
 * 只在真实 DSH 才有、demo 里没有的说法，由 evidence 字段标明出处。
 */

const nodes: StageNode[] = [
  { id: "profile", label: "组装单", sub: "这次装哪几件", col: 0, row: 1, kind: "data" },
  { id: "cordis", label: "插件容器", sub: "装卸、依赖、生死", col: 1, row: 1, kind: "core" },
  { id: "parts", label: "能力插件", sub: "模型 工具 会话 权限", col: 2, row: 0, kind: "plugin" },
  { id: "loop", label: "主循环", sub: "也是其中一件", col: 2, row: 1, kind: "plugin" },
  { id: "yours", label: "你写的插件", sub: "和自带的同一种", col: 2, row: 2, kind: "plugin" },
  { id: "dsh", label: "dsh", sub: "你用的那个 agent", col: 3, row: 0, kind: "core", kindLabel: "产品" },
  { id: "cc", label: "Claude Code", sub: "接口由产品定", col: 3, row: 2, kind: "external", kindLabel: "别家产品" },
];

const edges: StageEdge[] = [
  { from: "profile", to: "cordis", label: "照单装" },
  { from: "cordis", to: "parts", label: "装上" },
  { from: "cordis", to: "loop", label: "装上" },
  { from: "cordis", to: "yours", label: "装上" },
  { from: "parts", to: "dsh", label: "跑起来就是" },
  { from: "loop", to: "dsh", label: "跑起来就是" },
  { from: "yours", to: "dsh", label: "跑起来就是" },
  { from: "yours", to: "cc", label: "跨进程接入" },
];

export const dshOverview: Lesson = {
  id: "dsh-overview",
  index: "02",
  title: "DeepSeek Harness 是什么，跟 Claude Code 什么关系",
  summary: "先分清零件库和产品",
  eyebrow: "定位与对比",
  group: "know",
  readingMinutes: 11,
  oneLiner: "一套连主循环都能换的零件，和用它装出来的那个编程 agent，共用这个名字。",
  positioning:
    "第 01 节讲的 Harness 是统称，DeepSeek Harness 是其中一个。它分三层：最底下一个通用插件容器；中间几十件插件，模型、工具、会话、权限，连主循环也在里面；最上面一张单子，决定这次装哪几件。你用的那个产品就是照单装出来的。这一节讲这三层，也讲它跟 Claude Code 差在哪。",
  concepts: [
    {
      term: "插件容器 Cordis",
      plain: "插件是能单独装上、单独拆掉的一件功能。容器只管装卸，谁在等谁、拆时怎么收干净都归它。",
      source: "demo/mini-harness/kernel.ts · 同构的最小版，不是 Cordis",
    },
    {
      term: "服务",
      plain: "挂在一个名字底下的能力。别人报名字来取，不认背后是谁写的。",
      source: "demo/mini-harness/kernel.ts · provide() 与 get()",
    },
    {
      term: "组装单 profile",
      plain: "写明这次装哪几件。它是一层层叠出来的，后面的层盖前面的层。",
      source: "demo/mini-harness/profile.ts · compose()",
    },
    {
      term: "主循环",
      plain: "一句话进来后转圈的那段流程。它也是装配单上的一件插件，能整个换掉。",
      source: "demo/mini-harness/loop.ts · loop 插件",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels: ["装什么", "谁来装", "装的是什么", "装出来的东西"],
    legendLabels: { core: "容器与产品", plugin: "插件", data: "组装单", external: "别家产品" },
    overview: {
      nodes,
      edges: edges.map(({ from, to }) => ({ from, to, curve: "straight" as const })),
      columnLabels: ["装什么", "谁来装", "装的是什么", "装出来的东西"],
      summary: "一张单子叠出来，容器照单把插件装上，跑起来就是那台产品",
    },
  },
  steps: [
    {
      id: "s1",
      title: "一个名字，两样东西",
      detail:
        "DeepSeek Harness 既指一套做编程 agent 的零件，也指用这套零件装出来的那个产品。读到这个名字，先分清说的是哪个。",
      activeNodes: ["parts", "dsh"],
      activeEdges: [],
      log: [
        { kind: "state", text: "零件那一层：模型、工具、会话、权限，都是插件" },
        { kind: "state", text: "产品那一层：挑几件装到一起，跑起来的那个 agent" },
        { kind: "warn", text: "两样东西共用一个名字，混着读，后面几节全乱" },
      ],
    },
    {
      id: "s2",
      title: "底下是一个通用容器",
      detail:
        "最底下这层不是它自己写的，是一个通用插件容器，叫 Cordis。谁提供了什么、谁在等谁、拆的时候怎么收干净，全归它管。",
      activeNodes: ["cordis", "parts"],
      activeEdges: ["cordis->parts"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "这三行来自 npm run demo：依赖没齐的先等着，齐了才装" },
      ],
    },
    {
      id: "s3",
      title: "连主循环也能换掉",
      detail:
        "转圈问模型的那段流程，也是一件挂在名字底下的服务，可以整个换掉。它自己把这条写成一句话：一切皆插件，循环也不例外。",
      activeNodes: ["cordis", "loop"],
      activeEdges: ["cordis->loop"],
      log: [
        { kind: "ok", text: "plugin/start { name=loop }" },
        { kind: "state", text: "这行来自 npm run demo：主循环和审批、日志一样被装上去" },
        { kind: "state", text: "换掉它，就是把这个名字底下的实现换成另一份" },
        { kind: "state", text: "容器不用改，别的插件也不用改，它们只认名字" },
      ],
    },
    {
      id: "s4",
      title: "一张单子决定装哪几件",
      detail:
        "单子不是写死的一份，是叠出来的：底座一层，用户自己再盖一层，只改在意的那项。同一套零件，叠法不同，装出来的东西就不同。",
      activeNodes: ["profile", "cordis", "dsh"],
      activeEdges: ["profile->cordis", "parts->dsh", "loop->dsh"],
      log: [
        { kind: "state", text: 'approval/config { deny=["delete_file"] }' },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "approval/config { deny=[] }" },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
        { kind: "state", text: "同一份剧本跑两遍，零件一件没换，只有上面盖的那层不同" },
      ],
    },
    {
      id: "s5",
      title: "你写的和自带的同一种",
      detail:
        "你写的插件挂上去的方式，和自带的那些完全一样：同一个容器，同一张单子。没有内置和外挂之分，只有装了和没装。",
      activeNodes: ["cordis", "yours", "dsh"],
      activeEdges: ["cordis->yours", "yours->dsh"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "state", text: "上面头两行，一个是自带的、一个是后加的，走的是同一条路" },
      ],
    },
    {
      id: "s6",
      title: "换到 Claude Code 那边",
      detail:
        "同一个自己写的工具，在那边只能站在产品外面：跑在你自己的进程里，按一份公开协议接进去。协议不属于哪一家，进程边界是白给的。",
      activeNodes: ["yours", "cc"],
      activeEdges: ["yours->cc"],
      log: [
        { kind: "state", text: "这份公开协议叫 MCP，全称 Model Context Protocol" },
        { kind: "state", text: "MCP 不是那边独有的，这边也接，进的是同一张工具表" },
        { kind: "state", text: "那边的接法还有钩子：配置里的一条命令，走的是另一套" },
        { kind: "warn", text: "这两套外挂，和产品自己内置的那套，是三种不同的东西" },
        { kind: "warn", text: "这一步没有代码可看：那边的产品内部不开源" },
      ],
    },
    {
      id: "s7",
      title: "两边各自要付的账",
      detail:
        "那边的账：你加的东西和内置的不是同一种，能接的位置由产品定。这边的账：单子归你维护，少装一件不会当场报错。",
      activeNodes: ["profile", "cordis", "yours"],
      activeEdges: ["profile->cordis"],
      log: [
        { kind: "warn", text: "少装一件，装载器不吭声：依赖它的插件只会挂在那儿等" },
        { kind: "state", text: "还在排队等依赖的： 没有" },
        { kind: "state", text: "这行是 npm run demo 打的名单。少装一件，名单上就有东西了" },
        { kind: "state", text: "想自己看：从 demo/mini-harness/main.ts 的底座层删掉 tools 再跑" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "demo 里那几个文件，就是 DeepSeek Harness 的结构。",
      right:
        "形状是对的，规模差得远。两边用的是同一套办法：插件挂在名字底下、依赖没齐的先排队、拆掉时按登记回收、循环也在装配单上。差别在每一块里面。真货的组装单是磁盘上的配置文件，改了不用重启，插件按名字从磁盘装，不像 demo 这样 import 进来；一次工具调用要过好几道关，不是一道。骨架的形状是对的，别把骨架当成全部。",
    },
    {
      wrong: "既然什么都能换，这套东西就没有固定的部分。",
      right:
        "有。插件容器本身不在容器里，它是底座，装不进自己。还有服务名：工具登记表挂在一个名字底下，同一套装配里只有一份，谁提供了它，全体插件取到的就是它。换掉这份实现可以；两份同时挂，后挂的会不声不响盖掉先挂的，你收不到任何提示。这类东西不是配置项，是定死的。",
    },
    {
      wrong: "它和 Claude Code 是同一个东西的两种写法，功能迟早会对齐。",
      right:
        "功能清单上两边确实在互相靠近：工具调用、审批、子 Agent，现在两边都有。但「你能不能换掉主流程」这一条由边界位置决定，功能追平了它也不会变。那边的扩展口是产品留的，产品自己那部分不对你开放。这边也有换不掉的东西（上一条那些），但那是架构上定死的，跟「这块归产品，不给你碰」是两回事。",
    },
    {
      wrong: "看完这三层，我就摸清 DeepSeek Harness 了。",
      right:
        "摸清的是形状，不是全貌。这一节讲的是「零件库 / 产品 / 组装单」这个骨架，真实那套里每一层都厚得多——光插件包就几十个，装配单是好几层配置叠出来的。第 15 到 17 节专门讲真实骨架长什么样，这里先记住三层的关系就够了。",
    },
  ],
  takeaways: [
    {
      title: "三层分别是什么",
      intro: "以后读到「DeepSeek Harness」，先分清说的是哪一层。",
      items: [
        {
          label: "插件容器",
          text: "提供「装插件」这件事本身：挂上一个服务、等依赖齐了再启动、拆掉时按登记回收。它是一个通用开源框架，叫 Cordis，不是为这个 agent 专门写的。",
          hint: "demo/mini-harness/kernel.ts",
        },
        {
          label: "零件库",
          text: "站在容器上的几十件插件：模型接入、工具、会话、权限，还有一堆这一节没展开的。文档里说的 SDK（software development kit，零件库）指的就是这一层。",
        },
        {
          label: "产品",
          text: "照着一张单子，从零件库里挑几件装到一起，跑起来就是你用的那个编程 agent，命令叫 dsh。换一张单子，同一套零件装出另一种形态：一种带浏览器界面，一种跑完一个任务就退出。",
          hint: "demo/mini-harness/profile.ts",
        },
      ],
    },
    {
      title: "两边各自的账",
      intro: "没有哪边天然更高级。下面六条按「你要付出什么」排，不按「谁更强」排。",
      items: [
        {
          label: "那边：装上就能用",
          text: "不用先学怎么写单子。装完就是一个完整产品，命令行、桌面、网页、编辑器插件几种壳换着用。",
        },
        {
          label: "那边：外挂和内置不是同一种",
          text: "外部工具按公开协议跑在别的进程里，钩子是配置里的一条命令，内置工具是产品自己的代码。三套机制不一样，能做的事也不一样，接口有几个、开在哪由产品决定。",
        },
        {
          label: "两边都有：MCP 这条路",
          text: "MCP（Model Context Protocol）是公开的，由 Anthropic 提出，不属于哪一家产品。你写一个 MCP 服务，好几家 agent 产品都能用，DeepSeek Harness 也接它，进的是同一张工具表。它跑在自己的进程里，天然多一道边界，同进程的插件没有这道边界。",
        },
        {
          label: "这边：多一个选项，写成进程内插件",
          text: "同一个容器、同一张单子、同一种写法。想拦一次工具调用，你写的插件和自带的审批站在同一位置。代价是没有那道进程边界。",
          hint: "demo/mini-harness/plugins/approval.ts",
        },
        {
          label: "这边：单子归你维护",
          text: "装什么、装几件、少装了谁，都要自己盯。装载器不会替你报错，它只把缺依赖的那件挂起来等着。",
          hint: "demo/mini-harness/kernel.ts · pending()",
        },
        {
          label: "这边：排查链路更长",
          text: "一个行为不对，先看单子这次装了谁，再看是哪件插件在监听。比翻一个配置开关远得多。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "同事说「我们直接上 DeepSeek Harness 就行」。要听懂这句话，缺的是哪个信息？",
      options: [
        "他说的是拿现成产品来用，还是拿零件库自己装一个",
        "他打算接哪一家的模型",
        "他要的是命令行版还是网页版",
      ],
      answer: 0,
      explain:
        "这个名字同时指零件库和用零件装出来的产品。当成产品，是装好就能用；当成零件库，是自己写一张单子挑零件。两条路要做的事完全不一样，先问清是哪条。",
      wrongExplains: [
        "",
        "模型只是其中一件插件，换它只动那一件。这个信息补上了，仍然听不出他要走哪条路。",
        "这两种形态都是同一套零件按不同单子装出来的。选哪个形态，是决定了走「用现成产品」这条路之后才轮到的问题。",
      ],
    },
    {
      question: "「一切皆插件，循环也不例外」落到具体上是什么意思？",
      options: [
        "循环里的每一步都能被别的插件监听到",
        "转圈问模型那段流程也是挂在名字底下的服务，可以整个换成另一份实现",
        "循环最多跑几轮，可以在配置里改",
      ],
      answer: 1,
      explain:
        "服务是按名字取的：谁提供了那个名字，用的就是谁。主循环占着其中一个名字，换掉它就是把整段流程换成另一份实现，容器和别的插件都不用动。npm run demo 里那行 plugin/start { name=loop } 就是它被装上去的时刻。",
      wrongExplains: [
        "监听确实做得到，但那是在原来那段流程上挂东西，流程本身没换。这句话说的是把整段流程换掉。",
        "",
        "改轮数是调一个参数，那段流程一行都没变。这句话说的是那段流程本身可以整个换掉。",
      ],
    },
  ],
  evidence: "定位说法出自 DeepSeek Harness 自带文档",
  bridge:
    "上面那些运行记录，是一个真跑得起来的最小 Harness 吐出来的。下一节你自己跑一遍，然后一行行读：哪一行是容器在装插件，哪一行是模型说的，哪一行是插件真的动了手。",
};
