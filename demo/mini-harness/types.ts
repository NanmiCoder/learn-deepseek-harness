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

/** 挂在 'history' 这个名字下的能力 */
export interface History {
  add(message: Message): void
  all(): Message[]
}

/** 挂在 'tools' 这个名字下的能力 */
export interface Tools {
  register(tool: Tool): void
  list(): Tool[]
  find(name: string): Tool | undefined
}

/** 挂在 'approval' 这个名字下的能力 */
export interface Approval {
  ask(toolName: string, args: Record<string, string>): Promise<boolean>
}
