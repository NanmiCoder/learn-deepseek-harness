/**
 * 一节课的数据结构。
 *
 * 每节课都是一份纯数据，由同一套工作台渲染。新增一节课 = 新增一个数据文件，
 * 不需要写新的组件。
 */

/** 图上节点的种类，决定它的配色 */
export type NodeKind =
  /** 内核，框架自己保留的最小部分 */
  | "core"
  /** 插件，可装可卸的功能 */
  | "plugin"
  /** 外部世界：人、模型、文件系统、别人的工具 */
  | "external"
  /** 流动的数据：消息、上下文、结果 */
  | "data";

export interface StageNode {
  id: string;
  label: string;
  /** 副标题，写包名或类名 */
  sub?: string;
  /** 第几列，从 0 开始 */
  col: number;
  /** 第几行，从 0 开始 */
  row: number;
  /**
   * 窄屏下改用的坐标。省略就沿用 col / row。
   *
   * 只给真的糊掉的图填——判据是 390px 下有节点被挤出可视区。
   * 横滚救不了「一主派三子」这类图：读者看到的是主控和半个子节点，
   * 而那张图的全部意义就在于关系，关系被裁掉就等于没画。
   *
   * 要么都填要么都不填。只填一个，另一个轴会沿用宽屏的值，大概率和别的节点撞格。
   */
  mobileCol?: number;
  mobileRow?: number;
  kind: NodeKind;
  /** 覆盖节点眉标。真实业务图里可写「主控」「子 Agent」等角色。 */
  kindLabel?: string;
}

export interface StageEdge {
  from: string;
  to: string;
  label?: string;
  /** 曲线走向。默认自动判断 */
  curve?: "auto" | "straight" | "loop";
}

/** 运行记录里一行的类型 */
export type LogKind =
  | "event"
  | "call"
  | "state"
  | "io"
  | "ok"
  | "warn";

export interface LogLine {
  kind: LogKind;
  text: string;
}

export interface CodeBlock {
  /** 来源，形如 demo/mini-harness/kernel.ts:59。体检会真的打开文件核对这一行。 */
  source: string;
  content: string;
  /** 一到两句话，指出最关键那行在干什么 */
  note: string;
  /** 需要高亮的行号，从 1 开始 */
  highlight?: number[];
  /**
   * 标成 true 表示这是「写到这一步的样子」，不是文件里某一行开始的原样拷贝。
   * 只有逐步搭建代码的课用得上。界面上会标出来，读者不会误以为是最终版。
   * 标了之后体检就不核对行号了，所以别滥用。
   */
  partial?: boolean;
}

/** 分步动画的一帧 */
export interface LessonStep {
  id: string;
  title: string;
  /** 这一步发生了什么、为什么 */
  detail: string;
  activeNodes: string[];
  /** 形如 "from->to" */
  activeEdges: string[];
  log: LogLine[];
  code?: CodeBlock;
}

export interface ConceptRow {
  term: string;
  /** 大白话解释 */
  plain: string;
  /** 源码里对应什么 */
  source: string;
}

export interface QuizItem {
  question: string;
  options: string[];
  /** 正确选项下标，从 0 开始 */
  answer: number;
  /** 答对时显示。说清为什么对，不要只复述选项。 */
  explain: string;
  /**
   * 每个错误选项一句专属反驳，下标和 options 对齐，正确选项那一格写空字符串占位。
   *
   * 答错那一刻是唯一能确诊读者哪儿想岔了的时机，所以这里要针对这个选项本身写：
   * 他为什么会这么想、这个想法错在哪、在 npm run demo 的哪一行能看见它是错的。
   * 「这个不对，回去再看一遍」帮不上忙，那是判分不是教学。
   *
   * 不写会退回一句通用提示。尽量别省。
   */
  wrongExplains?: string[];
}

export interface Misconception {
  wrong: string;
  right: string;
}

/** 课后补充。放主流程装不下、但确实有用的东西，比如速查表、好处与代价。 */
export interface Takeaway {
  title: string;
  /** 可选的一句话导语 */
  intro?: string;
  items: {
    label: string;
    text: string;
    /** 可选，源码路径之类的旁注 */
    hint?: string;
  }[];
}

