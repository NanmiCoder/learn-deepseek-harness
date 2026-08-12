/**
 * 内核：一个最小的插件容器。
 *
 * 它只管三件事：
 *   1. 谁提供了什么能力（服务）
 *   2. 谁在等什么能力（依赖）
 *   3. 拆掉一个插件时，怎么把它留下的东西收干净（作用域）
 *
 * 就这三件事，没有别的。真实框架做得更多，但骨架就是这个样子。
 * 有多大自己数：wc -l demo/mini-harness/kernel.ts。写死的行数迟早会过期。
 */

/** 清理函数。插件被拆掉时会挨个调用。 */
export type Cleanup = () => void

/** 事件监听器：只是被通知一声，改不了什么 */
export type Listener = (payload: unknown) => void

/**
 * 环绕式监听器。
 *
 * 和普通监听器的区别只有一个：它多拿到一个 next。
 * 调 next(值) 就把值交给下一个人；不调 next 直接返回，后面的人就都不跑了。
 * 「拦下一次工具调用」就是这么实现的。
 */
export type Wrapper = (value: unknown, next: (value: unknown) => unknown) => unknown

/**
 * 插件就是这么一个对象。
 * 没有基类，没有装饰器，没有魔法。
 */
export interface Plugin {
  /** 名字，出错时好定位 */
  name: string
  /** 我要用到哪些服务。它们都到齐了，setup 才会被调用。 */
  needs?: string[]
  /**
   * 装载时执行一次。
   * ctx 是这个插件专属的把手；config 是装配单发给它的配置。
   */
  setup(ctx: Context, config: Record<string, unknown>): void
}

/** 一个插件在内核里占的那块地。拆插件时按这块地回收。 */
interface Scope {
  plugin: Plugin
  /** 装配单发给这个插件的配置 */
  config: Record<string, unknown>
  /** 这个插件挂上去的服务名 */
  provided: string[]
  /** 这个插件登记过的清理函数 */
  cleanups: Cleanup[]
  active: boolean
}

export class Kernel {
  /** 服务名 -> 实现 */
  private services = new Map<string, unknown>()
  /** 事件名 -> 监听器集合 */
  private listeners = new Map<string, Set<Listener>>()
  /** 事件名 -> 环绕式监听器集合。和上面那张表分开存，因为签名不一样。 */
  private wrappers = new Map<string, Set<Wrapper>>()
  /** 已经装上的插件 */
  private scopes: Scope[] = []
  /** 依赖还没齐、正在排队等的插件 */
  private waiting: Scope[] = []
  /** 正在装插件的过程中。防止插件在 setup 里又装插件时递归进来。 */
  private busy = false

  /**
   * 装一个插件。
   * 不管依赖齐没齐，先进队列，再让内核统一去扫。
   * 所以装配单的顺序无所谓——写在前面的可以等后面的。
   */
  use(plugin: Plugin, config: Record<string, unknown> = {}): void {
    this.waiting.push({ plugin, config, provided: [], cleanups: [], active: false })
    if (!this.ready(plugin)) {
      this.announce('plugin/wait', {
        name: plugin.name,
        missing: (plugin.needs ?? []).filter((name) => !this.services.has(name)),
      })
    }
    this.drain()
  }

  /** 拆一个插件。它挂的服务、登记的清理函数，全部回收。 */
  remove(name: string): void {
    const index = this.scopes.findIndex((scope) => scope.plugin.name === name)
    if (index === -1) return
    const scope = this.scopes[index]

    // 倒着执行清理函数：后登记的先收，和装的时候反过来
    for (let i = scope.cleanups.length - 1; i >= 0; i--) scope.cleanups[i]()
    for (const serviceName of scope.provided) this.services.delete(serviceName)

    scope.active = false
    this.scopes.splice(index, 1)
    this.announce('plugin/remove', { name })
  }

  /** 某个插件的依赖是不是齐了 */
  private ready(plugin: Plugin): boolean {
    return (plugin.needs ?? []).every((name) => this.services.has(name))
  }

  /**
   * 反复扫队列：谁的依赖齐了就装谁。
   * 装完一个可能又满足了别人，所以要一直扫到扫不出新的为止。
   */
  private drain(): void {
    if (this.busy) return
    this.busy = true

    try {
      let progress = true
      while (progress) {
        progress = false
        for (const scope of [...this.waiting]) {
          if (!this.ready(scope.plugin)) continue
          // 先从队列里摘掉，再装。不然装的过程中又会扫到它自己。
          this.waiting = this.waiting.filter((item) => item !== scope)
          this.start(scope)
          progress = true
        }
      }
    } finally {
      this.busy = false
    }
  }

  /** 真正把插件跑起来 */
  private start(scope: Scope): void {
    scope.active = true
    this.scopes.push(scope)
    this.announce('plugin/start', { name: scope.plugin.name })
    scope.plugin.setup(new Context(this, scope), scope.config)
  }

