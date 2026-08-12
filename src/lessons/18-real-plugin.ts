import type { Lesson } from "../tutorial/types";

export const realPlugin: Lesson = {
  id: "real-plugin",
  index: "18",
  title: "从 demo 插件到真实 DSH 插件",
  summary: "两套写法的对照",
  eyebrow: "实战",
  group: "real-world",
  readingMinutes: 10,
  kind: "read",
  oneLiner: "同一个插件换成真实 DSH 的写法。形状、字段名、装配单都要改，理解不用改。",
  positioning:
    "前面你写的插件，是 demo 那个最小内核认的格式。这一节把它换成真实 DSH 认的格式。改的是写法，你对「插件是什么」的理解一个字都不用改。",
  concepts: [
    {
      term: "inject",
      plain: "声明要用哪些服务。它们到齐了，apply 才会跑。",
      source: "demo/dsh-plugin-example/src/index.ts:43",
    },
    {
      term: "apply",
      plain: "装载时执行一次的入口。demo 里它叫 setup。",
      source: "demo/dsh-plugin-example/src/index.ts:66",
    },
    {
      term: "Config",
      plain: "配置的形状。是运行时真的会跑的校验，不只是类型。",
      source: "demo/dsh-plugin-example/src/index.ts:57",
    },
    {
      term: "组合补丁",
      plain: "一份 YAML，作用相当于装配单，但它是数据不是代码。",
      source: "demo/dsh-plugin-example/cordis.patch.yml:8",
    },
  ],
  stage: {
    columnLabels: ["你写过的", "", "真实 DSH", "启动时"],
    nodes: [
      { id: "dPlugin", label: "demo 插件", sub: "对象字面量", col: 0, row: 1, kind: "plugin" },
      { id: "dProfile", label: "装配单", sub: "分层叠出来", col: 0, row: 3, kind: "data" },
      { id: "rName", label: "name", sub: "照搬", col: 2, row: 0, kind: "plugin" },
      { id: "rInject", label: "inject", sub: "原来叫 needs", col: 2, row: 1, kind: "plugin" },
      { id: "rApply", label: "apply", sub: "原来叫 setup", col: 2, row: 2, kind: "plugin" },
      { id: "rConfig", label: "Config", sub: "新东西", col: 2, row: 3, kind: "core" },
      { id: "patch", label: "组合补丁", sub: "一份 YAML", col: 3, row: 2, kind: "data" },
      { id: "tree", label: "组合树", sub: "启动时拼出来", col: 3, row: 0, kind: "core" },
    ],
    edges: [
      { from: "dPlugin", to: "rName", label: "照搬" },
      { from: "dPlugin", to: "rInject", label: "换名字" },
      { from: "dPlugin", to: "rApply", label: "换名字" },
      { from: "rConfig", to: "rApply", label: "补默认值" },
      { from: "dProfile", to: "patch", label: "换成数据" },
      { from: "patch", to: "tree", label: "启动时拼" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "先看两边长什么样",
      detail:
        "demo 的插件是一个对象字面量：名字、要用的服务、装载函数，全写在一个大括号里。真实 DSH 不是这个形状。",
      activeNodes: ["dPlugin"],
      activeEdges: [],
      log: [
        { kind: "ok", text: "plugin/start { name=approval }" },
        { kind: "state", text: 'approval/config { deny=["delete_file"] }' },
        { kind: "state", text: "这两行来自 npm run demo，装的就是下面这个对象" },
      ],
      code: {
        source: "demo/mini-harness/plugins/approval.ts:25",
        highlight: [1, 5],
        content: `export const approval: Plugin = {
  name: 'approval',
  needs: ['tools'],

  setup(ctx, config) {
    const tools = ctx.get<Tools>('tools')
    // 装配单发下来的配置：哪些工具要拦。没配就一个都不拦。
    const deny = (config.deny as string[]) ?? []
    ctx.emit('approval/config', { deny })`,
        note: "上面这个对象一共三个字段，全在一个大括号里。第 8 行那句手写的类型转换和默认值，等下会有人替你做。",
      },
    },
    {
      id: "s2",
      title: "名字这一项照搬",
      detail:
        "真实 DSH 的插件是模块级的命名导出，一个模块就是一个插件，没有那层对象壳。name 这一项两边完全一致。",
      activeNodes: ["dPlugin", "rName"],
      activeEdges: ["dPlugin->rName"],
      log: [
        { kind: "ok", text: "- id: plugin-example" },
        { kind: "ok", text: "  name: dsh-plugin-example" },
        { kind: "state", text: "组合树里认人靠的就是这两行" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:27",
        highlight: [2],
        content: `/** 插件名。出错信息、组合树里都用它认人。 */
export const name = 'plugin-example'`,
        note: "导出一个叫 name 的常量，不是往对象里写一个 name 字段。形状变了，意思没变。",
      },
    },
    {
      id: "s3",
      title: "needs 改叫 inject",
      detail:
        "意思没变：写在里面的服务到齐了，入口才会被调用。但它只等服务本身上线，不等别的插件往服务里注册了什么。",
      activeNodes: ["dPlugin", "rInject"],
      activeEdges: ["dPlugin->rInject"],
      log: [
        { kind: "warn", text: 'plugin/wait { name=tool-files, missing=["tools"] }' },
        { kind: "ok", text: "plugin/start { name=tools }" },
        { kind: "ok", text: "plugin/start { name=tool-files }" },
        { kind: "state", text: "demo 里等依赖是这个样子，真实 DSH 的 inject 是同一件事" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:30",
        highlight: [4, 14],
        content: `/**
 * 依赖的服务。写在这里的，apply 跑的时候一定已经就位。
 *
 * 注意它只等「服务」，不等「别的插件往服务里注册了什么」。
 * 那种依赖要延后到第一次真正用的时候再检查。
 *
 * 本例只用到两个。其他常见的还有：
 *   agents         按会话 id 找到活着的 Agent
 *   workspace      当前有哪些工作区
 *   subagents      派生子 Agent
 *   systemPrompt   往系统提示里加一段
 * 名字写错不会报错，插件会一直在队列里等，apply 一次也不跑。
 */
export const inject = ['tools', 'httpServer']`,
        note: "第 4 行那句是本节最容易想错的地方，下面「容易想错的地方」第一条专门讲它。",
      },
    },
    {
      id: "s4",
      title: "setup 改叫 apply",
      detail: "一样是装载时跑一次，一样收 ctx 和 config 两个参数。区别只在名字，以及 config 已经被人校验过了。",
      activeNodes: ["dPlugin", "rApply"],
      activeEdges: ["dPlugin->rApply"],
      log: [
        { kind: "io", text: "编译出来之后，把产物 import 进来看它导出了什么" },
        { kind: "ok", text: "exports: [ 'Config', 'apply', 'inject', 'name' ]" },
        { kind: "state", text: "对外就是这四个命名导出，没有默认导出" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:61",
        highlight: [4, 6],
        content: `/**
 * 插件的全部入口。装载时执行一次。
 * @param ctx - 这个插件专属的上下文。注册什么都通过它。
 * @param config - 经 Config schema 校验并补过默认值的配置。
 */
export function apply(ctx: Context, config: Config): void {
  const maxNotes = config.maxNotes ?? 20`,
        note: "必须是命名导出。默认导出会丢掉 inject，依赖不再被等待。这条出自一份真实的事故复盘，本教程没有复现过。",
      },
    },
    {
      id: "s5",
      title: "多出来一份 Config",
      detail: "demo 里配置是一团没人管的原始数据，要自己转类型、自己兜默认值。真实 DSH 有一份 schema 替你做这两件事。",
      activeNodes: ["rConfig", "rApply"],
      activeEdges: ["rConfig->rApply"],
      log: [
        { kind: "state", text: 'demo：const deny = (config.deny as string[]) ?? []' },
        { kind: "state", text: "真实：z.natural().min(1).default(20)" },
        { kind: "ok", text: "config: maxNotes: 20" },
        { kind: "state", text: "最后这行是组合树导出里的，默认值已经被填好了" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/index.ts:51",
        highlight: [4, 5, 8],
        content: `/**
 * 配置的 schema。
 *
 * 它不只是类型，是运行时真的会跑的校验：填错类型会在启动时报错，
 * 没填的字段由 default 补上。所以 apply 里不用自己写默认值兜底。
 */
export const Config: z<Config> = z.object({
  maxNotes: z.natural().min(1).default(20),
})`,
        note: "填错类型在启动时就报错，不用等跑到一半才崩。代价是多写一份 schema。",
      },
    },
    {
      id: "s6",
      title: "装配单变成数据",
      detail: "demo 里加插件是写一行代码。真实 DSH 里是往一份 YAML 里加一行数据，启动时被拼进组合树。",
      activeNodes: ["dProfile", "patch", "tree"],
      activeEdges: ["dProfile->patch", "patch->tree"],
      log: [
        { kind: "state", text: "demo：零件一个没变，只有 approval 的 deny 从 [\"delete_file\"] 改成了 []。" },
        { kind: "io", text: "真实：dsh --profile <你的 profile> --dump-config" },
        { kind: "ok", text: "- id: plugin-example" },
        { kind: "ok", text: "  name: dsh-plugin-example" },
        { kind: "state", text: "  config:" },
        { kind: "state", text: "    maxNotes: 20" },
      ],
      code: {
        source: "demo/dsh-plugin-example/cordis.patch.yml:8",
        highlight: [1, 3, 7],
        content: `- insert:
    # 组合行的 id，全局唯一。dsh --dump-config 里看到的就是它。
    - id: plugin-example
      # 必须等于 package.json 的 name。
      # 浏览器名册按这个名字去 require.resolve('<name>/package.json')，
      # 写错了 host 面能起来、client 面永远加载不了。
      name: dsh-plugin-example
      # 传给插件 apply(ctx, config) 的第二个参数。
      # 字段名要和 src/index.ts 里导出的 Config schema 对得上，
      # 没写的字段由 schema 的 default 补齐。
      config:
        maxNotes: 20`,
        note: "顶层必须是数组。这份文件跟着包一起发出去，装的人不用改任何代码。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "inject 里写了 'tools'，apply 跑的时候工具就都注册好了。",
      right:
        "只保证 tools 这个服务本身在，不保证别的插件已经往它里面注册过工具。这就是第 08 节那句「服务在，内容未必齐」——那节里 tool-count 在 setup 里查 delegate 拿到的是 undefined，因为 subagent 排在它后面。换成真实 DSH，inject 的行为一模一样：它等的是服务挂上，不等别的插件往服务里注册的东西。凡是依赖别人已经注册过什么的检查，都要挪到第一次真正用它的时候。",
    },
    {
      wrong: "inject 里写了 'httpServer'，ctx.httpServer 就能用了。",
      right:
        "inject 只管运行时。这个属性在类型上存不存在是另一回事。它靠 TypeScript 的声明合并挂上去，规则是：你要用 ctx 上的哪个成员，提供它的那个包就必须被加载进编译程序。值导入和 import type {} 都算加载。本例的 tools 没有单独写一行，因为 import { defineTool } 已经把那个包带进来了；httpServer 没有值要用，才单写一行 import type {}。反过来也有跟 inject 无关的加载，比如事件表那行，它是为了让你自己声明的事件名有地方合并。别按个数对：加载的是包，inject 声明的是服务，两边不是一一对应。把 demo/dsh-plugin-example/src/index.ts:20 那行删掉，编译立刻报 Property 'httpServer' does not exist on type 'Context'。",
    },
    {
      wrong: "Config 就是个 TypeScript 类型，写不写都行。",
      right:
        "它是运行时真的会跑的校验。配置填错类型，启动时就报错；没填的字段由 default 补上。对照 demo/mini-harness/plugins/approval.ts:32，那里得自己写类型转换和默认值兜底，写漏了不会有人提醒你。代价是你要多维护一份 schema。",
    },
    {
      wrong: "插件写成 export default { name, inject, apply } 也一样。",
      right:
        "必须是命名导出。写成默认导出，框架看不见 inject，依赖不再被等待。而且它不报错，出来的是随机的时序问题，比报错难查得多。",
    },
    {
      wrong: "把插件装进 profile，它就开始工作了。",
      right:
        "还得重启。组合补丁是在启动时拼进配置树的，热更新只更配置，不会加载新的插件行。这跟 demo 里 kernel.use 写完立刻生效不一样——那是代码，这是数据，数据要等下次组装才被读到。",
    },
  ],
  takeaways: [
    {
      title: "哪些变了，哪些没变",
      intro: "左边是你在 demo 里写过的，右边是真实 DSH 的写法。标了「照搬」的那行是唯一不用动的。",
      items: [
        { label: "形状", text: "对象字面量 → 模块级命名导出。一个模块就是一个插件，没有对象壳。", hint: "demo/dsh-plugin-example/src/index.ts:28" },
        { label: "name", text: "完全一样，照搬。", hint: "demo/dsh-plugin-example/src/index.ts:28" },
        { label: "needs → inject", text: "意思一样：服务到齐了才跑。只等服务，不等服务里的内容。", hint: "demo/dsh-plugin-example/src/index.ts:43" },
        { label: "setup → apply", text: "意思一样：装载时跑一次，收 ctx 和 config。", hint: "demo/dsh-plugin-example/src/index.ts:66" },
        { label: "多出 Config", text: "一份运行时 schema，负责校验和补默认值。demo 里这两件事得自己做。", hint: "demo/dsh-plugin-example/src/index.ts:57" },
        { label: "装配单 → YAML", text: "demo 是写一行代码，真实 DSH 是加一行数据，启动时拼进组合树。", hint: "demo/dsh-plugin-example/cordis.patch.yml:8" },
      ],
    },
    {
      title: "换来了什么，付出了什么",
      intro: "把装配从代码换成数据，两边都得说。",
      items: [
        { label: "换来", text: "插件能独立打包发出去，装的人不用改一行代码，跑一条安装命令就行。" },
        { label: "换来", text: "同一套零件，换一层配置就是另一个产品形态。你在 demo 的两轮运行里已经见过。" },
        { label: "付出", text: "改一行代码要重启一次服务。组装发生在启动时，改完存盘不会立刻生效。" },
        { label: "付出", text: "多一份 schema 要维护。配置项加一个，schema 和类型都要跟着改。" },
      ],
    },
  ],
  quiz: [
    {
      question: "inject 里写了 'subagents'，apply 跑的时候一定能用它派生子 Agent 吗？",
      options: [
        "能，inject 就是干这个的",
        "不一定，inject 只保证服务本身挂上，不保证别人已经往它里面注册过东西",
        "不能，派生子 Agent 得自己实现",
      ],
      answer: 1,
      explain:
        "插件是并发加载的，往服务里注册东西是别的插件的动作，可能比你晚。所以这类检查要延后到第一次真正用它的时候，那是最早能确定结果的位置。",
      wrongExplains: [
        "inject 保证的是服务本身挂上，不保证别人已经往它里面注册过东西。这两件事差一个时间差，而插件是并发加载的。第 08 节里 tool-count 查 delegate 拿到 undefined，就是这个时间差。",
        "",
        "不用你实现，那是别的插件的活。问题只在于它可能比你晚就位。",
      ],
    },
    {
      question: "cordis.patch.yml 里的 name 写错一个字母，会怎么样？",
      options: [
        "启动直接报错，一眼能看出来",
        "host 那半可能照常起来，浏览器那半永远加载不了",
        "没影响，只要 id 对就行",
      ],
      answer: 1,
      explain:
        "浏览器扫名册时按这个名字去解析包。名字对不上就整包不收，而且不报错，现象是面板永远不出现。这类「不报错的失败」是真实 DSH 里最难查的一类。",
      wrongExplains: [
        "最麻烦的地方就是它不报错。组合行按 id 照样能挂上，错误只发生在浏览器扫名册的时候，而扫不到的包会被静默跳过。",
        "",
        "id 只是组合行在配置树里的编号。浏览器是按 name 去找包的，两个字段管的不是一件事。",
      ],
    },
  ],
  evidence:
    "demo 侧的运行记录来自 npm run demo，逐行可核对。真实 DSH 侧的记录来自 demo/dsh-plugin-example 的类型检查、构建和组合树导出，跑在能解析 @deepseek-ai 那些包的环境里，本仓库跑不了。",
  bridge:
    "插件的壳搭好了，但它还什么都不做。下一节往壳里塞三样东西：一个模型能调的工具、一条留在会话里的记录、一个外面能读到的接口。",
};
