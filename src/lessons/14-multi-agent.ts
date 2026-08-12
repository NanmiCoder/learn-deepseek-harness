import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 这一节讲把一件事分给另一个 Agent 做：它另开一份会话，回来只带一句话。
 *
 * 第 13 节讲的是一份日志能读出几样东西。这里回答的是「为什么每个子 Agent
 * 要单开一份」——用三个会话的日志长度回答，不讲道理。
 *
 * 全部运行记录来自 npm run demo 第二轮（把 notes.txt 的要点整理一下）。
 * 真实 DSH 的分活方式多出来的部分，出处是 demo/mini-harness/README.md
 * 末尾的差距表，由 evidence 字段标明。
 */

const nodes: StageNode[] = [
  { id: "user", label: "一句需求", sub: "把要点整理一下", col: 0, row: 1, kind: "external" },
  { id: "parent", label: "父会话 s2", sub: "顶层，第 0 层", col: 1, row: 1, kind: "core", kindLabel: "主 Agent" },
  { id: "plog", label: "父会话日志", sub: "11 条，历史 6 条", col: 1, row: 3, kind: "data" },
  { id: "delegate", label: "delegate", sub: "分活的那个工具", col: 2, row: 1, kind: "plugin" },
  { id: "child", label: "子会话 s3", sub: "派自 s2，第 1 层", col: 3, row: 1, kind: "core", kindLabel: "子 Agent" },
  { id: "clog", label: "子会话日志", sub: "5 条，历史 2 条", col: 3, row: 3, kind: "data" },
];

const edges: StageEdge[] = [
  { from: "user", to: "parent", label: "一句话" },
  { from: "parent", to: "plog", label: "记一条" },
  { from: "parent", to: "delegate", label: "分出去" },
  { from: "delegate", to: "child", label: "另开一份" },
  { from: "child", to: "clog", label: "自己记" },
  { from: "child", to: "delegate", label: "回一句" },
  { from: "delegate", to: "plog", label: "当工具结果" },
];

