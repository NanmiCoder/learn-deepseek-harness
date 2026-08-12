import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 这一节讲一次运行留下的那份会话日志换来了什么。
 *
 * 第 04 节已经量过那两个数（日志 14 条、给模型 8 条），也讲过模型历史是算出来的。
 * 这里不重讲那个推导，从「多出来的 6 条值什么」接着往下：一份只往后加的日志，
 * 换一种挑法就是另一样东西，落盘、恢复、分叉、界面全从它这儿出。
 *
 * 运行记录来自 npm run demo。真实 DSH 多出来的部分由 evidence 字段标明出处。
 */

const nodes: StageNode[] = [
  { id: "writer", label: "循环", sub: "每做一件事记一条", col: 0, row: 1, kind: "plugin" },
  { id: "log", label: "会话日志", sub: "只往后加，不改不删", col: 1, row: 1, kind: "data" },
  { id: "derive", label: "派生历史", sub: "挑出三种事件", col: 2, row: 0, kind: "plugin" },
  { id: "raw", label: "原样读出", sub: "14 条一条不少", col: 2, row: 2, kind: "plugin" },
  { id: "model", label: "模型", sub: "只看得见 8 条", col: 3, row: 0, kind: "external" },
  { id: "screen", label: "终端那几行", sub: "给人看的那份", col: 3, row: 1, kind: "external" },
  { id: "disk", label: "存盘与恢复", sub: "崩了能接着跑", col: 3, row: 2, kind: "external", kindLabel: "真实 DSH 才有" },
  { id: "fork", label: "分叉", sub: "截一段另开一份", col: 3, row: 3, kind: "external", kindLabel: "真实 DSH 才有" },
];

const edges: StageEdge[] = [
  { from: "writer", to: "log", label: "记一条" },
  { from: "log", to: "derive", label: "挑三种" },
  { from: "derive", to: "model", label: "发过去" },
  { from: "log", to: "raw", label: "原样给" },
  { from: "raw", to: "screen", label: "给人看" },
  { from: "raw", to: "disk", label: "写下来" },
  { from: "raw", to: "fork", label: "截一段" },
];

