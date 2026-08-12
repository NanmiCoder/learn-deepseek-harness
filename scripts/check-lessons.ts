/**
 * 课程数据体检。
 * 类型检查管不到的东西在这里查：动画点亮的节点/连线是不是真的存在、
 * 答案下标有没有越界、布局有没有超出网格、标签有没有长到画不下。
 *
 * 跑法：npm run check
 */
import { lessons } from "../src/lessons";
import { buildDiagramFrame, buildFlowGroups, edgeKey } from "../src/tutorial/diagramFrames";

declare const process: { exit(code: number): never };

const problems: string[] = [];
const warnings: string[] = [];

function fail(where: string, message: string) {
  problems.push(`${where} ${message}`);
}

function warn(where: string, message: string) {
  warnings.push(`${where} ${message}`);
}

/**
 * 估算一段文字画出来有多宽，单位是「几个中文字」。
 * 和 StageDiagram 里的算法保持一致：中文按整宽，其余按 0.56 宽。
 * 用码点数量判断会误报——「根 Context」是 9 个码点，但只有 5 个字宽。
 */
function visualWidth(text: string) {
  let units = 0;
  for (const char of text) units += /[一-鿿　-〿＀-￯]/.test(char) ? 1 : 0.56;
  return units;
}

declare function require(name: string): {
  readFileSync(path: string, enc: string): string;
  existsSync(path: string): boolean;
  readdirSync(path: string): string[];
  statSync(path: string): { isDirectory(): boolean };
};
const fs = require("fs");

/**
 * 保密体检。
 *
 * 教程里的代码必须全部来自我们自己写的 demo/mini-harness/。
 * 这里用的是「正向规则」而不是「黑名单」——黑名单要把内测项目的内部符号名
 * 抄进这个文件，等于把它们留在了仓库里。正向规则只认自己人，更严也更干净。
 */
const OURS = "demo/mini-harness/";

/** 看起来像文件路径的东西 */
const PATH_LIKE = /\b[\w.-]+(?:\/[\w.-]+)+\.(?:ts|tsx|js|mjs|json|ya?ml|md|py|sh)\b/g;

/** 看起来像代码标识符的东西：ctx.xxx 或者 xxx() */
const IDENT_LIKE = /\bctx\.(\w+)|\b([a-z]\w{3,})\(\)/g;

/** demo 的全部源码，拼成一坨用来查「这个名字我们自己有没有」 */
const demoSource: string = (() => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap((name: string) => {
      const full = `${dir}/${name}`;
      return fs.statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") ? [full] : [];
    });
  return walk("demo").map((file: string) => fs.readFileSync(file, "utf8")).join("\n");
})();

/**
 * 核对代码片段。
 *
 * 课程里每段代码都标了来源，形如 demo/mini-harness/kernel.ts:59。
 * 这里真的去打开那个文件，确认那一行就是代码片段的第一行。
 * 对不上说明要么行号写错了，要么代码是手打的而不是从文件复制的。
 */
function checkCodeSource(at: string, source: string, content: string) {
  const match = source.match(/^(.+):(\d+)$/);
  if (!match) return;

  const [, path, lineText] = match;
  if (!fs.existsSync(path)) {
    fail(at, `代码来源 ${source} 指向的文件不存在`);
    return;
  }

  const fileLines = fs.readFileSync(path, "utf8").split("\n");
  const declared = Number(lineText);
  const firstLine = content.split("\n")[0].trim();
  if (!firstLine) return;

  const actual = (fileLines[declared - 1] ?? "").trim();
  if (actual === firstLine) return;

  // 行号不对，找找它到底在第几行，好直接告诉作者怎么改
  const found = fileLines.findIndex((line) => line.trim() === firstLine);
  if (found === -1) {
    fail(at, `代码片段的第一行在 ${path} 里根本找不到，说明不是从文件复制的：${firstLine.slice(0, 40)}`);
  } else {
    fail(at, `代码来源 ${source} 行号不对，这段代码实际在第 ${found + 1} 行`);
  }
}

/** 把一节课里所有的文字揪出来，连同它在哪 */
function collectText(value: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((item, i) => collectText(item, `${path}[${i}]`, out));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) collectText(item, `${path}.${key}`, out);
  }
}

const seenIds = new Set<string>();

