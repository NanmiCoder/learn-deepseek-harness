import type { Lesson, StageEdge, StageNode } from "../tutorial/types";

/**
 * 这一节讲三种失败：工具抛异常、工具压根不存在、模型转不停。
 *
 * demo 里三条路都有真代码：stat_file 打不开文件时直接 throw，
 * runTool 抓住它写成一句话，runTurn 的 for 有个步数上限。
 * 前两条在 npm run demo 的输出里跑得出来，第三条跑不出来（剧本里的模型会收手），
 * 所以那一步明确标了「这次没走到」。
 *
 * 顺手修掉一处老错：第 01 节说过「循环只有一个出口」，那是错的。
 * 正常出口一个，兜底出口一个，两个都在 loop.ts 里。
 */

const nodes: StageNode[] = [
  { id: "model", label: "模型", sub: "只读得到文字", col: 0, row: 1, kind: "external" },
  { id: "brake", label: "步数上限", sub: "转到头就停", col: 1, row: 0, kind: "core" },
  { id: "loop", label: "循环", sub: "转圈的那段", col: 1, row: 1, kind: "plugin" },
  { id: "tool", label: "工具", sub: "别人写的代码", col: 2, row: 1, kind: "plugin" },
  { id: "catcher", label: "接住那一下", sub: "不让它炸上来", col: 2, row: 2, kind: "core" },
  { id: "next", label: "下一步再问", sub: "模型自己改口", col: 3, row: 0, kind: "external" },
  { id: "result", label: "一条工具结果", sub: "写成一句话", col: 3, row: 1, kind: "data" },
];

const edges: StageEdge[] = [
  { from: "model", to: "loop", label: "要个工具" },
  { from: "brake", to: "loop", label: "转到头就停" },
  { from: "loop", to: "tool", label: "交给它" },
  { from: "tool", to: "result", label: "跑通了" },
  { from: "tool", to: "catcher", label: "抛出来" },
  { from: "catcher", to: "result", label: "写成一句话" },
  { from: "result", to: "next", label: "带上再问" },
];

const columnLabels = ["谁提的要求", "谁在转圈", "谁去动手", "留下什么"];

