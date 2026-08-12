#!/usr/bin/env node
/**
 * 把 DSH 的包链接进本目录的 node_modules。
 *
 * 为什么需要它：DSH 的 @deepseek-ai/* 包目前不在 npm 上，pnpm install
 * 装不到。开发期只能指向本地的 DSH 源码检出。
 *
 * 这个脚本不写死源码仓库的目录结构——它扫一遍检出，按 package.json 里的
 * name 建一张名字到目录的表，再按需要链接。所以对方仓库改了目录布局也不影响。
 *
 * 用法：
 *   node scripts/link-dsh.mjs /path/to/dsh-checkout
 *   DSH_ROOT=/path/to/dsh-checkout node scripts/link-dsh.mjs
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')

const root = process.argv[2] ?? process.env.DSH_ROOT
if (!root) {
  console.error('用法：node scripts/link-dsh.mjs <DSH 源码检出目录>')
  process.exit(1)
}

/** 我们需要哪些包：从 package.json 的依赖里读，不用手抄一遍。 */
const manifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
const wanted = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
].filter((name) => name.startsWith('@deepseek-ai/'))

/** 扫检出，建「包名 -> 目录」表。深度有限，跳过不可能放包的目录。 */
const SKIP = new Set(['node_modules', '.git', 'lib', 'dist', 'coverage'])
const found = new Map()
function scan(dir, depth) {
  if (depth > 4) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name === 'package.json') {
      try {
        const { name } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
        if (typeof name === 'string' && !found.has(name)) found.set(name, dir)
      } catch {
        // 不是合法 package.json，跳过
      }
    }
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !SKIP.has(entry.name) && !entry.name.startsWith('.')) {
      scan(join(dir, entry.name), depth + 1)
    }
  }
}
scan(resolve(root), 0)

const target = join(projectRoot, 'node_modules', '@deepseek-ai')
mkdirSync(target, { recursive: true })

const missing = []
for (const name of wanted) {
  const source = found.get(name)
  const short = name.slice('@deepseek-ai/'.length)
  if (!source) {
    missing.push(name)
    continue
  }
  const link = join(target, short)
  try {
    rmSync(link, { recursive: true, force: true })
  } catch {
    // 没有就算了
  }
  symlinkSync(source, link, 'dir')
  // 链接的是源码包目录，它的 lib/types 必须是构建过的，否则类型会缺。
  const types = join(source, 'lib', 'types')
  let built = true
  try {
    built = statSync(types).isDirectory()
  } catch {
    built = false
  }
  console.log(`  ${built ? 'OK  ' : '未构建'} ${name} -> ${source}`)
}

if (missing.length > 0) {
  console.error(`\n在 ${root} 里没找到这些包：\n  ${missing.join('\n  ')}`)
  console.error('检出的路径对不对？或者这些包在这个版本里改名了。')
  process.exit(1)
}
console.log('\n链接完成。接下来跑 npm run typecheck。')
