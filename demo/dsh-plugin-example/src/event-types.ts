/**
 * 会话事件的类型声明。
 *
 * 这个文件一行 import 都不能有。
 *
 * 原因：它同时属于两个 tsc program。host 那一半要用它写事件，
 * 浏览器那一半（如果要读事件）也要用它。一旦这里 import 了 host 侧的包，
 * 浏览器那个 program 就会被 host 的类型声明污染，报出一堆看不懂的错。
 *
 * 那 declare module 怎么才能生效？TypeScript 只会把「已经加载进 program 的
 * 模块」拿来合并。所以真正加载 '@deepseek-ai/dsh-session/types' 这件事，
 * 交给用到它的文件去做——本例是 src/index.ts 顶部那行 type-only import。
 * @module dsh-plugin-example/event-types
 */

/** 一条便签被记下时写进会话日志的内容。 */
export interface ExampleNoteAddedData {
  /** 便签 id，用来在重放时对齐同一条记录。 */
  readonly id: string
  /** 便签正文。 */
  readonly text: string
  /** 记录时间，毫秒时间戳。 */
  readonly ts: number
}

/**
 * 把自己的事件并进 DSH 的会话事件表。
 *
 * 这张表是 merge-extensible 的：谁都可以往里加一行，加完 session.append
 * 就认识这个事件名了。浏览器侧的对话流节点也是按这张表重放事件的。
 */
declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * 记下了一条便签。
     * @param data - 便签的 id、正文和时间。
     */
    'plugin-example/note-added': ExampleNoteAddedData
  }
}
