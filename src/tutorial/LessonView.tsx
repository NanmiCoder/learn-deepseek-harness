import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowBendRightDown,
  Clock,
  Code,
  Info,
  Path,
  Table,
  Warning,
  X,
} from "@phosphor-icons/react";
import { CodePanel } from "../components/CodePanel";
import { Quiz } from "../components/Quiz";
import { RunLog } from "../components/RunLog";
import { StageDiagram } from "../components/StageDiagram";
import { LessonControls } from "./LessonControls";
import { useLessonPlayer } from "./useLessonPlayer";
import { buildDiagramFrame, buildFlowGroups } from "./diagramFrames";
import type { Lesson } from "./types";

const LEGEND: { kind: "core" | "plugin" | "external" | "data"; label: string; color: string }[] = [
  { kind: "core", label: "内核", color: "var(--node-core-stroke)" },
  { kind: "plugin", label: "插件", color: "var(--node-plugin-stroke)" },
  { kind: "external", label: "外部", color: "var(--node-external-stroke)" },
  { kind: "data", label: "数据", color: "var(--node-data-stroke)" },
];

export function LessonView({
  lesson,
  passed,
  onPass,
}: {
  lesson: Lesson;
  passed: boolean;
  onPass: () => void;
}) {
  const teachingFrames = useMemo(
    () => [
      ...lesson.steps.flatMap((item, stepIndex) => {
        const beatCount = Math.max(1, buildFlowGroups(item, lesson.stage.edges).length);
        return Array.from({ length: beatCount }, (_, beatIndex) => ({ kind: "step" as const, stepIndex, beatIndex, beatCount }));
      }),
      { kind: "overview" as const, stepIndex: lesson.steps.length, beatIndex: 0, beatCount: 1 },
    ],
    [lesson.stage.edges, lesson.steps],
  );
  const player = useLessonPlayer(teachingFrames.length, 2600);
  const cursor = teachingFrames[player.currentStep];
  const isOverview = cursor.kind === "overview";
  const stepIndex = isOverview ? lesson.steps.length - 1 : cursor.stepIndex;
  const step = lesson.steps[stepIndex];
  const usedKinds = new Set(lesson.stage.nodes.map((node) => node.kind));
  const [codeOpen, setCodeOpen] = useState(false);
  const codeButtonRef = useRef<HTMLButtonElement>(null);
  const diagramFrame = useMemo(
    () => buildDiagramFrame(lesson, cursor.stepIndex, cursor.beatIndex),
    [cursor.beatIndex, cursor.stepIndex, lesson],
  );
  const firstFrameForStep = useMemo(() => {
    const result: number[] = [];
    teachingFrames.forEach((frame, frameIndex) => {
      if (frame.kind === "step" && result[frame.stepIndex] === undefined) result[frame.stepIndex] = frameIndex;
    });
    return result;
  }, [teachingFrames]);

  useEffect(() => {
    setCodeOpen(false);
  }, [lesson.id]);

  useEffect(() => {
    if (codeOpen && (!step.code || isOverview)) setCodeOpen(false);
  }, [codeOpen, isOverview, step.code]);

  useEffect(() => {
    if (!codeOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCodeOpen(false);
      window.requestAnimationFrame(() => codeButtonRef.current?.focus());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [codeOpen]);

  function closeCode() {
    setCodeOpen(false);
    window.requestAnimationFrame(() => codeButtonRef.current?.focus());
  }

  return (
    <>
      <article className="mx-auto max-w-[1240px] px-4 pb-16 pt-7 sm:px-7 sm:pt-8 lg:px-8 lg:pb-[4.5rem]">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--teal-soft)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--teal-deep)]">
              {lesson.index}
            </span>
            <span className="text-[11px] font-medium text-[var(--ink-2)]">{lesson.eyebrow}</span>
            <span className="flex items-center gap-1 text-[11px] text-[var(--ink-3)]">
              <Clock aria-hidden="true" size={12} weight="regular" />
              约 {lesson.readingMinutes} 分钟
            </span>
          </div>
          <h1 className="mt-3.5 text-[1.9rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[var(--ink)] sm:text-[2.5rem]">
            {lesson.title}
          </h1>
          <p className="mt-3 max-w-[34em] text-[15px] leading-[1.75] text-[var(--ink-2)] sm:text-base">
            {lesson.oneLiner}
          </p>
        </header>

        {!lesson.architectureFirst && (
          <section aria-label="先看懂" className="mt-6">
            <div className="analogy-card soft-card rounded-[1.5rem] p-5 sm:px-[1.375rem]">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--teal)]">
                <Info aria-hidden="true" size={14} weight="regular" />
                先打个比方
              </div>
              <p className="mt-2.5 max-w-[78ch] text-[13.5px] leading-[1.95] text-[var(--ink)]">{lesson.analogy}</p>
            </div>

            <div className="mt-[1.375rem]">
              <div className="px-1 pb-2.5 text-[11px] font-semibold text-[var(--ink-2)]">这节课会出现的词</div>
              <dl className="grid gap-3 md:grid-cols-2">
                {lesson.concepts.map((concept) => (
                  <div className="soft-card min-w-0 rounded-[1.25rem] p-[1.0625rem] backdrop-blur-xl" key={concept.term}>
                    <dt className="text-[13.5px] font-semibold text-[var(--ink)]">{concept.term}</dt>
                    <dd className="mt-1.5 text-[12.5px] leading-[1.7] text-[var(--ink-2)]">{concept.plain}</dd>
                    <dd className="mt-2.5 truncate font-mono text-[10px] text-[var(--ink-4)]" title={concept.source}>
                      {concept.source}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <section aria-label="分步演示" className="soft-panel mt-[1.375rem] overflow-hidden rounded-[1.75rem] backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-0 pt-4 sm:px-5">
            <span className="text-[11px] font-semibold text-[var(--ink-2)]">分步演示 · 一次对话怎么跑完</span>
            {step.code && !isOverview ? (
              <button
                aria-haspopup="dialog"
                className="soft-action max-w-full text-[var(--teal-deep)]"
                onClick={() => setCodeOpen(true)}
                ref={codeButtonRef}
                type="button"
              >
                <Code aria-hidden="true" size={14} weight="regular" />
                <span className="shrink-0">看这一步的代码</span>
                <span className="hidden truncate font-mono text-[10px] font-medium text-[var(--ink-4)] sm:inline">{step.code.source}</span>
              </button>
            ) : lesson.evidence ? (
              <span className="soft-action pointer-events-none max-w-full text-[var(--teal-deep)]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--hot)] shadow-[0_0_0_4px_var(--hot-soft)]" />
                <span className="truncate font-mono text-[10px] font-semibold">{lesson.evidence}</span>
              </span>
            ) : null}
          </div>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="grid min-h-[104px] grid-cols-[auto_1fr] items-start gap-4 px-4 py-4 sm:px-5 sm:pb-[1.125rem]"
              exit={{ opacity: 0, y: -5 }}
              initial={{ opacity: 0, y: 5 }}
              key={isOverview ? "overview" : `${step.id}-${cursor.beatIndex}`}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="font-mono text-[2rem] font-bold leading-none text-[var(--ink)] sm:text-[2.125rem]">
                  {isOverview ? "◎" : String(stepIndex + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-4)]">{isOverview ? "全景" : `/ ${String(lesson.steps.length).padStart(2, "0")}`}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[var(--ink)] sm:text-[18px]">{isOverview ? "完整链路已经串起来" : step.title}</h2>
                <p className="mt-1.5 max-w-[64em] text-[12.5px] leading-[1.75] text-[var(--ink-2)] sm:text-[13px]">
                  {isOverview ? "总览只保留组件关系。点击左侧任一步，可以重新查看当时新增的数据流。" : step.detail}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="workbench-grid grid min-w-0 gap-3 px-4 pb-3 sm:px-5 lg:grid-cols-[212px_minmax(0,1fr)]">
            <div className="step-rail thin-scroll" aria-label="演示步骤">
              <div className="step-rail-label">步骤</div>
              {lesson.steps.map((item, itemIndex) => {
                const current = !isOverview && itemIndex === stepIndex;
                const past = isOverview || itemIndex < stepIndex;
                return (
                  <button
                    aria-current={current ? "step" : undefined}
                    className={`step-rail-item ${current ? "step-rail-item--current" : ""}`}
                    key={item.id}
                    onClick={() => player.goTo(firstFrameForStep[itemIndex])}
                    type="button"
                  >
                    <span className={`step-rail-number ${current ? "is-current" : past ? "is-past" : ""}`}>
                      {String(itemIndex + 1).padStart(2, "0")}
                    </span>
                    <span className={`step-rail-title ${current ? "is-current" : past ? "is-past" : ""}`}>{item.title}</span>
                  </button>
                );
              })}
              <button
                aria-current={isOverview ? "step" : undefined}
                className={`step-rail-item ${isOverview ? "step-rail-item--current" : ""}`}
                onClick={() => player.goTo(teachingFrames.length - 1)}
                type="button"
              >
                <span className={`step-rail-number ${isOverview ? "is-current" : ""}`}>◎</span>
                <span className={`step-rail-title ${isOverview ? "is-current" : ""}`}>完整链路总览</span>
              </button>
            </div>

            <div className={`soft-inset thin-scroll relative h-[340px] min-w-0 rounded-[1.25rem] px-2 pb-8 pt-2 lg:h-[430px] ${lesson.stage.scrollOnMobile ? "overflow-x-auto" : ""}`}>
              <div className="current-flow" aria-live="polite">
                <span>{isOverview ? "全局关系" : `当前动作${cursor.beatCount > 1 ? ` ${cursor.beatIndex + 1}/${cursor.beatCount}` : ""}`}</span>
                <strong>{diagramFrame.actionText}</strong>
              </div>
              <div className={`h-full pt-10 ${lesson.stage.scrollOnMobile ? "min-w-[760px] sm:min-w-0" : ""}`}>
                <StageDiagram
                  caption={isOverview ? `${lesson.title} 完整链路总览` : `${lesson.title} 第 ${stepIndex + 1} 步：${step.title}`}
                  columnLabels={diagramFrame.columnLabels}
                  currentEdges={diagramFrame.currentEdges}
                  currentNodes={diagramFrame.currentNodes}
                  edges={diagramFrame.edges}
                  enteringNodes={diagramFrame.enteringNodes}
                  frameKey={`${player.currentStep}`}
                  mode={diagramFrame.mode}
                  nodes={diagramFrame.nodes}
                  revealedEdges={diagramFrame.revealedEdges}
                  revealedNodes={diagramFrame.revealedNodes}
                />
              </div>
              <div className="absolute bottom-3 left-4 flex flex-wrap gap-3 sm:left-5 sm:gap-4">
                {LEGEND.filter((entry) => usedKinds.has(entry.kind as never)).map((entry) => (
                  <span className="flex items-center gap-1.5 text-[9.5px] text-[var(--ink-3)]" key={entry.kind}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {lesson.stage.legendLabels?.[entry.kind] ?? entry.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[220px] px-4 pb-1 sm:px-5">
            <RunLog currentStep={stepIndex} steps={lesson.steps} />
          </div>

          <LessonControls
            currentStep={player.currentStep}
            isPlaying={player.isPlaying}
            onNext={player.next}
            onPrevious={player.previous}
            onReset={player.reset}
            onTogglePlaying={player.togglePlaying}
            positionLabel={isOverview ? "总览" : `步骤 ${String(stepIndex + 1).padStart(2, "0")}${cursor.beatCount > 1 ? ` · 动作 ${cursor.beatIndex + 1}/${cursor.beatCount}` : ""}`}
            stepTitles={teachingFrames.map((frame) => frame.kind === "overview" ? "完整链路总览" : lesson.steps[frame.stepIndex].title)}
          />
        </section>

        {lesson.architectureFirst && (
          <details className="soft-card mt-4 overflow-hidden rounded-[1.375rem] backdrop-blur-xl">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-[1.125rem] py-3.5 text-[12.5px] font-semibold text-[var(--ink)] transition-colors">
              <span className="flex items-center gap-2">
                <Info aria-hidden="true" className="text-[var(--teal)]" size={14} weight="regular" />
                补充：四个角色分别负责什么
              </span>
              <span className="font-mono text-[10px] font-normal text-[var(--ink-4)]">展开 ▾</span>
            </summary>
            <div className="border-t border-[var(--line-soft)] px-[1.125rem] py-4">
              <p className="max-w-[78ch] text-[12.5px] leading-[1.8] text-[var(--ink-2)]">{lesson.analogy}</p>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                {lesson.concepts.map((concept) => (
                  <div className="soft-inset min-w-0 rounded-[1rem] p-4" key={concept.term}>
                    <dt className="text-[12.5px] font-semibold text-[var(--ink)]">{concept.term}</dt>
                    <dd className="mt-1 text-[12px] leading-relaxed text-[var(--ink-2)]">{concept.plain}</dd>
                    <dd className="mt-2 truncate font-mono text-[10px] text-[var(--ink-4)]" title={concept.source}>{concept.source}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        )}

        {lesson.misconceptions.length > 0 && (
          <section aria-label="容易想错的地方" className="mt-6">
            <div className="flex items-center gap-2 px-1 pb-3 text-[11px] font-semibold text-[var(--ink-2)]">
              <Warning aria-hidden="true" size={13} weight="regular" />
              容易想错的地方
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {lesson.misconceptions.map((item) => (
                <div className="soft-card rounded-[1.375rem] p-[1.0625rem] backdrop-blur-xl" key={item.wrong}>
                  <p className="flex gap-2.5 text-[12.5px] leading-[1.7] text-[var(--ink-3)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffbfab]" />
                    <span>
                      <span className="font-semibold text-[var(--ink-2)]">以为：</span>
                      {item.wrong}
                    </span>
                  </p>
                  <p className="mt-2.5 flex gap-2.5 text-[12.5px] leading-[1.7] text-[var(--ink)]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--teal)]" />
                    <span>
                      <span className="font-semibold text-[var(--teal-deep)]">其实：</span>
                      {item.right}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {lesson.takeaways?.map((takeaway) => (
          <details className="soft-card mt-4 overflow-hidden rounded-[1.375rem] backdrop-blur-xl" key={takeaway.title}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-[1.125rem] py-3.5 text-[12.5px] font-semibold text-[var(--ink)] transition-colors">
              <span className="flex items-center gap-2">
                <Table aria-hidden="true" className="text-[var(--teal)]" size={14} weight="regular" />
                {takeaway.title}
              </span>
              <span className="font-mono text-[10px] font-normal text-[var(--ink-4)]">{takeaway.items.length} 条 ▾</span>
            </summary>
            <div className="border-t border-[var(--line-soft)] px-[1.125rem] py-3.5">
              {takeaway.intro && <p className="mb-3 text-[12px] leading-relaxed text-[var(--ink-3)]">{takeaway.intro}</p>}
              <dl className="space-y-3">
                {takeaway.items.map((item, itemIndex) => (
                  <div className="grid gap-1" key={`${item.label}-${itemIndex}`}>
                    <dt className="text-[12.5px] font-semibold text-[var(--ink)]">{item.label}</dt>
                    <dd className="text-[12px] leading-relaxed text-[var(--ink-2)]">{item.text}</dd>
                    {item.hint && <dd className="font-mono text-[10px] leading-relaxed text-[var(--ink-4)]">{item.hint}</dd>}
                  </div>
                ))}
              </dl>
            </div>
          </details>
        ))}

        <div className="mt-[1.375rem]">
          <Quiz items={lesson.quiz} lessonId={lesson.id} onPass={onPass} passed={passed} />
        </div>

        {lesson.bridge && (
          <div className="bridge-card soft-card mt-[1.375rem] flex items-start gap-3 rounded-[1.5rem] p-5">
            <ArrowBendRightDown aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--teal)]" size={16} weight="regular" />
            <p className="text-[13px] leading-[1.8] text-[var(--ink)]">{lesson.bridge}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[var(--ink-4)]">
          <Path aria-hidden="true" size={12} weight="regular" />
          本节内容基于源码整理
        </div>
      </article>

      <AnimatePresence>
        {codeOpen && step.code && (
          <>
            <motion.button
              aria-label="关闭代码抽屉"
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 cursor-default bg-[#014e60]/25 backdrop-blur-[3px]"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeCode}
              type="button"
            />
            <motion.aside
              aria-labelledby="code-drawer-title"
              aria-modal="true"
              animate={{ x: 0 }}
              className="code-drawer fixed inset-y-2 right-2 z-50 flex w-[min(580px,calc(100vw-16px))] flex-col rounded-[1.75rem] backdrop-blur-3xl sm:inset-y-4 sm:right-4 sm:w-[min(580px,calc(100vw-32px))]"
              exit={{ x: "calc(100% + 24px)" }}
              initial={{ x: "calc(100% + 24px)" }}
              role="dialog"
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-5">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-[var(--ink-3)]">步骤 {String(stepIndex + 1).padStart(2, "0")} 的代码</div>
                  <div className="mt-1 truncate font-mono text-[12px] text-[var(--ink)]" id="code-drawer-title">{step.code.source}</div>
                </div>
                <button autoFocus className="soft-action shrink-0" onClick={closeCode} type="button">
                  <X aria-hidden="true" size={14} weight="bold" />
                  关闭 <span className="hidden font-mono text-[9px] text-[var(--ink-4)] sm:inline">ESC</span>
                </button>
              </div>

              <div className="min-h-0 flex-1 px-3 sm:px-4">
                <CodePanel code={step.code} showMeta={false} />
              </div>

              <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <button className="soft-action justify-center" disabled={player.currentStep === 0} onClick={player.previous} type="button">
                  ← 上一步的代码
                </button>
                <button className="soft-action justify-center" disabled={player.currentStep === lesson.steps.length - 1} onClick={player.next} type="button">
                  下一步的代码 →
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
