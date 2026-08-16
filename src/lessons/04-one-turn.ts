import type { Lesson } from "../tutorial/types";

/**
 * 「拆开」阶段第一节。两件事：
 *   1. 把第 03 节那屏输出对回文件，改功能时知道开哪一个
 *   2. 引入「日志是底账、给模型看的那份对话是算出来的」
 *
 * 第 2 条是硬前置：loop.ts 里 messages: session.derive() 那一行，
 * 不懂这个就看不懂循环为什么每一步都要重算。
 * 只讲到这一层为止——存盘、回放、分叉子会话留给后面。
 */

export const oneTurn: Lesson = {
  id: "one-turn",
  index: "04",
  title: "一次对话流过哪几块",
  summary: "改功能该开哪个文件",
  eyebrow: "拆开来看",
  group: "take-apart",
  readingMinutes: 9,
  oneLiner: "一句话进来，流过几块地方再出去。改哪个功能，就打开哪一块。",
  positioning:
    "第 03 节你已经看过那一屏输出。这一节把它对回文件：哪一行是哪一块打的，改一个功能该开哪个文件。顺带把一个容易搞反的因果讲清楚——发生过的事记在日志里，模型每一步看到的那份对话是现算出来的。",
  concepts: [
    {
      term: "会话日志",
      plain: "按顺序记下发生过的每件事。只往后加，加过就不改。",
      source: "demo/mini-harness/plugins/session.ts · append()",
    },
    {
      term: "派生历史",
      plain: "喂给模型的那份对话。它没单独存过，每次问模型之前现算。",
      source: "demo/mini-harness/plugins/session.ts · derive()",
    },
    {
      term: "服务",
      plain: "一块能力挂在一个名字底下。别人报名字来取，不认背后是谁。",
      source: "demo/mini-harness/kernel.ts · provide()",
    },
    {
      term: "needs",
      plain: "我要用到哪几个名字。它们都到齐了，这一块才会被装上。",
      source: "demo/mini-harness/kernel.ts · Plugin",
    },
  ],
  stage: {
    nodes: [
      { id: "you", label: "你", sub: "说一句话", col: 0, row: 1, kind: "external" },
      { id: "loop", label: "循环", sub: "转圈那段", col: 1, row: 1, kind: "plugin" },
      { id: "log", label: "会话日志", sub: "只往后加", col: 1, row: 3, kind: "data" },
      { id: "model", label: "大模型", sub: "只输出文字", col: 2, row: 0, kind: "external" },
      { id: "tools", label: "工具登记处", sub: "按名字找", col: 2, row: 1, kind: "plugin" },
      { id: "history", label: "算出来的对话", sub: "每次现算", col: 2, row: 3, kind: "data" },
      { id: "world", label: "真实世界", sub: "文件 命令", col: 3, row: 1, kind: "external" },
    ],
    edges: [
      { from: "you", to: "loop", label: "说一句" },
      { from: "loop", to: "log", label: "记一条" },
      { from: "log", to: "history", label: "现算一份" },
      { from: "history", to: "model", label: "整包发过去" },
      { from: "model", to: "loop", label: "我要调工具" },
      { from: "loop", to: "tools", label: "按名字找" },
      { from: "tools", to: "world", label: "真的动手" },
      { from: "tools", to: "loop", label: "结果回来" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "你的话先进日志",
      detail:
        "你的话不会直接飞给模型。它先被记成两条：这一轮开始了，用户说了什么。日志只往后加，加过就不改。",
      activeNodes: ["you", "loop", "log"],
      activeEdges: ["you->loop", "loop->log"],
      log: [
        { kind: "io", text: "用户输入：看看 notes.txt 写了什么，然后把它删掉" },
        { kind: "state", text: "session/append { session=s1, seq=0, type=turn/start }" },
        { kind: "state", text: "session/append { session=s1, seq=1, type=user }" },
        { kind: "state", text: "seq 从 0 一路往上，中间不插队，写过的也不回头改" },
      ],
      code: {
        source: "demo/mini-harness/plugins/session.ts:40",
        highlight: [2, 3],
        content: `        append(type, data = {}) {
          const event: SessionEvent = { seq: log.length, type, data }
          log.push(event)
          ctx.emit('session/append', { session: id, seq: event.seq, type })
          return event
        },`,
        note: "整个文件里改日志的只有这一处，而且只会 push。没有对应的删除。",
      },
    },
    {
      id: "s2",
      title: "给模型的那份对话是算出来的",
      detail:
        "要问模型了，得给它一份完整对话。这份对话没存在哪，是这时候从日志里挑出该给它看的那几条现拼的。",
      activeNodes: ["log", "history", "model"],
      activeEdges: ["log->history", "history->model"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=2, type=step/start }" },
        { kind: "call", text: "model/request { round=1, toolCount=5, messageCount=1 }" },
        { kind: "state", text: "日志这时已经 3 条，算出来给模型的只有 1 条" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:49",
        highlight: [2, 6],
        content: `    // 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
    // messages 是现从日志里派生的——日志里那些结构事件不会出现在这。
    const reply = await model.ask({
      system: SYSTEM,
      tools: tools.list(),
      messages: session.derive(),
    })`,
        note: "第 6 行是现算的。循环手上没有一个存着对话的变量。",
      },
    },
    {
      id: "s3",
      title: "点名，然后有人去动手",
      detail:
        "模型回的是一个名字加一组参数。循环拿这个名字去登记处找，找到了才有人真去碰文件。",
      activeNodes: ["model", "loop", "tools", "world"],
      activeEdges: ["model->loop", "loop->tools", "tools->world"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=3, type=assistant }" },
        { kind: "call", text: 'tool/decide { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "call", text: 'tool/before { name=read_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tools.ts:16",
        highlight: [9],
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
    }`,
        note: "登记处只会三件事：收下、列清单、按名字找。循环用的是第 9 行那个。",
      },
    },
    {
      id: "s4",
      title: "结果回日志，下一步重算",
      detail:
        "工具结果又记成一条进日志。下一步再问模型时，重新算一份新的对话——不是在上一份后面接一条。",
      activeNodes: ["tools", "loop", "log", "history"],
      activeEdges: ["tools->loop", "loop->log", "log->history"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=4, type=tool }" },
        { kind: "state", text: "session/append { session=s1, seq=5, type=step/start }" },
        { kind: "call", text: "model/request { round=2, toolCount=5, messageCount=3 }" },
        { kind: "state", text: "1 条变 3 条。没人去改上一份，是又算了一份新的" },
      ],
    },
    {
      id: "s5",
      title: "日志 14 条，模型看到 8 条",
      detail:
        "这一轮跑完，日志 14 条，算给模型的 8 条。差的 6 条是结构记录，模型一个字都看不到。",
      activeNodes: ["log", "history"],
      activeEdges: ["log->history"],
      log: [
        { kind: "state", text: "日志里一共 14 条事件" },
        { kind: "state", text: "派生出来给模型看的只有 8 条消息" },
        { kind: "state", text: "差在哪：turn/start、step/start、turn/end 这些结构事件模型看不到" },
        { kind: "state", text: "日志全貌： turn/start → user → step/start → assistant → tool → step/start → assistant → tool → step/start → assistant → tool → step/start → assistant → turn/end" },
      ],
      code: {
        source: "demo/mini-harness/plugins/session.ts:18",
        highlight: [5, 10],
        content: `/**
 * 只有这三种事件会变成模型看得见的消息。
 * 其余的（turn-start / step-start / turn-end）只是结构，派生时直接跳过。
 */
const MESSAGE_TYPES = new Set(['user', 'assistant', 'tool'])
// ...
        derive() {
          const messages: Message[] = []
          for (const event of log) {
            if (!MESSAGE_TYPES.has(event.type)) continue
            messages.push(toMessage(event))
          }
          return messages
        },`,
        note: "过滤逻辑就第 10 行这一句。不在那三种里的事件，算的时候直接跳过。",
      },
    },
    {
      id: "s6",
      title: "这几块谁也没 import 谁",
      detail:
        "循环要模型和工具，写的是两个名字，不是两个文件路径。入口那边取会话和循环，用的也是名字。",
      activeNodes: ["loop", "tools", "log", "model"],
      activeEdges: ["loop->tools"],
      log: [
        { kind: "ok", text: "plugin/start { name=session }" },
        { kind: "ok", text: "plugin/start { name=model-fake }" },
        { kind: "ok", text: "plugin/start { name=loop }" },
        { kind: "state", text: "三件互不认识的东西，靠 sessions、model、loop 三个名字接上" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:44",
        highlight: [1, 7],
        content: `const sessions = ctx.get<Sessions>('sessions')

// ---------- 第一轮：读文件、数文件、删文件被拦下 ----------
console.log('--- 用户说了一句话 ---')
const first = sessions.create()
sessions.setCurrent(first)
const answer = await ctx.get<Loop>('loop').run(first, '看看 notes.txt 写了什么，然后把它删掉')`,
        note: "两处都是按名字取。想换掉背后的实现，这两行一个字都不用动。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "会话日志就是那份对话，两个名字一件事。",
      right:
        "不是。跑一遍 demo，末尾两行写着：日志 14 条，给模型看的 8 条。差的 6 条是 turn/start、step/start、turn/end 这类结构记录，模型一个字看不到。日志是底账，对话是每次从底账里挑出三种事件现拼的。",
    },
    {
      wrong: "既然每次都要重算，不如把那份对话直接存一份，省得算。",
      right:
        "日志里的东西比对话多：哪一步属于哪一轮、中间被拦下过什么，只有日志里有。同一份日志既能算出对话喂给模型，也能拿去回放、存盘、分叉出一个子会话。真另存一份对话，两边就得一直对齐。代价也是真的：demo 每次全量重算，日志越长扫得越多。",
    },
    {
      wrong: "循环得认识模型和工具，才知道该找谁。",
      right:
        "它只认名字。demo/mini-harness/loop.ts 开头两行是 ctx.get('model') 和 ctx.get('tools')——ctx 是内核发给每件插件的专属把手，第 06 节细讲。整个文件没 import 过任何一个具体的模型或工具。换掉背后的实现，循环一行都不用改。",
    },
    {
      wrong: "一次对话就流过这几块，真实的也一样。",
      right:
        "块是这几类，但每一块里面厚得多。真实那套里，喂给模型的那包东西是每次现拼的：系统提示由多个插件各出一段，工具说明书跟着一起发。而且流过的东西不止喂模型这一条路——落盘、遥测、界面都在读同一份日志。第 15 节讲这条分界线。",
    },
  ],
  takeaways: [
    {
      title: "改哪个功能，打开哪个文件",
      intro: "这一节的实用价值就在这张表。拿到需求先对一眼。",
      items: [
        {
          label: "换一个模型",
          text: "挂在 model 这个名字下的那件。换成真模型只动它一个文件，循环那边取用的写法不变。",
          hint: "demo/mini-harness/plugins/model-fake.ts",
        },
        {
          label: "加一个工具",
          text: "写一件新的，往登记处 register 一个。数文件那个工具就是这么加的，登记处和循环都没改。",
          hint: "demo/mini-harness/plugins/tool-count.ts",
        },
        {
          label: "改转圈的规则",
          text: "最多跑几步、什么时候停、工具出错怎么办，都在循环里。",
          hint: "demo/mini-harness/loop.ts",
        },
        {
          label: "改记什么、怎么算",
          text: "日志里记哪些事件、哪几种会变成给模型看的对话，都在会话那一块。",
          hint: "demo/mini-harness/plugins/session.ts",
        },
        {
          label: "改拦不拦、拦谁",
          text: "循环里搜不到「权限」两个字。要改拦截规则，去审批那一块。",
          hint: "demo/mini-harness/plugins/approval.ts",
        },
      ],
    },
    {
      title: "这样拆开要付的账",
      intro: "上面那张表是好处。下面四条是同一个设计的另一面。",
      items: [
        {
          label: "一件事要跨文件看",
          text: "一次读文件从循环发起、登记处找到、文件工具执行、日志插件才让你看见。出问题时排查链路就是这么长。",
        },
        {
          label: "现算是有成本的",
          text: "每问一次模型就把整份日志扫一遍。demo 里 14 条无所谓，几百轮之后这笔账会涨。",
          hint: "demo/mini-harness/plugins/session.ts · derive()",
        },
        {
          label: "日志只进不出",
          text: "写错一条就永远在里面，只能再写一条盖过去。session.ts 里有 append，没有对应的删除。",
        },
        {
          label: "日志里的顺序就是唯一的事实",
          text: "谁先谁后全看 seq。哪一块要是忘了往日志里写一条，那件事对模型就等于没发生过——不报错，只是安静地少一段。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "「模型不记得上一句」这件事，demo 里靠什么解决？",
      options: [
        "循环把上一轮模型说的话再复述一遍",
        "每问一次模型，就从日志里现算一份完整对话发过去",
        "模型自己在服务端存着这个会话",
      ],
      answer: 1,
      explain:
        "运行记录里 messageCount 从 1 涨到 3、5、7，就是这份现算的对话在变长。它没被单独存过，每一步都是从日志重新算的。",
      wrongExplains: [
        "循环里没有复述这回事。它做的是把整份对话重新拼一包，模型自己前几步说过的话也一条不落地带回去。",
        "",
        "要是模型那边存着，就不用每一步都发 messageCount 那么多条了。demo 的假模型每次只看这一包输入，此外一无所知。",
      ],
    },
    {
      question: "日志 14 条，算给模型的只有 8 条。少掉的 6 条去哪了？",
      options: [
        "被压成了一段摘要",
        "它们是结构记录，算的时候直接跳过，模型看不到",
        "写日志时出错丢了",
      ],
      answer: 1,
      explain:
        "session.ts 里只有 user、assistant、tool 三种会变成消息。turn/start、step/start、turn/end 是记给系统看的，一行代码就把它们跳过了。",
      wrongExplains: [
        "没有摘要这一步。跳过的那 6 条一个字都没进对话，也没被换成别的东西，它们在日志里原样躺着。",
        "",
        "一条都没丢。运行记录最后打出了日志全貌，14 条按顺序排得整整齐齐，turn/start 到 turn/end 一条不缺。",
      ],
    },
  ],
  bridge:
    "这一节说了几块，也说了它们互相不 import。下一节看这是怎么办到的：这几块其实是同一种东西，装配单上删掉一行，就少一个功能。",
};
