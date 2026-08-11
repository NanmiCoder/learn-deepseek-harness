import { AnimatePresence, motion } from "framer-motion";
import { ArrowBendRightDown, Clock, Info, Path, Table, Warning } from "@phosphor-icons/react";
import { CodePanel } from "../components/CodePanel";
import { Quiz } from "../components/Quiz";
import { RunLog } from "../components/RunLog";
import { StageDiagram } from "../components/StageDiagram";
import { LessonControls } from "./LessonControls";
import { useLessonPlayer } from "./useLessonPlayer";
import type { Lesson } from "./types";

const LEGEND: { kind: string; label: string; dot: string }[] = [
  { kind: "core", label: "内核", dot: "bg-[#2fc47a]" },
  { kind: "plugin", label: "插件", dot: "bg-[#5cb8c4]" },
  { kind: "external", label: "外部", dot: "bg-[#8aa8b4]" },
  { kind: "data", label: "数据", dot: "bg-[#c9963f]" },
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
  const player = useLessonPlayer(lesson.steps.length);
  const step = lesson.steps[player.currentStep];
  const usedKinds = new Set(lesson.stage.nodes.map((node) => node.kind));

  return (
    <article className="mx-auto max-w-[1180px] px-4 pb-16 pt-7 sm:px-7 lg:px-9">
      {/* 课程头 */}
      <header>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-[var(--mint-soft)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--mint-deep)]">
            {lesson.index}
          </span>
          <span className="text-[11px] font-medium text-[var(--ink-3)]">{lesson.eyebrow}</span>
          <span className="flex items-center gap-1 text-[11px] text-[var(--ink-4)]">
            <Clock aria-hidden="true" size={12} weight="regular" />
            约 {lesson.readingMinutes} 分钟
          </span>
        </div>
        <h1 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--ink)] sm:text-[1.95rem]">
          {lesson.title}
        </h1>
        <p className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-[var(--ink-2)]">{lesson.oneLiner}</p>
      </header>

      {/* 先看懂：类比 + 概念表 */}
      <section aria-label="先看懂" className="mt-7">
        <div className="soft-card rounded-[1.5rem] bg-[var(--cyan-wash)]/80 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--cyan-deep)]">
            <Info aria-hidden="true" size={14} weight="regular" />
            先打个比方
          </div>
          <p className="mt-2.5 max-w-[86ch] text-[13.5px] leading-[1.9] text-[var(--ink-2)]">{lesson.analogy}</p>
        </div>

        <div className="mt-3">
          <div className="px-1 pb-2.5 text-[11px] font-semibold text-[var(--ink-3)]">这节课会出现的词</div>
          {/* 卡片要 min-w-0：里面那行源码路径不换行，不加会把网格撑宽，移动端就横向溢出 */}
          <dl className="grid gap-2.5 md:grid-cols-2">
            {lesson.concepts.map((concept) => (
              <div className="soft-card min-w-0 rounded-[1.25rem] bg-white/68 p-4 backdrop-blur-xl" key={concept.term}>
                <dt className="text-[12.5px] font-semibold text-[var(--ink)]">{concept.term}</dt>
                <dd className="mt-1.5 text-[12px] leading-relaxed text-[var(--ink-2)]">{concept.plain}</dd>
                <dd className="mt-2 truncate font-mono text-[10px] text-[var(--ink-4)]" title={concept.source}>
                  {concept.source}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 分步演示工作台 */}
      <section aria-label="分步演示" className="soft-panel mt-5 overflow-hidden rounded-[1.75rem] bg-white/58 backdrop-blur-xl">
        {/* 固定高度，翻步时动画区不会上下跳 */}
        <div className="flex min-h-[106px] items-center border-b border-[var(--line-soft)] bg-white/45 px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 6 }}
              key={step.id}
              transition={{ duration: 0.22 }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--mint-deep)]">
                  步骤 {String(player.currentStep + 1).padStart(2, "0")}
                </span>
                <span className="h-3 w-px bg-[var(--line)]" />
                <h2 className="text-[13.5px] font-semibold text-[var(--ink)]">{step.title}</h2>
              </div>
              <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-relaxed text-[var(--ink-2)]">{step.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.08fr_0.92fr] lg:p-5">
          {/* 动画舞台 */}
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[11px] font-semibold text-[var(--ink-3)]">分步动画</span>
              <div className="flex items-center gap-2.5">
                {LEGEND.filter((entry) => usedKinds.has(entry.kind as never)).map((entry) => (
                  <span className="flex items-center gap-1 text-[9.5px] text-[var(--ink-4)]" key={entry.kind}>
                    <span className={`h-1.5 w-1.5 rounded-full ${entry.dot}`} />
                    {entry.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="soft-inset h-[290px] rounded-2xl bg-[#fbfdfc] p-2 sm:h-[320px]">
              <StageDiagram
                activeEdges={step.activeEdges}
                activeNodes={step.activeNodes}
                caption={`${lesson.title} 第 ${player.currentStep + 1} 步：${step.title}`}
                edges={lesson.stage.edges}
                nodes={lesson.stage.nodes}
              />
            </div>
          </div>

          {/* 运行记录 */}
          <div className="flex h-[290px] min-w-0 flex-col sm:h-[320px]">
            <RunLog currentStep={player.currentStep} steps={lesson.steps} />
          </div>
        </div>

        {/* 代码与解释 */}
        {step.code && (
          <div className="px-4 pb-4 lg:px-5 lg:pb-5">
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={step.id}
                transition={{ duration: 0.2 }}
              >
                <CodePanel code={step.code} />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <LessonControls
          currentStep={player.currentStep}
          isPlaying={player.isPlaying}
          onGoTo={player.goTo}
          onNext={player.next}
          onPrevious={player.previous}
          onReset={player.reset}
          onTogglePlaying={player.togglePlaying}
          stepTitles={lesson.steps.map((item) => item.title)}
        />
      </section>

      {/* 常见误解 */}
      {lesson.misconceptions.length > 0 && (
        <section aria-label="容易想错的地方" className="mt-5">
          <div className="flex items-center gap-2 px-1 pb-3 text-[11px] font-semibold text-[var(--ink-3)]">
            <Warning aria-hidden="true" size={13} weight="regular" />
            容易想错的地方
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {lesson.misconceptions.map((item) => (
              <div className="soft-card rounded-[1.4rem] bg-white/62 p-4 backdrop-blur-xl" key={item.wrong}>
                <p className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--ink-3)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e0a173]" />
                  <span>
                    <span className="font-semibold text-[var(--ink-2)]">以为：</span>
                    {item.wrong}
                  </span>
                </p>
                <p className="mt-2.5 flex gap-2 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mint)]" />
                  <span>
                    <span className="font-semibold text-[var(--mint-deep)]">其实：</span>
                    {item.right}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 课后补充 */}
      {lesson.takeaways?.map((takeaway) => (
        <details className="soft-card mt-4 overflow-hidden rounded-[1.4rem] bg-white/62 backdrop-blur-xl" key={takeaway.title}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[12.5px] font-semibold text-[var(--ink-2)] transition-colors hover:bg-white/50">
            <span className="flex items-center gap-2">
              <Table aria-hidden="true" className="text-[var(--cyan-deep)]" size={14} weight="regular" />
              {takeaway.title}
            </span>
            <span className="font-mono text-[10px] font-normal text-[var(--ink-4)]">{takeaway.items.length} 条</span>
          </summary>
          <div className="border-t border-[var(--line-soft)] px-4 py-3.5">
            {takeaway.intro && <p className="mb-3 text-[12px] leading-relaxed text-[var(--ink-3)]">{takeaway.intro}</p>}
            <dl className="space-y-2.5">
              {takeaway.items.map((item) => (
                <div className="grid gap-1 border-b border-[var(--line-soft)] pb-2.5 last:border-0 last:pb-0" key={item.label}>
                  <dt className="text-[12px] font-semibold text-[var(--ink)]">{item.label}</dt>
                  <dd className="text-[12px] leading-relaxed text-[var(--ink-2)]">{item.text}</dd>
                  {item.hint && <dd className="font-mono text-[10px] leading-relaxed text-[var(--ink-4)]">{item.hint}</dd>}
                </div>
              ))}
            </dl>
          </div>
        </details>
      ))}

      {/* 完成检查 */}
      <div className="mt-5">
        <Quiz items={lesson.quiz} lessonId={lesson.id} onPass={onPass} passed={passed} />
      </div>

      {/* 承接下一节 */}
      {lesson.bridge && (
        <div className="soft-card mt-5 flex items-start gap-3 rounded-[1.4rem] bg-[var(--mint-wash)]/85 p-4">
          <ArrowBendRightDown aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mint-deep)]" size={16} weight="regular" />
          <p className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">{lesson.bridge}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[var(--ink-4)]">
        <Path aria-hidden="true" size={12} weight="regular" />
        本节内容基于源码整理
      </div>
    </article>
  );
}
