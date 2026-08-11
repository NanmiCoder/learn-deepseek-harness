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
import { runTurn } from './loop.ts'
import { approval } from './plugins/approval.ts'
import { history } from './plugins/history.ts'
import { logger } from './plugins/logger.ts'
import { modelFake } from './plugins/model-fake.ts'
import { toolCount } from './plugins/tool-count.ts'
import { toolFiles } from './plugins/tool-files.ts'
import { tools } from './plugins/tools.ts'

const kernel = new Kernel()
const ctx = kernel.root()

// 装配单。顺序随便写——依赖没齐的插件会自己排队等。
// 这里故意把 tool-files 写在 tools 前面，你可以在运行记录里看到它等了一下。
kernel.use(logger)
kernel.use(toolFiles)
kernel.use(tools)
kernel.use(history)
kernel.use(modelFake)
kernel.use(approval)
kernel.use(toolCount)

console.log('--- 装好了，现在有这些插件在跑 ---')
console.log('还在排队等依赖的：', kernel.pending().length === 0 ? '没有' : kernel.pending())
console.log()

console.log('--- 用户说了一句话 ---')
const answer = await runTurn(ctx, '看看 notes.txt 写了什么，然后把它删掉')
console.log()
console.log('--- 模型最后的回答 ---')
console.log(answer)

console.log()
console.log('--- 拆掉 tool-count 插件 ---')
kernel.remove('tool-count')
console.log('拆完之后，它注册的清理函数已经跑过了（上面那行 count/bye）。')
