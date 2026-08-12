/**
 * 便签簿：这个插件全部的状态。
 *
 * 为了把例子压到最小，这里用的是进程内数组，重启就没了。
 * 真实插件的状态一般落在工作区的文件里（读-改-写还要串行化，
 * 避免两个工具调用同时改同一份数据），那部分和 DSH 无关，
 * 是普通 Node 代码，所以这里不展开。
 * @module dsh-plugin-example/notes
 */

/** 一条便签。 */
export interface Note {
  readonly id: string
  readonly text: string
  readonly ts: number
}

/** 全部便签，新的在后面。 */
const notes: Note[] = []

/**
 * 记一条便签。超过上限时丢掉最旧的那条。
 * @param text - 便签正文。
 * @param limit - 最多留几条。
 * @returns 刚记下的这条。
 */
export function addNote(text: string, limit: number): Note {
  const note: Note = { id: `n${Date.now().toString(36)}`, text, ts: Date.now() }
  notes.push(note)
  while (notes.length > limit) notes.shift()
  return note
}

/** 当前全部便签的快照。HTTP 路由把它原样发给浏览器。 */
export function listNotes(): readonly Note[] {
  return notes
}
