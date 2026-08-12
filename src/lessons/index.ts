import type { Lesson } from "../tutorial/types";
import { harnessBasics } from "./01-harness-basics";
import { dshOverview } from "./02-dsh-overview";
import { runIt } from "./03-run-it";
import { oneTurn } from "./04-one-turn";
import { pluginsEverywhere } from "./05-everything-is-plugin";
import { kernelThreeJobs } from "./06-kernel";
import { writeAPlugin } from "./07-write-a-plugin";
import { debugAPlugin } from "./08-debug-a-plugin";
import { toolDescription } from "./09-tool-description";
import { context } from "./10-context";
import { failure } from "./11-failure";
import { approvalBoundary } from "./12-approval";
import { sessionLog } from "./13-session-log";
import { multiAgent } from "./14-multi-agent";
import { realSkeleton } from "./15-real-skeleton";
import { boot } from "./16-boot";
import { swappable } from "./17-swappable";
import { realPlugin } from "./18-real-plugin";
import { hostSeams } from "./19-host-seams";
import { twoEntries } from "./20-two-entries";

/**
 * 课程按顺序排列，左侧目录和上一课/下一课都用这个顺序。
 *
 * 一节课只有挂进这个数组才会被 npm run check 检查——保密硬拦、代码行号核对、
 * 图的连通性全都是遍历这个数组做的。写完不挂进来，跑出来的「0 错误」
 * 意思是「没看过」，不是「通过了」。所以新课一落盘就挂上，别等排序定了再挂。
 */
export const lessons: Lesson[] = [
  harnessBasics,
  dshOverview,
  runIt,
  oneTurn,
  pluginsEverywhere,
  kernelThreeJobs,
  writeAPlugin,
  debugAPlugin,
  toolDescription,
  context,
  failure,
  approvalBoundary,
  sessionLog,
  multiAgent,
  realSkeleton,
  boot,
  swappable,
  realPlugin,
  hostSeams,
  twoEntries,
];
