/**
 * 会话：一条只能往后加的事件流。
 *
 * 这是整个 demo 里最值得多看两眼的一块。
 *
 * 直觉的做法是准备一个数组存对话消息，每来一条 push 一下。
 * 这里没有那么做。这里存的是「发生过的事」——包括开始一轮、开始一步
 * 这种模型根本看不见的事。模型看得见的那份历史，是每次现从日志里
 * 挑出来算的（derive）。
 *
 * 为什么值得这么麻烦：日志里有的东西比消息多。谁先谁后、哪一步属于哪一轮、
 * 中间被拦下过什么，全在里面。所以同一份日志既能喂给模型，也能拿去回放、
 * 存盘、分叉出一个新会话——它们都是同一份事实的不同看法。
 */
import type { Plugin } from '../kernel.ts'
import type { Message, Session, SessionEvent, SessionMeta, Sessions, ToolCall } from '../types.ts'

/**
 * 只有这三种事件会变成模型看得见的消息。
 * 其余的（turn-start / step-start / turn-end）只是结构，派生时直接跳过。
 */
const MESSAGE_TYPES = new Set(['user', 'assistant', 'tool'])

export const session: Plugin = {
  name: 'session',

  setup(ctx) {
    const all: Session[] = []
    let current: Session | undefined
    let nextId = 1

    function create(meta: SessionMeta = {}): Session {
      const id = `s${nextId++}`
      const log: SessionEvent[] = []

      const self: Session = {
        id,
        meta,

        append(type, data = {}) {
          const event: SessionEvent = { seq: log.length, type, data }
          log.push(event)
          ctx.emit('session/append', { session: id, seq: event.seq, type })
          return event
        },

        events: () => [...log],

        derive() {
          const messages: Message[] = []
          for (const event of log) {
            // 结构事件在这里被丢掉。模型永远看不到它们。
            if (!MESSAGE_TYPES.has(event.type)) continue
            messages.push(toMessage(event))
          }
          return messages
        },
      }

      all.push(self)
      ctx.emit('session/create', { session: id, parent: meta.parent ?? '无', depth: meta.depth ?? 0 })
      return self
    }

    const service: Sessions = {
      create,
      list: () => [...all],
      current: () => current,
      setCurrent(next) { current = next },
    }

    ctx.provide('sessions', service)
  },
}

/** 把一条日志事件翻译成一条模型消息 */
function toMessage(event: SessionEvent): Message {
  const message: Message = {
    role: event.type as Message['role'],
    text: String(event.data.text ?? ''),
  }
  if (event.data.toolCall) message.toolCall = event.data.toolCall as ToolCall
  return message
}
