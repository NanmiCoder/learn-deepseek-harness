import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 这一节回答教程自己制造出来的那个疑问：每问一次模型就把整段历史重念一遍，
 * 那它越滚越长怎么办。
 *
 * 落点是「动手时动的是哪一份」——循环每一步现拼一包，历史那部分是算出来的，
 * 所以裁剪和摘要动的是算这一步，日志本身一条不删。
 *
 * 分工：第 04 节已经说过日志是底账、模型历史是算出来的，这里直接用，不重讲。
 * 那份日志本身值多少钱、还能读出几样东西，归第 13 节。
 * demo 里没有压缩插件，凡是关于压缩的说法都标明来自真实 Harness 的做法，
 * 出处是 demo/mini-harness/README.md 末尾那张差距表。
 */

const nodes: StageNode[] = [
  { id: "log", label: "会话日志", sub: "只往后加", col: 0, row: 1, kind: "data" },
  { id: "compact", label: "裁剪与摘要", sub: "挂在算的这一步", col: 1, row: 0, kind: "plugin" },
  { id: "derive", label: "算一份历史", sub: "每问一次算一次", col: 1, row: 1, kind: "core" },
  { id: "extra", label: "提示与工具表", sub: "每包都带", col: 2, row: 0, kind: "data" },
  { id: "hist", label: "模型历史", sub: "这次要念的那份", col: 2, row: 1, kind: "data" },
  { id: "replay", label: "回放与界面", sub: "读的是另一份", col: 2, row: 2, kind: "external" },
  { id: "model", label: "模型", sub: "窗口就这么大", col: 3, row: 1, kind: "external" },
];

const edges: StageEdge[] = [
  { from: "log", to: "derive", label: "现算" },
  { from: "compact", to: "derive", label: "遮蔽一段" },
  { from: "derive", to: "hist", label: "算出这份" },
  { from: "extra", to: "model", label: "跟着发" },
  { from: "hist", to: "model", label: "跟着发" },
  { from: "log", to: "replay", label: "同一份日志" },
];

const columnLabels = ["记下来的", "算的那一步", "算出来的", "读它的人"];

