/**
 * 假模型。
 *
 * 真模型要联网、要 API key、每次回答还不一样，教程里不好用。
 * 这个假模型按一份剧本回答，所以你每次跑出来的结果都一模一样。
 *
 * 它和真模型对外长得一样：收一包输入，吐一条消息。
 * 换成真模型，只要换掉这一个文件，循环一行都不用动。
 */
import type { Plugin } from '../kernel.ts'
import type { Message, Model, Request } from '../types.ts'

/** 剧本：第几次被问，就返回哪一条 */
const SCRIPT: Message[] = [
  {
    role: 'assistant',
    text: '我先看看这个文件。',
    toolCall: { name: 'read_file', args: { path: 'notes.txt' } },
  },
  {
    role: 'assistant',
    text: '顺便数一下这里有几个文件。',
    toolCall: { name: 'count_files', args: {} },
  },
  {
    role: 'assistant',
    text: '再把它删掉。',
    toolCall: { name: 'delete_file', args: { path: 'notes.txt' } },
  },
  {
    role: 'assistant',
    text: 'notes.txt 里写的是「记得写测试」，工作区一共 2 个文件。你不让删，我就没删。',
  },
]

export const modelFake: Plugin = {
  name: 'model-fake',

  setup(ctx) {
    let asked = 0

    const model: Model = {
      async ask(request: Request) {
        // 打印出来，好让你看清每次到底喂了什么给模型
        ctx.emit('model/request', {
          round: asked + 1,
          toolCount: request.tools.length,
          messageCount: request.messages.length,
        })

        const reply = SCRIPT[asked] ?? { role: 'assistant' as const, text: '没话说了。' }
        asked++
        return reply
      },
    }

    ctx.provide('model', model)
  },
}
