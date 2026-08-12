import type { Lesson } from "../tutorial/types";

/**
 * 「真货」阶段第二节。
 *
 * 这一节回答「组装到底怎么发生」——它是 DSH 区别于「一层壳」的地方。
 * demo 的 compose() 是这套分层叠加的最小版，可跑；真实 DSH 的层数更多，
 * 但叠加规则是同一个：后面的层盖前面的层。
 *
 * demo 侧输出来自 npm run demo 的 A/B 两次装配，逐行可核对。
 */

export const boot: Lesson = {
  id: "boot",
  index: "16",
  title: "一个命令下去，agent 是怎么被装出来的",
  summary: "先叠单子，再照单装",
  eyebrow: "真货",
  group: "the-real-thing",
  readingMinutes: 10,
  oneLiner: "跑起来之前先有一份单子。单子是一层层叠出来的，叠完才照着装。",
  positioning:
    "上一节看的是数据在骨架里怎么流。这一节看这些块本身怎么被装到一起。这是 harness 和「一层壳」最不一样的地方：壳是写死的，harness 是照一份声明装出来的。同一套零件，换一份声明就是另一个形态。demo 里这份声明是几行代码，真实 DSH 里是几层配置文件叠出来的，但叠的规则是同一个。",
  concepts: [
    {
      term: "层",
      plain: "一份局部声明。写了什么就盖什么，没写的保留前一层的。",
      source: "demo/mini-harness/profile.ts:13 · Layer",
    },
    {
      term: "叠加",
      plain: "按顺序把几层合成一份最终单子。后面的盖前面的。",
      source: "demo/mini-harness/profile.ts:27 · compose()",
    },
    {
      term: "装配",
      plain: "照着最终那份单子，把插件一个个挂上去。",
      source: "demo/mini-harness/main.ts · kernel.use()",
    },
    {
      term: "组合形态",
      plain: "同一套零件，叠不同的层，装出来就是不同的东西。",
      source: "demo/mini-harness/main.ts · base 与 trusting",
    },
  ],
  stageTitle: "分步演示 · 从一份声明到一个跑起来的 agent",
  stage: {
    nodes: [
      { id: "base", label: "底座层", sub: "都要的那些", col: 0, row: 0, kind: "data" },
      { id: "user", label: "覆盖层", sub: "只写想改的", col: 0, row: 2, kind: "data" },
      { id: "compose", label: "叠加", sub: "合成一份", col: 1, row: 1, kind: "core" },
      { id: "list", label: "最终单子", sub: "装谁、什么配置", col: 2, row: 1, kind: "data" },
      { id: "kernel", label: "容器", sub: "照单装", col: 3, row: 0, kind: "core" },
      { id: "agent", label: "跑起来的 agent", sub: "装配的结果", col: 3, row: 2, kind: "external" },
    ],
    edges: [
      { from: "base", to: "compose", label: "第一层" },
      { from: "user", to: "compose", label: "盖上去" },
      { from: "compose", to: "list", label: "合成" },
      { from: "list", to: "kernel", label: "照着装" },
      { from: "kernel", to: "agent", label: "装完能跑" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "底座层写全套",
      detail:
        "第一层写这次要装的全部插件，外加它们的配置。demo 里底座把 approval 的 deny 设成拦住删文件。",
      activeNodes: ["base", "compose"],
      activeEdges: ["base->compose"],
      log: [{ kind: "state", text: 'base = { use: [...9 个插件], config: { approval: { deny: ["delete_file"] } } }' }],
      code: {
        source: "demo/mini-harness/profile.ts:13",
        highlight: [3, 5],
        content: `export interface Layer {
  name: string
  use?: Plugin[]
  /** 只写想改的那几项，没写到的沿用前一层 */
  config?: Record<string, Record<string, unknown>>
}`,
        note: "一层可以只写配置不写插件。这就是「覆盖层」的用法。",
      },
    },
    {
      id: "s2",
      title: "覆盖层只写想改的那一项",
      detail:
        "第二层不重写全套，只写要改的那一项。demo 的信任层只写了一句：approval 的 deny 清空。别的一个字没提。",
      activeNodes: ["user", "compose"],
      activeEdges: ["user->compose"],
      log: [{ kind: "state", text: "trusting = { name: '信任', config: { approval: { deny: [] } } }" }],
    },
    {
      id: "s3",
      title: "叠加：后面的盖前面的",
      detail:
        "按顺序合。插件去重累加，配置逐项覆盖——写到的那项盖掉，没写到的保留。这个规则是整套组装的核心。",
      activeNodes: ["compose", "list"],
      activeEdges: ["compose->list"],
      log: [{ kind: "state", text: "compose([base, trusting]) → 9 个插件不变，approval.deny 被盖成 []" }],
      code: {
        source: "demo/mini-harness/profile.ts:27",
        highlight: [10, 11],
        content: `export function compose(layers: Layer[]): Assembly {
  const use: Plugin[] = []
  const config: Record<string, Record<string, unknown>> = {}

  for (const layer of layers) {
    for (const plugin of layer.use ?? []) {
      if (!use.includes(plugin)) use.push(plugin)
    }
    for (const [name, values] of Object.entries(layer.config ?? {})) {
      // 只盖写到的那几项，没写到的保留前一层的
      config[name] = { ...config[name], ...values }
    }
  }

  return { use, config }`,
        note: "整个叠加就这十几行。真实 DSH 的层数多得多，规则是同一个。",
      },
    },
    {
      id: "s4",
      title: "照单装",
      detail:
        "拿最终那份单子，一个个挂上去，顺带把该给的配置发过去。装完插件各自就位，agent 可以开始转了。",
      activeNodes: ["list", "kernel", "agent"],
      activeEdges: ["list->kernel", "kernel->agent"],
      log: [
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "state", text: 'approval/config { deny=["delete_file"] }' },
        { kind: "ok", text: "plugin/start { name=loop }" },
      ],
    },
    {
      id: "s5",
      title: "同一套零件，两次装配，两种行为",
      detail:
        "demo 用两份单子把同一个剧本跑了两遍。零件一个没换，只有 approval 那一项配置不同。第一遍删文件被拦，第二遍真删了。",
      activeNodes: ["base", "user", "compose", "agent"],
      activeEdges: ["base->compose", "user->compose", "compose->list"],
      log: [
        { kind: "state", text: 'approval/config { deny=["delete_file"] }   ← 第一遍' },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "approval/config { deny=[] }                ← 第二遍" },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
      ],
    },
    {
      id: "s6",
      title: "真实 DSH 的层比这多",
      detail:
        "真货里这份单子由好几层叠出来：组合包带来的、profile 自己的、机器上那份、命令行临时加的。叠完才启动容器装插件，然后才创建 agent。",
      activeNodes: ["compose", "list", "kernel", "agent"],
      activeEdges: ["compose->list", "list->kernel", "kernel->agent"],
      log: [
        { kind: "state", text: "叠的顺序：组合包 → profile → 机器级 → 命令行覆盖" },
        { kind: "state", text: "叠完启动容器 → 装服务 → 按配置创建或恢复 agent → 开始驱动" },
        { kind: "warn", text: "这一步说的是真实 DSH，demo 里没有对应代码" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "改配置要去改代码。",
      right:
        "不用。demo 的信任层就是一句配置，插件代码一行没动。真实 DSH 里更彻底——那几层是磁盘上的配置文件，改完重启就换了一套行为。",
    },
    {
      wrong: "叠加就是后一层整个替换前一层。",
      right:
        "是逐项盖，不是整层换。demo 里信任层只写了 approval 一项，别的八个插件的配置全都保留着。写到的那项才盖。",
    },
    {
      wrong: "既然是照单装，那顺序必须写对。",
      right:
        "demo 里故意把 tool-files 写在 tools 前面，照样跑。容器会让缺依赖的先等着，齐了再装。运行记录第一行的 plugin/wait 就是它在等。",
    },
  ],
  takeaways: [
    {
      title: "为什么值得这么绕",
      intro: "多一层声明是有代价的，先说清它换来了什么。",
      items: [
        {
          label: "换来的",
          text: "同一套零件能装出不同形态。改行为不用改代码，只改那份声明。",
          hint: "demo 的 A/B 两次装配",
        },
        {
          label: "换来的",
          text: "谁装了什么一目了然。要知道这次跑的是什么，读那份最终单子就够了。",
          hint: "不用翻代码找 import",
        },
        {
          label: "代价",
          text: "多一层间接。出问题时你得先搞清最终单子叠出来是什么样，才知道跑的是哪个版本。",
          hint: "层多了尤其麻烦",
        },
        {
          label: "代价",
          text: "启动顺序不再一眼可见。插件之间靠依赖排队，不靠你写的先后。",
          hint: "plugin/wait 那行",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "demo 的信任层只写了 approval 一项配置。其余八个插件会怎样？",
      options: [
        "被清空，因为这一层没提到它们",
        "保留底座层给的配置，只有 approval 那项被盖掉",
        "报错，因为层必须写全",
      ],
      answer: 1,
      wrongExplains: [
        "叠加是逐项合并不是整层替换。compose() 里那行 { ...config[name], ...values } 就是在保留没写到的项。",
        "",
        "层本来就允许只写一部分——Layer 里 use 和 config 都是可选的。只写配置不写插件是正常用法。",
      ],
      explain:
        "compose() 对配置做的是逐项展开合并：写到的盖掉，没写到的沿用前一层。所以覆盖层可以很短，只写你在意的那一项。",
    },
    {
      question: "为什么说这套组装方式让 harness 不只是「一层壳」？",
      options: [
        "因为它代码量更大",
        "因为跑什么是由一份声明决定的，换声明就换形态，不用改代码",
        "因为它把循环藏起来了",
      ],
      answer: 1,
      wrongExplains: [
        "跟代码量没关系。demo 的 compose() 才十几行，一样是这个机制。",
        "",
        "循环没被藏起来，它就在装配单里，是能删能换的一行。这一点前面第 05 节演示过。",
      ],
      explain:
        "壳是写死的，你只能在它留的口子上挂东西。照单装配的 harness 里，装什么、怎么配全在声明里——连循环都是单子上的一行。",
    },
  ],
  evidence:
    "demo 侧的两次装配输出来自 npm run demo，逐行可核对。真实 DSH 的层次顺序来自源码仓库启动流程的代码，本仓库跑不了，所以这一节只讲顺序和规则，不描述它的运行时输出。",
  bridge:
    "装出来的东西里有一块特别显眼：循环。前面一直说它也是插件，可它明明在干最要紧的活。下一节把这个问题说清楚——循环到底是不是中心，什么能换，什么换不得。",
};
