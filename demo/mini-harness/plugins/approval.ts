/**
 * 审批：危险动作动手之前先问一句。
 *
 * 这个插件是理解「一切皆插件」的关键例子。
 * 循环里没有任何一行提到权限——它只是在动手前发了个 tool/before 事件。
 * 这里监听那个事件，看到危险工具就调 block() 拦下来。
 *
 * 把这个插件从装配单里删掉，整个 demo 照样跑，只是没人拦了。
 */
import type { Plugin } from '../kernel.ts'
import type { Tools } from '../types.ts'

/**
 * 真产品这里会弹窗问用户。demo 里为了每次跑出来一样，
 * 用一份固定答复代替：删文件一律不同意。
 */
function askUser(toolName: string): boolean {
  return toolName !== 'delete_file'
}

export const approval: Plugin = {
  name: 'approval',
  needs: ['tools'],

  setup(ctx) {
    const tools = ctx.get<Tools>('tools')

    ctx.on('tool/before', (payload) => {
      const event = payload as {
        name: string
        block: (reason: string) => void
      }

      const tool = tools.find(event.name)
      if (!tool?.needsApproval) return

      ctx.emit('approval/ask', { name: event.name })
      if (askUser(event.name)) {
        ctx.emit('approval/allow', { name: event.name })
        return
      }

      ctx.emit('approval/deny', { name: event.name })
      event.block('用户拒绝了这次操作。')
    })
  },
}
