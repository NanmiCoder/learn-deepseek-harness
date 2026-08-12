import { motion } from "framer-motion";
import type { NodeKind, StageEdge, StageNode } from "../tutorial/types";
import type { DiagramMode } from "../tutorial/diagramFrames";
import { edgeKey } from "../tutorial/diagramFrames";

const NODE_W = 152;
const NODE_H = 74;
const GAP_X = 72;
const GAP_Y = 40;
const PAD = 28;
const BOW = 40;

type Point = { x: number; y: number };

const KIND_LABEL: Record<NodeKind, string> = {
  core: "内核",
  plugin: "插件",
  external: "外部",
  data: "数据",
};

const PALETTE: Record<NodeKind, { fill: string; stroke: string; text: string; sub: string }> = {
  core: { fill: "var(--node-core-fill)", stroke: "var(--node-core-stroke)", text: "var(--node-core-text)", sub: "var(--node-core-sub)" },
  plugin: { fill: "var(--node-plugin-fill)", stroke: "var(--node-plugin-stroke)", text: "var(--node-plugin-text)", sub: "var(--node-plugin-sub)" },
  external: { fill: "var(--node-external-fill)", stroke: "var(--node-external-stroke)", text: "var(--node-external-text)", sub: "var(--node-external-sub)" },
  data: { fill: "var(--node-data-fill)", stroke: "var(--node-data-stroke)", text: "var(--node-data-text)", sub: "var(--node-data-sub)" },
};

const IDLE = {
  fill: "var(--node-idle-fill)",
  stroke: "var(--node-idle-stroke)",
  text: "var(--node-idle-text)",
  sub: "var(--node-idle-sub)",
  kind: "var(--node-idle-kind)",
};

/**
 * 节点画在哪一格。
 *
 * 窄屏优先用 mobileCol/mobileRow——4 列的横版图压进手机宽度会缩到看不清。
 * 没填就退回 col/row，行为和宽屏一致。
 */
export function cellOf(node: StageNode, narrow: boolean) {
  return narrow
    ? { col: node.mobileCol ?? node.col, row: node.mobileRow ?? node.row }
    : { col: node.col, row: node.row };
}

/** 这张图有没有给窄屏准备过竖版坐标 */
export function hasMobileCells(nodes: StageNode[]): boolean {
  return nodes.some((node) => node.mobileCol !== undefined);
}

