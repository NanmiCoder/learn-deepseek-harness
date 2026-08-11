import type { Lesson } from "../tutorial/types";

export const outsideWorld: Lesson = {
  id: "outside-world",
  index: "04",
  title: "如何与外界交互",
  summary: "接模型、接电脑、接人",
  eyebrow: "对外交互",
  readingMinutes: 10,
  oneLiner: "Harness 夹在中间：上接模型，下接电脑，一边问人，一边收编别人的工具。",
  analogy:
    "把 Harness 想成柜台后面的店员。上面有个只会动嘴的老板，就是大模型，它只会说「去把那份文件拿来」，自己一步也不迈。下面是仓库，就是你这台电脑，文件都在里面。旁边坐着你，遇到要扔东西的事，店员会回头问你一句。门外还有别家的送货员，登个记就能一起干活。店员自己不生产东西，只把这四头连起来。",
  concepts: [
    {
      term: "工具说明书",
      plain: "一张纸，写清工具叫什么名字、要哪几个参数。模型照着它填，看不到干活的代码。",
      source: "demo/mini-harness/types.ts · Tool",
    },
    {
      term: "一整包输入",
      plain: "每次问模型都要重发的三样东西：系统提示、全部工具说明书、整段历史。",
      source: "demo/mini-harness/types.ts · Request",
    },
    {
      term: "审批",
      plain: "危险动作动手前先问人一句。人不同意，这次调用就作废，理由还给模型。",
      source: "demo/mini-harness/plugins/approval.ts",
    },
    {
      term: "MCP",
      plain: "一份公开的约定。外部程序照它自报有哪些工具，就能接进同一张工具表。",
      source: "demo 里没写，思路见课后速查",
    },
  ],
  stage: {
    nodes: [
      { id: "user", label: "人", sub: "你和你的键盘", col: 0, row: 2, kind: "external" },
      { id: "loop", label: "循环", sub: "loop.ts", col: 1, row: 2, kind: "core" },
      { id: "modelPlugin", label: "模型插件", sub: "model-fake.ts", col: 2, row: 1, kind: "plugin" },
      { id: "model", label: "大模型", sub: "另一头的服务", col: 3, row: 0, kind: "external" },
      { id: "tools", label: "工具表", sub: "tools.ts", col: 2, row: 3, kind: "plugin" },
      { id: "machine", label: "这台电脑", sub: "文件都在这里", col: 3, row: 4, kind: "external" },
      { id: "approval", label: "审批插件", sub: "approval.ts", col: 1, row: 4, kind: "plugin" },
      { id: "mcp", label: "外部工具", sub: "别人写的程序", col: 0, row: 4, kind: "external" },
    ],
    edges: [
      { from: "user", to: "loop", label: "你说的话" },
      { from: "loop", to: "modelPlugin", label: "一整包" },
      { from: "modelPlugin", to: "model", label: "发出去" },
      { from: "model", to: "modelPlugin", label: "一条回复" },
      { from: "modelPlugin", to: "loop", label: "我要调工具" },
      { from: "loop", to: "tools", label: "按名字找" },
      { from: "tools", to: "machine", label: "真去动手" },
      { from: "tools", to: "loop", label: "结果回来" },
      { from: "loop", to: "approval", label: "动手前喊一声" },
      { from: "approval", to: "user", label: "你同意吗" },
      { from: "approval", to: "loop", label: "拦下来" },
      { from: "mcp", to: "tools", label: "登记进来" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "你说的话先进来",
      detail:
        "你说：看看 notes.txt 写了什么，然后把它删掉。这句话先存进历史。循环是 Harness 的心跳，开工前先取三样能力：模型、历史、工具表。",
      activeNodes: ["user", "loop"],
      activeEdges: ["user->loop"],
      log: [
        { kind: "io", text: "用户输入：看看 notes.txt 写了什么，然后把它删掉" },
        { kind: "state", text: "history/add { role=user, count=1 }" },
        { kind: "event", text: "step/start { step=1 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:18",
        highlight: [2, 3, 4],
        content: `export async function runTurn(ctx: Context, userText: string): Promise<string> {
  const history = ctx.get<History>('history')
  const model = ctx.get<Model>('model')
  const tools = ctx.get<Tools>('tools')
  // ...
  history.add({ role: 'user', text: userText })`,
        note: "循环按名字取能力，不关心背后是谁实现的。",
      },
    },
    {
      id: "s2",
      title: "把一整包发给模型",
      detail:
        "循环不是只把你这句话发过去。系统提示、每个工具的说明书、到现在为止的全部消息，三样一起打包。说明书就是一张纸，写清工具叫什么、要哪几个参数，模型照着填。",
      activeNodes: ["loop", "modelPlugin", "model"],
      activeEdges: ["loop->modelPlugin", "modelPlugin->model"],
      log: [
        { kind: "call", text: "model/request { round=1, toolCount=3, messageCount=1 }" },
        { kind: "io", text: "这一包里：system 1 段、tools 3 个、messages 1 条" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:29",
        highlight: [2],
        content: `    // 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
    const reply = await model.ask({
      system: SYSTEM,
      tools: tools.list(),
      messages: history.all(),
    })
    history.add(reply)`,
        note: "三样东西每轮都重发一遍，模型没有记忆。",
      },
    },
    {
      id: "s3",
      title: "模型只会点名",
      detail:
        "模型回了一条消息：我先看看这个文件。消息上还挂着一句点名，说要调 read_file，参数是 notes.txt。它碰不到你的硬盘，只会说名字和参数。",
      activeNodes: ["model", "modelPlugin", "loop"],
      activeEdges: ["model->modelPlugin", "modelPlugin->loop"],
      log: [
        { kind: "state", text: "history/add { role=assistant, count=2 }" },
        { kind: "io", text: "assistant 消息带 toolCall: read_file { path: notes.txt }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/model-fake.ts:42",
        highlight: [1, 14],
        content: `    const model: Model = {
      async ask(request: Request) {
        ctx.emit('model/request', {
          round: asked + 1,
          toolCount: request.tools.length,
          messageCount: request.messages.length,
        })
        // ...
        const reply = SCRIPT[asked] ?? { role: 'assistant' as const, text: '没话说了。' }
        asked++
        return reply
      },
    }
    ctx.provide('model', model)`,
        note: "换成真模型只改这个文件，循环一行不动。",
      },
    },
    {
      id: "s4",
      title: "工具真的去读硬盘",
      detail:
        "循环按名字在工具表里找到 read_file，动手前先喊一嗓子，没人拦就执行。真正读文件的代码写在文件工具这个插件里，读回来一句「记得写测试」。",
      activeNodes: ["loop", "tools", "machine"],
      activeEdges: ["loop->tools", "tools->machine", "tools->loop"],
      log: [
        { kind: "call", text: 'tool/before { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
        { kind: "state", text: "history/add { role=tool, count=3 }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-files.ts:27",
        highlight: [3, 4, 6],
        content: `    tools.register({
      name: 'read_file',
      describe: '读一个文件的内容',
      params: { path: '文件路径' },
      async run(args) {
        const text = workspace.get(args.path)
        return text ?? \`没有这个文件：\${args.path}\`
      },
    })`,
        note: "describe 和 params 给模型看，run 才是动手的。",
      },
    },
    {
      id: "s5",
      title: "删文件先问一句",
      detail:
        "第三轮模型要删文件。delete_file 在注册时标了危险。审批插件盯着那声「我要动手了」，一看是危险动作就问人。人说不行，这次调用就被拦下。",
      activeNodes: ["loop", "approval", "user"],
      activeEdges: ["loop->approval", "approval->user", "approval->loop"],
      log: [
        { kind: "call", text: 'tool/before { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:28",
        highlight: [8, 11],
        content: `    ctx.on('tool/before', (payload) => {
      const event = payload as {
        name: string
        block: (reason: string) => void
      }

      const tool = tools.find(event.name)
      if (!tool?.needsApproval) return
      // ...
      ctx.emit('approval/deny', { name: event.name })
      event.block('用户拒绝了这次操作。')
    })`,
        note: "标了危险的才问；block() 一调，这次就作废。",
      },
    },
    {
      id: "s6",
      title: "被拒绝也要告诉模型",
      detail:
        "拦下来不算完。拒绝的理由被当成这次工具的结果，写回历史。下一轮模型看见这条，才知道你不让删，于是改口说：你不让删，我就没删。",
      activeNodes: ["loop", "modelPlugin", "model"],
      activeEdges: ["loop->modelPlugin", "modelPlugin->model"],
      log: [
        { kind: "state", text: "history/add { role=tool, count=7 }" },
        { kind: "call", text: "model/request { round=4, toolCount=3, messageCount=7 }" },
        { kind: "state", text: "history/add { role=assistant, count=8 }" },
        { kind: "ok", text: "最后的回答：notes.txt 里写的是「记得写测试」…你不让删，我就没删。" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:68",
        highlight: [4],
        content: `  if (blockedReason) {
    // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
    ctx.emit('tool/blocked', { name: call.name, reason: blockedReason })
    return blockedReason
  }`,
        note: "拒绝理由走工具结果那条路，模型才看得见。",
      },
    },
    {
      id: "s7",
      title: "外部工具走同一条路",
      detail:
        "工具表不认来源。demo 里 count_files 是另一个插件登记进来的，循环用起来和读文件没区别。别人写的程序也能这么接进来：按一份公开约定自报家门。",
      activeNodes: ["mcp", "tools", "loop"],
      activeEdges: ["mcp->tools", "loop->tools"],
      log: [
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=delete_file }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "call", text: "model/request { round=1, toolCount=3, messageCount=1 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tools.ts:16",
        highlight: [2, 6],
        content: `    const service: Tools = {
      register(tool) {
        registry.set(tool.name, tool)
        ctx.emit('tool/register', { name: tool.name })
      },
      list() {
        return [...registry.values()]
      },
      find(name) {
        return registry.get(name)
      },
    }

    ctx.provide('tools', service)`,
        note: "谁登记的都进同一张表，list() 一视同仁。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "模型自己会读文件、会删文件。",
      right:
        "模型只会吐一条消息，上面挂着工具名和参数。真去读的是 tool-files.ts 里的 run 函数，中间还隔着一道审批。",
    },
    {
      wrong: "模型记得上一轮说过什么。",
      right:
        "它不记得。每一轮都把系统提示、工具说明书、整段历史重新拼一遍发过去。demo 里 messageCount 从 1 涨到 3 再到 7，就是这么涨的。",
    },
    {
      wrong: "接一个外部工具要改循环。",
      right:
        "不用。工具登记进同一张表，循环只管按名字找。加一个、删一个，loop.ts 一行都不动。",
    },
  ],
  takeaways: [
    {
      title: "四个方向分别归谁管",
      intro: "Harness 自己不干活，四个方向各由一个插件顶着，换掉哪个都不影响循环。",
      items: [
        {
          label: "向上：接模型",
          text: "把系统提示、工具说明书、整段历史打成一包发过去，收回一条消息。换一家模型只换这个文件，循环一行不动。",
          hint: "demo/mini-harness/plugins/model-fake.ts",
        },
        {
          label: "向下：接这台电脑",
          text: "模型点名，工具动手。demo 里的文件放在内存的一个 Map 里；想换成真读磁盘，改 run 里面那一行就行。",
          hint: "demo/mini-harness/plugins/tool-files.ts",
        },
        {
          label: "向人：先问一句",
          text: "危险的工具在注册时标一下。审批插件盯着动手前的那声招呼，问人，人不同意就拦下，拒绝的理由当成工具结果还给模型。",
          hint: "demo/mini-harness/plugins/approval.ts",
        },
        {
          label: "向外：接别人的工具",
          text: "demo 里没写这一块。思路是：外部程序按一份公开约定自报有哪些工具，业界的做法叫 MCP。Harness 把它们登记进同一张工具表，调用路径和内置工具没区别。",
          hint: "demo 里没有实现，只讲思路",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "循环第二轮问模型时，为什么要把第一轮的消息再发一遍？",
      options: [
        "模型不记得上一轮，历史每次都得重新拼一遍发过去",
        "为了让运行记录看起来更完整",
        "因为这一轮的工具表变了，得重新对一遍",
      ],
      answer: 0,
      explain:
        "demo 里 messageCount 从 1 到 3 再到 7，就是每轮重发全部历史；toolCount 一直是 3，工具表压根没变。",
    },
    {
      question: "删文件被拦下来之后，模型是怎么知道自己没删成的？",
      options: [
        "循环直接结束了，模型不知道",
        "拒绝理由被当成这次工具的结果写回历史，下一轮发给模型",
        "审批插件直接给模型发了一条消息",
      ],
      answer: 1,
      explain:
        "loop.ts 里 blockedReason 被 return 出去，和正常工具输出走同一条路；审批插件只调了 block()，它根本不认识模型。",
    },
  ],
  bridge:
    "四个方向都是插件接上去的：模型是一个插件，文件工具是一个插件，审批也是。下一节你自己写一个挂上去。",
};
