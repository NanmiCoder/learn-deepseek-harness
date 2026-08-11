import { motion } from "framer-motion";
import type { NodeKind, StageEdge, StageNode } from "../tutorial/types";

const NODE_W = 138;
const NODE_H = 62;
const GAP_X = 66;
const GAP_Y = 34;
const PAD = 20;
/** 一对来回的连线要分开画，各自向两侧鼓一点 */
const BOW = 24;

type Point = { x: number; y: number };

function nodeBox(node: StageNode) {
  const x = PAD + node.col * (NODE_W + GAP_X);
  const y = PAD + node.row * (NODE_H + GAP_Y);
  return { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
}

const PALETTE: Record<NodeKind, { fill: string; stroke: string; text: string; sub: string }> = {
  core: { fill: "#eef9f3", stroke: "#2fc47a", text: "#1d8f57", sub: "#4fa87c" },
  plugin: { fill: "#ffffff", stroke: "#5cb8c4", text: "#2f8c99", sub: "#5f9aa3" },
  external: { fill: "#f6fbfc", stroke: "#8aa8b4", text: "#4a6273", sub: "#7d94a1" },
  data: { fill: "#fdf8ef", stroke: "#c9963f", text: "#9a7130", sub: "#b18f5c" },
};

const IDLE = { fill: "#fbfdfc", stroke: "#dfeae6", text: "#9aaab5", sub: "#b3c0c8" };

/** 中文字符按整宽算，其余按半宽多一点算 */
function textWidth(text: string, fontSize: number) {
  let units = 0;
  for (const char of text) units += /[一-鿿　-〿＀-￯]/.test(char) ? 1 : 0.56;
  return units * fontSize;
}

/** 标签太长就自动缩字号，保证画得下 */
function fitFontSize(text: string, maxWidth: number, base: number, floor: number) {
  const natural = textWidth(text, base);
  if (natural <= maxWidth) return base;
  return Math.max(floor, base * (maxWidth / natural));
}

/**
 * 算一条连线。
 * 先按两个节点的相对位置决定从哪条边出、从哪条边进，再用三次贝塞尔连起来。
 * bow 不为 0 时把控制点朝垂直方向推开，用来把 A→B 和 B→A 这一对线错开。
 */
function edgeGeometry(from: StageNode, to: StageNode, bow: number) {
  const a = nodeBox(from);
  const b = nodeBox(to);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;

  let p1: Point;
  let p2: Point;
  let c1: Point;
  let c2: Point;

  if (Math.abs(dx) >= Math.abs(dy) * 0.75) {
    // 横向为主：左右两边出入
    const dir = dx >= 0 ? 1 : -1;
    p1 = { x: dir > 0 ? a.x + NODE_W : a.x, y: a.cy };
    p2 = { x: dir > 0 ? b.x : b.x + NODE_W, y: b.cy };
    const reach = Math.max(30, Math.abs(p2.x - p1.x) * 0.5);
    c1 = { x: p1.x + dir * reach, y: p1.y };
    c2 = { x: p2.x - dir * reach, y: p2.y };
  } else {
    // 纵向为主：上下两边出入
    const dir = dy >= 0 ? 1 : -1;
    p1 = { x: a.cx, y: dir > 0 ? a.y + NODE_H : a.y };
    p2 = { x: b.cx, y: dir > 0 ? b.y : b.y + NODE_H };
    const reach = Math.max(24, Math.abs(p2.y - p1.y) * 0.5);
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

  // 贝塞尔在 t=0.5 处的点，标签放这里
  const mid: Point = {
    x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8,
    y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8,
  };

  return {
    d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`,
    mid,
  };
}

export function StageDiagram({
  nodes,
  edges,
  activeNodes,
  activeEdges,
  caption,
}: {
  nodes: StageNode[];
  edges: StageEdge[];
  activeNodes: string[];
  activeEdges: string[];
  caption: string;
}) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const maxCol = Math.max(...nodes.map((node) => node.col));
  const maxRow = Math.max(...nodes.map((node) => node.row));
  const width = PAD * 2 + (maxCol + 1) * NODE_W + maxCol * GAP_X;
  const height = PAD * 2 + (maxRow + 1) * NODE_H + maxRow * GAP_Y;

  const present = new Set(edges.map((edge) => `${edge.from}->${edge.to}`));
  const activeNodeSet = new Set(activeNodes);
  const activeEdgeSet = new Set(activeEdges);

  return (
    <svg
      aria-label={caption}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <marker id="arrow-idle" markerHeight="6" markerWidth="7" orient="auto" refX="6.2" refY="3">
          <path d="M0,0 L7,3 L0,6 z" fill="#d3e2dd" />
        </marker>
        <marker id="arrow-live" markerHeight="6" markerWidth="7" orient="auto" refX="6.2" refY="3">
          <path d="M0,0 L7,3 L0,6 z" fill="#2fc47a" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;

        const key = `${edge.from}->${edge.to}`;
        const live = activeEdgeSet.has(key);
        // 存在反向边时，两条各往一侧鼓开；用 id 大小定谁往哪边，保证稳定
        const paired = present.has(`${edge.to}->${edge.from}`);
        const bow = paired ? (edge.from < edge.to ? 1 : -1) : 0;
        const { d, mid } = edgeGeometry(from, to, bow);

        return (
          <g key={key}>
            <path
              d={d}
              fill="none"
              markerEnd={live ? "url(#arrow-live)" : "url(#arrow-idle)"}
              stroke={live ? "#2fc47a" : "#dfeae6"}
              strokeLinecap="round"
              strokeWidth={live ? 2.1 : 1.5}
              style={{ transition: "stroke 320ms ease, stroke-width 320ms ease" }}
            />
            {live && (
              <motion.path
                animate={{ opacity: [0, 1, 1, 0] }}
                d={d}
                fill="none"
                initial={{ opacity: 0 }}
                stroke="#8ce3b7"
                strokeDasharray="5 9"
                strokeLinecap="round"
                strokeWidth={3.4}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
            {edge.label && (
              <text
                fill={live ? "#1d8f57" : "#a3b4bd"}
                fontSize="9.5"
                fontWeight={live ? 650 : 500}
                paintOrder="stroke"
                stroke="#fbfdfc"
                strokeLinejoin="round"
                strokeWidth={3.4}
                style={{ transition: "fill 320ms ease" }}
                textAnchor="middle"
                x={mid.x}
                y={mid.y + 3}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {nodes.map((node) => {
        const box = nodeBox(node);
        const live = activeNodeSet.has(node.id);
        const tone = live ? PALETTE[node.kind] : IDLE;

        return (
          <motion.g
            animate={{ scale: live ? 1 : 0.972, opacity: live ? 1 : 0.8 }}
            initial={false}
            key={node.id}
            style={{ originX: `${box.cx}px`, originY: `${box.cy}px` }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {live && (
              <rect
                fill="none"
                height={NODE_H + 9}
                opacity={0.45}
                rx={21}
                stroke={tone.stroke}
                strokeWidth={1}
                width={NODE_W + 9}
                x={box.x - 4.5}
                y={box.y - 4.5}
              />
            )}
            <rect
              fill={tone.fill}
              height={NODE_H}
              rx={17}
              stroke={tone.stroke}
              strokeWidth={live ? 1.6 : 1.1}
              style={{ transition: "fill 320ms ease, stroke 320ms ease" }}
              width={NODE_W}
              x={box.x}
              y={box.y}
            />
            <text
              fill={tone.text}
              fontSize={fitFontSize(node.label, NODE_W - 18, 12.5, 8.5)}
              fontWeight={650}
              style={{ transition: "fill 320ms ease" }}
              textAnchor="middle"
              x={box.cx}
              y={node.sub ? box.cy - 3 : box.cy + 4}
            >
              {node.label}
            </text>
            {node.sub && (
              <text
                fill={tone.sub}
                fontSize={fitFontSize(node.sub, NODE_W - 16, 9, 6.5)}
                style={{ transition: "fill 320ms ease" }}
                textAnchor="middle"
                x={box.cx}
                y={box.cy + 13}
              >
                {node.sub}
              </text>
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
