/**
 * 把 client 那一半打成浏览器能加载的一个文件。
 *
 * 浏览器加载的不是源码，是 /plugins/<包名>/client.js。它的格式是固定的：
 * 一个自执行的注册调用，把工厂函数交给页面上的模块加载器。
 * 下面 outputOptions 里的 banner / footer / intro 拼出来的就是这个壳。
 *
 * 这个配置是从 DSH 的 client 打包协议裁剪出来的最小版。真实模板还带
 * CSS Modules 内联（用 lightningcss 编译再注入 style 标签）。本例的面板
 * 用的是内联样式，所以那部分整块砍掉了。
 */

import type { UserConfig } from 'tsdown'

/** 包名。三个地方必须一致：这里、package.json 的 name、cordis.patch.yml 的 name。 */
const PLUGIN_ID = 'dsh-plugin-example'

/**
 * 页面上已经有的模块，不许打进来。
 *
 * 这些由浏览器的模块加载器统一提供。重复打包会得到第二份 React、
 * 第二份运行时实例，行为会很怪。
 */
const CLIENT_EXTERNALS: readonly string[] = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
]

const config: UserConfig = {
  name: `${PLUGIN_ID}/client`,
  // 入口是 tsc client program 的产物，不是源码。
  // 所以构建顺序是：tsc host → tsc client → tsdown。
  entry: { client: 'lib/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  // host 那一半的产物也在 lib/ 下，清目录会把它删掉。
  clean: false,
  external: [...CLIENT_EXTERNALS],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  // 除了 external 名单，其余依赖一律内联进 bundle。
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  plugins: [{
    // 纯净度闸门：不在名单里的 @deepseek-ai 包一律构建报错。
    // 跨插件直接 import 值，要么内联出重复实例，要么问模块加载器要一个
    // 它答不出来的名字。插件之间要协作，走服务，不走 import。
    name: 'client-bundle-purity',
    resolveId(source: string) {
      if (!source.startsWith('@deepseek-ai/')) return null
      if (CLIENT_EXTERNALS.includes(source)) return null
      throw new Error(`client bundle purity: 不允许从浏览器侧 import "${source}" 的值`)
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default config
