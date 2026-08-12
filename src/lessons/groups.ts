import type { LessonGroup } from "../tutorial/types";

export type { LessonGroup };

/**
 * 目录里的六个阶段，顺序即侧边栏的显示顺序。
 *
 * 单独放一个文件，是为了让排课和渲染互不干扰：加课改的是 index.ts，
 * 调分组名改的是这里，两边不会在同一处打架。
 *
 * id 要和 Lesson.group 对上。课程数据里写了没在这儿登记的 group，
 * 会被当成没分组处理（目录退回平铺），不会报错也不会丢课。
 */
export const groups: LessonGroup[] = [
  { id: "know", title: "认识", goal: "先搞清楚 Harness 是什么、不是什么" },
  { id: "take-apart", title: "拆开", goal: "一次对话流过哪几块，每块归谁管" },
  { id: "hands-on-stage", title: "动手", goal: "自己写一个插件，并且知道不生效时去哪查" },
  { id: "advanced", title: "进阶", goal: "上下文、出错重试、危险动作的确认" },
  { id: "put-together", title: "合起来", goal: "把前面各块接成一条能跑的链路" },
  { id: "real-world", title: "实战", goal: "写一个能真的装进 DSH 的插件" },
];
