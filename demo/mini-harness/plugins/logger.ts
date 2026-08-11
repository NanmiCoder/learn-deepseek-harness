/**
 * 日志插件：把跑起来之后发生的每件事打出来。
 *
 * 它不提供任何服务，只监听事件。这类插件删掉不影响功能，
 * 只是你看不见里面在干什么了。
 *
 * 教程里那个「运行记录」面板，内容就是这个文件打出来的。
 */
import type { Plugin } from '../kernel.ts'

/** 每种事件用哪个标签显示 */
const TAGS: Record<string, string> = {
  'plugin/wait': 'warn',
  'plugin/start': 'ok',
  'plugin/remove': 'state',
  'turn/start': 'event',
  'step/start': 'event',
  'model/request': 'call',
  'history/add': 'state',
  'tool/register': 'ok',
  'tool/before': 'call',
  'tool/after': 'io',
  'tool/blocked': 'warn',
  'approval/ask': 'io',
  'approval/allow': 'ok',
  'approval/deny': 'warn',
  'turn/end': 'ok',
  'count/bye': 'state',
}

export const logger: Plugin = {
  name: 'logger',

  setup(ctx) {
    for (const [event, tag] of Object.entries(TAGS)) {
      ctx.on(event, (payload) => {
        const detail = describe(payload)
        console.log(`${tag.padEnd(5)} ${event}${detail ? ' ' + detail : ''}`)
      })
    }
  },
}

/** 把事件带的数据压成一行，长的截断 */
function describe(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const entries = Object.entries(payload as Record<string, unknown>)
    // block 是个函数，打不出来也没意义
    .filter(([, value]) => typeof value !== 'function')
    .map(([key, value]) => `${key}=${short(value)}`)
  return entries.length > 0 ? `{ ${entries.join(', ')} }` : ''
}

function short(value: unknown): string {
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text.length > 34 ? text.slice(0, 33) + '…' : text
}
