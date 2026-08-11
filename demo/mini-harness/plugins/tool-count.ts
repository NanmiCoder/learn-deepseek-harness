/**
 * 第 5 课要你亲手写的那个插件。
 *
 * 它做一件很小的事：给模型加一个「数一数工作区有几个文件」的工具。
 * 麻雀虽小，插件该有的东西它都有：声明依赖、注册工具、登记清理。
 */
import type { Plugin } from '../kernel.ts'
import type { Tools } from '../types.ts'

export const toolCount: Plugin = {
  // 1. 名字。出错时靠它定位是谁的问题。
  name: 'tool-count',

  // 2. 我要用到 tools 这个服务。它没就位，下面的 setup 不会被调用。
  needs: ['tools'],

  // 3. 装载时执行一次。
  setup(ctx) {
    const tools = ctx.get<Tools>('tools')
    let calls = 0

    tools.register({
      name: 'count_files',
      describe: '数一数工作区里有几个文件',
      params: {},
      async run() {
        calls++
        return `工作区里有 2 个文件。（这个工具被调用了 ${calls} 次）`
      },
    })

    // 4. 交出清理函数。插件被拆掉时，这行会被执行。
    ctx.effect(() => {
      ctx.emit('count/bye', { calls })
    })
  },
}
