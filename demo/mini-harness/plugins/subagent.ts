/**
 * 子 Agent：把一件事分出去，让它在自己的会话里做完再回来。
 *
 * 这里只有一个要点，别的都是配角：**子 Agent 有自己的会话日志。**
 *
 * 为什么不共用一份？因为上下文会互相污染。子 Agent 干活时翻来覆去的那些
 * 中间步骤，父会话一条都不需要看见；父会话此前那一大段对话，子 Agent 也
 * 不需要。分开之后，两边各自只带自己那份，谁也不用替对方付账。
 *
 * 传回来的只有一样东西：子 Agent 的结论，当成一条工具结果进父会话。
 */
import type { Plugin } from '../kernel.ts'
import type { Model, Sessions, Tools } from '../types.ts'

const CHILD_SYSTEM = '你是一个子 agent，专心把交给你的这一件事做完，然后给一句结论。'

export const subagent: Plugin = {
  name: 'subagent',
  needs: ['tools', 'sessions', 'model'],

  setup(ctx) {
    const tools = ctx.get<Tools>('tools')
    const sessions = ctx.get<Sessions>('sessions')
    const model = ctx.get<Model>('model')

    tools.register({
      name: 'delegate',
      describe: '把一件独立的小事交给另一个 agent 去做，拿回它的结论',
      params: { task: '要它做的那件事' },

      async run(args) {
        const parent = sessions.current()

        // 关键就是这一行：开一个新会话，而不是往当前这份日志里接着写
        const child = sessions.create({
          parent: parent?.id,
          depth: (parent?.meta.depth ?? 0) + 1,
        })

        ctx.emit('delegate/start', { child: child.id, task: args.task })

        child.append('turn/start', { text: args.task })
        child.append('user', { text: args.task })
        child.append('step/start', { step: 1 })

        // 子 Agent 用的是同一个模型服务。它派生出来的历史里只有自己那两条，
        // 父会话那一大段跟它没关系。
        const reply = await model.ask({
          system: CHILD_SYSTEM,
          tools: [],
          messages: child.derive(),
        })

        child.append('assistant', { text: reply.text })
        child.append('turn/end', { step: 1 })

        ctx.emit('delegate/done', { child: child.id, events: child.events().length })
        return reply.text
      },
    })
  },
}
