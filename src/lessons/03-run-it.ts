import type { Lesson } from "../tutorial/types";

/**
 * 全教程第一节动手课。读者要真的敲一次 npm run demo，
 * 再动手改掉装配单里的一个词，跑第二遍看差别。
 *
 * 两份运行记录都来自真实执行：
 *   改动前 = npm run demo 原样
 *   改动后 = main.ts 第 28 行的 use 清单里去掉 approval 之后再跑
 * 最后一步埋一个伏笔：这一屏字全是 logger 插件打的，事件这个词第 05 节兑现。
 */

export const runIt: Lesson = {
  id: "run-it",
  index: "03",
  title: "把最小 Harness 跑起来，读懂它的输出",
  summary: "跑一遍，改一行，再跑",
  eyebrow: "第一次动手",
  group: "know",
  kind: "hands-on",
  readingMinutes: 8,
  oneLiner: "跑起来只要一条命令。输出里每一行都是一件真发生过的事。",
  positioning:
    "前两节讲的是道理，这一节把它跑起来。demo 就在 demo/mini-harness/main.ts 那一带，一条命令，不联网也不用填密钥，每次输出都一样。跑完你要动手改一行再跑一遍。后面十几节贴的运行记录，你都能在自己屏幕上找到对应那几行。",
  concepts: [
    {
      term: "运行记录",
      plain: "跑起来之后打出的每一行。谁发的、发生了什么，都写在这一行里。",
      source: "demo/mini-harness/plugins/logger.ts · TAGS",
    },
    {
      term: "装配单",
      plain: "一份清单，写明这次把哪几件装进来。删掉一件，就少一个功能。",
      source: "demo/mini-harness/main.ts · base",
    },
    {
      term: "事件",
      plain: "一件事发生了就喊一声。在听的人都收到，喊的人不认识谁在听。",
      source: "demo/mini-harness/kernel.ts · emit()",
    },
    {
      term: "排队等依赖",
      plain: "要用的东西还没到，这件插件就先躺在队里，一行代码都不跑。",
      source: "demo/mini-harness/kernel.ts · pending()",
    },
  ],
  stage: {
    nodes: [
      { id: "you", label: "你", sub: "敲一条命令", col: 0, row: 1, kind: "external" },
      { id: "list", label: "装配单", sub: "这次装九件", col: 1, row: 0, kind: "data" },
      { id: "kernel", label: "内核", sub: "照单装上", col: 1, row: 2, kind: "core" },
      { id: "parts", label: "能力插件", sub: "工具 会话 模型 循环", col: 2, row: 1, kind: "plugin" },
      { id: "approval", label: "审批插件", sub: "这次你要删它", col: 2, row: 3, kind: "plugin" },
      { id: "logger", label: "日志插件", sub: "只听，不干活", col: 3, row: 2, kind: "plugin" },
      { id: "screen", label: "你的终端", sub: "满屏那些行", col: 3, row: 0, kind: "external" },
    ],
    edges: [
      { from: "you", to: "kernel", label: "跑一遍" },
      { from: "list", to: "kernel", label: "照单装" },
      { from: "kernel", to: "parts", label: "装上" },
      { from: "kernel", to: "approval", label: "装上" },
      { from: "parts", to: "logger", label: "发事件" },
      { from: "approval", to: "logger", label: "发事件" },
      { from: "logger", to: "screen", label: "打出来" },
      { from: "you", to: "list", label: "改这一行" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "敲这条命令",
      detail:
        "在项目根目录敲 npm run demo。它跑的是 demo/mini-harness/main.ts，从头到尾在你自己机器上，没有网络请求。",
      activeNodes: ["you", "kernel"],
      activeEdges: ["you->kernel"],
      log: [
        { kind: "call", text: "npm run demo" },
        { kind: "state", text: "node --experimental-strip-types demo/mini-harness/main.ts" },
        { kind: "ok", text: "接下来这一屏字，一行都不用跳过" },
      ],
    },
    {
      id: "s2",
      title: "第一行是警告，不是错",
      detail:
        "第一行标着 warn：tool-files 要用 tools，可 tools 还没装。它没报错，只是先躺进队列等着。",
      activeNodes: ["list", "kernel", "parts"],
      activeEdges: ["list->kernel", "kernel->parts"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "还在排队等依赖的： 没有" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:23",
        highlight: [6],
        content: `// 底座层：这些插件是每种形态都要的。
// 顺序随便写——依赖没齐的插件会自己排队等。
// 这里故意把 tool-files 写在 tools 前面，你可以在运行记录里看到它等了一下。
const base: Layer = {
  name: '底座',
  use: [logger, toolFiles, tools, session, modelFake, approval, toolCount, subagent, loop],
  config: { approval: { deny: ['delete_file'] } },
}`,
        note: "第 6 行 toolFiles 写在 tools 前面，是故意的。清单的先后不决定谁先启动。",
      },
    },
    {
      id: "s3",
      title: "中间这一段是一次完整对话",
      detail:
        "从 session/create 到 turn/end 是一次对话。中间 model/request 出现 4 次，就是模型被问了 4 次。",
      activeNodes: ["parts", "logger", "screen"],
      activeEdges: ["parts->logger", "logger->screen"],
      log: [
        { kind: "event", text: "session/create { session=s1, parent=无, depth=0 }" },
        { kind: "call", text: "model/request { round=1, toolCount=5, messageCount=1 }" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
        { kind: "call", text: "model/request { round=3, toolCount=5, messageCount=5 }" },
        { kind: "call", text: "model/request { round=4, toolCount=5, messageCount=7 }" },
        { kind: "state", text: "session/append { session=s1, seq=13, type=turn/end }" },
      ],
    },
    {
      id: "s4",
      title: "有四行是这次调用被拦下了",
      detail:
        "第 3 步模型要删文件。tool/decide 之后没有 tool/before，也没有 tool/after——这个工具一次都没跑。",
      activeNodes: ["approval", "logger"],
      activeEdges: ["kernel->approval", "approval->logger"],
      log: [
        { kind: "call", text: 'tool/decide { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "往上翻对比 read_file：它 decide、before、after 三行齐全" },
      ],
    },
    {
      id: "s5",
      title: "轮到你改一行",
      detail:
        "打开 demo/mini-harness/main.ts 第 28 行，把清单里的 approval 和它后面那个逗号删掉。只删这一处。",
      activeNodes: ["you", "list"],
      activeEdges: ["you->list"],
      log: [
        { kind: "state", text: "改前：use: [logger, toolFiles, tools, session, modelFake, approval, toolCount, subagent, loop]" },
        { kind: "state", text: "改后：use: [logger, toolFiles, tools, session, modelFake, toolCount, subagent, loop]" },
        { kind: "warn", text: "文件顶上那行 import 留着不用管，npm run demo 不看它" },
        { kind: "call", text: "存盘，再敲一次 npm run demo" },
      ],
    },
    {
      id: "s6",
      title: "再跑一遍，差别在这",
      detail:
        "拦截那四行没了，delete_file 走完了 before 和 after，文件真删了。装配那一段也少了两行。",
      activeNodes: ["list", "kernel", "approval"],
      activeEdges: ["list->kernel"],
      log: [
        { kind: "call", text: 'tool/decide { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "call", text: 'tool/before { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
        { kind: "warn", text: "装配段里 plugin/start { name=approval } 和 approval/config 也没了" },
        { kind: "state", text: "循环、工具、会话、模型，一个字都没改" },
      ],
    },
    {
      id: "s7",
      title: "改回去，这一屏字是谁打的",
      detail:
        "把删掉的那处加回第 28 行。再看一眼这一屏字：它们不是散在各处打的，是一个插件听着事件统一打出来的。",
      activeNodes: ["logger", "screen"],
      activeEdges: ["logger->screen"],
      log: [
        { kind: "state", text: "logger 不提供任何能力，只做一件事：把听到的事件打成一行" },
        { kind: "warn", text: "把 logger 也从清单里删掉，demo 照样跑完、照样给出最后那句答案" },
        { kind: "warn", text: "只是你一行都看不见了" },
      ],
      code: {
        source: "demo/mini-harness/plugins/logger.ts:38",
        highlight: [2],
        content: `    for (const [event, tag] of Object.entries(TAGS)) {
      ctx.on(event, (payload) => {
        const detail = describe(payload)
        console.log(\`\${tag.padEnd(5)} \${event}\${detail ? ' ' + detail : ''}\`)
      })
    }`,
        note: "第 2 行订上一个事件，收到就打一行。你看到的一屏字，全从这里出来。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "第一行是 warn，说明装配出错了。",
      right:
        "没出错。tool-files 要用 tools，而 tools 在清单里排在它后面，所以它先等着。紧跟的两行 plugin/start { name=tools } 和 plugin/start { name=tool-files } 就是等到之后被装上。装完那句「还在排队等依赖的： 没有」，说明队列是空的。",
    },
    {
      wrong: "删掉 approval 之后模型还说「你不让删」，说明它还是被拦下了。",
      right:
        "没有。同一段输出里 tool/after { name=delete_file, output=已删除 notes.txt } 写着删掉了。最后那句是假模型按剧本念的——demo 用假模型是为了每次跑出来一样，剧本里第 4 句就写死了这段话。判断一个动作有没有发生，看事件行，别看模型说什么。",
    },
    {
      wrong: "输出里那些行，是散在各个文件里一句句打出来的。",
      right:
        "不是。它们都是事件，由一个叫 logger 的插件统一打成一行。demo/mini-harness/loop.ts 里一句打印都没有，它只负责发事件。把 logger 从清单里删掉，demo 照样跑完，只是你什么都看不见。",
    },
    {
      wrong: "跑通了这个 demo，就等于跑通了 DeepSeek Harness。",
      right:
        "差得远。这个 demo 一千行出头，你能读完；真实那套有几十个包，还带落盘、遥测、沙箱、压缩。它俩的价值不一样：demo 用来把结构看清楚，真货用来干活。结构是同一套，规模差着量级——第 15 节会把两边摆一起对照。",
    },
  ],
  takeaways: [
    {
      title: "这一屏输出分三段",
      intro: "自己跑的时候按这三段看，不要从头一行行硬啃。",
      items: [
        {
          label: "开头是装配",
          text: "plugin/start 一行一件插件，tool/register 一行一个工具。这一段跑完，Harness 才开始接活。",
          hint: "从 plugin/wait 到 plugin/start { name=loop }",
        },
        {
          label: "中间是对话",
          text: "model/request 出现几次，模型就被问了几次。session/append 一行一条记录，seq 从 0 往上数。",
          hint: "round=1 到 round=4",
        },
        {
          label: "结尾是几笔账",
          text: "这次一共记了多少条、给模型看了多少条、三个会话各记各的，最后拆掉一个插件。这几笔账后面几节逐个拆开。",
          hint: "--- 三个会话，各记各的 ---",
        },
      ],
    },
    {
      title: "这份输出能信到什么程度",
      intro: "跑得出来不等于跑的是真的。下面四条分清哪些能当依据。",
      items: [
        {
          label: "能信：结构",
          text: "谁先装、谁在等、哪一步发了什么事件、哪个工具真跑了。这些换成真模型也一样。",
        },
        {
          label: "不能信：内容",
          text: "模型每一句回答都是剧本里写死的。它说什么和你改了什么没关系——改完看事件行，别看它那句话。",
          hint: "demo/mini-harness/plugins/model-fake.ts",
        },
        {
          label: "代价：每次都一样",
          text: "假模型让你能逐行核对，代价是看不到真实模型的不确定性。同一句话问两次，真模型可能走两条不同的路，这份输出演不出来。",
        },
        {
          label: "它没碰你的磁盘",
          text: "工作区是内存里的两个文件。delete_file 删掉的是内存里那条，你机器上什么都没变。",
          hint: "demo/mini-harness/plugins/tool-files.ts",
        },
      ],
    },
  ],
  quiz: [
    {
      question: '输出第一行是 plugin/wait { name=tool-files, missing=["tools"] }。它说明什么？',
      options: [
        "装配出错了，得把 tool-files 挪到 tools 后面",
        "tool-files 要用的 tools 还没装，它先在队里等着，等到了自动装上",
        "根本没有 tools 这件插件，所以它永远装不上",
      ],
      answer: 1,
      explain:
        "紧跟的两行就是结局：plugin/start { name=tools } 之后立刻 plugin/start { name=tool-files }。清单的先后和启动的先后是两回事。",
      wrongExplains: [
        "挪不挪都一样。demo 是故意把它写在前面的，就为了让你看见这一行。谁先启动由「谁要用谁」推出来，不由清单顺序决定。",
        "",
        "有。第 28 行的清单里 tools 就写在 toolFiles 后面一位，输出第二行 plugin/start { name=tools } 也印出来了。",
      ],
    },
    {
      question: "删掉 approval 再跑，模型最后还是说「你不让删，我就没删」。文件到底删了没？",
      options: [
        "没删，模型这句话就是证据",
        "删了。tool/after { name=delete_file, output=已删除 notes.txt } 这行说了实话",
        "删了一半：工具跑了，但事后被撤销了",
      ],
      answer: 1,
      explain:
        "假模型按固定剧本回答，它并不知道你动过装配单。判断一个动作发生没有，看事件行：tool/before 和 tool/after 都在，说明工具真的跑了。",
      wrongExplains: [
        "那句话是剧本里的第 4 条，写死的。拦没拦它都这么说——这也正是不能拿模型的话当证据的原因。",
        "",
        "没有撤销这回事。工具跑完发一条 tool/after 就结束了，输出里也找不到任何回滚动作。",
      ],
    },
  ],
  evidence: "两份运行记录都来自 npm run demo，改动前后各跑一遍",
  bridge:
    "这一屏输出你现在能一行行读下来了。下一节回答它没说的那件事：那些 session/append 记到哪去了，模型每一步看到的那份对话又是从哪来的。",
};