/**
 * 目录里的一个阶段。实例登记在 src/lessons/groups.ts，顺序即侧边栏顺序。
 *
 * goal 写这个阶段读完能干什么，不是这个阶段讲了什么——
 * 「先搞清楚 Harness 是什么」是目标，「介绍 Harness 概念」是目录。
 */
export type LessonGroup = { id: string; title: string; goal?: string };

export interface Lesson {
  id: string;
  /** 两位数序号，如 "01" */
  index: string;
  title: string;
  /** 一句话说明这节讲什么，不超过 20 字 */
  summary: string;
  /** 分组标签，如「基础认知」 */
  eyebrow: string;
  readingMinutes: number;
  /** 不超过 40 字，读完要有画面感 */
  oneLiner: string;
  /** 真实案例可让交互图先于类比和概念出现。 */
  architectureFirst?: boolean;
  /**
   * 这节属于哪个阶段，值要对上 src/lessons/groups.ts 里某个 LessonGroup 的 id。
   *
   * 用显式外键而不是复用 eyebrow：eyebrow 同时被面包屑和正文头当文案用，
   * 改一次措辞就会把分组打散。分组是结构，措辞是文案，两件事分开。
   */
  group: string;
  /**
   * 这节要不要读者打开终端动手。省略等同于 "read"。
   *
   * 只标动手课，不标纯阅读课——全都标等于没标，少数派才扫得到。
   * 侧边栏会给动手课渲染一个图标。**不要在课程数据里写 emoji**，
   * 标记是 UI 的事，文案里出现 emoji 违反写作约定。
   */
  kind?: "read" | "hands-on";
  /**
   * 生活化类比，150 字以内。和 positioning 至少要有一个。
   *
   * 只在比喻真的能解释东西时才写，三条判断标准：
   * 1. 删除测试：把它删掉重读正文，理解难度没上升，这个比喻就不该存在。
   * 2. 角色对齐：比喻里说是 A 干的事，正文里就不能是 B 干的。
   * 3. 覆盖难点：要能罩住这一节最难的那两步，罩不住就换一个。
   * 同一个比喻在整套教程里只能指一样东西，新写之前先全局搜一遍本体词。
   *
   * 没有合格的比喻时留空，改写 positioning。凑一个出来比不写更糟。
   */
  analogy?: string;
  /**
   * analogy 的替代品：不打比方，直接说清这一节讲的是什么、和上一节什么关系。
   *
   * 用在读者已经有足够直觉的地方——再叠一层比喻，他反而要先把比喻忘掉才能读代码。
   * 两个字段可以都写，positioning 渲染在前。
   */
  positioning?: string;
  /**
   * 分步演示那一块的小标题。省略时用「分步演示」。
   *
   * 默认文案原来写死成「分步演示 · 一次对话怎么跑完」，那只对讲一次对话的课成立。
   * 讲三层关系、讲怎么排查、讲插件怎么装的课，套上去都是错的。
   * 这一节演的是什么，就写什么。
   */
  stageTitle?: string;
  concepts: ConceptRow[];
  stage: {
    nodes: StageNode[];
    edges: StageEdge[];
    /** 可选的列泳道标题，与图的 col 一一对应。 */
    columnLabels?: string[];
    /** 可选的图例文案覆盖。 */
    legendLabels?: Partial<Record<NodeKind, string>>;
    /** 移动端保持图的可读宽度，允许在图内横向查看。 */
    scrollOnMobile?: boolean;
    /** 最后一帧的关系级总览。省略时会自动合并双向边并复用主图节点。 */
    overview?: {
      nodes: StageNode[];
      edges: StageEdge[];
      columnLabels?: string[];
      summary?: string;
    };
  };
  steps: LessonStep[];
  misconceptions: Misconception[];
  /** 可选的课后补充，渲染成可折叠的速查区 */
  takeaways?: Takeaway[];
  quiz: QuizItem[];
  /** 无代码步骤可用这行说明证据来源。 */
  evidence?: string;
  /** 学完这节后带着什么问题进入下一节 */
  bridge?: string;
}