export const context: Lesson = {
  id: "context",
  index: "10",
  group: "advanced",
  title: "历史越滚越长，上下文怎么办",
  summary: "上下文满了怎么办",
  eyebrow: "上下文管理",
  readingMinutes: 9,
  oneLiner: "每问一次就把整段历史重念一遍。要裁的是算出来的那份，日志一条不删。",
  positioning:
    "前面几节反复说过一件事：模型不记得上一句。每问一次，都要把整段历史重新发过去。那它越滚越长怎么办。这一节讲两件事：满了会发生什么，以及真动手时动的是哪一份。省下的那点长度，最后要拿什么去换。",
  concepts: [
    {
      term: "一整包输入",
      plain: "每次问模型都重发一遍的那份：系统提示、工具表、全部历史。",
      source: "demo/mini-harness/types.ts · Request",
    },
    {
      term: "上下文窗口",
      plain: "模型一次能读进去多少字，有个上限。整包超了，请求当场失败。",
      source: "demo/mini-harness/plugins/model-fake.ts · model/request 里的 messageCount",
    },
    {
      term: "裁剪与摘要",
      plain: "两种缩短办法：一种直接扔掉几条，一种花一次模型调用总结成一段。",
      source: "demo 里没有这一件，做法见 demo/mini-harness/README.md",
    },
    {
      term: "遮蔽",
      plain: "把日志里一段标成不再进历史。事件本身一条都不删。",
      source: "demo 里没有这一件，做法见 demo/mini-harness/README.md",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels,
    legendLabels: { core: "算的那一步", plugin: "插件", data: "记着的东西", external: "读它的人" },
    overview: {
      nodes,
      edges: edges.map(({ from, to }) => ({ from, to, curve: "straight" as const })),
      columnLabels,
      summary: "一份日志算出两种看法：一份喂模型，一份给人和回放",
    },
  },
  steps: [
    {
      id: "s1",
      title: "一整包里有什么",
      detail: "整包里装三样：系统提示、工具表、全部历史。跑一次 demo，工具表是 5 个。",
      activeNodes: ["extra", "hist", "model"],
      activeEdges: ["extra->model", "hist->model"],
      log: [
        { kind: "call", text: "model/request { round=1, toolCount=5, messageCount=1 }" },
        { kind: "state", text: "toolCount 是这一包带了几个工具，messageCount 是带了几条消息" },
        { kind: "state", text: "系统提示没打出来，但它每一包也都在" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:29",
        content: `/** 模型收到的一整包输入 */
export interface Request {
  system: string
  tools: { name: string; describe: string; params: Record<string, string> }[]
  messages: Message[]
}`,
        note: "类型定义就是那一包的全部内容。三样都得重发，模型那边不留底。",
        highlight: [5],
      },
    },
    {
      id: "s2",
      title: "只有一样在涨",
      detail: "工具表四步都是 5，历史那部分从 1 涨到 7。这一轮用户只说了一句话。",
      activeNodes: ["hist", "model"],
      activeEdges: ["hist->model"],
      log: [
        { kind: "call", text: "model/request { round=1, toolCount=5, messageCount=1 }" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
        { kind: "call", text: "model/request { round=3, toolCount=5, messageCount=5 }" },
        { kind: "call", text: "model/request { round=4, toolCount=5, messageCount=7 }" },
        { kind: "state", text: "那句「看看 notes.txt 写了什么」，在这一轮里被发了 4 遍" },
      ],
    },
    {
      id: "s3",
      title: "窗口就这么大",
      detail: "模型一次能读多少是有上限的。整包超过它，这次请求当场失败。",
      activeNodes: ["model"],
      activeEdges: [],
      log: [
        { kind: "warn", text: "这条 demo 里看不到：假模型按剧本回答，不挑输入多长" },
        { kind: "state", text: "真实模型那边有个上限，整包超了就是一次失败的请求" },
        { kind: "state", text: "失败之后再补救已经晚了，得赶在发出去之前把包管住" },
      ],
    },
    {
      id: "s4",
      title: "每一步现拼一份",
      detail: "循环手里不留历史。每转一步，它现要一份，用完就扔。",
      activeNodes: ["log", "derive", "hist"],
      activeEdges: ["log->derive", "derive->hist"],
      log: [
        { kind: "state", text: "循环里没有一个存历史的数组，翻遍 loop.ts 都找不到" },
        { kind: "state", text: "第 54 行那句 session.derive()，就是「这次给我一份」" },
        { kind: "ok", text: "所以要少给模型看一段，改的是算这一份的规则" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:49",
        content: `    // 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
    // messages 是现从日志里派生的——日志里那些结构事件不会出现在这。
    const reply = await model.ask({
      system: SYSTEM,
      tools: tools.list(),
      messages: session.derive(),
    })`,
        note: "这一段在 for 循环里面。每转一步就重拼一次，上一次那份不留着。",
        highlight: [6],
      },
    },
    {
      id: "s5",
      title: "遮蔽，不是删除",
      detail: "日志只往后加，号从 0 排下去。删中间一条，后面的号就对不上了。",
      activeNodes: ["compact", "derive", "log", "replay"],
      activeEdges: ["compact->derive", "log->replay"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=0, type=turn/start }" },
        { kind: "state", text: "session/append { session=s1, seq=1, type=user }" },
        { kind: "state", text: "session/append { session=s1, seq=2, type=step/start }" },
        { kind: "state", text: "真实 Harness 的压缩是标住一段：算历史时跳过，事件和号都留着" },
        { kind: "warn", text: "demo 里没有压缩插件，这一条来自真实 Harness 的做法" },
      ],
    },
    {
      id: "s6",
      title: "省下的拿什么换",
      detail: "摘要是有损的。它本身还是一次模型调用，一样计费一样要等。",
      activeNodes: ["compact", "model"],
      activeEdges: [],
      log: [
        { kind: "warn", text: "被遮蔽那段的细节，模型后面再问也问不回来了" },
        { kind: "state", text: "所以顺序是先扔能直接扔的，扔不动了才花那一次调用去总结" },
        { kind: "ok", text: "日志那份完整，所以人和回放这条路上什么都没丢" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "上下文满了，Harness 会把老消息从记录里删掉。",
      right:
        "删的是「算给模型看的那一份」的结果。demo 里那一份每问一次现算一次，日志摆在旁边一条没动。真实 Harness 也是这个路子：把被压缩的那段标成不再进历史，事件留着。所以一次压缩过的会话，翻上去看还是完整的。",
    },
    {
      wrong: "压缩就是把文字缩短，本地做完就行，跟模型没关系。",
      right:
        "裁剪可以本地做，摘要不行。要把十几轮对话总结成一段话，得再问一次模型。那一次和别的请求一样计费、一样要等。所以真实系统里顺序是固定的：先扔掉能直接扔的，扔不动了才动摘要。",
    },
    {
      wrong: "窗口够大就不用管上下文了。",
      right:
        "装得下不等于该装。整包每一步都重发一次。demo 里一轮走了 4 步，那一句用户输入就被发了 4 遍，5 个工具的说明也是。历史越长，每一步付的钱和等的时间都跟着长。",
    },
    {
      wrong: "上下文满了就得删掉一段历史。",
      right:
        "删的是喂给模型的那份，不是日志。真实那套里更明确：日志始终完整，压缩做的是让派生时跳过一段，被跳过的部分在回放和界面里照样看得见。省的是模型那边的字数，不是磁盘。这个「一份底账、多种投影」的设计，第 15 节专门讲。",
    },
  ],
  takeaways: [
    {
      title: "换来了什么，付了什么",
      intro: "「历史是算出来的」这件事，好处和账单是配套的。",
      items: [
        {
          label: "换来：动手的位置只有一处",
          text: "要少喂一点给模型，改的是算历史那一步。写日志的地方、循环、工具，一行都不用动。",
          hint: "demo/mini-harness/loop.ts:54",
        },
        {
          label: "换来：压缩之后还能翻旧账",
          text: "模型那边短了，日志这边一条没少。人在界面上翻上去、回放这一次运行，看到的还是全貌。",
        },
        {
          label: "付出：摘要是有损的",
          text: "被总结掉的那几轮，模型手里只剩一段概述。它后面要具体哪一行代码、哪个报错，问不回来了。",
        },
        {
          label: "付出：摘要要先花一次模型调用",
          text: "为了省后面每一步的钱，先花一次钱。会话短的时候这笔账不划算，所以触发它得有个阈值。",
        },
        {
          label: "付出：两份东西要一直对得上",
          text: "人看到的和模型看到的不再是同一份。排查问题时得先问清楚：这句话模型到底看没看见。",
        },
      ],
    },
    {
      title: "真实 Harness 这一块还多了什么",
      intro: "demo 里根本没有压缩这一件。中间两条出自 demo/mini-harness/README.md 末尾那张差距表，头尾两条出自 DeepSeek Harness 自带文档。",
      items: [
        {
          label: "压缩是一个插件",
          text: "它不长在循环里。循环照旧每一步要一份历史，插件负责让那一份短下来。所以换一套压缩策略不用碰循环。",
        },
        {
          label: "遮蔽而不是删除",
          text: "上下文太长时遮蔽掉一段，日志始终是完整的。被遮蔽的那段不进模型历史，回放和界面读的是另一份投影。",
        },
        {
          label: "算过的会缓存",
          text: "demo 每问一次模型就把整条日志重过一遍。真实系统把算过的部分留着，只算新增的那一段。",
        },
        {
          label: "溢出了还有一次机会",
          text: "整包撑爆了那次请求，还能先压一压再重发。但只有真的压短了才会再试一次，压不动就按这次失败报出来。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "一段对话被压缩成摘要之后，原来那几轮消息还翻得出来吗？",
      options: [
        "翻不出来，压缩就是把它们删了",
        "翻得出来，日志里的事件一条没删，被遮蔽的只是不再进模型历史",
        "翻得出来，但要再问一次模型，让它把内容还原",
      ],
      answer: 1,
      explain:
        "被动的是「算给模型看的那一份」。demo 里那一份每问一次现算一次，在 demo/mini-harness/loop.ts:54 那一句要。真实 Harness 的压缩就在这一步上遮蔽一段范围，日志那边的事件和号一个不动。",
      wrongExplains: [
        "把两份东西当成了一份。日志只往后加，号从 0 一路排下去；模型看到的那份是每问一次现算的。压缩改的是后面那份的算法。",
        "",
        "翻旧消息不用问模型，它们就躺在日志里。要花一次模型调用的是「生成摘要」那一步，不是「读回原文」那一步。",
      ],
    },
    {
      question: "你想让模型下一次少读一点。动哪里？",
      options: [
        "往日志里少写几条事件",
        "让算历史那一步少放几条进结果",
        "把工具表删短一点",
      ],
      answer: 1,
      explain:
        "模型读的是算出来的那一份，日志它一眼都看不到。改算的这一步，模型那边立刻短了，写日志的地方和循环一行都不用动。",
      wrongExplains: [
        "日志是唯一那份原始记录。少写一条，省下的那点长度，是拿「这次运行还原不回来」换的。",
        "",
        "工具表确实占位置，demo 里每一包都带 5 个工具。但删工具是把能力砍了，而且它四步都是 5，跟对话变长没关系。",
      ],
    },
  ],
  evidence: "压缩的说法出自 DeepSeek Harness 自带文档，demo 里没有这一件",
  bridge:
    "这一节的麻烦是历史太长，好歹还能预料。下一节是另一种：工具当场抛了个异常，或者模型每一步都要工具就是不给答案。循环撞上这两样，会不会当场死掉。",
};
