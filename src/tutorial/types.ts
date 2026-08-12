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
  explain: string;
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
  /** 生活化类比，150 字以内 */
  analogy: string;
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
