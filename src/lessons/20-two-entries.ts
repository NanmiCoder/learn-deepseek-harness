import type { Lesson } from "../tutorial/types";

export const twoEntries: Lesson = {
  id: "two-entries",
  index: "20",
  title: "一个包两个入口：浏览器那半怎么被找到",
  summary: "一个包的两个入口",
  eyebrow: "实战",
  group: "real-world",
  readingMinutes: 12,
  kind: "hands-on",
  oneLiner: "同一个包，一半跑在 Node 里，一半跑在浏览器里，两半只靠 HTTP 说话。",
  positioning:
    "前两节做的东西全都跑在 Node 里，用户看不见。这一节讲同一个包的另一半：跑在浏览器里、有界面的那一半，以及它是怎么被找到的。找不到是这一层最常见的故障，所以排查顺序也在这节。",
  concepts: [
    {
      term: "两个入口",
      plain: "一个包两个身份，Node 走一个入口，浏览器走另一个。",
      source: "demo/dsh-plugin-example/src/client/index.tsx:7",
    },
    {
      term: "两个编译程序",
      plain: "host 和 client 必须分开编译，否则两边类型会打架。",
      source: "demo/dsh-plugin-example/tsconfig.client.json:3",
    },
    {
      term: "名册",
      plain: "浏览器启动时扫一遍，看哪些包声明了自己有浏览器那半。",
      source: "demo/dsh-plugin-example/package.json:37",
    },
    {
      term: "浏览器产物",
      plain: "浏览器加载的不是源码，是打包成一个文件的自注册壳。",
      source: "demo/dsh-plugin-example/tsdown.config.ts:64",
    },
  ],
  stage: {
    columnLabels: ["一个包", "两半", "怎么找到", "看得见"],
    nodes: [
      { id: "pkg", label: "一个包", sub: "package.json", col: 0, row: 1, kind: "data" },
      { id: "host", label: "跑在 Node", sub: "前两节那半", col: 1, row: 0, kind: "plugin" },
      { id: "client", label: "跑在浏览器", sub: "这节这半", col: 1, row: 2, kind: "plugin" },
      { id: "route", label: "HTTP 路由", sub: "上节开的那条", col: 2, row: 0, kind: "plugin" },
      { id: "roster", label: "名册", sub: "启动时扫一遍", col: 2, row: 2, kind: "core" },
      { id: "user", label: "用户", sub: "看得见的那面", col: 3, row: 0, kind: "external" },
      { id: "panel", label: "浮层", sub: "挂在页面上", col: 3, row: 2, kind: "plugin" },
    ],
    edges: [
      { from: "pkg", to: "host", label: "一个入口" },
      { from: "pkg", to: "client", label: "另一个" },
      { from: "pkg", to: "roster", label: "声明" },
      { from: "roster", to: "client", label: "加载" },
      { from: "client", to: "panel", label: "挂上去" },
      { from: "route", to: "panel", label: "一秒一次" },
      { from: "panel", to: "user", label: "看见" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "一个包，两个门",
      detail: "同一个包声明了两个入口。Node 走一个，浏览器走另一个。两边跑在不同的进程里。",
      activeNodes: ["pkg", "host", "client"],
      activeEdges: ["pkg->host", "pkg->client"],
      log: [
        { kind: "state", text: "host 那半：前两节写的工具、事件、路由" },
        { kind: "state", text: "client 那半：这一节的浮层" },
        { kind: "warn", text: "两个进程，不共享任何内存" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/client/index.tsx:1",
        highlight: [7, 8],
        content: `/**
 * 最小 DSH 插件的 client 面：跑在浏览器里的那一半。
 *
 * 文件名必须是 .tsx。TypeScript 只在 .tsx 里把 < 当成 JSX，
 * 写成 .ts 会报一长串 TS1005 '>' expected，和 jsx 配置无关。
 *
 * 它在浏览器里也是一个 cordis 插件：导出 apply，加载时被调用一次。
 * 但装载路径和 host 那一半完全不同——package.json 里 exports 的 "./client"
 * 那一项指向打包好的浏览器产物，浏览器扫到它才会加载。
 * @module dsh-plugin-example/client
 */`,
        note: "浏览器那半也导出 apply，也是装载时跑一次。插件模型没变，变的是谁来装它。",
      },
    },
    {
      id: "s2",
      title: "为什么分开编译",
      detail: "两边的包都往同一个上下文上加了个叫 sessions 的成员，类型不是一回事。放一个程序里必打架。",
      activeNodes: ["host", "client"],
      activeEdges: [],
      log: [
        { kind: "state", text: "host 那份：tsconfig.json，只给 ES 标准库" },
        { kind: "state", text: "client 那份：tsconfig.client.json，补上 DOM 和 jsx" },
        { kind: "ok", text: "两个程序分别检查，各 0 错误" },
      ],
      code: {
        source: "demo/dsh-plugin-example/tsconfig.client.json:1",
        highlight: [4, 5, 13],
        content: `// client 面的编译配置。跑在浏览器里的那一半。
//
// 为什么不能和 host 共用一个 program：
// host 侧的会话包和浏览器侧的运行时包，都往 cordis 的 Context 上合并了
// 一个叫 sessions 的成员，但类型不是一个东西。放进同一个 program 里，
// 两份声明会打架，最后只有先加载的那份生效，报出来的错还看不懂。
// 拆成两个 program，各自只看得见自己那半边的声明，问题就不存在了。
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // 浏览器环境，补上 DOM。
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    // 写 JSX 必须开这个。注意还有个前提：文件名得是 .tsx。
    "jsx": "react-jsx",`,
        note: "拆两个程序是双面架构的代价，不是配置洁癖。不拆，报错会指向完全无关的地方。",
      },
    },
    {
      id: "s3",
      title: "浏览器怎么找到它",
      detail: "包要在 package.json 里声明自己有浏览器那半，启动时才会被扫进名册。这里要写两遍。",
      activeNodes: ["pkg", "roster", "client"],
      activeEdges: ["pkg->roster", "roster->client"],
      log: [
        { kind: "state", text: "启动时扫一遍所有包，看谁声明了浏览器那半" },
        { kind: "warn", text: "只写一种格式，扫描会判空，而且不报错" },
        { kind: "warn", text: "这个失败是别人踩出来记下来的，本教程没有复现过" },
      ],
      code: {
        source: "demo/dsh-plugin-example/package.json:30",
        highlight: [1, 8],
        content: `    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-runtime"
      ],
      "platform": "web"
    }
  },
  "dshClient": {
    "inject": [
      "@deepseek-ai/dsh-client-runtime"
    ],
    "platform": "web"
  },`,
        note: "上面那份嵌套在 dsh 里，下面那份在顶层，内容一模一样。为什么写两遍见下面易错点。",
      },
    },
    {
      id: "s4",
      title: "加载的不是源码",
      detail: "浏览器拿到的是打包好的一个文件，外面套着一层固定的壳，自己向页面上的加载器注册。",
      activeNodes: ["client"],
      activeEdges: [],
      log: [
        { kind: "io", text: "构建产出一个浏览器文件，2418 字节" },
        { kind: "ok", text: 'window.__ModuleLoader__.load({ id: "dsh-plugin-example",' },
        { kind: "state", text: "首尾这层壳是固定格式，构建配置里拼出来的" },
      ],
      code: {
        source: "demo/dsh-plugin-example/tsdown.config.ts:64",
        highlight: [3, 4],
        content: `  outputOptions: {
    entryFileNames: 'client.js',
    banner: \`window.__ModuleLoader__.load({ id: \${JSON.stringify(PLUGIN_ID)}, factory: (require) => {\`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}`,
        note: "页面上已经有的 React 之类不会被打进来，由加载器统一提供，否则会出现第二份实例。",
      },
    },
    {
      id: "s5",
      title: "把面板挂上去",
      detail: "页面没有留给插件的位置，浮层只能自己往 body 上塞一个容器。自己造的东西自己收。",
      activeNodes: ["client", "panel", "user"],
      activeEdges: ["client->panel", "panel->user"],
      log: [
        { kind: "state", text: "应该在页面右上角看到一个便签浮层" },
        { kind: "warn", text: "这条没有验证过，浏览器里从没真的加载过这个产物" },
        { kind: "state", text: "卸载时把 DOM 和 React 根一起收掉" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/client/index.tsx:73",
        highlight: [1, 8],
        content: `export function apply(ctx: ClientContext): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  root.render(<NotesPanel />)

  // 自己创建的 DOM 和 React root，卸载时要自己收干净。
  ctx.effect(() => () => {
    root.unmount()
    host.remove()
  }, 'plugin-example: notes panel')
}`,
        note: "又是 ctx.effect。自己往页面上塞的东西，内核看不见，得自己交出收尾的办法。",
      },
    },
    {
      id: "s6",
      title: "数据从哪来",
      detail: "浏览器那半读不到 host 那半的内存，只能按秒去问上一节开的那条路由。",
      activeNodes: ["route", "panel"],
      activeEdges: ["route->panel"],
      log: [
        { kind: "io", text: "每秒请求一次上一节那条路由" },
        { kind: "state", text: "页面在后台时不拉，省一点" },
        { kind: "warn", text: "返回 200 但形状不对时要挡住，否则界面会闪" },
      ],
      code: {
        source: "demo/dsh-plugin-example/src/client/index.tsx:30",
        highlight: [5, 10],
        content: `  useEffect(() => {
    let alive = true
    const pull = async () => {
      // 页面在后台时不用拉，省一点。
      if (document.hidden) return
      try {
        const body: unknown = await (await fetch(NOTES_URL)).json()
        const list = (body as { notes?: unknown }).notes
        // 校验一下形状。200 但返回值不对时，界面不该跟着崩。
        if (alive && Array.isArray(list)) setNotes(list as Note[])
      } catch {
        // 拉取失败就保持上一次的内容，不闪。
      }
    }`,
        note: "轮询是外部插件取数据的常规办法。代价是最多有一秒的延迟，好处是不用自己造推送。",
      },
    },
  ],
  misconceptions: [
    {
      wrong: "浏览器那半和 host 那半是同一个进程，可以直接读对方的变量。",
      right:
        "两个进程，不共享任何内存。同名的 ctx 在两边是两个不同的东西，连类型都不一样。浏览器那半想要数据，只能走 HTTP 去问——这就是上一节那条路由存在的全部理由。",
    },
    {
      wrong: "package.json 里浏览器那半的声明写一遍就够了。",
      right:
        "照实物抄，两个都写：一份嵌套在 dsh 里，一份放顶层 dshClient，内容一样。新旧版本读的字段不同，只写一种的话名册扫描会判空。最坑的是它不报错，现象是面板永远不出现。哪一份是权威、哪一份是兼容遗留，我们没有实测出来，所以两个都留着。",
    },
    {
      wrong: "面板不出现，先去查 React 组件写得对不对。",
      right:
        "加载链路是「名册收录 → 拿到浏览器产物 → 执行组件」。先查名册收没收这个包，再看产物拿不拿得到。前面任何一步断了，组件根本不会被执行到，查组件是在查一段没跑过的代码。",
    },
    {
      wrong: "含 JSX 的入口文件叫 index.ts 也行，反正 jsx 选项开了。",
      right:
        "不行。TypeScript 只在 .tsx 文件里把尖括号当 JSX，在 .ts 里它是小于号。写错扩展名会报一长串语法错，跟 jsx 选项无关，改配置怎么改都不好使。",
    },
  ],
  takeaways: [
    {
      title: "面板不出现，按这个顺序查",
      intro: "这一层的故障几乎都不报错，所以顺序比经验重要。前面没通过，后面查了也白查。",
      items: [
        { label: "1 名册收了吗", text: "启动时扫描有没有收录这个包。没收就往下看第 2 条。" },
        { label: "2 声明写全了吗", text: "package.json 里嵌套那份和顶层 dshClient 那份要都在，内容一致。", hint: "demo/dsh-plugin-example/package.json:30" },
        { label: "3 名字对得上吗", text: "组合补丁里的 name 必须等于包名，写错了 host 起得来、浏览器找不到。", hint: "demo/dsh-plugin-example/cordis.patch.yml:14" },
        { label: "4 重启了吗", text: "组合发生在启动时。装完不重启，前面三条都对也没用。" },
        { label: "5 产物拿得到吗", text: "请求那个浏览器产物的地址，看是不是 200。" },
        { label: "6 才轮到组件", text: "前五步都通过了，才值得去看 React 组件本身。" },
      ],
    },
    {
      title: "双面架构换来了什么，付出了什么",
      intro: "一个包同时管两端，两边都得说。",
      items: [
        { label: "换来", text: "工具和界面在同一个包里，版本天然一致，装一次两边都到位。" },
        { label: "换来", text: "界面是插件，不改宿主一行代码就能加一块面板。" },
        { label: "付出", text: "两个编译程序、两套依赖、一次打包，构建链比普通包长。" },
        { label: "付出", text: "两边只能靠 HTTP 说话，数据有延迟，还要自己处理拉取失败和形状异常。" },
        { label: "付出", text: "页面没有留给插件的挂载位置，浮层自己定位，多个插件装在一起会叠。" },
      ],
    },
  ],
  quiz: [
    {
      question: "host 那半和浏览器那半怎么交换数据？",
      options: [
        "共享同一个上下文对象",
        "通过 HTTP 路由，浏览器那半自己去拉",
        "打包时把 host 的数据一起打进去",
      ],
      answer: 1,
      explain:
        "两个进程不共享内存。本例是浏览器每秒去拉一次 host 开的那条路由，所以数据最多差一秒。",
      wrongExplains: [
        "两半在两个进程里，连内存都不共享，谈不上共享上下文对象。同名的 ctx 在两边是两个不同的东西。",
        "",
        "打包发生在构建时，那时候还没有任何运行时数据。用户记的便签是跑起来之后才有的。",
      ],
    },
    {
      question: "装完插件重启了，面板还是没出现。先查哪个？",
      options: [
        "先看组件的样式写得对不对",
        "先看名册收没收这个包，再看浏览器产物拿不拿得到",
        "先把插件卸了重装一遍",
      ],
      answer: 1,
      explain:
        "加载链路是名册、产物、组件三步。前面断了组件根本不会执行，查样式是在查一段没跑过的代码。名册不收最常见的原因是声明只写了一种格式。",
      wrongExplains: [
        "样式问题最多让面板难看，不会让它整个不出现。而且组件没被执行到的时候，样式根本无从谈起。",
        "",
        "重装解决不了声明写漏。名册不收这个包最常见的原因是 package.json 里两份声明只写了一份，重装多少次都一样。",
      ],
    },
  ],
  evidence:
    "这一节的构建产物大小、外壳格式、两个编译程序各 0 错误，都是在能解析 @deepseek-ai 那些包的环境里真跑出来的。但浏览器那半从没真的被加载过：名册收录、产物请求、浮层渲染这三件事都没有验证过，凡是描述它们的句子都写成了「应该」。",
  bridge:
    "到这里全套读完了，说清楚你现在会什么。你能写出一个结构正确的 DSH 插件：那四个命名导出、一个工具、一条会话记录、一条路由、一块浏览器面板，也知道面板不出现时按什么顺序查。你还不会的两件事：一是这个例子只验证到类型检查和构建通过，装进真实环境之后的行为得你自己跑一遍才算数；二是真实插件要做的持久化、并发控制、鉴权，本教程一条都没讲，那些是普通后端功夫，跟 Harness 无关。",
};