export const multiAgent: Lesson = {
  id: "multi-agent",
  index: "14",
  group: "put-together",
  title: "把活分出去，子 Agent 为什么要自己开一份日志",
  summary: "三个会话，各记各的",
  eyebrow: "多 Agent 协作",
  readingMinutes: 10,
  oneLiner: "s2 的日志 11 条。派出去的 s3 从零记起只有 5 条，父会话那段不用带。",
  positioning:
    "第 10 节讲过那一包只涨不降，第 13 节讲过截一段就能另开一份。这一节真去分一件事出去：接手的那位另起了一份日志，为什么要这样，用三个会话的长度回答。",
  concepts: [
    {
      term: "子 Agent",
      plain: "接过一件独立的小事，在自己的会话里做完，回一句结论。",
      source: "demo/mini-harness/plugins/subagent.ts · delegate",
    },
    {
      term: "子会话",
      plain: "另开的一份日志，只记它自己那几条，父会话那段不带。",
      source: "demo/mini-harness/plugins/session.ts · create()",
    },
    {
      term: "父子关系",
      plain: "挂在会话自己身上的两项：爹是谁、隔了几层。不是嵌套。",
      source: "demo/mini-harness/types.ts · SessionMeta",
    },
    {
      term: "工具结果",
      plain: "子 Agent 那句结论当成一条工具结果进父会话，和读文件同一条路。",
      source: "demo/mini-harness/loop.ts · runTurn()",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels: ["谁提的", "谁接的", "分给谁", "谁做的"],
    legendLabels: { core: "两个会话", plugin: "分活的工具", data: "各自的日志", external: "人" },
    overview: {
      nodes,
      edges: edges.map(({ from, to }) => ({ from, to, curve: "straight" as const })),
      columnLabels: ["谁提的", "谁接的", "分给谁", "谁做的"],
      summary: "一件事分出去，另开一份日志做完，回来只带一句话",
    },
  },
  steps: [
    {
      id: "s1",
      title: "换个需求，开一份新的",
      detail:
        "demo 第二轮换了个需求，从头开一个顶层会话。setCurrent 那一行不是摆设：等下工具要开子会话时，得知道自己现在在哪一份里。",
      activeNodes: ["user", "parent", "plog"],
      activeEdges: ["user->parent", "parent->plog"],
      log: [
        { kind: "event", text: "session/create { session=s2, parent=无, depth=0 }" },
        { kind: "state", text: "session/append { session=s2, seq=0, type=turn/start }" },
        { kind: "state", text: "session/append { session=s2, seq=1, type=user }" },
        { kind: "call", text: "model/request { round=5, toolCount=5, messageCount=1 }" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:66",
        highlight: [2],
        content: `const second = sessions.create()
sessions.setCurrent(second)
const delegated = await ctx.get<Loop>('loop').run(second, '把 notes.txt 的要点整理一下')`,
        note: "parent 是空的、depth 是 0，说明这是一份顶层会话，跟 s1 平级，不是它的下级。",
      },
    },
    {
      id: "s2",
      title: "分出去那一下，另开一份",
      detail:
        "模型这一步点了 delegate。这个工具跑起来的第一件事不是干活，是新建一个会话，把爹是谁、隔了几层记在它身上。",
      activeNodes: ["parent", "delegate", "child"],
      activeEdges: ["parent->delegate", "delegate->child"],
      log: [
        { kind: "call", text: 'tool/decide { name=delegate, args={"task":"把 notes.txt 的要点整理成一句话"} }' },
        { kind: "call", text: 'tool/before { name=delegate, args={"task":"把 notes.txt 的要点整理成一句话"} }' },
        { kind: "event", text: "session/create { session=s3, parent=s2, depth=1 }" },
        { kind: "call", text: "delegate/start { child=s3, task=把 notes.txt 的要点整理成一句话 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/subagent.ts:34",
        highlight: [1, 2],
        content: `// 关键就是这一行：开一个新会话，而不是往当前这份日志里接着写
const child = sessions.create({
  parent: parent?.id,
  depth: (parent?.meta.depth ?? 0) + 1,
})`,
        note: "爹是谁、隔了几层，是记在子会话自己身上的两项数据，不是把它塞进父会话里面。",
      },
    },
    {
      id: "s3",
      title: "它那份历史只有一条",
      detail:
        "子会话开头三条事件下去，派生出来只有一条：它收到的那句任务。父会话那一大段对话跟它没关系。",
      activeNodes: ["child", "clog"],
      activeEdges: ["child->clog"],
      log: [
        { kind: "state", text: "session/append { session=s3, seq=0, type=turn/start }" },
        { kind: "state", text: "session/append { session=s3, seq=1, type=user }" },
        { kind: "state", text: "session/append { session=s3, seq=2, type=step/start }" },
        { kind: "call", text: "model/request { round=6, toolCount=0, messageCount=1 }" },
        { kind: "state", text: "父会话自己最后一次问模型是 5 条，它这一次只有 1 条" },
      ],
      code: {
        source: "demo/mini-harness/plugins/subagent.ts:42",
        highlight: [9, 10],
        content: `child.append('turn/start', { text: args.task })
child.append('user', { text: args.task })
child.append('step/start', { step: 1 })

// 子 Agent 用的是同一个模型服务。它派生出来的历史里只有自己那两条，
// 父会话那一大段跟它没关系。
const reply = await model.ask({
  system: CHILD_SYSTEM,
  tools: [],
  messages: child.derive(),
})`,
        note: "同一个模型服务，喂进去的是子会话自己算出来的那份。工具表这里写死成空的，所以上面那行是 toolCount=0。",
      },
    },
    {
      id: "s4",
      title: "回来的只有一句话",
      detail:
        "子会话那 5 条事件一条都没回流。父会话拿到的是一条工具结果，和 read_file 拿到的东西同一种。",
      activeNodes: ["child", "delegate", "plog"],
      activeEdges: ["child->delegate", "delegate->plog"],
      log: [
        { kind: "ok", text: "delegate/done { child=s3, events=5 }" },
        { kind: "io", text: "tool/after { name=delegate, output=（子 agent）把 notes.txt 的要点整理成一句话：记得… }" },
        { kind: "state", text: "session/append { session=s2, seq=4, type=tool }" },
        { kind: "state", text: "父会话这边只多了一条 tool，正好是子会话回的那句话" },
      ],
      code: {
        source: "demo/mini-harness/plugins/subagent.ts:54",
        highlight: [5],
        content: `child.append('assistant', { text: reply.text })
child.append('turn/end', { step: 1 })

ctx.emit('delegate/done', { child: child.id, events: child.events().length })
return reply.text`,
        note: "return 出去的是普通工具的返回值。循环拿到它照常记一条 tool，不知道也不关心它是子 Agent 生的。",
      },
    },
    {
      id: "s5",
      title: "三个会话，各记各的",
      detail:
        "跑完全程把三份都列出来：两个顶层的，一个派出去的。派出去那份的日志和历史都短一截。",
      activeNodes: ["plog", "clog"],
      activeEdges: [],
      log: [
        { kind: "state", text: "s1（顶层，第 0 层）：日志 14 条，派生历史 8 条" },
        { kind: "state", text: "s2（顶层，第 0 层）：日志 11 条，派生历史 6 条" },
        { kind: "state", text: "s3（派自 s2，第 1 层）：日志 5 条，派生历史 2 条" },
        { kind: "state", text: "子会话没带上父会话那一大段对话，所以它那份历史短得多。" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:75",
        highlight: [4, 5],
        content: `for (const item of sessions.list()) {
  const from = item.meta.parent ? \`派自 \${item.meta.parent}\` : '顶层'
  console.log(
    \`\${item.id}（\${from}，第 \${item.meta.depth ?? 0} 层）\` +
    \`：日志 \${item.events().length} 条，派生历史 \${item.derive().length} 条\`,
  )
}`,
        note: "三个会话平着躺在同一张表里，列出来就是三行。爹是谁，是每一行自己带的。",
      },
    },
    {
      id: "s6",
      title: "真实里的分活还多几种",
      detail:
        "demo 只做了一种：新开一个，问一次，回来。真实 DSH 的分活方式不止这一种，也不是默认就并发跑。",
      activeNodes: ["delegate", "child"],
      activeEdges: [],
      log: [
        { kind: "warn", text: "demo 里派活是串行的：demo/mini-harness/loop.ts 那个 for 一次只等一个工具跑完" },
        { kind: "state", text: "真实 DSH 会并发跑，但要先判定这批活并发着做是安全的" },
        { kind: "state", text: "判不出来、没声明、判断本身出错，一律按不能并发处理" },
        { kind: "state", text: "分活方式也不止新开一份：还能从当前对话某一条上分叉出去，或者交给另一个产品做" },
        { kind: "state", text: "有的子 Agent 跑完就结束，有的能存下来以后接着聊" },
        { kind: "state", text: "爹是谁、隔了几层这些都要落盘，重启之后还认得" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "子 Agent 就是换一段提示词接着聊，还是同一份对话。",
      right:
        "不是。delegate 干的第一件事是新建一个会话，那份日志从 seq=0 开始记。跑完之后 s3 是 5 条日志、2 条历史，s2 是 11 条和 6 条，两份各记各的，没有一条是共用的。",
    },
    {
      wrong: "子会话记着爹是谁，说明它被套在父会话里面。",
      right:
        "记下来的只有两项数据：爹的 id、隔了几层。会话本身是平的，三个躺在同一张表里，sessions.list() 一次列出三行。真实 DSH 也是把这两项挂在会话自己身上，不靠一层套一层来表达。",
    },
    {
      wrong: "子 Agent 看不到父会话那段对话，所以它被关住了，干不了坏事。",
      right:
        "两码事。demo 里子 Agent 的工具表是空的，那行 toolCount=0 就是这么来的。空表是 demo/mini-harness/plugins/subagent.ts 里写死的一行 tools: []，跟日志分不分开没关系。看不见一段对话，和碰不到一个工具，是两套机制，别拿前者当后者用。",
    },
  ],
  takeaways: [
    {
      title: "分出去换来什么",
      intro: "三条都能在 npm run demo 的输出里当场数出来。",
      items: [
        {
          label: "那一包不用带着走",
          text: "子会话的历史从零开始。s3 问模型时 messageCount=1；父会话自己最后那次是 5 条，一个人干到底的 s1 到了 7 条。",
          hint: "demo/mini-harness/plugins/subagent.ts · child.derive()",
        },
        {
          label: "中间过程不用回流",
          text: "s3 那 5 条事件一条都没进父会话。父会话只多了一条 tool，装着子 Agent 回的那句话。",
        },
        {
          label: "两份日志各自完整",
          text: "s3 自己有 turn/start 也有 turn/end，单独拎出来照样读得懂，不用先去看父会话。",
        },
      ],
    },
    {
      title: "代价是什么",
      intro: "四条，都是选了「分出去做」之后躲不掉的。",
      items: [
        {
          label: "回来的就那一句",
          text: "子 Agent 干活时看到的细节，父会话一条都拿不到。那句结论写得含糊，父会话就没法接着做——成本落在下一步，而且当场看不出来。",
        },
        {
          label: "排查要跨日志翻",
          text: "一件事做砸了，先看父会话哪一步派的活，再翻子会话那份。demo 里是三份，真实任务里子会话会更多。",
        },
        {
          label: "分得太碎更贵",
          text: "s3 那 5 条里有 3 条是开场和收尾，真正干活的只有一次问模型。任务越小，这笔开销占比越大。",
        },
        {
          label: "并发不是白给的",
          text: "真实 DSH 要先判定这批活并发着做是安全的才给并发，判不出来就按排队处理。想靠多开几个 Agent 提速，得先过那一关。",
        },
      ],
    },
    {
      title: "到这里为止，你会什么、还不会什么",
      intro: "前面这些都建在 demo/mini-harness 这台最小 Harness 上。先说清它带你走到了哪。",
      items: [
        {
          label: "你会的",
          text: "读懂一次运行的每一行输出；给它加一个插件和一个工具；插件没生效时分层查到底卡在哪；说清日志和模型历史的关系；读懂一次派活。",
        },
        {
          label: "对得上的部分",
          text: "插件的形状、按名字取服务、依赖没齐就等着、拆掉时按登记回收、环绕式拦截、日志派生历史。这几件真实 DSH 是同一套做法，差的是规模不是形状。",
          hint: "demo/mini-harness/README.md · 末尾差距表",
        },
        {
          label: "简化掉的部分",
          text: "装配单的层数、循环的层数、并发调度、落盘与恢复、真的网络请求，demo 里要么是简化的要么根本没有。别把骨架当成全部。",
        },
        {
          label: "这门课不教的",
          text: "从零写一个生产级的插件容器、真实的模型接入与流式、进程沙箱、真实的并发调度。不是讲不好，是不讲——知道它们存在就行。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "delegate 为什么要新建一个会话，而不是往当前这份日志里接着写？",
      options: [
        "父会话的日志有长度上限，写满了得换一份",
        "接着写的话，子 Agent 每问一次模型都得把父会话那一大段一起带上",
        "两边同时往一份日志里写会打架",
      ],
      answer: 1,
      explain:
        "模型不记得上一步，每问一次都要把历史整个重发。接着写就等于子 Agent 每一步都替父会话那段对话付一次账。demo 里 s3 那次是 messageCount=1，父会话自己最后那次是 5 条。",
      wrongExplains: [
        "日志没有上限，它只管往后加。s1 记到 14 条也没人拦。换一份是为了别把父会话那段带上，不是因为写满了。",
        "",
        "demo 里派活是串行的：delegate 没跑完，父会话那一步一直等着。没有两边同时写这回事，分开记也不是为了这个。",
      ],
    },
    {
      question: "s3 的日志 5 条，派生历史 2 条。这 2 条是哪两条？",
      options: [
        "父会话派下来的那句任务，和子 Agent 回的那句结论",
        "开始一轮和结束一轮",
        "父会话最后两条消息，抄了一份过来",
      ],
      answer: 0,
      explain:
        "5 条里只有 user 和 assistant 两条会变成消息，turn/start、step/start、turn/end 那三条是结构事件。挑法和第 13 节那份一模一样，换个会话也不换规矩。",
      wrongExplains: [
        "",
        "turn/start 和 turn/end 恰好是被跳过的那两种。它们记的是边界，模型一个字都看不到。",
        "父会话一条都没抄过来。s3 的第 0 条就是它自己的 turn/start，seq 从 0 数起。",
      ],
    },
  ],
  evidence:
    "运行记录来自 npm run demo 第二轮；真实 DSH 的分活方式和并发判定，出自 demo/mini-harness/README.md 末尾的差距表和 DeepSeek Harness 自带文档",
  bridge:
    "到这里，demo/mini-harness 那台最小 Harness 每一块都拆过一遍了。可你写的插件是往 demo/mini-harness/main.ts 里加一行装上的，真实 DSH 的插件不长这样，也不是这么装的。下一节把两边的写法一条条对上。",
};
