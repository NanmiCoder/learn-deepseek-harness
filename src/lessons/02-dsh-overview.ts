import type { Lesson } from "../tutorial/types";

export const dshOverview: Lesson = {
  id: "dsh-overview",
  index: "02",
  title: "DeepSeek Harness 是什么",
  summary: "这些活分别交给谁",
  eyebrow: "框架概览",
  readingMinutes: 10,
  oneLiner: "Harness 不是一整块代码。它切成几块：内核、循环、模型、工具、会话。",
  analogy:
    "把 Harness 想成一间厨房。内核是墙上的水电和台面，自己不做菜，只让每件器具有地方插。循环是做菜的流程：看一眼菜谱，动手一步，尝一口，再看菜谱。剩下的都是器具：跟供货商打电话的、切菜洗菜的、记着「盐放过了」的。开工前有一张单子，写明今天搬哪几件进来。想换供货商，只换那一件，水电和流程一动不动。",
  concepts: [
    {
      term: "内核",
      plain: "一个只管装卸的容器。谁提供了什么、谁在等什么、拆的时候怎么收干净，就这三件事。",
      source: "demo/mini-harness/kernel.ts · use() 与 remove()",
    },
    {
      term: "服务",
      plain: "一份挂在名字底下的能力。别人报名字来取，不认背后是谁写的。",
      source: "demo/mini-harness/kernel.ts · provide() 与 get()",
    },
    {
      term: "循环",
      plain: "一句话进来之后转圈的那段流程：问模型、执行工具、结果回灌、再问。",
      source: "demo/mini-harness/loop.ts · runTurn()",
    },
    {
      term: "装配单",
      plain: "一份名单，写明这次装哪几块。删掉一行那个功能就没了，别处不用改。",
      source: "demo/mini-harness/main.ts · kernel.use(...)",
    },
  ],
  stage: {
    nodes: [
      { id: "main", label: "装配单", sub: "main.ts 决定装谁", col: 0, row: 1, kind: "core" },
      { id: "kernel", label: "内核", sub: "kernel.ts 只管装卸", col: 1, row: 1, kind: "core" },
      { id: "model", label: "模型接入", sub: "换一家就换它", col: 2, row: 0, kind: "plugin" },
      { id: "tools", label: "工具", sub: "读文件 删文件", col: 2, row: 1, kind: "plugin" },
      { id: "history", label: "会话历史", sub: "模型没记性", col: 2, row: 2, kind: "plugin" },
      { id: "user", label: "用户", sub: "说一句话", col: 3, row: 0, kind: "external" },
      { id: "loop", label: "循环", sub: "loop.ts 转圈的那段", col: 3, row: 1, kind: "core" },
    ],
    edges: [
      { from: "main", to: "kernel", label: "照单装" },
      { from: "kernel", to: "model", label: "挂上" },
      { from: "kernel", to: "tools", label: "挂上" },
      { from: "kernel", to: "history", label: "挂上" },
      { from: "user", to: "loop", label: "说一句" },
      { from: "loop", to: "model", label: "问一次" },
      { from: "loop", to: "tools", label: "去执行" },
      { from: "loop", to: "history", label: "存和取" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "照着装配单开工",
      detail:
        "main.ts 就是一张单子。这次装哪几块，全写在这七行里。想去掉审批，把 approval 那行删掉就行。别的文件一行不用动。",
      activeNodes: ["main", "kernel"],
      activeEdges: ["main->kernel"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:23",
        highlight: [4, 5],
        content: `// 装配单。顺序随便写——依赖没齐的插件会自己排队等。
// 这里故意把 tool-files 写在 tools 前面，你可以在运行记录里看到它等了一下。
kernel.use(logger)
kernel.use(toolFiles)
kernel.use(tools)
kernel.use(history)
kernel.use(modelFake)
kernel.use(approval)
kernel.use(toolCount)`,
        note: "七行，七块零件。顺序随便写，缺依赖的会自己排队等。",
      },
    },
    {
      id: "s2",
      title: "内核把零件挂上",
      detail:
        "内核不认识模型，也不认识文件。它只做一件事：谁提供了什么，记在一个名字底下。以后别人报名字来取，取到的就是它。",
      activeNodes: ["kernel", "model", "tools", "history"],
      activeEdges: ["kernel->model", "kernel->tools", "kernel->history"],
      log: [
        { kind: "ok", text: "tool/register { name=read_file }" },
        { kind: "ok", text: "tool/register { name=delete_file }" },
        { kind: "ok", text: "plugin/start { name=history }" },
        { kind: "ok", text: "plugin/start { name=model-fake }" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:176",
        highlight: [3, 12],
        content: `/** 把一个能力挂上去，别人按名字取用 */
provide(name: string, value: unknown): void {
  this.kernel.setService(name, value)
  this.scope.provided.push(name)
}

/** 按名字取一个能力。取不到就报错，因为多半是忘了写 needs。 */
get<T>(name: string): T {
  if (!this.kernel.hasService(name)) {
    throw new Error(\`没有找到服务 "\${name}"。是不是忘了在 needs 里声明？\`)
  }
  return this.kernel.getService(name) as T
}`,
        note: "provide 挂上去，get 按名字取。隔着一个名字，两边谁也不认识谁。",
      },
    },
    {
      id: "s3",
      title: "一句话进来",
      detail:
        "用户敲了一句话。它先被记进会话，再交给循环。从这一刻起，剩下的活都归循环安排。循环自己不干活，它只知道该找谁。",
      activeNodes: ["user", "loop", "history"],
      activeEdges: ["user->loop", "loop->history"],
      log: [
        { kind: "state", text: "history/add { role=user, count=1 }" },
        { kind: "event", text: "step/start { step=1 }" },
        { kind: "call", text: "model/request { round=1, toolCount=3, messageCount=1 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:18",
        highlight: [2, 3, 4],
        content: `export async function runTurn(ctx: Context, userText: string): Promise<string> {
  const history = ctx.get<History>('history')
  const model = ctx.get<Model>('model')
  const tools = ctx.get<Tools>('tools')
  // ...
  history.add({ role: 'user', text: userText })

  for (let step = 1; step <= MAX_STEPS; step++) {`,
        note: "开头三行就是循环的全部家当：历史、模型、工具，都按名字取。",
      },
    },
    {
      id: "s4",
      title: "循环去问模型",
      detail:
        "模型没有记忆。所以每问一次，循环都要把整段历史重新拼一遍。工具说明书也一起发过去。第一轮只有 1 条消息，第二轮就有 3 条。",
      activeNodes: ["loop", "history", "model"],
      activeEdges: ["loop->history", "loop->model"],
      log: [
        { kind: "call", text: "model/request { round=1, toolCount=3, messageCount=1 }" },
        { kind: "state", text: "history/add { role=assistant, count=2 }" },
        { kind: "event", text: "step/start { step=2 }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:29",
        highlight: [2, 5],
        content: `// 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
const reply = await model.ask({
  system: SYSTEM,
  tools: tools.list(),
  messages: history.all(),
})
history.add(reply)`,
        note: "循环只说 model.ask，不认识是哪一家的模型。换一家，改的是别的文件。",
      },
    },
    {
      id: "s5",
      title: "循环派工具干活",
      detail:
        "模型说它要调 read_file，参数是 notes.txt。它只是说说。真去读的是工具那一块。循环拿着名字去登记处找，找到了才执行。",
      activeNodes: ["loop", "tools"],
      activeEdges: ["loop->tools"],
      log: [
        { kind: "call", text: 'tool/before { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
        { kind: "state", text: "history/add { role=tool, count=3 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tools.ts:16",
        highlight: [2, 9],
        content: `const service: Tools = {
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
}`,
        note: "登记处就这么点东西。加一个工具不用改循环，删一个也不用。",
      },
    },
    {
      id: "s6",
      title: "结果存回会话",
      detail:
        "工具跑完，结果被当成一条新消息存进会话。下一轮问模型时，它自己就看到了。模型的记性不在模型里，在会话这一块。",
      activeNodes: ["tools", "loop", "history", "model"],
      activeEdges: ["loop->history", "loop->model"],
      log: [
        { kind: "state", text: "history/add { role=tool, count=3 }" },
        { kind: "call", text: "model/request { round=2, toolCount=3, messageCount=3 }" },
        { kind: "call", text: "model/request { round=4, toolCount=3, messageCount=7 }" },
        { kind: "ok", text: "turn/end { step=4 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/history.ts:16",
        highlight: [3, 8],
        content: `const service: History = {
  add(message) {
    messages.push(message)
    ctx.emit('history/add', { role: message.role, count: messages.length })
  },
  all() {
    // 给一份拷贝，别人改不动这里面的东西
    return [...messages]
  },
}`,
        note: "会话就是一个数组：加一条，全取出来。模型的记性全在这儿。",
      },
    },
    {
      id: "s7",
      title: "拆掉一块试试",
      detail:
        "跑完之后拆掉 tool-count 这一块。内核记着它挂过什么、留过什么清理动作，一起收干净。别的块照跑，一行都不用改。",
      activeNodes: ["main", "kernel", "tools"],
      activeEdges: ["main->kernel", "kernel->tools"],
      log: [
        { kind: "state", text: "count/bye { calls=1 }" },
        { kind: "state", text: "plugin/remove { name=tool-count }" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:70",
        highlight: [8, 9],
        content: `/** 拆一个插件。它挂的服务、登记的清理函数，全部回收。 */
remove(name: string): void {
  const index = this.scopes.findIndex((scope) => scope.plugin.name === name)
  if (index === -1) return
  const scope = this.scopes[index]

  // 倒着执行清理函数：后登记的先收，和装的时候反过来
  for (let i = scope.cleanups.length - 1; i >= 0; i--) scope.cleanups[i]()
  for (const serviceName of scope.provided) this.services.delete(serviceName)

  scope.active = false
  this.scopes.splice(index, 1)
  this.announce('plugin/remove', { name })
}`,
        note: "内核记着每块地上有什么，拆的时候按这块地收，不用你自己记。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "内核越强大越好，功能都塞进内核最省事。",
      right:
        "反过来。demo 的内核里，读文件、跑模型、问权限，一件都没有。它只管装卸和回收。塞进内核的东西，以后想换就得改内核，一改就牵动所有人。",
    },
    {
      wrong: "循环里总得写清楚这次用的是哪家模型。",
      right:
        "循环里只有一句 model.ask(...)，一个厂商名字都没出现。具体跟谁说话，是 model-fake.ts 那一块的事。换一家模型，改那一个文件，循环一行不动。",
    },
    {
      wrong: "真实的 Harness 那么复杂，肯定不是这么分的。",
      right:
        "真实的确复杂得多：真的网络请求、流式返回、上下文太长时的压缩、崩溃后恢复会话、并发工具调用。但复杂度是长在每一块里面的，不是又多出几块。骨架还是这几块。",
    },
  ],
  takeaways: [
    {
      title: "六块零件速查",
      intro: "一句话记住每块管什么，以及想改它时该打开哪个文件。",
      items: [
        {
          label: "内核",
          text: "把插件装上、把依赖接齐、拆的时候收干净。不做任何具体功能。",
          hint: "demo/mini-harness/kernel.ts",
        },
        {
          label: "循环",
          text: "一句话进来后转圈：问模型、执行工具、结果回灌、再问，直到模型不再要工具。",
          hint: "demo/mini-harness/loop.ts",
        },
        {
          label: "模型接入",
          text: "唯一跟模型说话的地方。换一家模型，只改这一个文件。",
          hint: "demo/mini-harness/plugins/model-fake.ts",
        },
        {
          label: "工具",
          text: "模型能动手的那些能力。登记处管名单，每个工具各写各的。",
          hint: "demo/mini-harness/plugins/tools.ts 与同目录的 tool-files.ts",
        },
        {
          label: "会话",
          text: "模型没记性，全靠它存着。每次问模型前，整段历史重新念一遍。",
          hint: "demo/mini-harness/plugins/history.ts",
        },
        {
          label: "装配单",
          text: "决定这次装哪几块。加功能加一行，去功能删一行，别处不用动。",
          hint: "demo/mini-harness/main.ts",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "想把这个 demo 接上真的模型，最少要动哪里？",
      options: [
        "循环、工具、会话都得跟着改一遍",
        "只改 model-fake.ts 那一块，循环一行不用动",
        "先改内核，让它认识新模型",
      ],
      answer: 1,
      explain:
        "循环只调用 model.ask(...)，不认识背后是谁。跟模型说话的代码全在那一个文件里，换掉它就行；内核根本不碰模型。",
    },
    {
      question: "装配单里 tool-files 写在 tools 前面，运行时会怎样？",
      options: [
        "报错，因为它要用的 tools 这时候还不存在",
        "tool-files 先排队等着，tools 装好后内核回头把它装上",
        "内核先把这两行的顺序调换过来，再往下走",
      ],
      answer: 1,
      explain:
        "内核先把插件收进队列，依赖齐了才真装。运行记录第一行 plugin/wait 是它在等，第三行 plugin/start 才是它装上。文件本身没被动过。",
    },
  ],
  bridge:
    "这一节把活分给了六块。下一节看一个更狠的问题：这些块凭什么能随便加、随便拆？答案是它们都是插件，连审批和日志也不例外。",
};
