/**
 * demo 跑在 Node 上，但为了保持零依赖，这里没装 @types/node。
 * 它只用到 console.log 一个外部 API，就手写一行声明。
 */
declare const console: {
  log(...args: unknown[]): void
}
