import type { Lesson } from "../tutorial/types";

/**
 * 全教程第一节。要读者带走的只有一件事：
 * 模型说「删掉它」的那一刻，文件到底删没删。
 *
 * turn 和 step 这两个词在这里第一次钉死，后面每一节都按这个用法。
 * 运行记录全部来自 npm run demo 的第一轮对话（会话 s1），逐行可核对。
 */

export const harnessBasics: Lesson = {
  id: "harness-basics",
  index: "01",
  title: "模型只会说话，谁去动手",
  summary: "一句话问了模型 4 次",
  eyebrow: "基础认知",
  group: "know",
  readingMinutes: 8,
  oneLiner: "一个 agent 拆开就两半：一半是模型，只会输出文字；剩下那一半全是 harness。",
  positioning:
    "先把名字说清。一个 agent 拆开只有两半：一半是模型，它能看、能说，但手伸不出来，说完就忘。剩下那一半全是 harness——把整段对话重新念给它听的那层、真去读文件删文件的那层、危险动作先问你一句的那层、决定这次装哪几件的那张单子。harness 不是某一个部件，是模型以外的所有东西的总称。这一节先看它最日常的那次运转：你说一句话，它让模型真的动起来。",
  concepts: [
    {
      term: "会话记录",
      plain: "模型不记得上一句。发生过的事记在外面，每次问它之前重新念一遍。",
      source: "demo/mini-harness/plugins/session.ts · append()",
    },
    {
      term: "工具",
      plain: "模型只写得出工具名和参数。真去读文件删文件的是 harness 里的工具。",
      source: "demo/mini-harness/plugins/tools.ts",
    },
    {
      term: "循环",
      plain: "模型每要一次工具就多问一次，直到它不再要工具。这段转圈也是 harness 的一块。",
      source: "demo/mini-harness/loop.ts · runTurn()",
    },
    {
      term: "权限确认",
      plain: "危险动作动手前先问你。你说不行，理由当成结果还给模型。",
      source: "demo/mini-harness/plugins/approval.ts · tool/decide",
    },
  ],
  stage: {
    nodes: [
      { id: "user", label: "用户", sub: "敲一句话", col: 0, row: 1, kind: "external" },
      { id: "loop", label: "循环", sub: "harness 的一块", col: 1, row: 0, kind: "core" },
      { id: "record", label: "会话记录", sub: "harness 的一块", col: 1, row: 2, kind: "data" },
      { id: "approval", label: "权限确认", sub: "harness 的一块", col: 2, row: 2, kind: "plugin" },
      { id: "model", label: "大模型", sub: "只会输出文字", col: 2, row: 0, kind: "external" },
      { id: "tool", label: "工具", sub: "harness 的一块", col: 3, row: 1, kind: "plugin" },
      { id: "world", label: "真实世界", sub: "文件 命令 网络", col: 3, row: 3, kind: "external" },
    ],
    edges: [
      { from: "user", to: "loop", label: "说一句" },
      { from: "loop", to: "record", label: "记下来" },
      { from: "record", to: "loop", label: "重念一遍" },
      { from: "loop", to: "model", label: "整包发过去" },
      { from: "model", to: "loop", label: "我要调工具" },
      { from: "loop", to: "tool", label: "照着去做" },
      { from: "tool", to: "world", label: "真的动手" },
      { from: "tool", to: "loop", label: "结果回来" },
      { from: "loop", to: "approval", label: "先问一句" },
      { from: "approval", to: "loop", label: "你说不行" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "你说了一句话",
      detail:
        "你的话不会直接飞到模型那里。先被记下来——这是 harness 里「会话记录」那一块干的活。一次用户输入就是一个 turn，这个 turn 从这两条记录开始。",
      activeNodes: ["user", "loop", "record"],
      activeEdges: ["user->loop", "loop->record"],
      log: [
        { kind: "io", text: "用户输入：看看 notes.txt 写了什么，然后把它删掉" },
        { kind: "event", text: "session/create { session=s1, parent=无, depth=0 }" },
        { kind: "state", text: "session/append { session=s1, seq=0, type=turn/start }" },
        { kind: "state", text: "session/append { session=s1, seq=1, type=user }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:39",
        highlight: [5, 6],
        content: `export async function runTurn(ctx: Context, session: Session, userText: string): Promise<string> {
  const model = ctx.get<Model>('model')
  const tools = ctx.get<Tools>('tools')

  session.append('turn/start', { text: userText })
  session.append('user', { text: userText })`,
        note: "你的话先被记下来。模型那边还什么都没发生。",
      },
    },
    {
      id: "s2",
      title: "把整段话念给模型",
      detail:
        "模型不记得上一句。每问一次都要重新拼一包完整输入：系统提示、工具清单、整段对话。问模型一次，就是一个 step。",
      activeNodes: ["loop", "record", "model"],
      activeEdges: ["record->loop", "loop->model"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=2, type=step/start }" },
        { kind: "call", text: "model/request { round=1, toolCount=5, messageCount=1 }" },
        { kind: "state", text: "这个 turn 的第 1 个 step。这时对话里只有你那一句话" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:51",
        highlight: [4],
        content: `    const reply = await model.ask({
      system: SYSTEM,
      tools: tools.list(),
      messages: session.derive(),
    })`,
        note: "messages 是这次要给模型看的整段对话。每一步都从头带一遍。",
      },
    },
    {
      id: "s3",
      title: "模型只回了文字",
      detail:
        "模型回了一句话：我要调 read_file，参数是 notes.txt。注意，它只是写下了这句话。文件一个字都没被读。",
      activeNodes: ["model", "loop"],
      activeEdges: ["model->loop"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=3, type=assistant }" },
        { kind: "state", text: "这条消息带着一个 toolCall：{ name: read_file, args: { path: notes.txt } }" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:3",
        highlight: [6, 11, 12],
        content: `/** 一条对话消息 */
export interface Message {
  role: 'user' | 'assistant' | 'tool'
  text: string
  /** 只有 assistant 消息可能带这个：模型说它想调哪个工具 */
  toolCall?: ToolCall
}

/** 模型说「我要调这个工具，参数是这些」 */
export interface ToolCall {
  name: string
  args: Record<string, string>
}`,
        note: "模型能给的只有名字和参数。别的一概没有。",
      },
    },
    {
      id: "s4",
      title: "真去动手的是它",
      detail:
        "循环拿这个名字去工具表里找。找到了就跑那个函数。倒数第三行才是真的动手：文件被读出来了。",
      activeNodes: ["loop", "tool", "world"],
      activeEdges: ["loop->tool", "tool->world"],
      log: [
        { kind: "call", text: 'tool/decide { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "call", text: 'tool/before { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:79",
        highlight: [2, 7],
        content: `async function runTool(ctx: Context, call: ToolCall): Promise<string> {
  const tool = ctx.get<Tools>('tools').find(call.name)

  // 工具不存在也要给模型一个回复，让它自己换个做法
  if (!tool) return \`没有叫 \${call.name} 的工具。\`
  // ...
    const output = await tool.run(decision.args)
    ctx.emit('tool/after', { name: call.name, output })
    return output`,
        note: "第 7 行是真的动手那一行。模型碰不到它。",
      },
    },
    {
      id: "s5",
      title: "结果塞回去再问",
      detail:
        "读到的内容记成新的一条。然后回到上一步，把变长的对话重新拼一包再问一次。这次带过去 3 条。",
      activeNodes: ["tool", "loop", "record", "model"],
      activeEdges: ["tool->loop", "loop->record", "loop->model"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=4, type=tool }" },
        { kind: "state", text: "session/append { session=s1, seq=5, type=step/start }" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:46",
        highlight: [5],
        content: `  for (let step = 1; step <= MAX_STEPS; step++) {
    session.append('step/start', { step })
    // ...
    const result = await runTool(ctx, reply.toolCall)
    session.append('tool', { text: result })
  }`,
        note: "结果记成新的一条，下一步自然带上。",
      },
    },
    {
      id: "s6",
      title: "第二个工具也真跑了",
      detail:
        "第 2 步模型要的是 count_files。和 read_file 一样：它只写下名字和参数，真去数文件的是工具那一层。循环就是同一套流程再来一遍。",
      activeNodes: ["model", "loop", "tool", "world"],
      activeEdges: ["model->loop", "loop->tool", "tool->world"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=6, type=assistant }" },
        { kind: "state", text: "这条消息带着一个 toolCall：{ name: count_files, args: {} }" },
        { kind: "call", text: "tool/decide { name=count_files, args={} }" },
        { kind: "call", text: "tool/before { name=count_files, args={} }" },
        { kind: "io", text: "tool/after { name=count_files, output=工作区里有 2 个文件。（这个工具被调用了 1 次） }" },
        { kind: "state", text: "session/append { session=s1, seq=7, type=tool }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts:26",
        highlight: [3],
        content: `      async run() {
        calls++
        return \`工作区里有 2 个文件。（这个工具被调用了 \${calls} 次）\`
      },`,
        note: "第 3 行是真正干活的那一行。模型碰不到它。",
      },
    },
    {
      id: "s7",
      title: "危险的先问你",
      detail:
        "第 3 步模型要删文件。这个工具标了危险，动手前先问你一句。你说不行，拒绝理由就当成工具结果还给模型。",
      activeNodes: ["loop", "approval", "record"],
      activeEdges: ["loop->approval", "approval->loop"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=8, type=step/start }" },
        { kind: "call", text: "model/request { round=3, toolCount=5, messageCount=5 }" },
        { kind: "state", text: "session/append { session=s1, seq=9, type=assistant }" },
        { kind: "state", text: "这条消息带着一个 toolCall：{ name: delete_file, args: { path: notes.txt } }" },
        { kind: "call", text: 'tool/decide { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "session/append { session=s1, seq=10, type=tool }" },
        { kind: "state", text: "这次没有 tool/before 也没有 tool/after：delete_file 一次都没跑" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:93",
        highlight: [4],
        content: `  if (decision.blocked) {
    // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
    ctx.emit('tool/blocked', { name: call.name, reason: decision.blocked })
    return decision.blocked
  }`,
        note: "拒绝理由当成这次工具的结果返回，模型看得见。",
      },
    },
    {
      id: "s8",
      title: "模型不要工具了",
      detail:
        "第 4 步模型只回了一句话，没再要工具。循环从这里返回，这个 turn 结束。这是正常出口，下面还有一个兜底出口。",
      activeNodes: ["model", "loop", "user"],
      activeEdges: ["model->loop"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=11, type=step/start }" },
        { kind: "call", text: "model/request { round=4, toolCount=5, messageCount=7 }" },
        { kind: "state", text: "session/append { session=s1, seq=12, type=assistant }" },
        { kind: "ok", text: "session/append { session=s1, seq=13, type=turn/end }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:58",
        highlight: [3, 12],
        content: `    // 出口之一：模型没要工具，说明它给出答案了。
    // 另一个出口在下面——步数走到 MAX_STEPS 上限，防它一直要工具不给答案。
    if (!reply.toolCall) {
      session.append('turn/end', { step })
      return reply.text
    }

    const result = await runTool(ctx, reply.toolCall)
    session.append('tool', { text: result })
  }

  return '步数用完了，还没得到答案。'
}`,
        note: "模型不要工具就从第 3 行返回。跑满 6 步还没结果，第 12 行是兜底出口。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "模型自己会读文件、跑命令。",
      right:
        "模型只写下一个工具名和一组参数。真去读文件的是 demo/mini-harness/plugins/tool-files.ts 里那个 run 函数。模型全程碰不到你的机器。",
    },
    {
      wrong: "一次对话就是问一句、答一句。",
      right:
        "demo 里你只说了一句话，模型被问了 4 次。它每要一次工具就多问一次，直到它不再要工具为止。一次用户输入叫一个 turn，问模型一次叫一个 step——这个 turn 里有 4 个 step。",
    },
    {
      wrong: "循环只有一个出口：模型不再要工具。",
      right:
        "有两个。loop.ts 的 for 写着最多跑 6 步，跑满了就返回「步数用完了，还没得到答案。」。这条兜底路是防模型抽风的：万一它每一步都要工具、永远不给答案，总得有个头。demo 的剧本 4 步就收工，所以这条路你在输出里看不到。",
    },
    {
      wrong: "你点了拒绝，这件事就翻篇了。",
      right:
        "拒绝理由会当成一条工具结果发回给模型。所以它最后那句话才说得出「你不让删，我就没删」。",
    },
  ],
  takeaways: [
    {
      title: "跑一遍 demo，账是这样的",
      intro: "npm run demo，下面这些数字都能在第一轮对话里对上。",
      items: [
        {
          label: "模型被问了 4 次",
          text: "你只说了一句话。前 3 次它都在要工具，第 4 次才给答案。这 4 次是同一个 turn 里的 4 个 step。",
          hint: "model/request round=1..4",
        },
        {
          label: "每一步都要重发一遍",
          text: "喂给模型的对话从 1 条涨到 7 条。模型不记得上一步，上一步的结果只能靠重发带过去。",
          hint: "messageCount 1 → 3 → 5 → 7",
        },
        {
          label: "工具只真跑了 2 次",
          text: "read_file 和 count_files 跑了。delete_file 被拦下，它的 run 一次都没跑。",
          hint: "第一轮里 tool/after 只出现 2 行",
        },
        {
          label: "模型看得见 5 个工具",
          text: "read_file、stat_file、delete_file、count_files、delegate。这份清单每一步都跟着重发一遍。",
          hint: "toolCount=5",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "demo 里你只说了一句话，模型却被问了 4 次。为什么？",
      options: [
        "harness 怕模型答错，同一个问题重复问几遍",
        "模型每要一次工具，就得把结果拼进去重新问一次",
        "轮数写死是 4，每次都问满 4 轮",
      ],
      answer: 1,
      explain:
        "模型不记得上一步，工具结果只能靠重新拼一包输入喂进去。它第 4 次不再要工具，循环才停，不是问够次数就停。",
      wrongExplains: [
        "问题每次都不一样。第 1 次输入里只有你那句话，第 4 次已经带上前面 7 条——运行记录里 messageCount 从 1 涨到 7。",
        "",
        "写死的是上限不是次数：loop.ts 里最多跑 6 步，而这一轮 4 步就停了。停下来是因为模型不再要工具。",
      ],
    },
    {
      question: "模型说出「我要删 notes.txt」的那一刻，文件被删了吗？",
      options: [
        "删了，模型说出口就等于执行",
        "没删。那只是一段文字，要 harness 里的工具找到、真去跑那个函数才会删",
        "没删，但模型会自己重试直到删掉",
      ],
      answer: 1,
      explain:
        "模型的输出只有工具名和参数。这次还被拦下了，delete_file 的 run 一次都没跑，运行记录里连 tool/before 那行都没有。",
      wrongExplains: [
        "模型的输出只是一条消息，里面写着名字和参数。真去动手的那一行在 loop.ts 里，长这样：await tool.run(decision.args)。",
        "",
        "它没有自己动手的通道，下一步说什么全看它收到了什么。这一轮它收到拒绝理由后就改口了，最后那句是「你不让删，我就没删」。",
      ],
    },
  ],
  bridge:
    "记对话、执行工具、决定这次装哪几件——这些都是 harness 的活，模型一概不管。这是 harness 这个词在任何一个 agent 框架里的意思。下一节落到具体的一个：DeepSeek 做的这套 harness 叫什么、跟 Claude Code 那种有什么区别。",
};
