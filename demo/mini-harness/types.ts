/** demo 里到处都用到的几个类型，单独放一个文件，省得互相 import 绕圈。 */

/** 一条对话消息 */
export interface Message {
  role: 'user' | 'assistant' | 'tool'
  text: string
  /** 只有 assistant 消息可能带这个：模型说它想调哪个工具 */
  toolCall?: ToolCall
}

/** 模型说「我要调这个工具，参数是这些」 */
export interface ToolCall {
  name: string
  args: Record<string, string>
}

/** 一个工具的完整定义：说明书 + 干活的函数 */
export interface Tool {
  name: string
  /** 给模型看的一句话说明 */
  describe: string
  /** 参数名 -> 这个参数是干什么的。模型照着它填参数。 */
  params: Record<string, string>
  /** 危险动作标记为 true，执行前会先问人 */
  needsApproval?: boolean
  run(args: Record<string, string>): Promise<string>
}

/** 模型收到的一整包输入 */
export interface Request {
  system: string
  tools: { name: string; describe: string; params: Record<string, string> }[]
  messages: Message[]
}

/** 挂在 'model' 这个名字下的能力 */
export interface Model {
  ask(request: Request): Promise<Message>
}

/**
 * 会话日志里的一条事件。
 *
 * 日志只能往后加，加进去就不改了。seq 是它在日志里的位置。
 */
export interface SessionEvent {
  seq: number
  /** 事件类型。只有 user / assistant / tool 三种会变成模型看得见的消息。 */
  type: SessionEventType
  data: Record<string, unknown>
}

/**
 * demo 用到的六种事件。名字分两类，一眼能看出区别：
 *   - 光秃秃的 user / assistant / tool：这三种会变成模型看得见的消息，
 *     名字就是消息的 role。
 *   - 带斜杠的 turn/start、step/start、turn/end：结构标记，
 *     记录「什么时候开始、什么时候结束」，模型一个字都看不到。
 */
export type SessionEventType =
  | 'user' | 'assistant' | 'tool'
  | 'turn/start' | 'step/start' | 'turn/end'

/** 一个会话的来历。子会话会记下它爹是谁、隔了几层。 */
export interface SessionMeta {
  parent?: string
  depth?: number
}

/** 一个会话：一条只能往后加的事件流 */
export interface Session {
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
  derive(): Message[]
}

/** 挂在 'sessions' 这个名字下的能力 */
export interface Sessions {
  create(meta?: SessionMeta): Session
  list(): Session[]
  /** 现在正在跑的那个会话。工具要开子会话时得知道自己的爹是谁。 */
  current(): Session | undefined
  setCurrent(session: Session | undefined): void
}

/**
 * 一次工具调用的决定，在 tool/decide 这个环绕式事件里传递。
 * 插件可以放行、可以改参数，也可以填上 blocked 把它拦下来。
 */
export interface ToolDecision {
  name: string
  args: Record<string, string>
  /** 空字符串 = 放行。非空 = 拦下，这段话会当成工具结果还给模型。 */
  blocked: string
}

/** 挂在 'tools' 这个名字下的能力 */
export interface Tools {
  register(tool: Tool): void
  list(): Tool[]
  find(name: string): Tool | undefined
}

/**
 * 挂在 'loop' 这个名字下的能力。
 *
 * 循环也是一个插件，这一点值得停一下：它不是内核的一部分，
 * 也不是谁 import 进来的函数，就是装配单里的一行。
 * 想换一套转圈的规则，写一个也提供 'loop' 的插件替掉那行就行，
 * 别的插件一个都不用动——它们只知道按名字取。
 */
export interface Loop {
  run(session: Session, userText: string): Promise<string>
}
