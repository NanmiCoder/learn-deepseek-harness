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
  // 下面两条属于第二轮对话：这次它把活分出去做
  {
    role: 'assistant',
    text: '这件事我分给另一个 agent 去做。',
    toolCall: { name: 'delegate', args: { task: '把 notes.txt 的要点整理成一句话' } },
  },
  {
    role: 'assistant',
    text: '顺手看看另一个文件多大。',
    toolCall: { name: 'stat_file', args: { path: 'missing.txt' } },
  },
  {
    role: 'assistant',
    text: '分出去的那位说要点是「记得写测试」。missing.txt 打不开，我就不看它了。',
  },
]

export const modelFake: Plugin = {
  name: 'model-fake',

  setup(ctx) {
    /** 一共被问了几次。子 agent 那次也算。 */
    let calls = 0
    /** 主线剧本走到第几条了。子 agent 不走主线剧本，所以它不动这个数。 */
    let asked = 0

    const model: Model = {
      async ask(request: Request) {
        calls++
        // 打印出来，好让你看清每次到底喂了什么给模型
        ctx.emit('model/request', {
          round: calls,
          toolCount: request.tools.length,
          messageCount: request.messages.length,
        })

        // 子 agent 手里一个工具都没有，用这个认出它，另给一份答复。
        // 注意它派生出来的历史只有 1 条——父会话那一大段跟它无关。
        if (request.tools.length === 0) {
          const task = request.messages[request.messages.length - 1]?.text ?? ''
          return { role: 'assistant' as const, text: `（子 agent）${task}：记得写测试。` }
        }

        const reply = SCRIPT[asked] ?? { role: 'assistant' as const, text: '没话说了。' }
        asked++
        return reply
      },
    }

    ctx.provide('model', model)
  },
}
