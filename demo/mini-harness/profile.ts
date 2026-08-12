/**
 * 装配单是「叠」出来的，不是写死的一份。
 *
 * 底座给一份默认的，界面层往上加几个插件，用户自己再盖一层只改自己在意的
 * 那一项。后面的层盖前面的层，最后叠出来的那份才是这次真正要装的东西。
 *
 * 为什么不直接写死一份：同一套零件，叠法不同就装出不同的产品。
 * 换一层就换一个形态，底座那层一个字都不用改。
 */
import type { Plugin } from './kernel.ts'

/** 一层。两样东西：这层要加装哪些插件，这层要改哪些插件的配置。 */
export interface Layer {
  name: string
  use?: Plugin[]
  /** 插件名 -> 给它的配置。只写你要改的那几项。 */
  config?: Record<string, Record<string, unknown>>
}

/** 叠好之后的最终装配单 */
export interface Assembly {
  use: Plugin[]
  config: Record<string, Record<string, unknown>>
}

/** 把几层按顺序叠起来。后面的盖前面的。 */
export function compose(layers: Layer[]): Assembly {
  const use: Plugin[] = []
  const config: Record<string, Record<string, unknown>> = {}

  for (const layer of layers) {
    for (const plugin of layer.use ?? []) {
      if (!use.includes(plugin)) use.push(plugin)
    }
    for (const [name, values] of Object.entries(layer.config ?? {})) {
      // 只盖写到的那几项，没写到的保留前一层的
      config[name] = { ...config[name], ...values }
    }
  }

  return { use, config }
}