  /** 内核自己发的事件，走的是同一套监听器 */
  private announce(event: string, payload: unknown): void {
    for (const fn of this.listeners.get(event) ?? []) fn(payload)
  }

  /** 还在排队的插件，以及它们各自缺什么。调试时用。 */
  pending(): { name: string; missing: string[] }[] {
    return this.waiting.map((scope) => ({
      name: scope.plugin.name,
      missing: (scope.plugin.needs ?? []).filter((name) => !this.services.has(name)),
    }))
  }

  /** 内核自己也需要一个 ctx，用来装第一批插件、发第一个事件 */
  root(): Context {
    const scope: Scope = {
      plugin: { name: 'root', setup: () => {} },
      config: {},
      provided: [],
      cleanups: [],
      active: true,
    }
    return new Context(this, scope)
  }

  // 下面几个给 Context 用
  /** @internal */ setService(name: string, value: unknown) { this.services.set(name, value) }
  /** @internal */ getService(name: string) { return this.services.get(name) }
  /** @internal */ hasService(name: string) { return this.services.has(name) }
  /** @internal */ listenersOf(event: string) { return this.listeners.get(event) }
  /** @internal */ addListener(event: string, fn: Listener) {
    let set = this.listeners.get(event)
    if (!set) this.listeners.set(event, (set = new Set()))
    set.add(fn)
  }
  /** @internal */ wrappersOf(event: string) { return this.wrappers.get(event) }
  /** @internal */ addWrapper(event: string, fn: Wrapper) {
    let set = this.wrappers.get(event)
    if (!set) this.wrappers.set(event, (set = new Set()))
    set.add(fn)
  }
}

/**
 * 上下文：插件拿到的那个把手。
 *
 * 每个插件拿到的 ctx 都不一样——它记着自己是谁。
 * 所以你在 ctx 上挂的服务、登记的监听，内核都知道算在你头上，
 * 拆你的时候才能精确回收。
 */
export class Context {
  private kernel: Kernel
  /** 这个 ctx 属于哪个插件。回收就是按它来的。 */
  private scope: { provided: string[]; cleanups: Cleanup[] }

  constructor(kernel: Kernel, scope: { provided: string[]; cleanups: Cleanup[] }) {
    this.kernel = kernel
    this.scope = scope
  }

  /** 把一个能力挂上去，别人按名字取用 */
  provide(name: string, value: unknown): void {
    this.kernel.setService(name, value)
    this.scope.provided.push(name)
  }

  /** 按名字取一个能力。取不到就报错，因为多半是忘了写 needs。 */
  get<T>(name: string): T {
    if (!this.kernel.hasService(name)) {
      throw new Error(`没有找到服务 "${name}"。是不是忘了在 needs 里声明？`)
    }
    return this.kernel.getService(name) as T
  }

  /** 监听事件。拆插件时会自动取消。 */
  on(event: string, fn: Listener): void {
    this.kernel.addListener(event, fn)
    this.scope.cleanups.push(() => this.kernel.listenersOf(event)?.delete(fn))
  }

  /** 发一个事件，通知所有监听的人 */
  emit(event: string, payload?: unknown): void {
    for (const fn of this.kernel.listenersOf(event) ?? []) fn(payload)
  }

  /**
   * 登记一个清理函数。
   * 定时器、连接、临时文件这类不经过 ctx 的东西，都要用它交出来，
   * 否则插件拆了它还在跑。
   */
  effect(cleanup: Cleanup): void {
    this.scope.cleanups.push(cleanup)
  }

  /** 在这个上下文里再装一个插件 */
  plugin(plugin: Plugin): void {
    this.kernel.use(plugin)
  }

  /**
   * 登记一个环绕式监听器。拆插件时会自动取消，和 on() 一样。
   *
   * 用它而不用 on()，是因为你想左右这件事的结果，不只是知道它发生了。
   */
  intercept(event: string, fn: Wrapper): void {
    this.kernel.addWrapper(event, fn)
    this.scope.cleanups.push(() => this.kernel.wrappersOf(event)?.delete(fn))
  }

  /**
   * 发一个环绕式事件，拿回最终结果。
   *
   * 监听器排成一队，每个人拿到 (值, next)：
   *   - 调 next(值)  → 交给下一个人，最后一个交给 base（真正干活的那段）
   *   - 不调 next    → 短路，后面的人和 base 都不跑，你的返回值就是最终结果
   *   - 也可以先 next 拿到下游结果，再包一层返回
   *
   * emit 做不到这三件事里的任何一件，这就是两者的区别。
   */
  waterfall<T>(event: string, value: T, base: (value: T) => T): T {
    const chain = [...(this.kernel.wrappersOf(event) ?? [])]
    const step = (index: number, current: T): T => {
      const fn = chain[index]
      if (!fn) return base(current)
      return fn(current, (passed) => step(index + 1, passed as T)) as T
    }
    return step(0, value)
  }
}
