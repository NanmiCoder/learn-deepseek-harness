/**
 * 循环：Harness 的心跳。
 *
 * 一句用户输入进来，这里可能要跟模型来回好几轮：
 * 模型每要一次工具，就多问一次；直到它不再要工具为止。
 *
 * 两件事这个文件里看不到：
 *   1. 没有「权限」两个字。拦不拦是别人的事，这里只发一个环绕式事件。
 *   2. 没有存历史的数组。它把发生的事写进会话日志，
 *      要喂给模型时再从日志里现算一份历史出来。
 */
import type { Context, Plugin } from './kernel.ts'
import type { Loop, Model, Session, ToolCall, ToolDecision, Tools } from './types.ts'

/**
 * 循环插件。装配单里的一行，和审批、日志、工具没有区别。
 *
 * 「一切皆插件，循环也不例外」——这句话在这里兑现。
 * 把这行从装配单删掉，整个 Harness 就不会转圈了；
 * 换一个也提供 'loop' 的插件，就换了一套转圈的规则。
 */
export const loop: Plugin = {
  name: 'loop',
  needs: ['model', 'tools'],

  setup(ctx) {
    const service: Loop = {
      run: (session, userText) => runTurn(ctx, session, userText),
    }
    ctx.provide('loop', service)
  },
}

/** 防止模型无限要工具，跑到头就停 */
const MAX_STEPS = 6

const SYSTEM = '你是一个帮忙看代码的助手。需要读文件时就调工具，不要猜文件内容。'

export async function runTurn(ctx: Context, session: Session, userText: string): Promise<string> {
  const model = ctx.get<Model>('model')
  const tools = ctx.get<Tools>('tools')

  session.append('turn/start', { text: userText })
  session.append('user', { text: userText })

  for (let step = 1; step <= MAX_STEPS; step++) {
    session.append('step/start', { step })

    // 每一步都重新拼一份完整输入。模型不记得上一步，全靠这里喂给它。
    // messages 是现从日志里派生的——日志里那些结构事件不会出现在这。
    const reply = await model.ask({
      system: SYSTEM,
      tools: tools.list(),
      messages: session.derive(),
    })
    session.append('assistant', { text: reply.text, toolCall: reply.toolCall })

    // 出口之一：模型没要工具，说明它给出答案了。
    // 另一个出口在下面——步数走到 MAX_STEPS 上限，防它一直要工具不给答案。
    if (!reply.toolCall) {
      session.append('turn/end', { step })
      return reply.text
    }

    const result = await runTool(ctx, reply.toolCall)
    session.append('tool', { text: result })
  }

  return '步数用完了，还没得到答案。'
}

/**
 * 执行一次工具调用。
 *
 * 动手之前先走一个环绕式事件 tool/decide：插件排成一队，
 * 每个人都可以放行、改参数，或者不往下传直接拦下。
 * 循环不认识队里有谁，也不关心谁拦的。
 */
async function runTool(ctx: Context, call: ToolCall): Promise<string> {
  const tool = ctx.get<Tools>('tools').find(call.name)

  // 工具不存在也要给模型一个回复，让它自己换个做法
  if (!tool) return `没有叫 ${call.name} 的工具。`

  ctx.emit('tool/decide', { name: call.name, args: call.args })
  const decision = ctx.waterfall<ToolDecision>(
    'tool/decide',
    { name: call.name, args: call.args, blocked: '' },
    // 没人拦的时候，最后落到这里：原样放行
    (final) => final,
  )

  if (decision.blocked) {
    // 拒绝理由要当成工具结果还给模型，它才知道发生了什么
    ctx.emit('tool/blocked', { name: call.name, reason: decision.blocked })
    return decision.blocked
  }

  ctx.emit('tool/before', { name: call.name, args: decision.args })

  try {
    const output = await tool.run(decision.args)
    ctx.emit('tool/after', { name: call.name, output })
    return output
  } catch (error) {
    // 工具是别人写的代码，它抛异常不能把整个循环炸掉。
    // 把错误当成这次工具的结果还给模型，它下一步自己会换个做法——
    // 和「被拦下」走的是同一条路：都变成一条 tool 消息进日志。
    const reason = error instanceof Error ? error.message : String(error)
    ctx.emit('tool/failed', { name: call.name, reason })
    return `工具 ${call.name} 出错了：${reason}`
  }
}
