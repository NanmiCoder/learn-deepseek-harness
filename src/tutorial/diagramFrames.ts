import type { Lesson, LessonStep, StageEdge, StageNode } from "./types";

export type DiagramMode = "step" | "overview";

export interface DiagramFrame {
  mode: DiagramMode;
  nodes: StageNode[];
  edges: StageEdge[];
  columnLabels?: string[];
  revealedNodes: string[];
  currentNodes: string[];
  enteringNodes: string[];
  revealedEdges: string[];
  currentEdges: string[];
  actionText: string;
}

export function edgeKey(edge: StageEdge) {
  return `${edge.from}->${edge.to}`;
}

/**
 * 一步里可以有多条边，但不同动词不能一起抢注意力。
 * 同标签且同起点/终点的并行边视为一个教学节拍。
 */
export function buildFlowGroups(step: LessonStep, edges: StageEdge[]): StageEdge[][] {
  const byKey = new Map(edges.map((edge) => [edgeKey(edge), edge]));
  const groups: StageEdge[][] = [];

  for (const key of step.activeEdges) {
    const edge = byKey.get(key);
    if (!edge) continue;
    const last = groups.at(-1);
    const sameAction = last?.every((item) => item.label === edge.label);
    const sameSource = last?.every((item) => item.from === edge.from);
    const sameTarget = last?.every((item) => item.to === edge.to);

    if (last && sameAction && (sameSource || sameTarget)) last.push(edge);
    else groups.push([edge]);
  }

  return groups;
}

function actionText(group: StageEdge[], nodes: StageNode[], fallback: string) {
  if (group.length === 0) return fallback;
  const byId = new Map(nodes.map((node) => [node.id, node.label]));
  const label = group[0].label ?? "流向";
  const sameSource = group.every((edge) => edge.from === group[0].from);
  const sameTarget = group.every((edge) => edge.to === group[0].to);

  if (sameSource) {
    const targets = group.map((edge) => byId.get(edge.to) ?? edge.to).join("、");
    return `${byId.get(group[0].from) ?? group[0].from} —${label}→ ${targets}`;
  }
  if (sameTarget) {
    const sources = group.map((edge) => byId.get(edge.from) ?? edge.from).join("、");
    return `${sources} —${label}→ ${byId.get(group[0].to) ?? group[0].to}`;
  }
  if (group.length === 2 && group[0].to === group[1].from) {
    return `${byId.get(group[0].from) ?? group[0].from} → ${byId.get(group[0].to) ?? group[0].to} → ${byId.get(group[1].to) ?? group[1].to}`;
  }
  return fallback;
}

/** 总览只表达组件关系：双向调用折成一条，边文字交给步骤视图。 */
function compactOverviewEdges(edges: StageEdge[]) {
  const seen = new Set<string>();
  return edges.flatMap((edge) => {
    const pair = [edge.from, edge.to].sort().join("::");
    if (seen.has(pair)) return [];
    seen.add(pair);
    return [{ ...edge, label: undefined, curve: "straight" as const }];
  });
}

export function buildDiagramFrame(
  lesson: Lesson,
  frameIndex: number,
  beatIndex: number,
): DiagramFrame {
  const overview = frameIndex >= lesson.steps.length;

  if (overview) {
    const custom = lesson.stage.overview;
    const nodes = custom?.nodes ?? lesson.stage.nodes;
    const edges = custom?.edges ?? compactOverviewEdges(lesson.stage.edges);
    return {
      mode: "overview",
      nodes,
      edges,
      columnLabels: custom?.columnLabels ?? lesson.stage.columnLabels,
      revealedNodes: nodes.map((node) => node.id),
      currentNodes: [],
      enteringNodes: [],
      revealedEdges: edges.map(edgeKey),
      currentEdges: [],
      actionText: custom?.summary ?? "全部关系已收束为一张稳定结构图",
    };
  }

  const step = lesson.steps[frameIndex];
  const groups = buildFlowGroups(step, lesson.stage.edges);
  const safeBeat = Math.min(beatIndex, Math.max(0, groups.length - 1));
  const currentGroup = groups[safeBeat] ?? [];
  const previousSteps = lesson.steps.slice(0, frameIndex);
  const previousEdgeKeys = new Set(previousSteps.flatMap((item) => item.activeEdges));
  const revealedEdgeKeys = new Set(previousEdgeKeys);
  groups.slice(0, safeBeat + 1).flat().forEach((edge) => revealedEdgeKeys.add(edgeKey(edge)));

  const edgeByKey = new Map(lesson.stage.edges.map((edge) => [edgeKey(edge), edge]));
  const previousNodes = new Set(previousSteps.flatMap((item) => item.activeNodes));
  for (const key of previousEdgeKeys) {
    const edge = edgeByKey.get(key);
    if (edge) {
      previousNodes.add(edge.from);
      previousNodes.add(edge.to);
    }
  }

  const everyCurrentEndpoint = new Set(groups.flat().flatMap((edge) => [edge.from, edge.to]));
  const standaloneNodes = step.activeNodes.filter((id) => !everyCurrentEndpoint.has(id));
  const revealedNodes = new Set(previousNodes);
  standaloneNodes.forEach((id) => revealedNodes.add(id));
  groups.slice(0, safeBeat + 1).flat().forEach((edge) => {
    revealedNodes.add(edge.from);
    revealedNodes.add(edge.to);
  });

  const currentNodes = new Set(currentGroup.flatMap((edge) => [edge.from, edge.to]));
  if (currentGroup.length === 0) standaloneNodes.forEach((id) => currentNodes.add(id));

  return {
    mode: "step",
    nodes: lesson.stage.nodes,
    edges: lesson.stage.edges,
    columnLabels: lesson.stage.columnLabels,
    revealedNodes: [...revealedNodes],
    currentNodes: [...currentNodes],
    enteringNodes: [...revealedNodes].filter((id) => !previousNodes.has(id)),
    revealedEdges: [...revealedEdgeKeys],
    currentEdges: currentGroup.map(edgeKey),
    actionText: actionText(currentGroup, lesson.stage.nodes, step.title),
  };
}
