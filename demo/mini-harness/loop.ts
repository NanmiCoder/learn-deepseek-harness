/**
 * 循环：Harness 的心跳。
 *
 * 一句用户输入进来，这里可能要跟模型来回好几轮：
 * 模型每要一次工具，就多问一次；直到它不再要工具为止。
 *
 * 注意这个文件里没有「权限」两个字。审批是另一个插件干的事，
 * 循环只负责在动手之前喊一嗓子，谁想拦就拦。
 */
import type { Context } from './kernel.ts'
import type { History, Model, ToolCall, Tools } from './types.ts'

/** 防止模型无限要工具，跑到头就停 */
const MAX_STEPS = 6

const SYSTEM = '你是一个帮忙看代码的助手。需要读文件时就调工具，不要猜文件内容。'

export async function runTurn(ctx: Context, userText: string): Promise<string> {
  const history = ctx.get<History>('history')
  const model = ctx.get<Model>('model')
  const tools = ctx.get<Tools>('tools')

  ctx.emit('turn/start', { text: userText })
  history.add({ role: 'user', text: userText })

  for (let step = 1; step <= MAX_STEPS; step++) {
    ctx.emit('step/start', { step })

    // 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
    const reply = await model.ask({
      system: SYSTEM,
      tools: tools.list(),
      messages: history.all(),
    })
    history.add(reply)

    // 循环唯一的出口：模型没要工具，说明它给出答案了
    if (!reply.toolCall) {
      ctx.emit('turn/end', { step })
      return reply.text
    }

    const result = await runTool(ctx, reply.toolCall)
    history.add({ role: 'tool', text: result })
  }

  return '步数用完了，还没得到答案。'
}

/**
 * 执行一次工具调用。
 * 动手之前先发 tool/before，事件里带一个 block 函数——
 * 任何插件都能调它把这次调用拦下来。循环不关心是谁拦的。
 */
async function runTool(ctx: Context, call: ToolCall): Promise<string> {
  const tool = ctx.get<Tools>('tools').find(call.name)

  // 工具不存在也要给模型一个回复，让它自己换个做法
  if (!tool) return `没有叫 ${call.name} 的工具。`

  let blockedReason = ''
  ctx.emit('tool/before', {
    name: call.name,
    args: call.args,
    block: (reason: string) => { blockedReason = reason },
  })

  if (blockedReason) {
    // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
    ctx.emit('tool/blocked', { name: call.name, reason: blockedReason })
    return blockedReason
  }

  const output = await tool.run(call.args)
  ctx.emit('tool/after', { name: call.name, output })
  return output
}