for (const lesson of lessons) {
  const at = `[${lesson.index} ${lesson.title}]`;

  if (seenIds.has(lesson.id)) fail(at, `id 重复：${lesson.id}`);
  seenIds.add(lesson.id);

  // 保密体检：出现的路径和标识符，必须都是我们自己 demo 里有的
  const texts: { path: string; text: string }[] = [];
  collectText(lesson, "", texts);
  for (const { path, text } of texts) {
    for (const hit of text.match(PATH_LIKE) ?? []) {
      // demo 自己的文件，以及代码里那些相对 import（比如 plugins/tool-count.ts），都算自己人
      const ours =
        hit.startsWith("demo/") || fs.existsSync(OURS + hit) || fs.existsSync(OURS + "plugins/" + hit);
      if (!ours) fail(at, `${path} 出现了外部路径「${hit}」，教程里只能引用 ${OURS} 下的文件`);
    }
    IDENT_LIKE.lastIndex = 0;
    let m = IDENT_LIKE.exec(text);
    while (m) {
      const name = m[1] ?? m[2];
      if (name && !demoSource.includes(name)) {
        fail(at, `${path} 出现了标识符「${m[0]}」，但 demo 里没有这个东西，不许写进教程`);
      }
      m = IDENT_LIKE.exec(text);
    }
  }

  for (const step of lesson.steps) {
    if (step.code && !step.code.source.startsWith(OURS)) {
      fail(at, `代码来源「${step.code.source}」不在 ${OURS} 下。教程里的代码只能来自我们自己的 demo`);
    }
  }

  // 图
  const nodeIds = new Set(lesson.stage.nodes.map((node) => node.id));
  if (nodeIds.size !== lesson.stage.nodes.length) fail(at, "stage.nodes 里有重复 id");
  if (lesson.stage.nodes.length < 4 || lesson.stage.nodes.length > 9) {
    warn(at, `节点数 ${lesson.stage.nodes.length}，建议 5-9 个`);
  }

  for (const node of lesson.stage.nodes) {
    if (node.col < 0 || node.col > 3) fail(at, `节点 ${node.id} 的 col=${node.col} 超出 0-3`);
    if (node.row < 0 || node.row > 4) fail(at, `节点 ${node.id} 的 row=${node.row} 超出 0-4`);
    const labelWidth = visualWidth(node.label);
    if (labelWidth > 8.6) warn(at, `节点 ${node.id} 的 label 宽 ${labelWidth.toFixed(1)} 字，会被自动缩小字号`);
    if (node.sub && visualWidth(node.sub) > 13) {
      warn(at, `节点 ${node.id} 的 sub 宽 ${visualWidth(node.sub).toFixed(1)} 字，会被自动缩小字号`);
    }
  }

  const occupied = new Map<string, string>();
  for (const node of lesson.stage.nodes) {
    const cell = `${node.col},${node.row}`;
    const taken = occupied.get(cell);
    if (taken) fail(at, `节点 ${node.id} 和 ${taken} 都在格子 (${cell})，会重叠`);
    occupied.set(cell, node.id);
  }

  const edgeKeys = new Set<string>();
  for (const edge of lesson.stage.edges) {
    const key = `${edge.from}->${edge.to}`;
    if (edgeKeys.has(key)) fail(at, `连线重复：${key}`);
    edgeKeys.add(key);
    if (!nodeIds.has(edge.from)) fail(at, `连线 ${key} 的起点不存在`);
    if (!nodeIds.has(edge.to)) fail(at, `连线 ${key} 的终点不存在`);
    if (edge.label && visualWidth(edge.label) > 6) {
      warn(at, `连线 ${key} 的 label 宽 ${visualWidth(edge.label).toFixed(1)} 字，可能压住别的线`);
    }
  }

  // 步骤
  if (lesson.steps.length < 5 || lesson.steps.length > 7) {
    warn(at, `步骤数 ${lesson.steps.length}，建议 5-7 步`);
  }
  if (lesson.concepts.length > 4) {
    warn(at, `概念 ${lesson.concepts.length} 条，建议 3-4 条，多了读者记不住`);
  }

  const stepIds = new Set<string>();
  const touchedNodes = new Set<string>();
  const touchedEdges = new Set<string>();

  lesson.steps.forEach((step, index) => {
    const where = `${at} 步骤${index + 1}`;
    if (stepIds.has(step.id)) fail(where, `step id 重复：${step.id}`);
    stepIds.add(step.id);

    if (step.activeNodes.length === 0) warn(where, "没有点亮任何节点");

    for (const id of step.activeNodes) {
      if (!nodeIds.has(id)) fail(where, `activeNodes 里的 "${id}" 不在 stage.nodes 里`);
      touchedNodes.add(id);
    }
    for (const key of step.activeEdges) {
      if (!edgeKeys.has(key)) fail(where, `activeEdges 里的 "${key}" 不在 stage.edges 里，动画点不亮`);
      touchedEdges.add(key);
    }

    if (step.log.length === 0) warn(where, "运行记录是空的");
    if (visualWidth(step.title) > 13) warn(where, `标题宽 ${visualWidth(step.title).toFixed(1)} 字，偏长`);
    if ([...step.detail].length > 80) warn(where, `说明 ${[...step.detail].length} 字，超过 80 字就不够浅显了`);

    if (step.code) {
      const lines = step.code.content.replace(/\n+$/, "").split("\n");
      if (lines.length > 14) warn(where, `代码 ${lines.length} 行，超过 14 行`);
      if (step.code.partial) {
        // 逐步搭建的代码不是文件的原样拷贝，带行号反而误导读者
        if (/:\d+$/.test(step.code.source)) {
          fail(where, `标了 partial 就别写行号了：${step.code.source}`);
        }
        const file = step.code.source.split(" ")[0];
        if (!fs.existsSync(file)) fail(where, `code.source 指向的文件不存在：${file}`);
      } else if (!/:\d+$/.test(step.code.source)) {
        warn(where, `code.source 没带行号：${step.code.source}`);
      } else {
        checkCodeSource(where, step.code.source, step.code.content);
      }
      for (const line of step.code.highlight ?? []) {
        if (line < 1 || line > lines.length) {
          fail(where, `highlight 行号 ${line} 越界（代码只有 ${lines.length} 行）`);
        }
      }
    }
  });

  for (const id of nodeIds) {
    if (!touchedNodes.has(id)) warn(at, `节点 "${id}" 从头到尾都没被点亮过`);
  }
  for (const key of edgeKeys) {
    if (!touchedEdges.has(key)) warn(at, `连线 "${key}" 从头到尾都没被点亮过`);
  }

  // 渐进披露体检：未来关系不能偷跑，当前节拍只能讲一个动作。
  lesson.steps.forEach((step, stepIndex) => {
    const groups = buildFlowGroups(step, lesson.stage.edges);
    const previousEdges = new Set(lesson.steps.slice(0, stepIndex).flatMap((item) => item.activeEdges));

    groups.forEach((group, beatIndex) => {
      const where = `${at} 步骤${stepIndex + 1} 动作${beatIndex + 1}`;
      const frame = buildDiagramFrame(lesson, stepIndex, beatIndex);
      const expectedRevealed = new Set(previousEdges);
      groups.slice(0, beatIndex + 1).flat().forEach((edge) => expectedRevealed.add(edgeKey(edge)));
      const actualRevealed = new Set(frame.revealedEdges);

      if (frame.currentEdges.length !== group.length) {
        fail(where, `当前连线 ${frame.currentEdges.length} 条，与动作组 ${group.length} 条不一致`);
      }
      if (actualRevealed.size !== expectedRevealed.size || [...actualRevealed].some((key) => !expectedRevealed.has(key))) {
        fail(where, "出现了尚未发生的未来连线");
      }
      if (frame.currentEdges.some((key) => !actualRevealed.has(key))) {
        fail(where, "当前连线没有包含在已揭示连线中");
      }
      if (!frame.actionText.trim()) fail(where, "当前动作说明是空的");

      if (group.length > 1) {
        const labels = new Set(group.map((edge) => edge.label));
        const sameSource = group.every((edge) => edge.from === group[0].from);
        const sameTarget = group.every((edge) => edge.to === group[0].to);
        if (labels.size > 1 || (!sameSource && !sameTarget)) {
          fail(where, "一个动作节拍里混进了不同语义的连线");
        }
      }
    });
  });

  const overview = buildDiagramFrame(lesson, lesson.steps.length, 0);
  if (overview.currentEdges.length > 0 || overview.currentNodes.length > 0) {
    fail(at, "总览不应该保留当前高亮或运动点");
  }
  if (overview.edges.some((edge) => edge.label)) fail(at, "总览连线不应该常驻动作文字");
  if (overview.edges.length > 9) fail(at, `总览有 ${overview.edges.length} 条关系，超过清晰阅读上限 9 条`);

  // 完成检查
  if (lesson.quiz.length === 0) fail(at, "没有完成检查题");
  lesson.quiz.forEach((item, index) => {
    const where = `${at} 第${index + 1}题`;
    if (item.options.length < 2 || item.options.length > 4) fail(where, `选项 ${item.options.length} 个，应该是 2-4 个`);
    if (item.answer < 0 || item.answer >= item.options.length) {
      fail(where, `answer=${item.answer} 越界（只有 ${item.options.length} 个选项）`);
    }
    if (new Set(item.options).size !== item.options.length) fail(where, "有完全重复的选项");
    if (!item.explain.trim()) fail(where, "没写解析");
  });

  // 其他必填
  if ([...lesson.oneLiner].length > 40) warn(at, `oneLiner ${[...lesson.oneLiner].length} 字，超过 40 字`);
  if ([...lesson.analogy].length > 160) warn(at, `analogy ${[...lesson.analogy].length} 字，超过 150 字`);
  for (const concept of lesson.concepts) {
    if ([...concept.plain].length > 45) warn(at, `概念「${concept.term}」的解释 ${[...concept.plain].length} 字，超过 45 字`);
  }
  if (!lesson.oneLiner.trim()) fail(at, "oneLiner 是空的");
  if (!lesson.analogy.trim()) fail(at, "analogy 是空的");
  if (lesson.concepts.length === 0) fail(at, "concepts 是空的");
  if ([...lesson.summary].length > 14) warn(at, `summary ${[...lesson.summary].length} 字，侧边栏可能放不下`);
}

console.log(`体检了 ${lessons.length} 节课，共 ${lessons.reduce((sum, l) => sum + l.steps.length, 0)} 步。\n`);

if (warnings.length > 0) {
  console.log(`提醒 ${warnings.length} 条：`);
  for (const line of warnings) console.log(`  · ${line}`);
  console.log("");
}

if (problems.length > 0) {
  console.log(`错误 ${problems.length} 条：`);
  for (const line of problems) console.log(`  ✗ ${line}`);
  process.exit(1);
}

console.log("没有错误。");
