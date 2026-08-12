/**
 * 入口：把零件装到一起，跑一遍。
 *
 * 这个文件就是「装配单」。想去掉某个功能，把对应那行删掉就行——
 * 删 approval 就没人拦危险动作，删 logger 就什么都不打印，
 * 其余部分一行都不用改。
 *
 * 跑法：npm run demo
 */
import { Kernel } from './kernel.ts'
import { compose, type Layer } from './profile.ts'
import { loop } from './loop.ts'
import { approval } from './plugins/approval.ts'
import { logger } from './plugins/logger.ts'
import { modelFake } from './plugins/model-fake.ts'
import { session } from './plugins/session.ts'
import { subagent } from './plugins/subagent.ts'
import { toolCount } from './plugins/tool-count.ts'
import { toolFiles } from './plugins/tool-files.ts'
import { tools } from './plugins/tools.ts'
import type { Loop, Sessions } from './types.ts'

// 底座层：这些插件是每种形态都要的。
// 顺序随便写——依赖没齐的插件会自己排队等。
// 这里故意把 tool-files 写在 tools 前面，你可以在运行记录里看到它等了一下。
const base: Layer = {
  name: '底座',
  use: [logger, toolFiles, tools, session, modelFake, approval, toolCount, subagent, loop],
  config: { approval: { deny: ['delete_file'] } },
}

// 用户自己那一层：只改一项，别的照旧。
const trusting: Layer = { name: '信任', config: { approval: { deny: [] } } }

const standard = compose([base])
const kernel = new Kernel()
const ctx = kernel.root()
for (const plugin of standard.use) kernel.use(plugin, standard.config[plugin.name])

console.log('--- 装好了，现在有这些插件在跑 ---')
console.log('还在排队等依赖的：', kernel.pending().length === 0 ? '没有' : kernel.pending())
console.log()

const sessions = ctx.get<Sessions>('sessions')

// ---------- 第一轮：读文件、数文件、删文件被拦下 ----------
console.log('--- 用户说了一句话 ---')
const first = sessions.create()
sessions.setCurrent(first)
const answer = await ctx.get<Loop>('loop').run(first, '看看 notes.txt 写了什么，然后把它删掉')
console.log()
console.log('--- 模型最后的回答 ---')
console.log(answer)

// 同一份日志，两种看法：一份给人看，一份给模型看。
console.log()
console.log('--- 同一份日志，两种看法 ---')
console.log(`日志里一共 ${first.events().length} 条事件`)
console.log(`派生出来给模型看的只有 ${first.derive().length} 条消息`)
console.log('差在哪：turn/start、step/start、turn/end 这些结构事件模型看不到')
console.log('日志全貌：', first.events().map((event) => event.type).join(' → '))

// ---------- 第二轮：把活分给另一个 agent ----------
console.log()
console.log('--- 换个需求：这次让它分出去做 ---')
const second = sessions.create()
sessions.setCurrent(second)
const delegated = await ctx.get<Loop>('loop').run(second, '把 notes.txt 的要点整理一下')
console.log()
console.log('--- 模型最后的回答 ---')
console.log(delegated)

console.log()
console.log('--- 三个会话，各记各的 ---')
for (const item of sessions.list()) {
  const from = item.meta.parent ? `派自 ${item.meta.parent}` : '顶层'
  console.log(
    `${item.id}（${from}，第 ${item.meta.depth ?? 0} 层）` +
    `：日志 ${item.events().length} 条，派生历史 ${item.derive().length} 条`,
  )
}
console.log('子会话没带上父会话那一大段对话，所以它那份历史短得多。')

// ---------- 换一份装配单，同样的剧本再跑一次 ----------
console.log()
console.log('--- 盖上「信任」层，重装一套再跑一遍 ---')
const relaxed = compose([base, trusting])
const kernel2 = new Kernel()
const ctx2 = kernel2.root()
for (const plugin of relaxed.use) kernel2.use(plugin, relaxed.config[plugin.name])

const third = ctx2.get<Sessions>('sessions').create()
ctx2.get<Sessions>('sessions').setCurrent(third)
await ctx2.get<Loop>('loop').run(third, '看看 notes.txt 写了什么，然后把它删掉')
console.log()
console.log('零件一个没变，只有 approval 的 deny 从 ["delete_file"] 改成了 []。')
console.log('上面那轮 delete_file 被拦下，这一轮它真的删掉了。')

// ---------- 拆一个插件 ----------
console.log()
console.log('--- 拆掉 tool-count 插件 ---')
kernel.remove('tool-count')
console.log('拆完之后，它注册的清理函数已经跑过了（上面那行 count/bye）。')
