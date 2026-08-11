import type { Lesson } from "../tutorial/types";

export const harnessBasics: Lesson = {
  id: "harness-basics",
  index: "01",
  title: "Harness 是什么",
  summary: "模型只会说话，谁去动手",
  eyebrow: "基础认知",
  readingMinutes: 7,
  oneLiner: "大模型只会输出文字。Harness 在外面替它动手，再把结果喂回去。",
  analogy:
    "把模型想成一个关在玻璃房里的专家。他能看资料、能说话，但手伸不出来。你说一句话，外面的助手把整段对话念给他听。他说「帮我打开 3 号柜子」，助手真的去开。开完把里面的东西递进去。他没有记忆，所以助手每次都得从头念一遍。碰上「把柜子砸了」，助手会先扭头问你一句。这个助手就是 Harness。",
  concepts: [
    {
      term: "会话历史",
      plain: "模型不记得上一句。整段对话存在外面，每次重新念给它听。",
      source: "demo/mini-harness/plugins/history.ts · all()",
    },
    {
      term: "工具调用",
      plain: "模型只写得出工具名和参数。真去执行的是 Harness。",
      source: "demo/mini-harness/loop.ts · runTool()",
    },
    {
      term: "一轮循环",
      plain: "执行完把结果塞回历史，再问一次。模型不再要工具才停。",
      source: "demo/mini-harness/loop.ts · runTurn()",
    },
    {
      term: "权限确认",
      plain: "危险动作动手前先问你。你说不行，理由当成结果还给模型。",
      source: "demo/mini-harness/plugins/approval.ts · tool/before",
    },
  ],
  stage: {
    nodes: [
      { id: "user", label: "用户", sub: "敲一句话", col: 0, row: 1, kind: "external" },
      { id: "harness", label: "Harness", sub: "中间这一层", col: 1, row: 1, kind: "core" },
      { id: "history", label: "会话历史", sub: "整段对话都在", col: 1, row: 3, kind: "data" },
      { id: "model", label: "大模型", sub: "只会输出文字", col: 2, row: 0, kind: "external" },
      { id: "approval", label: "问你一句", sub: "危险动作才问", col: 2, row: 2, kind: "plugin" },
      { id: "tool", label: "工具", sub: "真的去执行", col: 3, row: 1, kind: "core" },
      { id: "world", label: "真实世界", sub: "文件 命令 网络", col: 3, row: 3, kind: "external" },
    ],
    edges: [
      { from: "user", to: "harness", label: "说一句" },
      { from: "harness", to: "history", label: "记下来" },
      { from: "history", to: "harness", label: "重念一遍" },
      { from: "harness", to: "model", label: "整包发过去" },
      { from: "model", to: "harness", label: "我要调工具" },
      { from: "harness", to: "tool", label: "照着去做" },
      { from: "tool", to: "world", label: "真的动手" },
      { from: "tool", to: "harness", label: "结果回来" },
      { from: "harness", to: "approval", label: "先问一句" },
      { from: "approval", to: "harness", label: "你说不行" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "你说了一句话",
      detail:
        "你的话不会直接飞到模型那里。Harness 先把它记进历史。历史就是这段对话的完整记录，从头到尾一条不落。",
      activeNodes: ["user", "harness", "history"],
      activeEdges: ["user->harness", "harness->history"],
      log: [
        { kind: "io", text: "用户输入：看看 notes.txt 写了什么，然后把它删掉" },
        { kind: "state", text: "history/add { role=user, count=1 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:18",
        highlight: [6],
        content: `export async function runTurn(ctx: Context, userText: string): Promise<string> {
  const history = ctx.get<History>('history')
  const model = ctx.get<Model>('model')
  const tools = ctx.get<Tools>('tools')
  // ...
  history.add({ role: 'user', text: userText })`,
        note: "你的话先进历史。模型那边还什么都没发生。",
      },
    },
    {
      id: "s2",
      title: "把整段话念给模型",
      detail:
        "模型不记得上一句。所以每问一次，都要重新拼一包完整输入。里面有系统提示、工具清单，还有整段历史。这一轮历史里只有你刚说的那句。",
      activeNodes: ["harness", "history", "model"],
      activeEdges: ["history->harness", "harness->model"],
      log: [
        { kind: "event", text: "step/start { step=1 }" },
        { kind: "call", text: "model/request { round=1, toolCount=3, messageCount=1 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:29",
        highlight: [5],
        content: `// 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
const reply = await model.ask({
  system: SYSTEM,
  tools: tools.list(),
  messages: history.all(),
})`,
        note: "messages 是整段历史。每一轮都从头带一遍。",
      },
    },
    {
      id: "s3",
      title: "模型只回了文字",
      detail:
        "模型回了一句话：我要调 read_file，参数是 notes.txt。注意，它只是写下了这句话。文件一个字都没被读。",
      activeNodes: ["model", "harness"],
      activeEdges: ["model->harness"],
      log: [
        { kind: "state", text: "history/add { role=assistant, count=2 }" },
        { kind: "state", text: "reply.toolCall = { name: read_file, args: { path: notes.txt } }" },
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
        "Harness 拿这个名字去工具表里找。找到了就跑那个函数。动手前后各发一条记录。这一行才是真的动手：文件被读出来了。",
      activeNodes: ["harness", "tool", "world"],
      activeEdges: ["harness->tool", "tool->world"],
      log: [
        { kind: "call", text: 'tool/before { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:55",
        highlight: [7],
        content: `async function runTool(ctx: Context, call: ToolCall): Promise<string> {
  const tool = ctx.get<Tools>('tools').find(call.name)

  // 工具不存在也要给模型一个回复，让它自己换个做法
  if (!tool) return \`没有叫 \${call.name} 的工具。\`
  // ...
  const output = await tool.run(call.args)
  ctx.emit('tool/after', { name: call.name, output })
  return output
}`,
        note: "tool.run 才是真的动手那一行。模型碰不到它。",
      },
    },
    {
      id: "s5",
      title: "结果塞回去再问",
      detail:
        "读到的内容当成一条新消息存进历史。然后回到上一步，把变长的历史重新拼一包再问模型。这次 messageCount 从 1 变成 3。",
      activeNodes: ["tool", "harness", "history", "model"],
      activeEdges: ["tool->harness", "harness->history", "harness->model"],
      log: [
        { kind: "state", text: "history/add { role=tool, count=3 }" },
        { kind: "event", text: "step/start { step=2 }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:26",
        highlight: [5],
        content: `for (let step = 1; step <= MAX_STEPS; step++) {
  ctx.emit('step/start', { step })
  // ...
  const result = await runTool(ctx, reply.toolCall)
  history.add({ role: 'tool', text: result })
}`,
        note: "结果当成一条新消息存进去，下一轮自然带上。",
      },
    },
    {
      id: "s6",
      title: "危险的先问你",
      detail:
        "第三轮模型要删文件。这个工具被标成了危险动作，所以动手前先问你一句。你说不行，拒绝理由就当成工具结果还给模型。它得知道自己为什么没删成。",
      activeNodes: ["harness", "approval", "history"],
      activeEdges: ["harness->approval", "approval->harness"],
      log: [
        { kind: "call", text: 'tool/before { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "history/add { role=tool, count=7 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:61",
        highlight: [5, 11],
        content: `let blockedReason = ''
ctx.emit('tool/before', {
  name: call.name,
  args: call.args,
  block: (reason: string) => { blockedReason = reason },
})

if (blockedReason) {
  // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
  ctx.emit('tool/blocked', { name: call.name, reason: blockedReason })
  return blockedReason
}`,
        note: "拒绝理由当成工具结果返回，模型看得见。",
      },
    },
    {
      id: "s7",
      title: "模型不要工具了",
      detail:
        "第四轮模型只回了一句话，没再要工具。循环就是在这里停的，只有这一个出口。答案交还给你，这一轮结束。",
      activeNodes: ["model", "harness", "user"],
      activeEdges: ["model->harness"],
      log: [
        { kind: "call", text: "model/request { round=4, toolCount=3, messageCount=7 }" },
        { kind: "state", text: "history/add { role=assistant, count=8 }" },
        { kind: "ok", text: "turn/end { step=4 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:37",
        highlight: [2],
        content: `// 循环唯一的出口：模型没要工具，说明它给出答案了
if (!reply.toolCall) {
  ctx.emit('turn/end', { step })
  return reply.text
}`,
        note: "没有 toolCall 就返回。循环只有这一个出口。",
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
        "demo 里你只说了一句话，模型被问了 4 次。它每要一次工具就多问一次，直到它不再要工具为止。",
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
      intro: "npm run demo，下面这些数字都能在输出里对上。",
      items: [
        {
          label: "模型被问了 4 次",
          text: "你只说了一句话。前 3 次它都在要工具，第 4 次才给答案。",
          hint: "model/request round=1..4",
        },
        {
          label: "历史涨到 8 条",
          text: "1 条你的话，4 条模型回复，3 条工具结果。最后一次请求把前 7 条全带上了。",
          hint: "history/add count=1..8",
        },
        {
          label: "工具只真跑了 2 次",
          text: "read_file 和 count_files 跑了。delete_file 被拦下来，一次都没跑。",
          hint: "tool/after 只出现 2 行",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "demo 里你只说了一句话，模型却被问了 4 次。为什么？",
      options: [
        "Harness 怕模型答错，同一个问题重复问几遍",
        "模型每要一次工具，就得把结果拼进去重新问一次",
        "轮数写死是 4，每次都问满 4 轮",
      ],
      answer: 1,
      explain:
        "模型不记得上一步，工具结果只能靠重新拼一包输入喂进去。它第 4 次不再要工具，循环才停，不是问够次数就停。",
    },
    {
      question: "模型说出「我要删 notes.txt」的那一刻，文件被删了吗？",
      options: [
        "删了，模型说出口就等于执行",
        "没删，那只是一段文字，要 Harness 找到工具真去跑那个函数才会删",
        "没删，但模型会自己重试直到删掉",
      ],
      answer: 1,
      explain:
        "模型的输出只有工具名和参数。这次还被拦下来了，delete_file 的 run 一次都没跑，模型也没法自己重试。",
    },
  ],
  bridge:
    "念历史、执行工具、结果回灌、先问一句。这四件事任何 Harness 都得做。下一节看它们该怎么拆开，才不会全挤在一个文件里。",
};
