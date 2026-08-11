/**
 * 会话历史。
 *
 * 模型没有记忆。它这一步能看到上一步的结果，全靠这里存着，
 * 每次请求前重新念一遍给它听。
 */
import type { Plugin } from '../kernel.ts'
import type { History, Message } from '../types.ts'

export const history: Plugin = {
  name: 'history',

  setup(ctx) {
    const messages: Message[] = []

    const service: History = {
      add(message) {
        messages.push(message)
        ctx.emit('history/add', { role: message.role, count: messages.length })
      },
      all() {
        // 给一份拷贝，别人改不动这里面的东西
        return [...messages]
      },
    }

    ctx.provide('history', service)
  },
}