function nodeBox(node: StageNode, topPad = PAD, narrow = false) {
  const cell = cellOf(node, narrow);
  const x = PAD + cell.col * (NODE_W + GAP_X);
  const y = topPad + cell.row * (NODE_H + GAP_Y);
  return { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
}

function textWidth(text: string, fontSize: number) {
  let units = 0;
  for (const char of text) units += /[一-鿿　-〿＀-￯]/.test(char) ? 1 : 0.56;
  return units * fontSize;
}

function fitFontSize(text: string, maxWidth: number, base: number, floor: number) {
  const natural = textWidth(text, base);
  if (natural <= maxWidth) return base;
  return Math.max(floor, base * (maxWidth / natural));
}

function edgeGeometry(from: StageNode, to: StageNode, bow: number, topPad: number, narrow: boolean) {
  const a = nodeBox(from, topPad, narrow);
  const b = nodeBox(to, topPad, narrow);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;

  let p1: Point;
  let p2: Point;
  let c1: Point;
  let c2: Point;

  if (Math.abs(dx) >= Math.abs(dy) * 0.75) {
    const dir = dx >= 0 ? 1 : -1;
    p1 = { x: dir > 0 ? a.x + NODE_W : a.x, y: a.cy };
    p2 = { x: dir > 0 ? b.x - 8 : b.x + NODE_W + 8, y: b.cy };
    const reach = Math.max(32, Math.abs(p2.x - p1.x) * 0.5);
    c1 = { x: p1.x + dir * reach, y: p1.y };
    c2 = { x: p2.x - dir * reach, y: p2.y };
  } else {
    const dir = dy >= 0 ? 1 : -1;
    p1 = { x: a.cx, y: dir > 0 ? a.y + NODE_H : a.y };
    p2 = { x: b.cx, y: dir > 0 ? b.y - 8 : b.y + NODE_H + 8 };
    const reach = Math.max(26, Math.abs(p2.y - p1.y) * 0.5);
    c1 = { x: p1.x, y: p1.y + dir * reach };
    c2 = { x: p2.x, y: p2.y - dir * reach };
  }

  if (bow !== 0) {
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
    const nx = -((p2.y - p1.y) / len) * BOW * bow;
    const ny = ((p2.x - p1.x) / len) * BOW * bow;
    c1 = { x: c1.x + nx, y: c1.y + ny };
    c2 = { x: c2.x + nx, y: c2.y + ny };
  }

  return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
}

export function StageDiagram({
  nodes,
  edges,
  revealedNodes,
  currentNodes,
  enteringNodes,
  revealedEdges,
  currentEdges,
  mode,
  frameKey,
  caption,
  columnLabels,
  narrow = false,
}: {
  nodes: StageNode[];
  edges: StageEdge[];
  revealedNodes: string[];
  currentNodes: string[];
  enteringNodes: string[];
  revealedEdges: string[];
  currentEdges: string[];
  mode: DiagramMode;
  frameKey: string;
  caption: string;
  columnLabels?: string[];
  narrow?: boolean;
}) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const maxCol = Math.max(...nodes.map((node) => cellOf(node, narrow).col));
  const maxRow = Math.max(...nodes.map((node) => cellOf(node, narrow).row));
  const topPad = !narrow && columnLabels?.length ? 58 : PAD;
  const width = PAD * 2 + (maxCol + 1) * NODE_W + maxCol * GAP_X;
  const height = topPad + PAD + (maxRow + 1) * NODE_H + maxRow * GAP_Y + 22;
  const present = new Set(edges.map((edge) => `${edge.from}->${edge.to}`));
  const revealedNodeSet = new Set(revealedNodes);
  const currentNodeSet = new Set(currentNodes);
  const enteringNodeSet = new Set(enteringNodes);
  const revealedEdgeSet = new Set(revealedEdges);
  const currentEdgeSet = new Set(currentEdges);

  return (
    <svg aria-label={caption} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <marker id="arrow-idle" markerHeight="7" markerWidth="8" orient="auto" refX="7" refY="3.5">
          <path d="M0,0 L8,3.5 L0,7 z" fill="var(--edge-idle)" />
        </marker>
        <marker id="arrow-live" markerHeight="7" markerWidth="8" orient="auto" refX="7" refY="3.5">
          <path d="M0,0 L8,3.5 L0,7 z" fill="var(--teal)" />
        </marker>
      </defs>

      {!narrow && columnLabels?.slice(0, maxCol + 1).map((label, index) => {
        const x = PAD + index * (NODE_W + GAP_X);
        // 这一列当前有没有露出来的节点。没有的话整条泳道压淡，
        // 不然会剩一个跟节点一样大的空框，读者以为是渲染坏了。
        const laneLive = nodes.some((node) => node.col === index && revealedNodeSet.has(node.id));
        return (
          <g key={label}>
            <rect
              fill="var(--diagram-lane-fill)"
              opacity={laneLive ? 1 : 0.45}
              height={height - 38}
              rx="18"
              stroke="var(--diagram-lane-stroke)"
              strokeDasharray="3 5"
              strokeOpacity={0.9}
              width={NODE_W + 20}
              x={x - 10}
              y="30"
            />
            <text
              fill="var(--ink-3)"
              fontFamily="JetBrains Mono Variable, monospace"
              fontSize="10"
              fontWeight="700"
              letterSpacing="1.1"
              textAnchor="middle"
              x={x + NODE_W / 2}
              y="19"
            >
              {label}
            </text>
          </g>
        );
      })}

      {edges.map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;

        const key = edgeKey(edge);
        const revealed = revealedEdgeSet.has(key);
        if (!revealed) return null;
        const live = currentEdgeSet.has(key);
        const paired = present.has(`${edge.to}->${edge.from}`);
        const d = edgeGeometry(from, to, paired ? 1 : 0, topPad, narrow);

        return (
          <motion.g
            animate={{ opacity: 1 }}
            initial={live ? { opacity: 0 } : false}
            key={`${frameKey}-${key}`}
            transition={{ duration: 0.2 }}
          >
            <motion.path
              animate={{ pathLength: 1, opacity: live ? 1 : mode === "overview" ? 0.72 : 0.28 }}
              d={d}
              fill="none"
              initial={live ? { pathLength: 0, opacity: 0.35 } : false}
              markerEnd={live ? "url(#arrow-live)" : "url(#arrow-idle)"}
              stroke={live ? "var(--teal)" : "var(--edge-idle)"}
              strokeLinecap="round"
              strokeWidth={live ? 3.2 : mode === "overview" ? 1.7 : 1.35}
              transition={{ duration: 0.62, ease: [0.2, 0.8, 0.2, 1] }}
            />
            {live && mode === "step" && (
              <circle className="flow-dot" fill="var(--hot)" r="4.5">
                <animateMotion begin="0.18s" dur="0.9s" fill="freeze" path={d} repeatCount="1" />
              </circle>
            )}
          </motion.g>
        );
      })}

      {nodes.map((node) => {
        const box = nodeBox(node, topPad, narrow);
        const revealed = revealedNodeSet.has(node.id);
        if (!revealed) return null;
        const live = currentNodeSet.has(node.id);
        const entering = enteringNodeSet.has(node.id);
        const tone = live ? PALETTE[node.kind] : IDLE;

        return (
          <motion.g
            animate={{ opacity: live ? 1 : mode === "overview" ? 0.96 : 0.78, scale: 1 }}
            initial={entering ? { opacity: 0, scale: 0.94 } : false}
            key={node.id}
            style={{ originX: `${box.cx}px`, originY: `${box.cy}px` }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            {live && (
              <rect
                className="node-pulse-ring"
                fill="none"
                height={NODE_H + 12}
                rx={20}
                stroke="var(--teal)"
                strokeWidth={1.6}
                width={NODE_W + 12}
                x={box.x - 6}
                y={box.y - 6}
              />
            )}
            <rect
              fill={tone.fill}
              height={NODE_H}
              rx={16}
              stroke={tone.stroke}
              strokeDasharray={node.kind === "data" ? "5 4" : undefined}
              strokeWidth={live ? 2.4 : 1.4}
              style={{ transition: "fill 300ms ease, stroke 300ms ease" }}
              width={NODE_W}
              x={box.x}
              y={box.y}
            />
            <text fill={live ? tone.sub : IDLE.kind} fontSize="11" fontWeight="700" letterSpacing="0.8" textAnchor="middle" x={box.cx} y={box.y + 18}>
              {node.kindLabel ?? KIND_LABEL[node.kind]}
            </text>
            <text fill={tone.text} fontSize={fitFontSize(node.label, NODE_W - 22, 15, 11.5)} fontWeight="600" textAnchor="middle" x={box.cx} y={box.cy + 4}>
              {node.label}
            </text>
            {node.sub && (
              <text fill={tone.sub} fontSize={fitFontSize(node.sub, NODE_W - 18, 12, 10)} textAnchor="middle" x={box.cx} y={box.y + NODE_H - 12}>
                {node.sub}
              </text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