export const sessionLog: Lesson = {
  id: "session-log",
  index: "13",
  group: "put-together",
  title: "一次运行留下了什么：会话日志",
  summary: "一份日志，几种读法",
  eyebrow: "会话与日志",
  readingMinutes: 10,
  oneLiner: "多出来那 6 条模型看不见。存盘、恢复、分叉、回放，全靠它们。",
  positioning:
    "第 04 节量过两个数：日志 14 条，给模型的消息 8 条。这一节接着问下去——多出来那 6 条到底值什么，同一份日志还能挑出几样别的东西来。",
  concepts: [
    {
      term: "事件日志",
      plain: "一条只能往后加的流水账。每条带一个 seq，写进去就不动了。",
      source: "demo/mini-harness/types.ts · SessionEvent",
    },
    {
      term: "六种事件",
      plain: "日志里只有这六种。三个名字光秃秃的，三个名字带斜杠。",
      source: "demo/mini-harness/types.ts · SessionEventType",
    },
    {
      term: "两个读口",
      plain: "一个把日志原样给你，一个给你算出来的那份。写只有一个口子。",
      source: "demo/mini-harness/types.ts · Session",
    },
    {
      term: "重放",
      plain: "把日志再念一遍。重建的是当时的记录，不是当时干过的事。",
      source: "demo/mini-harness/README.md · 末尾差距表",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels: ["谁在写", "写到哪", "怎么读", "读给谁用"],
    legendLabels: { plugin: "写的和读的", data: "唯一的那份底账", external: "读出来给谁" },
    overview: {
      nodes,
      edges: edges.map(({ from, to }) => ({ from, to, curve: "straight" as const })),
      columnLabels: ["谁在写", "写到哪", "怎么读", "读给谁用"],
      summary: "一份只往后加的日志，挑法不同，读出来的东西就不同",
    },
  },
  steps: [
    {
      id: "s1",
      title: "每条带一个号，写完不动",
      detail:
        "多出来那 6 条不是散着放的。每条事件都带一个 seq，就是它在日志里的位置，从 0 排到 13，写进去之后谁也不改。",
      activeNodes: ["writer", "log"],
      activeEdges: ["writer->log"],
      log: [
        { kind: "state", text: "session/append { session=s1, seq=0, type=turn/start }" },
        { kind: "state", text: "session/append { session=s1, seq=1, type=user }" },
        { kind: "state", text: "session/append { session=s1, seq=2, type=step/start }" },
        { kind: "state", text: "session/append { session=s1, seq=13, type=turn/end }" },
        { kind: "state", text: "中间那十条略过，seq 一路排到 13，正好 14 条" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:42",
        highlight: [3, 6],
        content: ` * 会话日志里的一条事件。
 *
 * 日志只能往后加，加进去就不改了。seq 是它在日志里的位置。
 */
export interface SessionEvent {
  seq: number
  /** 事件类型。只有 user / assistant / tool 三种会变成模型看得见的消息。 */
  type: SessionEventType
  data: Record<string, unknown>
}`,
        note: "只往后加、加完不改，这两条是后面所有便宜的来源。位置固定了，才谈得上截一段、接着往下跑。",
      },
    },
    {
      id: "s2",
      title: "名字分两类，不是随手起的",
      detail:
        "哪三种进模型历史你已经知道了。再看一眼名字：进的那三种一个斜杠都没有，不进的那三种全带斜杠。",
      activeNodes: ["log", "derive"],
      activeEdges: ["log->derive"],
      log: [
        { kind: "state", text: "日志全貌： turn/start → user → step/start → assistant → tool →" },
        { kind: "state", text: "step/start → assistant → tool → step/start → assistant → tool →" },
        { kind: "state", text: "step/start → assistant → turn/end" },
        { kind: "state", text: "上面这一长串是一行输出，为了看得清才断成三行" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:54",
        highlight: [8, 9],
        content: ` * demo 用到的六种事件。名字分两类，一眼能看出区别：
 *   - 光秃秃的 user / assistant / tool：这三种会变成模型看得见的消息，
 *     名字就是消息的 role。
 *   - 带斜杠的 turn/start、step/start、turn/end：结构标记，
 *     记录「什么时候开始、什么时候结束」，模型一个字都看不到。
 */
export type SessionEventType =
  | 'user' | 'assistant' | 'tool'
  | 'turn/start' | 'step/start' | 'turn/end'`,
        note: "扫一眼这串名字就能分出哪三种进历史，不用去翻派生那段代码。名字自己在说话。",
      },
    },
    {
      id: "s3",
      title: "写一个口子，读两个口子",
      detail:
        "往日志里写只有一条路。读有两条：一条把 14 条原样给你，一条现算出模型能吃的那 8 条。两条读的是同一份东西。",
      activeNodes: ["derive", "model", "raw", "screen"],
      activeEdges: ["derive->model", "log->raw", "raw->screen"],
      log: [
        { kind: "io", text: "notes.txt 里写的是「记得写测试」，工作区一共 2 个文件。你不让删，我就没删。" },
        { kind: "state", text: "模型这句话，是算出来的那 8 条喂出来的" },
        { kind: "state", text: "「日志全貌」那一行，是原样读出来的，14 条一条不少" },
        { kind: "state", text: "两行输出，两个读口，底下同一份日志" },
      ],
      code: {
        source: "demo/mini-harness/types.ts:71",
        highlight: [7, 12],
        content: `export interface Session {
  id: string
  meta: SessionMeta
  /** 往日志末尾加一条事件 */
  append(type: SessionEventType, data?: Record<string, unknown>): SessionEvent
  /** 日志原样。给一份拷贝，别人改不动。 */
  events(): SessionEvent[]
  /**
   * 从日志里派生出模型看得见的那份历史。
   * 注意是「派生」——这份历史没有单独存过一份，每次都是现算的。
   */
  derive(): Message[]`,
        note: "给一份拷贝，是为了谁都别想反手改日志。读口可以再加，写口只留一个。",
      },
    },
    {
      id: "s4",
      title: "存下来，才谈得上接着跑",
      detail:
        "demo 的日志躺在内存里，进程一退就没了。真实 DSH 把这份事件流整份写到磁盘上，换来的第一件事是崩了能接着跑。",
      activeNodes: ["raw", "disk"],
      activeEdges: ["raw->disk"],
      log: [
        { kind: "warn", text: "demo 的日志只在内存里，跑完这一次就没了" },
        { kind: "state", text: "真实 DSH 要整份落盘：分批写、带校验、崩了能修" },
        { kind: "state", text: "存住了就能恢复：换个进程把日志读回来，从断的地方往下接" },
        { kind: "state", text: "往外上报走的也是这一份事件流" },
        { kind: "warn", text: "这几条 demo 里都没有，出处见课末的差距表" },
      ],
    },
    {
      id: "s5",
      title: "截一段，就是另开一份",
      detail:
        "每条都带 seq，就有了下刀的位置。截到某一条为止，拿这一段当开头另开一份会话，原来那份一个字不动。",
      activeNodes: ["raw", "fork"],
      activeEdges: ["raw->fork"],
      log: [
        { kind: "state", text: "截到某一条为止另开一份，两份从此各走各的" },
        { kind: "state", text: "界面和回放读的又是另一份挑法，模型被跳过的那些它们看得见" },
        { kind: "state", text: "这些挑法都从同一份日志出，各挑各的，互相不打架" },
        { kind: "warn", text: "分叉 demo 里没有。下一节那个另开的会话是全新一份，不是从中间截的" },
      ],
    },
    {
      id: "s6",
      title: "重放的是记录，不是执行",
      detail:
        "这是这份日志的边界。它能还原当时模型看到了什么，还原不了当时工作区是什么样。",
      activeNodes: ["screen", "disk", "fork"],
      activeEdges: [],
      log: [
        { kind: "call", text: 'tool/before { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
        { kind: "state", text: "这两行来自 demo 第二遍：审批放行，文件真的删了" },
        { kind: "warn", text: "把这段日志再念一遍，notes.txt 不会回来" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "日志能重放，那就等于能撤销：把日志倒回去，删掉的文件就回来了。",
      right:
        "重建的是记录，不是执行。demo 第二遍跑的时候审批放行了，delete_file 真的执行了，工作区里的 notes.txt 没了。把日志再念一遍不会把它变回来——日志记的是「这件事发生过」，不是工作区当时长什么样。",
    },
    {
      wrong: "结构事件是调试用的，正式跑的时候可以不记。",
      right:
        "不记就只剩消息了。turn/start 和 step/start 一没，界面画不出「这是第几步」，想从中间截一段分叉出去也找不到下刀的位置。真实 DSH 还把「模型看得见的，日志里必须有」当成一条不许破的规矩：破一次，那次请求就重建不出来了。",
    },
    {
      wrong: "既然日志只加不删，跑久了迟早撑爆，所以得定期清老的。",
      right:
        "清掉就等于放弃了重建那几次请求的能力。上下文太长这个问题，真实 DSH 是在算消息那一步跳过一段，日志本身一条不少——省的是发给模型的字数，不是磁盘。这两件事不要混着解决。",
    },
    {
      wrong: "会话日志就是 demo 里这六种事件。",
      right:
        "六种是这个最小实现的量。真实那套里事件种类多得多，插件还能自己加新的；流式返回的每一小片也都逐条落盘，所以能一个字一个字地回放。不变的是那条规矩：只追加、不改写，所有投影都从它算出来。第 15 节把这条规矩讲透。",
    },
  ],
  takeaways: [
    {
      title: "同一份日志，几种读法",
      intro: "前两条 demo 里跑得出来，后面几条是真实 DSH 才有的，出处是课末那张差距表。",
      items: [
        {
          label: "原样读",
          text: "14 条一条不少，seq 从 0 排到 13。终端里「日志全貌」那一行就是这么打出来的。",
          hint: "demo/mini-harness/types.ts · events()",
        },
        {
          label: "挑三种",
          text: "只留 user、assistant、tool，得到 8 条消息，这份才是发给模型的。",
          hint: "demo/mini-harness/types.ts · derive()",
        },
        {
          label: "落盘与恢复",
          text: "整份写到磁盘，分批写、带校验、崩了能修。存住了，换个进程读回来就能接着跑。",
        },
        {
          label: "分叉",
          text: "截到某一条为止，拿这一段当开头另开一份会话。原来那份一个字不动。",
        },
        {
          label: "界面与回放",
          text: "人要看的比模型多。界面和回放走的是另一份挑法，模型被跳过的那些它们看得见。",
        },
      ],
    },
    {
      title: "这么记要付的账",
      intro: "四条，都是选了「日志当底账」之后躲不掉的。",
      items: [
        {
          label: "多绕一道",
          text: "想知道模型这次到底看到了什么，翻日志是不够的，得先在脑子里把那道过滤跑一遍。日志里有的，模型不一定有。",
        },
        {
          label: "只加不删",
          text: "日志往后加就完了，删不掉。想少发点给模型，只能在算消息那一步跳过一段，磁盘上那份还是全的。",
        },
        {
          label: "每次现算",
          text: "demo 每问一次模型就把整条日志重过一遍。日志一长，这一步就不再是白捡的，真实 DSH 得给算过的部分做缓存。",
        },
        {
          label: "漏一条就全砸",
          text: "模型看得见的东西必须全都在日志里。漏记一条，那次请求就重建不出来，后面的恢复、分叉、回放跟着一起不准。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "日志只往后加、不删不改。那上下文太长的时候，真实 DSH 拿什么办？",
      options: [
        "把老事件从日志里删掉，腾地方",
        "让算消息那一步跳过一段，事件本身留着",
        "把整份日志重写成一条摘要",
      ],
      answer: 1,
      explain:
        "删了就再也重建不出当时那次请求了。真实 DSH 的做法是在算消息那一步跳过一段，日志一条不少——所以压过的会话照样能完整回放，界面上也还看得到全貌。",
      wrongExplains: [
        "日志是底账，删一条就意味着有一次请求永远重建不出来。要省的是发给模型的字数，不该拿底账去换。",
        "",
        "摘要可以有，但它是往日志后面加的一条新事件，用来遮住前面那一段，前面那些事件一条都没动。只往后加这条规矩不为摘要破例。",
      ],
    },
    {
      question: "干脆存一份消息数组就好了，为什么要多绕一道派生？",
      options: [
        "省内存，事件比消息小",
        "日志里的信息比消息多，落盘、分叉、界面、回放要用的正是消息里没有的那部分",
        "模型的接口要求必须这么传",
      ],
      answer: 1,
      explain:
        "消息数组只够干喂模型这一件事。每条事件在第几位、哪一步属于哪一轮、这一轮怎么收的尾，只有日志里有。真实 DSH 的落盘、分叉、界面、回放都从这同一份日志上各挑各的。",
      wrongExplains: [
        "反了。日志比消息多 6 条，每条还带着 seq 和原始数据，只会更占地方。省的不是内存。",
        "",
        "模型收到的就是一份消息列表，跟你怎么存没关系。demo 里现算一份给它，你另外存不存它并不知道。",
      ],
    },
  ],
  evidence:
    "运行记录来自 npm run demo；真实 DSH 多出来的那几种读法，出自 demo/mini-harness/README.md 末尾的差距表和 DeepSeek Harness 自带文档",
  bridge:
    "同一份日志读几遍，说到这儿。下一节换个问题：一件事分给另一个 Agent 去做，它是接着往这份日志里写，还是自己另起一份？另起一份又能省下什么？",
};
