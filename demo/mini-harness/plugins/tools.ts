/**
 * 工具登记处。
 *
 * 别的插件把工具挂到这里，循环从这里取。
 * 谁也不用认识谁——加一个工具不用改循环，删一个也不用。
 */
import type { Plugin } from '../kernel.ts'
import type { Tool, Tools } from '../types.ts'

export const tools: Plugin = {
  name: 'tools',

  setup(ctx) {
    const registry = new Map<string, Tool>()

    const service: Tools = {
      register(tool) {
        registry.set(tool.name, tool)
        ctx.emit('tool/register', { name: tool.name })
      },
      list() {
        return [...registry.values()]
      },
      find(name) {
        return registry.get(name)
      },
    }

    ctx.provide('tools', service)
  },
}
