/**
 * 两个文件工具：读和删。
 *
 * 这就是「模型碰得到真实世界」的那一层。模型只会说
 * 「我要调 read_file，参数 path=notes.txt」，真的去读的是这里。
 *
 * 为了让 demo 到处都能跑，文件放在内存里，没碰你的磁盘。
 * 换成真的 fs.readFile 也就是改一行。
 */
import type { Plugin } from '../kernel.ts'
import type { Tools } from '../types.ts'

/** 假装的工作区 */
const workspace = new Map<string, string>([
  ['notes.txt', '记得写测试'],
  ['readme.md', '这是一个 demo'],
])

export const toolFiles: Plugin = {
  name: 'tool-files',
  // 没有工具登记处就没法注册，所以要等它
  needs: ['tools'],

  setup(ctx) {
    const tools = ctx.get<Tools>('tools')

    tools.register({
      name: 'read_file',
      describe: '读一个文件的内容',
      params: { path: '文件路径' },
      async run(args) {
        const text = workspace.get(args.path)
        return text ?? `没有这个文件：${args.path}`
      },
    })

    tools.register({
      name: 'stat_file',
      describe: '看一个文件有多大',
      params: { path: '文件路径' },
      async run(args) {
        const text = workspace.get(args.path)
        // 故意抛异常，不返回错误字符串。
        // 工具是别人写的代码，它想抛就抛——循环得扛得住这件事。
        if (text === undefined) throw new Error(`打不开 ${args.path}`)
        return `${args.path} 有 ${text.length} 个字`
      },
    })

    tools.register({
      name: 'delete_file',
      describe: '删掉一个文件',
      params: { path: '文件路径' },
      // 标记成危险动作，审批插件看到这个标记就会拦下来问
      needsApproval: true,
      async run(args) {
        workspace.delete(args.path)
        return `已删除 ${args.path}`
      },
    })
  },
}