export const failure: Lesson = {
  id: "failure",
  index: "11",
  group: "advanced",
  title: "工具报错、模型抽风、循环停不下来",
  summary: "失败了怎么兜住",
  eyebrow: "失败处理",
  readingMinutes: 9,
  oneLiner: "工具抛的异常、模型的抽风，最后都得变成模型读得到的一句话。",
  positioning:
    "上一节的麻烦是历史太长，至少还讲道理。这一节的三样不讲道理。工具会抛异常，模型会点名不存在的工具，也会转半天不给答案。三样各自撞在哪、被谁接住，处理办法为什么是同一个。",
  concepts: [
    {
      term: "工具抛异常",
      plain: "工具是别人写的代码。出错时它直接抛，不会好好返回一句话。",
      source: "demo/mini-harness/plugins/tool-files.ts · stat_file",
    },
    {
      term: "失败回灌",
      plain: "把错误写成一句话，当成这次工具的结果还给模型。",
      source: "demo/mini-harness/loop.ts · catch 里那句 return",
    },
    {
      term: "步数上限",
      plain: "一轮里最多问模型几次。到顶就停，防它一直要工具不给答案。",
      source: "demo/mini-harness/loop.ts · MAX_STEPS",
    },
    {
      term: "循环的两个出口",
      plain: "正常那个是模型不再要工具。另一个是步数用完，这轮没有答案。",
      source: "demo/mini-harness/loop.ts · runTurn 里两处 return",
    },
  ],
  stage: {
    nodes,
    edges,
    columnLabels,
    legendLabels: { core: "内核兜底的那两处", plugin: "插件", data: "回灌给模型的东西", external: "循环外面的" },
    overview: {
      nodes,
      edges: edges.map(({ from, to }) => ({ from, to, curve: "straight" as const })),
      columnLabels,
      summary: "跑通和抛异常两条路，最后都汇进同一条工具结果",
    },
  },
  steps: [
    {
      id: "s1",
      title: "工具是真的会抛",
      detail: "stat_file 打不开文件时直接抛，没有好好返回一句错误提示。",
      activeNodes: ["tool", "catcher"],
      activeEdges: ["tool->catcher"],
      log: [
        { kind: "ok", text: "tool/register { name=stat_file }" },
        { kind: "state", text: "这个工具装在 demo 里，跟 read_file、delete_file 排在一起" },
        { kind: "warn", text: "工作区里没有 missing.txt，所以它走的是抛那一支" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-files.ts:37",
        content: `    tools.register({
      name: 'stat_file',
      describe: '看一个文件有多大',
      params: { path: '文件路径' },
      async run(args) {
        const text = workspace.get(args.path)
        // 故意抛异常，不返回错误字符串。
        // 工具是别人写的代码，它想抛就抛——循环得扛得住这件事。
        if (text === undefined) throw new Error(\`打不开 \${args.path}\`)
        return \`\${args.path} 有 \${text.length} 个字\`
      },
    })`,
        note: "第 9 行是关键：它抛出去了。写工具的人可能是你，也可能不是。",
        highlight: [9],
      },
    },
    {
      id: "s2",
      title: "循环把它接住了",
      detail: "工具那一句包在 try 里面。抓到之后写成一句话，当成这次的结果。",
      activeNodes: ["loop", "tool", "catcher", "result"],
      activeEdges: ["loop->tool", "catcher->result"],
      log: [
        { kind: "call", text: "tool/before { name=stat_file, args={\"path\":\"missing.txt\"} }" },
        { kind: "warn", text: "tool/failed { name=stat_file, reason=打不开 missing.txt }" },
        { kind: "state", text: "这一行是 catch 里发的，异常没有再往上冒" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:101",
        content: `  try {
    const output = await tool.run(decision.args)
    ctx.emit('tool/after', { name: call.name, output })
    return output
  } catch (error) {
    // 工具是别人写的代码，它抛异常不能把整个循环炸掉。
    // 把错误当成这次工具的结果还给模型，它下一步自己会换个做法——
    // 和「被拦下」走的是同一条路：都变成一条 tool 消息进日志。
    const reason = error instanceof Error ? error.message : String(error)
    ctx.emit('tool/failed', { name: call.name, reason })
    return \`工具 \${call.name} 出错了：\${reason}\`
  }`,
        note: "两支都 return 一个字符串。上面那支是结果，下面那支是错误，形状一样。",
        highlight: [11],
      },
    },
    {
      id: "s3",
      title: "少一行，多一行",
      detail: "跑通那次有三行齐全。抛异常这次没有 tool/after，多了一行 tool/failed。",
      activeNodes: ["tool", "result"],
      activeEdges: ["tool->result"],
      log: [
        { kind: "call", text: "tool/decide { name=read_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "call", text: "tool/before { name=read_file, args={\"path\":\"notes.txt\"} }" },
        { kind: "io", text: "tool/after { name=read_file, output=记得写测试 }" },
        { kind: "call", text: "tool/decide { name=stat_file, args={\"path\":\"missing.txt\"} }" },
        { kind: "call", text: "tool/before { name=stat_file, args={\"path\":\"missing.txt\"} }" },
        { kind: "warn", text: "tool/failed { name=stat_file, reason=打不开 missing.txt }" },
      ],
    },
    {
      id: "s4",
      title: "错误也进了历史",
      detail: "错误当成工具结果写进日志，循环接着往下走。模型下一步就读得到它。",
      activeNodes: ["result", "next", "model"],
      activeEdges: ["result->next"],
      log: [
        { kind: "warn", text: "tool/failed { name=stat_file, reason=打不开 missing.txt }" },
        { kind: "state", text: "session/append { session=s2, seq=7, type=tool }" },
        { kind: "state", text: "session/append { session=s2, seq=8, type=step/start }" },
        { kind: "call", text: "model/request { round=8, toolCount=5, messageCount=5 }" },
        { kind: "state", text: "上一次是 3 条，这次 5 条，多出来的那两条里就有那句错误" },
        { kind: "io", text: "分出去的那位说要点是「记得写测试」。missing.txt 打不开，我就不看它了。" },
        { kind: "warn", text: "最后这句是剧本写好的：假模型不读输入，只按被问了第几次答" },
      ],
    },
    {
      id: "s5",
      title: "另一种停不下来",
      detail: "模型每一步都要工具，就是不给答案。挡它的是 for 上那个上限。",
      activeNodes: ["brake", "loop"],
      activeEdges: ["brake->loop"],
      log: [
        { kind: "state", text: "正常出口：模型这一步没要工具，把答案还回去" },
        { kind: "state", text: "兜底出口：步数走到头，返回一句「步数用完了，还没得到答案」" },
        { kind: "warn", text: "这次运行没走到兜底那个：两轮各用了 4 步和 3 步，上限是 6" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:58",
        content: `    // 出口之一：模型没要工具，说明它给出答案了。
    // 另一个出口在下面——步数走到 MAX_STEPS 上限，防它一直要工具不给答案。
    if (!reply.toolCall) {
      session.append('turn/end', { step })
      return reply.text
    }

    const result = await runTool(ctx, reply.toolCall)
    session.append('tool', { text: result })
  }

  return '步数用完了，还没得到答案。'`,
        note: "两个 return 挨得不远。上面那个带着答案回去，下面那个是 for 转完才落到的。",
        highlight: [3, 12],
      },
    },
    {
      id: "s6",
      title: "三条岔路一个出口",
      detail: "工具不存在这条也一样：不抛，不停，返回一句话让模型换个做法。",
      activeNodes: ["loop", "result", "model"],
      activeEdges: ["model->loop"],
      log: [
        { kind: "state", text: "工具不存在、工具抛异常、被拦下，三条路" },
        { kind: "state", text: "三条都是 return 一个字符串，都变成一条 tool 事件进日志" },
        { kind: "warn", text: "工具不存在这条 demo 跑不出来：剧本里的模型没点错过名字" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:80",
        content: `  const tool = ctx.get<Tools>('tools').find(call.name)

  // 工具不存在也要给模型一个回复，让它自己换个做法
  if (!tool) return \`没有叫 \${call.name} 的工具。\``,
        note: "注释里那句「让它自己换个做法」，就是这一节的全部心法。",
        highlight: [4],
      },
    },
  ],
  misconceptions: [
    {
      wrong: "工具报错应该重试，把错误告诉模型是偷懒。",
      right:
        "重试是另一件事，真实 Harness 里确实有专门一层管超时和重试。但它替代不了告诉模型：missing.txt 重试一百次还是不存在。错误进了日志，下一次请求就把它带上了，模型这才有机会换个做法。",
    },
    {
      wrong: "循环里加了这个 catch，Harness 就不会挂了。",
      right:
        "它接住的只是工具抛的异常。问模型那一次本身失败呢，比如网断了、整包超了窗口，走的不是这条路。demo 的假模型永远成功，所以这一类在 demo 里一次都看不到。真实 Harness 给它单开了一层，失败了能重试。",
    },
    {
      wrong: "步数上限是个性能参数，调大一点更保险。",
      right:
        "它是刹车不是油门。调大只是让抽风的那一轮多烧几步，模型该不给答案还是不给。撞上这个上限时，该看的是它每一步都在要什么工具。多半是工具描述没写清楚，不是上限设小了。",
    },
  ],
  takeaways: [
    {
      title: "三条岔路，一个出口",
      intro: "三种失败在 demo 里都有真代码，最后都收成同一样东西：一条工具结果。",
      items: [
        {
          label: "工具不存在",
          text: "返回一句「没有叫 xxx 的工具。」不抛错，也不停循环。",
          hint: "demo/mini-harness/loop.ts:83",
        },
        {
          label: "工具抛异常",
          text: "抓住，取出错误里那句话，返回「工具 xxx 出错了：……」。",
          hint: "demo/mini-harness/loop.ts:111",
        },
        {
          label: "被人拦下",
          text: "返回拒绝的理由。下一节讲是谁拦的、凭什么能拦住。",
          hint: "demo/mini-harness/loop.ts:96",
        },
        {
          label: "为什么必须收成一句话",
          text: "模型看不到异常栈，也看不到你终端里那行红字。它这一轮能读到的只有历史里的消息。不写成消息，等于没发生。",
        },
      ],
    },
    {
      title: "这么兜要付的账",
      intro: "把失败都变成文字，代价有三条，都在 demo 里看得见。",
      items: [
        {
          label: "堆栈没了",
          text: "catch 里只取了错误的那句话，栈丢了。终端里就一行 tool/failed，想知道它在工具里哪一行抛的，得自己去加。",
        },
        {
          label: "模型可能反复撞同一堵墙",
          text: "换不换做法由模型决定。它要是每一步都去 stat 那个不存在的文件，循环会陪着它一直转到步数用完。",
        },
        {
          label: "撞上上限就是没有答案",
          text: "兜底出口返回的是「步数用完了，还没得到答案」，不是一个凑合的答案。这一轮对用户来说就是白跑。",
        },
      ],
    },
    {
      title: "真实 Harness 这一块还多了什么",
      intro: "四条全出自 demo/mini-harness/README.md 末尾那张差距表。",
      items: [
        {
          label: "问模型那一次也会失败",
          text: "demo 的假模型永远成功。真的要联网，请求本身就会失败，而且每家提供方的重试策略还不一样。这一类不走工具这条路。",
        },
        {
          label: "超时和重试包在外面",
          text: "不写在工具里，也不写在循环里，是套在执行外面的一层。给某个工具加个超时，是加一层，不是改它。",
        },
        {
          label: "取消要等它真停下来",
          text: "用户按了停，不是立刻就没。已经跑起来的那件事得等它收尾，真实 Harness 把这一段单独当成一种结束方式。",
        },
        {
          label: "一轮可以一步都不走",
          text: "demo 的 for 一进去就问模型，表达不了「这一轮开了又关，一次模型都没问」。真实的轮次可以是零步的。",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "stat_file 打不开文件时直接抛了异常。运行记录里接下来是什么？",
      options: [
        "这一轮到此为止，循环退出",
        "tool/failed 之后没有 tool/after，但下一行 step/start 照常出现",
        "循环自动重试一次 stat_file",
      ],
      answer: 1,
      explain:
        "工具那一句包在 try 里。抓到之后错误被写成一句话，当成这次工具的结果，和跑通时一样进日志、一样进下一步。所以少的是 tool/after，多的是 tool/failed，循环一点事没有。",
      wrongExplains: [
        "工具抛一下就让整轮结束，等于把「工具是别人写的代码」这件事的后果全甩给用户。真实输出里 tool/failed 的下一行就是 session/append，再下一行就是 step/start。",
        "",
        "demo 里没有重试这一层。真实 Harness 确实有，但它包在执行外面，而且重试解决不了 missing.txt 根本不存在这件事。",
      ],
    },
    {
      question: "一个模型每一步都要工具，就是不给最终答案。挡住它的是什么？",
      options: [
        "审批插件看到危险工具会拦下来",
        "一轮里问模型的次数有上限，走到头就停",
        "工具登记处发现同一个工具被反复调用会拒绝",
      ],
      answer: 1,
      explain:
        "for 上写着 step 不能超过 MAX_STEPS，转完还没答案就落到最后那句「步数用完了，还没得到答案」。这是循环的第二个出口，正常跑的时候看不到它。",
      wrongExplains: [
        "审批只看这次要动的工具危不危险。模型反复调 read_file 一点也不危险，审批一次都不会拦。",
        "",
        "工具登记处只管「有没有这个名字」，它不记次数。demo 里 count_files 自己数了被调几次，那是这个工具自己的事。",
      ],
    },
  ],
  evidence: "真实 Harness 多出来的那几层，出处是 demo/mini-harness/README.md 末尾的差距表",
  bridge:
    "这一节的失败都是意外：文件打不开、名字点错了。下一节是另一类——模型要干的事本身没出错，是你不想让它干。删文件那次到底是谁拦下的，它凭什么能拦住一个不认识它的循环。",
};
