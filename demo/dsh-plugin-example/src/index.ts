/**
 * 最小 DSH 插件的 host 面：跑在 Node 里的那一半。
 *
 * 它做三件事，各一次，是为了把三条最常用的接缝各演示一遍：
 *   1. 注册一个工具 example_note，模型可以调它记便签
 *   2. 往调用者的会话日志里追加一条事件，便签这件事就留下了痕迹
 *   3. 开一条 HTTP 路由，浏览器那一半靠它取数据
 *
 * 装载方式是 bundle：cordis.patch.yml 把这个包挂成组合树里的一行，
 * 工具进的是全局工具登记处，所以这个 profile 下所有会话都能用。
 * @module dsh-plugin-example
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
// 只为触发声明合并：DSH 的各个包用 declare module 往 Context 上加成员，
// 包没被加载进 program，ctx.httpServer 在类型上就不存在。
// import type {} 不会产生任何运行时代码，编译后整行消失。
import type {} from '@deepseek-ai/dsh-host-webserver'
// 同理：加载会话事件表这个模块，src/event-types.ts 里的 declare module
// 才有东西可合并，下面 session.append 才认识我们自己的事件名。
import type {} from '@deepseek-ai/dsh-session/types'
import type { ExampleNoteAddedData } from './event-types.ts'
import { addNote, listNotes } from './notes.ts'

/** 插件名。出错信息、组合树里都用它认人。 */
export const name = 'plugin-example'

/**
 * 依赖的服务。写在这里的，apply 跑的时候一定已经就位。
 *
 * 注意它只等「服务」，不等「别的插件往服务里注册了什么」。
 * 那种依赖要延后到第一次真正用的时候再检查。
 *
 * 本例只用到两个。其他常见的还有：
 *   agents         按会话 id 找到活着的 Agent
 *   workspace      当前有哪些工作区
 *   subagents      派生子 Agent
 *   systemPrompt   往系统提示里加一段
 * 名字写错不会报错，插件会一直在队列里等，apply 一次也不跑。
 */
export const inject = ['tools', 'httpServer']

/** 插件配置。用户在 cordis.patch.yml 的 config 里填的就是它。 */
export interface Config {
  /** 便签最多留几条，超了丢最旧的。 */
  maxNotes?: number
}

/**
 * 配置的 schema。
 *
 * 它不只是类型，是运行时真的会跑的校验：填错类型会在启动时报错，
 * 没填的字段由 default 补上。所以 apply 里不用自己写默认值兜底。
 */
export const Config: z<Config> = z.object({
  maxNotes: z.natural().min(1).default(20),
})

/**
 * 插件的全部入口。装载时执行一次。
 * @param ctx - 这个插件专属的上下文。注册什么都通过它。
 * @param config - 经 Config schema 校验并补过默认值的配置。
 */
export function apply(ctx: Context, config: Config): void {
  const maxNotes = config.maxNotes ?? 20

  // ── 接缝一：工具 ────────────────────────────────────────────
  // description 和 parameters 是模型唯一的判断依据，写清楚它才知道
  // 什么时候该调、怎么调。
  ctx.tools.register(defineTool({
    name: 'example_note',
    description: 'Record a short note for the user. Use it when the user asks to remember something.',
    parameters: {
      text: { type: 'string', required: true, description: 'The note text to record.' },
    },
    output: {
      // 工具返回值的形状。execute 的返回值会按这个 schema 校验。
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          total: { type: 'number', required: true },
        },
      },
      // 把返回值翻译成模型看得懂的内容。
      render: (_args, value) => [{ type: 'text', text: `note recorded, ${value.total} in total` }],
    },
    async execute(args, exec) {
      const note = addNote(args.text, maxNotes)

      // ── 接缝二：会话事件 ──────────────────────────────────────
      // exec.agent 是调用这个工具的 Agent，它身上挂着当前会话。
      // 写事件是留痕，不是业务本身——写失败也不能让工具跟着失败。
      const data: ExampleNoteAddedData = { id: note.id, text: note.text, ts: note.ts }
      try {
        exec.agent?.session.append('plugin-example/note-added', data)
      } catch (error: unknown) {
        ctx.logger.warn(`plugin-example: append event failed: ${String(error)}`)
      }

      return { total: listNotes().length }
    },
  }))

  // ── 接缝三：HTTP 路由 ──────────────────────────────────────
  // register 返回一个注销函数，必须交给 ctx.effect。
  // 不交的话，插件重载时旧路由还留着，第二次注册就撞车了。
  ctx.effect(() => ctx.httpServer.register({
    kind: 'exact',
    path: '/plugins/dsh-plugin-example/notes',
    handler: async (_req, res) => {
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(JSON.stringify({ notes: listNotes() }))
    },
  }), 'plugin-example: notes route')
}
