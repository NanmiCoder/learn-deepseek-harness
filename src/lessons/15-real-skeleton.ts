import type { Lesson } from "../tutorial/types";

/**
 * 「真货」阶段第一节。
 *
 * 前面 14 节读者一直在 demo 里，很容易把 demo 的结构当成 DSH 的结构。
 * 这一节把真实骨架摆出来，核心是一条线：模型看得见什么、看不见什么。
 *
 * demo 侧的运行记录来自 npm run demo，逐行可核对。
 * 真实 DSH 侧的说法来自源码仓库的架构文档与包源码，本仓库跑不了，
 * 所以只讲结构不讲运行时现象。
 */

export const realSkeleton: Lesson = {
  id: "real-skeleton",
  index: "15",
  title: "真实 DSH 的骨架：模型看得见什么，看不见什么",
  summary: "模型只读到一份投影",
  eyebrow: "真货",
  group: "the-real-thing",
  readingMinutes: 11,
  oneLiner: "模型从来不看内存。它读到的是会话日志投影出来的那一份，其余全在它视线之外。",
  positioning:
    "前面 14 节你一直在 demo 里，那是一个能读完的最小实现。这一节换成真实的 DeepSeek Harness，先看它的骨架。骨架有一条主线：模型看得见什么、看不见什么。抓住这条线，几十个包的位置就清楚了——喂进模型的那几样是一类，模型压根不知道的是另一类。demo 里这条线也在，只是两边都短得多。",
  concepts: [
    {
      term: "会话日志",
      plain: "只追加的一份事件流。发生过的事都记在这儿，谁也不许改写。",
      source: "demo/mini-harness/plugins/session.ts · append()",
    },
    {
      term: "派生历史",
      plain: "从日志现算出来的那份消息。模型只读它，不读日志本身。",
      source: "demo/mini-harness/plugins/session.ts · derive()",
    },
    {
      term: "结构事件",
      plain: "记录流程走到哪的事件。它们在日志里，但派生时被丢掉，模型看不到。",
      source: "demo/mini-harness/plugins/session.ts:22 · MESSAGE_TYPES",
    },
    {
      term: "投影",
      plain: "同一份日志算出不同的东西。喂模型是一种算法，界面和落盘是另外的。",
      source: "demo/mini-harness/main.ts · events() 与 derive()",
    },
  ],
  stageTitle: "分步演示 · 一条日志，两种读法",
  stage: {
    nodes: [
      { id: "log", label: "会话日志", sub: "只追加，不改写", col: 0, row: 1, kind: "data" },
      { id: "derive", label: "派生", sub: "现算一份", col: 1, row: 0, kind: "core" },
      { id: "others", label: "别的读法", sub: "落盘 界面 统计", col: 1, row: 2, kind: "core" },
      { id: "model", label: "大模型", sub: "只读到派生那份", col: 2, row: 0, kind: "external" },
      { id: "disk", label: "落盘与回放", sub: "模型不知道", col: 2, row: 2, kind: "plugin" },
      { id: "hidden", label: "结构事件", sub: "留在日志里", col: 3, row: 1, kind: "data" },
    ],
    edges: [
      { from: "log", to: "derive", label: "挑出消息" },
      { from: "derive", to: "model", label: "喂给它" },
      { from: "log", to: "others", label: "同一份日志" },
      { from: "others", to: "disk", label: "各读各的" },
      { from: "log", to: "hidden", label: "全都留着" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "先看这两个数",
      detail:
        "跑一遍 demo，末尾会打出这两行。同一次对话，日志记了 14 条，喂给模型的只有 8 条。差的 6 条不是丢了，是没被挑进去。",
      activeNodes: ["log", "derive", "model"],
      activeEdges: ["log->derive", "derive->model"],
      log: [
        { kind: "io", text: "--- 同一份日志，两种看法 ---" },
        { kind: "state", text: "日志里一共 14 条事件" },
        { kind: "state", text: "派生出来给模型看的只有 8 条消息" },
      ],
    },
    {
      id: "s2",
      title: "差的那 6 条是什么",
      detail:
        "把日志全貌打出来就看明白了。turn/start、step/start、turn/end 记的是流程走到哪一步，不是谁说了什么。这些是给 harness 自己看的。",
      activeNodes: ["log", "hidden"],
      activeEdges: ["log->hidden"],
      log: [
        { kind: "io", text: "差在哪：turn/start、step/start、turn/end 这些结构事件模型看不到" },
        {
          kind: "state",
          text: "日志全貌： turn/start → user → step/start → assistant → tool → step/start → ...",
        },
      ],
    },
    {
      id: "s3",
      title: "挑的动作就这一行",
      detail:
        "派生的全部逻辑：遍历日志，不是消息类型的跳过。那行注释写着「模型永远看不到它们」，指的就是结构事件。",
      activeNodes: ["log", "derive"],
      activeEdges: ["log->derive"],
      log: [
        { kind: "state", text: "MESSAGE_TYPES = { user, assistant, tool }" },
        { kind: "state", text: "六种事件类型里，三种进历史，三种只留在日志" },
      ],
      code: {
        source: "demo/mini-harness/plugins/session.ts:49",
        highlight: [4, 5],
        content: `        derive() {
          const messages: Message[] = []
          for (const event of log) {
            // 结构事件在这里被丢掉。模型永远看不到它们。
            if (!MESSAGE_TYPES.has(event.type)) continue
            messages.push(toMessage(event))
          }
          return messages
        },`,
        note: "两行判断决定了模型的视野边界。日志本身一条没少。",
      },
    },
    {
      id: "s4",
      title: "日志不是只给模型用的",
      detail:
        "同一份日志，派生一次得到模型历史；换个算法就得到别的东西。demo 里 events() 直接把全部事件给你看，那是给人看的读法。",
      activeNodes: ["log", "others", "disk"],
      activeEdges: ["log->others", "others->disk"],
      log: [
        { kind: "state", text: "s1（顶层，第 0 层）：日志 14 条，派生历史 8 条" },
        { kind: "state", text: "同一个 session，两个方法，两种结果" },
      ],
    },
    {
      id: "s5",
      title: "真实 DSH 里这条线一样，两边都长得多",
      detail:
        "模型那边多了：系统提示是每次动态拼的，工具说明书跟着一起发。看不见那边多了：落盘、遥测、压缩、沙箱、审批，全都消费同一份事件流，全都不进模型。",
      activeNodes: ["log", "derive", "others", "model", "disk"],
      activeEdges: ["log->derive", "derive->model", "log->others", "others->disk"],
      log: [
        { kind: "state", text: "模型看得见：系统提示、工具说明书、派生历史、这次用哪个模型" },
        { kind: "state", text: "模型看不见：原始事件流、工具执行流水线、落盘、遥测、沙箱、审批、设置" },
        { kind: "warn", text: "这一步说的是真实 DSH，demo 里没有对应代码，别在 demo 里找" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "会话日志就是聊天记录。",
      right:
        "聊天记录是它算出来的一个结果，不是它本身。它是只追加的事件流，记的东西比对话多——流程走到哪、哪次请求发了什么。喂模型只是它的用途之一。",
    },
    {
      wrong: "模型能看到 harness 内部发生的事。",
      right:
        "看不到。demo 里 derive() 那两行判断就是边界：不是那三种消息类型的一律跳过。真实 DSH 里边界更清楚——落盘、遥测、审批、沙箱都消费事件流，一样都不进模型请求。",
    },
    {
      wrong: "既然模型看不到，那些结构事件删了也行。",
      right:
        "删不得。它们是 harness 自己的账：断在哪一步、要不要重来、界面画到哪、这次运行能不能重放，全靠它们。模型看不见不等于没用——恰恰是因为没必要给模型看。",
    },
  ],
  takeaways: [
    {
      title: "两边分别有什么",
      intro: "这条线是理解 harness 骨架的抓手。左边进模型请求，右边模型一无所知。",
      items: [
        {
          label: "模型看得见",
          text: "系统提示、提示词里的变量、工具说明书、派生出来的历史、这次走哪个模型。",
          hint: "都会变成发出去的那包请求",
        },
        {
          label: "模型看不见",
          text: "原始事件流、工具执行的流水线、落盘、遥测、压缩、沙箱、审批、设置与凭据。",
          hint: "它们消费日志，但从不进请求",
        },
        {
          label: "demo 里的对应",
          text: "看得见那边是 derive() 挑出的 8 条；看不见那边是剩下 6 条结构事件，加上 approval 拦截。",
          hint: "npm run demo 末尾两行",
        },
        {
          label: "代价",
          text: "多一层投影，调试时你得分清「日志里有没有」和「模型看没看到」是两个问题。查问题要同时看两边。",
          hint: "这是这个设计要付的账",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "demo 跑完打出「日志 14 条，派生历史 8 条」。差的 6 条去哪了？",
      options: [
        "被丢弃了，日志里也没有",
        "还在日志里，只是派生时没被挑进去，模型看不到",
        "存到另一个文件里了",
      ],
      answer: 1,
      wrongExplains: [
        "日志是只追加的，一条都不会少。derive() 做的是「挑」，不是「删」——原始日志里 14 条一直都在。",
        "",
        "demo 没有落盘，全在内存里。差别不在存哪儿，在于 derive() 遍历时跳过了不是消息类型的事件。",
      ],
      explain:
        "derive() 遍历日志，不是那三种消息类型的一律 continue。那 6 条是 turn/start、step/start、turn/end，记流程用的，一直留在日志里。",
    },
    {
      question: "真实 DSH 里，落盘、遥测、界面为什么能从同一个地方拿数据？",
      options: [
        "它们各自去问模型要一份",
        "它们都消费同一份会话事件流，各自投影出自己要的东西",
        "循环跑完之后统一分发给它们",
      ],
      answer: 1,
      wrongExplains: [
        "模型是这份数据的消费者之一，不是提供方。它连自己那份历史都是别人算好喂进去的。",
        "",
        "不依赖循环。循环只是往日志里写事件的人之一，落盘和遥测订阅的是事件流本身，循环换掉了它们照样工作。",
      ],
      explain:
        "会话日志是唯一的底账。喂模型是一种投影，落盘、遥测、界面、回放各是另一种。这也是为什么日志只能追加不能改写——改了，所有投影一起失真。",
    },
  ],
  evidence:
    "demo 侧的两个数字和日志全貌来自 npm run demo 的真实输出，逐行可核对。真实 DSH 侧的分界线来自源码仓库的架构文档和会话包源码，本仓库跑不了那套代码，所以这一节只讲结构，不描述它的运行时现象。",
  bridge:
    "这一节看的是骨架里数据怎么流。但这些块本身是怎么被装到一起的？下一节看一个 dsh 命令敲下去，到 agent 真的开始转，中间发生了什么。",
};
