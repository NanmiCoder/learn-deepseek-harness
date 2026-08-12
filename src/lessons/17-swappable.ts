import type { Lesson } from "../tutorial/types";

/**
 * 「真货」阶段第三节，也是这个阶段的收尾。
 *
 * 这一节正面回答一个容易讲错的问题：循环是不是 harness 的中心。
 * 答案是不是——它是注册进一个槽位的默认件。demo 的 ctx.provide('loop', ...)
 * 和真实 DSH 里循环把自己注册进 agent 工厂槽位，是同一个动作。
 *
 * 「什么不能换」这一半必须讲，只讲能换的是软文。
 */

export const swappable: Lesson = {
  id: "swappable",
  index: "17",
  title: "循环不是中心：什么能换，什么换不得",
  summary: "画清可替换的边界",
  eyebrow: "真货",
  group: "the-real-thing",
  readingMinutes: 10,
  oneLiner: "循环干着最要紧的活，但它只是注册进一个槽位的默认件，不是这套架构的中心。",
  positioning:
    "前面两节看了数据怎么流、块怎么装。这一节收尾，回答一个自然会冒出来的疑问：循环明明在干最要紧的活，凭什么说它也只是一块插件。顺带把边界画清楚——一套框架里总有换不得的东西，只讲能换的那半是软文。这一节两半都讲。",
  concepts: [
    {
      term: "槽位",
      plain: "一个留好的位置，谁来占都行。取用的人只认位置，不认是谁占着。",
      source: "demo/mini-harness/loop.ts · ctx.provide('loop', ...)",
    },
    {
      term: "默认件",
      plain: "框架自带的那个实现。它占着槽位，但你可以拿自己的换掉。",
      source: "demo/mini-harness/main.ts · 装配单里的 loop 那行",
    },
    {
      term: "契约",
      plain: "换的时候必须遵守的形状。换实现可以，换形状不行。",
      source: "demo/mini-harness/types.ts · Loop 接口",
    },
    {
      term: "地基",
      plain: "整套东西建在上面的那层。它换掉，别的全塌。",
      source: "demo/mini-harness/kernel.ts · 装卸与回收",
    },
  ],
  stageTitle: "分步演示 · 从能换的到换不得的",
  stage: {
    nodes: [
      { id: "list", label: "装配单", sub: "loop 是其中一行", col: 0, row: 1, kind: "data" },
      { id: "slot", label: "槽位", sub: "叫 loop 这个名字", col: 1, row: 1, kind: "core" },
      { id: "default", label: "默认循环", sub: "占着槽位", col: 2, row: 0, kind: "plugin" },
      { id: "yours", label: "你写的循环", sub: "换上去也行", col: 2, row: 2, kind: "plugin" },
      { id: "contract", label: "契约", sub: "形状不能变", col: 3, row: 1, kind: "data" },
      { id: "kernel", label: "地基", sub: "换不得", col: 3, row: 3, kind: "core" },
    ],
    edges: [
      { from: "list", to: "slot", label: "装上去" },
      { from: "default", to: "slot", label: "默认占着" },
      { from: "yours", to: "slot", label: "换成它" },
      { from: "slot", to: "contract", label: "得守形状" },
      { from: "contract", to: "kernel", label: "都建在这上面" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "循环把自己注册进一个槽位",
      detail:
        "看 demo 的循环插件。它做的事和别的插件一模一样：起个名字、声明依赖、把自己挂到一个名字底下。「loop」就是那个名字。",
      activeNodes: ["default", "slot"],
      activeEdges: ["default->slot"],
      log: [{ kind: "ok", text: "plugin/start { name=loop }" }],
      code: {
        source: "demo/mini-harness/loop.ts:22",
        highlight: [8],
        content: `export const loop: Plugin = {
  name: 'loop',
  needs: ['model', 'tools'],

  setup(ctx) {
    const service: Loop = {
      run: (session, userText) => runTurn(ctx, session, userText),
    }
    ctx.provide('loop', service)
  },
}`,
        note: "最后那行是关键：把自己挂到「loop」这个名字底下，和工具、会话挂的方式没区别。",
      },
    },
    {
      id: "s2",
      title: "用它的人只认名字",
      detail:
        "主程序拿循环的方式是按名字取，不是 import 那个函数。取到的是谁写的，它不关心——这就是槽位的意思。",
      activeNodes: ["slot", "list"],
      activeEdges: ["list->slot"],
      log: [{ kind: "state", text: "main.ts 里：ctx.get<Loop>('loop').run(session, '...')" }],
    },
    {
      id: "s3",
      title: "所以换掉它不用改别人",
      detail:
        "写一个也提供「loop」这个名字的插件，把装配单那一行替掉，整套转圈的规则就换了。别的八个插件一行都不用动。",
      activeNodes: ["yours", "slot", "list"],
      activeEdges: ["yours->slot", "list->slot"],
      log: [
        { kind: "state", text: "把 use 数组里的 loop 换成你自己那个" },
        { kind: "state", text: "工具、会话、审批、子 Agent 全都不知道换过" },
      ],
    },
    {
      id: "s4",
      title: "但形状不能变",
      detail:
        "换实现可以，换形状不行。取用的人写的是 run(session, userText)，你的循环也得是这个形状，不然接不上。这就是契约。",
      activeNodes: ["slot", "contract"],
      activeEdges: ["slot->contract"],
      log: [{ kind: "state", text: "Loop 接口：run(session, userText) => Promise<string>" }],
      code: {
        source: "demo/mini-harness/types.ts:112",
        highlight: [8],
        content: `/**
 * 挂在 'loop' 这个名字下的能力。
 *
 * 循环也是一个插件，这一点值得停一下：它不是内核的一部分，
 * 也不是谁 import 进来的函数，就是装配单里的一行。
 * 想换一套转圈的规则，写一个也提供 'loop' 的插件替掉那行就行，
 * 别的插件一个都不用动——它们只知道按名字取。
 */
export interface Loop {
  run(session: Session, userText: string): Promise<string>
}`,
        note: "接口就是契约。实现随便换，这个形状动不得。",
      },
    },
    {
      id: "s5",
      title: "真实 DSH 里也是这么回事",
      detail:
        "真货里循环同样是把自己注册进一个槽位，而那个槽位归 agent 注册中心管。循环是默认占位的那个，不是中心。中心是注册中心本身。",
      activeNodes: ["default", "yours", "slot"],
      activeEdges: ["default->slot", "yours->slot"],
      log: [
        { kind: "state", text: "真实 DSH：循环启动时把自己设成 agent 工厂的默认实现" },
        { kind: "state", text: "换法也一样：实现那个 agent 接口，自己注册进去" },
        { kind: "warn", text: "这一步说的是真实 DSH，demo 里没有 agent 注册中心这一层" },
      ],
    },
    {
      id: "s6",
      title: "换不得的那几样",
      detail:
        "地基换不得：装卸和回收那套机制、会话日志只追加这条规矩、循环那个形状、消息长什么样。它们不是插件，是插件赖以存在的前提。",
      activeNodes: ["contract", "kernel"],
      activeEdges: ["contract->kernel"],
      log: [
        { kind: "state", text: "换不得：容器机制、日志只追加、接口形状、消息结构" },
        { kind: "state", text: "能换：循环实现、模型接入、工具、审批、落盘方式、子 Agent" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "循环是 harness 的中心，别的都围着它转。",
      right:
        "不是。它是注册进一个槽位的默认件。demo 里它是装配单最后一行，删掉就不转了，别的插件照样在。真实 DSH 里那个槽位归 agent 注册中心管，循环只是默认占位的那个——落盘、遥测这些根本不经过循环。",
    },
    {
      wrong: "既然一切皆插件，那什么都能换。",
      right:
        "有换不得的。容器的装卸回收、日志只追加、接口的形状、消息的结构——这几样是插件赖以存在的前提，换了等于换一个框架。说「一切皆插件」是指能力层，不包括地基。",
    },
    {
      wrong: "换循环得把用到它的地方都改一遍。",
      right:
        "不用。取用的人写的是「按 loop 这个名字要一个」，不是 import 某个函数。只要新的守着同一个形状，换上去别人根本不知道。demo 里工具、会话、审批全程不知道循环是谁写的。",
    },
  ],
  takeaways: [
    {
      title: "边界速查",
      intro: "要动手改之前，先看清自己站在哪一边。",
      items: [
        {
          label: "随便换",
          text: "循环的实现、模型接入哪一家、有哪些工具、审批怎么判、日志落到哪、子 Agent 怎么派。",
          hint: "这些都是能力，占的是槽位",
        },
        {
          label: "换不得",
          text: "容器的装卸与回收、会话日志只追加不改写、服务接口的形状、消息的结构。",
          hint: "这些是插件赖以存在的前提",
        },
        {
          label: "怎么判断",
          text: "问一句：换掉它，别人需不需要跟着改？不需要就是能换的；需要，那它是契约不是实现。",
          hint: "这条判据 demo 和真货通用",
        },
        {
          label: "代价",
          text: "槽位换来了灵活，代价是看代码时多一跳——想知道这次跑的是哪个循环，得先去翻装配单。",
          hint: "第 16 节说过的那笔账",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "demo 里把装配单的 loop 那一行换成你自己写的循环，其余八个插件要改吗？",
      options: [
        "都要改，它们得知道换了循环",
        "一个都不用改，它们只按名字取，不认是谁写的",
        "只有工具要改，因为循环会调工具",
      ],
      answer: 1,
      wrongExplains: [
        "反了。正因为它们不知道循环是谁，才换得动。它们拿到的是「叫 loop 的那个能力」，谁提供的不影响。",
        "",
        "工具不认识循环。是循环去工具登记处按名字找工具，方向是单向的——工具那边压根不知道有循环这回事。",
      ],
      explain:
        "取用写的是 ctx.get<Loop>('loop')，认的是名字和形状。新循环只要守着 run(session, userText) 这个形状，换上去别人无感。",
    },
    {
      question: "下面哪一样是换不得的？",
      options: [
        "模型接入哪一家",
        "会话日志只追加、不改写这条规矩",
        "有哪些工具可以给模型用",
      ],
      answer: 1,
      wrongExplains: [
        "这个恰恰最容易换。demo 里模型接入是一个插件，真实 DSH 里是一个专门的适配器槽位，换一家就换一个适配器。",
        "",
        "工具是典型的能换项。加一个删一个都只改装配单，登记处和循环都不用动——第 04 节演示过。",
      ],
      explain:
        "日志只追加是所有投影的前提：喂模型、落盘、界面、回放全从它算出来。允许改写，这些投影会一起失真。它不是实现，是规矩。",
    },
  ],
  evidence:
    "demo 侧的代码和输出来自本仓库，逐行可核对。真实 DSH 里循环注册进 agent 工厂槽位这条，来自源码仓库对应包的代码与说明；本仓库跑不了那套代码，所以只讲机制不描述它的运行时现象。",
  bridge:
    "到这儿你已经看清真实 DSH 的骨架、装配过程和可换边界。接下来三节动手：写一个真的能装进 DSH 的插件，从形状对照开始。",
};
