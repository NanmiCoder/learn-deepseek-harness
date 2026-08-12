import type { Lesson } from "../tutorial/types";
import { harnessBasics } from "./01-harness-basics";
import { dshOverview } from "./02-dsh-overview";
import { everythingIsPlugin } from "./03-everything-is-plugin";
import { outsideWorld } from "./04-outside-world";
import { writeAPlugin } from "./05-write-a-plugin";
import { vsClaudeCode } from "./06-vs-claude-code";
import { cordis } from "./07-cordis";
import { todoAgentFlow } from "./08-todo-agent-flow";

/** 课程按顺序排列，左侧目录和上一课/下一课都用这个顺序。 */
export const lessons: Lesson[] = [
  harnessBasics,
  dshOverview,
  everythingIsPlugin,
  outsideWorld,
  writeAPlugin,
  vsClaudeCode,
  cordis,
  todoAgentFlow,
];
