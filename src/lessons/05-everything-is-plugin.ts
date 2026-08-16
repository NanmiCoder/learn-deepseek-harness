import type { Lesson } from "../tutorial/types";

/**
 * 承接旧的 03-everything-is-plugin.ts。
 *
 * 和第 06 节的分工：这一节讲插件的契约和对外行为（会用、会预测），
 * 第 06 节讲内核怎么实现（会看懂）。所以这一节一段 kernel.ts 的实现代码都不贴，
 * 只贴 Plugin 这个契约本身，其余全是插件侧的文件。
 *
 * 最硬的证据在 s6：loop 现在就在装配单最后一行，
 * npm run demo 的输出里有 plugin/start { name=loop }。
 */

export const pluginsEverywhere: Lesson = {
  id: "all-plugins",
  index: "05",
  title: "一切皆插件：删一行，就少一个功能",
  summary: "删一行，少一个功能",
  eyebrow: "拆开来看",
  group: "take-apart",
  readingMinutes: 11,
  oneLiner: "循环里没有「权限」两个字。连转圈那段流程自己，也是清单上的一行。",
  positioning:
    "上一节说这几块互相不 import。这一节看它们凭什么能这样：它们是同一种东西，都叫插件。装配单上一行一件，删掉一行就少一个功能——包括最后那一行，转圈问模型的那段流程本身。",
  concepts: [
    {
      term: "插件",
      plain: "一个普通对象：叫什么名字、要用到哪些能力、装上时干什么。",
      source: "demo/mini-harness/kernel.ts · Plugin",
    },
    {
      term: "配置",
      plain: "装配单发给这件插件的那份设置。同一件插件，配置不同行为不同。",
      source: "demo/mini-harness/plugins/approval.ts · config.deny",
    },
    {
      term: "环绕式事件",
      plain: "插件排成一队，每人手上一个「往下传」。不传，这件事就到此为止。",
      source: "demo/mini-harness/kernel.ts · intercept()",
    },
    {
      term: "分层叠加",
      plain: "装配单是几层叠出来的，后面的层盖前面的层，只盖写到的那几项。",
      source: "demo/mini-harness/profile.ts · compose()",
    },
  ],
  stage: {
    nodes: [
      { id: "list", label: "装配单", sub: "一行一件", col: 0, row: 1, kind: "data" },
      { id: "config", label: "配置层", sub: "只盖一项", col: 0, row: 3, kind: "data" },
      { id: "kernel", label: "内核", sub: "照单装上", col: 1, row: 1, kind: "core" },
      { id: "tools", label: "工具登记处", sub: "挂在 tools 下", col: 2, row: 0, kind: "plugin" },
      { id: "loop", label: "循环", sub: "也是一件", col: 2, row: 2, kind: "plugin" },
      { id: "count", label: "计数插件", sub: "后加的一件", col: 3, row: 0, kind: "plugin" },
      { id: "approval", label: "审批插件", sub: "排在队里拦", col: 3, row: 2, kind: "plugin" },
    ],
    edges: [
      { from: "config", to: "list", label: "盖一层" },
      { from: "list", to: "kernel", label: "照单装" },
      { from: "kernel", to: "tools", label: "装上" },
      { from: "kernel", to: "loop", label: "装上" },
      { from: "kernel", to: "approval", label: "装上" },
      { from: "kernel", to: "count", label: "装上" },
      { from: "count", to: "tools", label: "注册工具" },
      { from: "loop", to: "approval", label: "交给队列" },
      { from: "approval", to: "loop", label: "不往下传" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "插件长什么样",
      detail:
        "插件不是什么特别的东西，就是一个普通对象。四样：名字、要用到哪些能力、装上时干什么，外加一份配置。",
      activeNodes: ["count"],
      activeEdges: [],
      log: [
        { kind: "state", text: "没有基类，没有装饰器，没有注解" },
        { kind: "state", text: "needs 里写的是能力的名字，不是文件路径" },
        { kind: "state", text: "配置不写死在代码里，由装配单发下来" },
      ],
      code: {
        source: "demo/mini-harness/kernel.ts:32",
        highlight: [3, 5, 10],
        content: `export interface Plugin {
  /** 名字，出错时好定位 */
  name: string
  /** 我要用到哪些服务。它们都到齐了，setup 才会被调用。 */
  needs?: string[]
  /**
   * 装载时执行一次。
   * ctx 是这个插件专属的把手；config 是装配单发给它的配置。
   */
  setup(ctx: Context, config: Record<string, unknown>): void
}`,
        note: "第 10 行两个参数：ctx 是跟内核说话的口子，config 是装配单发下来的那份设置。",
      },
    },
    {
      id: "s2",
      title: "装，就是照单跑一遍",
      detail:
        "装配单是一份清单加一份配置。「装」这个动作没有任何玄机：挨个 use 一遍，顺手把该给的配置递过去。",
      activeNodes: ["list", "kernel", "tools", "loop"],
      activeEdges: ["list->kernel", "kernel->tools", "kernel->loop"],
      log: [
        { kind: "state", text: "use: [logger, toolFiles, tools, session, modelFake, approval, toolCount, subagent, loop]" },
        { kind: "state", text: 'config: { approval: { deny: ["delete_file"] } }' },
        { kind: "ok", text: "清单九行，运行记录里只有八条 plugin/start" },
        { kind: "state", text: "少的是日志插件自己：轮到它装的时候它还没在听，那一条没人打得出来" },
      ],
      code: {
        source: "demo/mini-harness/main.ts:35",
        highlight: [4],
        content: `const standard = compose([base])
const kernel = new Kernel()
const ctx = kernel.root()
for (const plugin of standard.use) kernel.use(plugin, standard.config[plugin.name])`,
        note: "最后一行是「装」的全部：照着清单挨个 use，配置按插件名对号入座。",
      },
    },
    {
      id: "s3",
      title: "删一件，就少一个功能",
      detail:
        "第 03 节你已经动手试过了。把审批从清单里删掉，删文件当场执行，循环和工具一个字都不用改。",
      activeNodes: ["list", "approval"],
      activeEdges: ["kernel->approval"],
      log: [
        { kind: "state", text: "清单里有 approval 的时候：" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "从清单里删掉它再跑：" },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
        { kind: "ok", text: "循环、工具登记处、会话，三个文件一个字没动" },
      ],
    },
    {
      id: "s4",
      title: "加一件，老代码也不用改",
      detail:
        "计数插件给模型多加了一个工具。它报一个名字要到工具登记处，往里塞一个。登记处那边什么都不知道。",
      activeNodes: ["kernel", "count", "tools"],
      activeEdges: ["kernel->count", "count->tools"],
      log: [
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "tool/register { name=count_files }" },
        { kind: "state", text: "模型看得见的工具从 4 个变 5 个：toolCount=5" },
      ],
      code: {
        source: "demo/mini-harness/plugins/tool-count.ts:10",
        highlight: [6, 13],
        content: `export const toolCount: Plugin = {
  // 1. 名字。出错时靠它定位是谁的问题。
  name: 'tool-count',

  // 2. 我要用到 tools 这个服务。它没就位，下面的 setup 不会被调用。
  needs: ['tools'],

  // 3. 装载时执行一次。
  setup(ctx) {
    const tools = ctx.get<Tools>('tools')
    let calls = 0

    tools.register({
      name: 'count_files',`,
        note: "第 6 行只写了一个名字。它不知道登记处在哪个文件里，也不需要知道。",
      },
    },
    {
      id: "s5",
      title: "规则是外挂上去的",
      detail:
        "循环动手前把这次调用交给一个队列。审批排在队里，看到危险工具就不往下传，工具的 run 一次都不跑。",
      activeNodes: ["loop", "approval"],
      activeEdges: ["loop->approval", "approval->loop"],
      log: [
        { kind: "call", text: 'tool/decide { name=delete_file, args={"path":"notes.txt"} }' },
        { kind: "io", text: "approval/ask { name=delete_file }" },
        { kind: "warn", text: "approval/deny { name=delete_file }" },
        { kind: "state", text: "后面没有 tool/before 也没有 tool/after，队伍到这儿就断了" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:35",
        highlight: [6, 9, 10],
        content: `    ctx.intercept('tool/decide', (value, next) => {
      const decision = value as ToolDecision
      const tool = tools.find(decision.name)

      // 不在这次要拦的名单里，我没意见，往下传
      if (!tool?.needsApproval || !deny.includes(decision.name)) return next(decision)
      // ...
      // 不调 next：这次调用到此为止，工具的 run 一次都不会跑
      ctx.emit('approval/deny', { name: decision.name })
      return { ...decision, blocked: '用户拒绝了这次操作。' }
    })`,
        note: "调 next 就往下传，不调就到此为止。往下传的时候还能传一份改过的参数。",
      },
    },
    {
      id: "s6",
      title: "连循环自己也是一行",
      detail:
        "转圈问模型的那段流程，在清单最后一行。它和审批、日志排在同一队里，跑出来的那条记录也一模一样。",
      activeNodes: ["kernel", "loop"],
      activeEdges: ["kernel->loop"],
      log: [
        { kind: "ok", text: "plugin/start { name=approval }" },
        { kind: "ok", text: "plugin/start { name=tool-count }" },
        { kind: "ok", text: "plugin/start { name=subagent }" },
        { kind: "ok", text: "plugin/start { name=loop }" },
        { kind: "state", text: "最后那行和上面几行没有任何区别" },
      ],
      code: {
        source: "demo/mini-harness/loop.ts:22",
        highlight: [1, 9],
        content: `export const loop: Plugin = {
  name: 'loop',
  needs: ['model', 'tools'],

  setup(ctx) {
    const service: Loop = {
      run: (session, userText) => runTurn(ctx, session, userText),
    }
    ctx.provide('loop', service)
  },
}`,
        note: "它挂在 loop 这个名字下。写一件也提供这个名字的插件替掉它，就换了一套转圈规则。",
      },
    },
    {
      id: "s7",
      title: "不删不加，只盖一层配置",
      detail:
        "装配单是几层叠出来的。底座那层拦删文件，用户那层把这一项盖成空。零件一件没换，行为就变了。",
      activeNodes: ["config", "list", "kernel"],
      activeEdges: ["config->list", "list->kernel"],
      log: [
        { kind: "state", text: 'approval/config { deny=["delete_file"] }' },
        { kind: "warn", text: "tool/blocked { name=delete_file, reason=用户拒绝了这次操作。 }" },
        { kind: "state", text: "approval/config { deny=[] }" },
        { kind: "io", text: "tool/after { name=delete_file, output=已删除 notes.txt }" },
        { kind: "state", text: "同一份剧本跑两遍。这回连清单都没动，只多盖了一层" },
      ],
      code: {
        source: "demo/mini-harness/profile.ts:27",
        highlight: [9, 11],
        content: `export function compose(layers: Layer[]): Assembly {
  const use: Plugin[] = []
  const config: Record<string, Record<string, unknown>> = {}

  for (const layer of layers) {
    for (const plugin of layer.use ?? []) {
      if (!use.includes(plugin)) use.push(plugin)
    }
    for (const [name, values] of Object.entries(layer.config ?? {})) {
      // 只盖写到的那几项，没写到的保留前一层的
      config[name] = { ...config[name], ...values }
    }
  }`,
        note: "第 11 行只覆盖后一层写到的那几项，没写到的保留前一层的。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "一切皆插件，就是说没有内核，什么都能拆。",
      right:
        "内核就是 kernel.ts 这一个文件，它拆不掉。它只管三件事：谁提供了什么能力、谁在等什么能力、拆一件时怎么把它留下的东西收干净。读文件、问权限、跑模型、转圈，一件都不在里面。所以这句话准确的说法是：内核之上的一切都是插件。",
    },
    {
      wrong: "装配单里写在前面的，就先启动。",
      right:
        "不是。启动顺序由 needs 排出来，清单顺序不参与。demo 故意把文件工具写在登记处前面，运行记录第一行就是它在等：plugin/wait { name=tool-files, missing=[\"tools\"] }。等登记处装好，内核回头把它装上。",
    },
    {
      wrong: "插件只能在旁边看着，拦不拦得住全看主流程给不给面子。",
      right:
        "循环把这次调用交给一个队列，插件排在队里，每人手上有一个「往下传」的动作。审批看到危险工具就不往下传，工具的 run 一次都没跑——运行记录里 delete_file 只有 tool/decide 那一行，后面 tool/before、tool/after 两行都没有。它还能改参数：往下传的时候传一份改过的就行。",
    },
    {
      wrong: "插件一拆，它干过的一切都会自动消失。",
      right:
        "只有走 ctx（内核发给每件插件的专属把手）的那部分会。demo 最后拆掉计数插件，它塞进登记处的 count_files 还在——那笔注册没经过 ctx，插件自己也没写一句撤销。内核凭什么判断该收哪些，下一节讲。",
    },
    {
      wrong: "既然一切皆插件，那 DeepSeek Harness 里什么都能换。",
      right:
        "有换不得的。能换的是能力层：模型接哪家、有哪些工具、怎么审批、日志落到哪。换不得的是地基：容器的装卸回收、日志只追加这条规矩、服务接口的形状。这条边界第 17 节专门画，动手改之前值得先看那一节。",
    },
  ],
  takeaways: [
    {
      title: "换来了什么",
      intro: "下面五条，每条都能跑一遍 demo 当场看到。",
      items: [
        {
          label: "删一行，就少一个功能",
          text: "把 approval 从清单里删掉再跑，运行记录里直接是 tool/after { name=delete_file, output=已删除 notes.txt }，没人拦了，其余一行不用改。",
          hint: "demo/mini-harness/main.ts:28",
        },
        {
          label: "加功能不用改老代码",
          text: "计数插件给模型多加了一个数文件的工具。循环、工具登记处、审批插件，一个字都没动。",
          hint: "demo/mini-harness/plugins/tool-count.ts",
        },
        {
          label: "同一个名字可以换实现",
          text: "model 这个名字下现在挂的是按剧本回答的假模型，所以每次跑结果都一样。换成真模型只改这一件，循环那边取用的写法不变。",
          hint: "demo/mini-harness/plugins/model-fake.ts",
        },
        {
          label: "顺序不用你操心",
          text: "清单谁先谁后都行。缺依赖的先排队，缺的东西一到就自动装上。",
          hint: "plugin/wait 之后紧跟着 plugin/start",
        },
        {
          label: "连循环都能换",
          text: "循环挂在 loop 这个名字下，就在清单最后一行。写一件也提供这个名字的插件替掉它，就换了一套转圈规则，别的插件一个都不用动。",
          hint: "demo/mini-harness/loop.ts:22",
        },
      ],
    },
    {
      title: "代价是什么",
      intro: "下面四条也都能在 demo 里看见。",
      items: [
        {
          label: "一件事散在好几个文件里",
          text: "「删文件被拦下」要看四个文件才拼得起来：循环把调用交出去、文件工具打危险标记、审批插件拦下、日志插件才让你看见。出问题时，排查链路就是这么长。",
          hint: "loop.ts / tool-files.ts / approval.ts / logger.ts",
        },
        {
          label: "依赖名写错，插件不吭声",
          text: "把 needs 里的 tools 写成 tool，内核不报错，它就一直在队里等，setup 永远不跑。demo 专门留了 kernel.pending() 让你查还有谁在等，就是为这个。",
          hint: "demo/mini-harness/kernel.ts · pending()",
        },
        {
          label: "代码里看不出谁在拦你",
          text: "loop.ts 里搜不到 approval 三个字，只有一句「把这次调用交给队列」。谁排在那个队里，代码里翻不出来，只能看运行记录，或者回清单数一遍。",
          hint: "demo/mini-harness/loop.ts:85",
        },
        {
          label: "配置是叠出来的，得自己算一遍",
          text: "底座那层给的是 deny: [\"delete_file\"]，信任层盖成 []。最终生效的是哪个，要顺着几层叠一遍才知道，单看哪一层都不算数。",
          hint: "demo/mini-harness/profile.ts · compose()",
        },
      ],
    },
  ],
  quiz: [
    {
      question: "把 approval 从装配单里删掉，再跑一遍 demo，会怎么样？",
      options: [
        "循环找不到审批这个能力，删文件那步报错停下",
        "删文件直接执行，其余照跑，因为没人排在那个队里了",
        "内核发现少了一件插件，拒绝启动",
      ],
      answer: 1,
      explain:
        "循环从头到尾没提过 approval，它只是把这次调用交给一个队列。队里没人，就一路传到底，工具照常执行。内核也不知道该有几件插件。",
      wrongExplains: [
        "循环里没有取审批这个动作。它只取了 model 和 tools 两个名字，少了审批照样跑得起来。",
        "",
        "内核手上没有「应该装几件」这份清单，它只知道你 use 过什么。第 03 节你自己删过一次，它一声没吭。",
      ],
    },
    {
      question: "打开 loop.ts 搜「权限」和 approval，一个字都搜不到。那删文件是谁拦下的？",
      options: [
        "内核在执行工具前查了一张权限表",
        "审批插件排在 tool/decide 那个队列里，轮到它时它不往下传",
        "delete_file 这个工具自己判断的",
      ],
      answer: 1,
      explain:
        "循环只发起一个 tool/decide，把这次调用交给队列。审批插件用 ctx.intercept（下一节细讲的拦截口子）排进去，看到危险工具就不调 next，后面的人和真正干活那段都不跑。",
      wrongExplains: [
        "内核里也搜不到 approval。它只管装卸和转发，手上没有任何一张权限表——把审批删掉，内核不会有任何反应。",
        "",
        "delete_file 的 run 只有两行：从工作区删掉、返回一句话。它连有没有人在拦都不知道，被拦下那次它一次都没跑。",
      ],
    },
  ],
  bridge:
    "清单上这九行，内核是怎么一件件装上去的？顺序写反了它怎么办？拆掉一件时，它留下的东西谁去收？下一节把内核那个文件拆开看。",
};
