/**
 * 最小 DSH 插件的 client 面：跑在浏览器里的那一半。
 *
 * 文件名必须是 .tsx。TypeScript 只在 .tsx 里把 < 当成 JSX，
 * 写成 .ts 会报一长串 TS1005 '>' expected，和 jsx 配置无关。
 *
 * 它在浏览器里也是一个 cordis 插件：导出 apply，加载时被调用一次。
 * 但装载路径和 host 那一半完全不同——package.json 里 exports 的 "./client"
 * 那一项指向打包好的浏览器产物，浏览器扫到它才会加载。
 * @module dsh-plugin-example/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'

/** host 侧那条路由。浏览器按同一个路径取数据。 */
const NOTES_URL = '/plugins/dsh-plugin-example/notes'

interface Note {
  id: string
  text: string
  ts: number
}

/** 便签浮层。1 秒轮询一次 host 路由，把结果画出来。 */
function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    let alive = true
    const pull = async () => {
      // 页面在后台时不用拉，省一点。
      if (document.hidden) return
      try {
        const body: unknown = await (await fetch(NOTES_URL)).json()
        const list = (body as { notes?: unknown }).notes
        // 校验一下形状。200 但返回值不对时，界面不该跟着崩。
        if (alive && Array.isArray(list)) setNotes(list as Note[])
      } catch {
        // 拉取失败就保持上一次的内容，不闪。
      }
    }
    void pull()
    const timer = setInterval(() => { void pull() }, 1000)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  return (
    <div
      // data-* 属性是给自动化测试用的探针。CSS 类名打包后会带哈希，
      // 拿它当选择器不稳。
      data-plugin-example-panel=""
      style={{
        position: 'fixed', right: 16, top: 16, width: 220, padding: 12,
        borderRadius: 8, background: 'rgba(20,20,20,0.85)', color: '#eee',
        font: '12px/1.6 system-ui', zIndex: 9999,
      }}
    >
      <div style={{ opacity: 0.6 }}>便签 {notes.length}</div>
      {notes.map((note) => <div key={note.id}>{note.text}</div>)}
    </div>
  )
}

/**
 * 浏览器侧的插件入口。
 *
 * Web 界面没有右上角的挂载槽位，所以这里自己往 body 上塞一个容器，
 * 用固定定位摆位置。这是外部插件做浮层的常规做法。
 * @param ctx - 浏览器侧的上下文。和 host 侧不是同一个东西。
 */
export function apply(ctx: ClientContext): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  root.render(<NotesPanel />)

  // 自己创建的 DOM 和 React root，卸载时要自己收干净。
  ctx.effect(() => () => {
    root.unmount()
    host.remove()
  }, 'plugin-example: notes panel')
}
