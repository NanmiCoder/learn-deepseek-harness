/**
 * 审批：危险动作动手之前先问一句。
 *
 * 这个插件是理解「一切皆插件」的关键例子。
 * 循环里没有任何一行提到权限——它只是在动手前发了个环绕式事件。
 * 这里排进那个队列，看到危险工具就不往下传，直接把这次调用接管掉。
 *
 * 注意 next 的两种用法，这是环绕式事件和普通事件最大的区别：
 *   - 调 next(决定)：我不管这件事，交给下一个人
 *   - 不调 next    ：这件事我说了算，后面的人和真正干活的那段都不跑了
 *
 * 把这个插件从装配单里删掉，整个 demo 照样跑，只是没人拦了。
 */
import type { Plugin } from '../kernel.ts'
import type { ToolDecision, Tools } from '../types.ts'

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

  setup(ctx, config) {
    const tools = ctx.get<Tools>('tools')
    // 装配单发下来的配置：哪些工具要拦。没配就一个都不拦。
    const deny = (config.deny as string[]) ?? []
    ctx.emit('approval/config', { deny })

    ctx.intercept('tool/decide', (value, next) => {
      const decision = value as ToolDecision
      const tool = tools.find(decision.name)

      // 不在这次要拦的名单里，我没意见，往下传
      if (!tool?.needsApproval || !deny.includes(decision.name)) return next(decision)

      ctx.emit('approval/ask', { name: decision.name })
      if (askUser(decision.name)) {
        ctx.emit('approval/allow', { name: decision.name })
        return next(decision)
      }

      // 不调 next：这次调用到此为止，工具的 run 一次都不会跑
      ctx.emit('approval/deny', { name: decision.name })
      return { ...decision, blocked: '用户拒绝了这次操作。' }
    })
  },
}
