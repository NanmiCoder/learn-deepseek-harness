import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { LessonStep, LogKind } from "../tutorial/types";

const TAG_TEXT: Record<LogKind, string> = {
  event: "event",
  call: "call",
  state: "state",
  io: "io",
  ok: "ok",
  warn: "warn",
};

/**
 * 运行记录。会把走过的每一步都留在上面，像真的跑了一遍。
 * 当前这一步的行会亮起来，之前的行退到浅色。
 */
export function RunLog({ steps, currentStep }: { steps: LessonStep[]; currentStep: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [currentStep]);

  const visible = steps.slice(0, currentStep + 1);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[11px] font-semibold text-[var(--ink-3)]">运行记录</span>
        <span className="font-mono text-[9px] text-[var(--ink-4)]">
          {visible.reduce((total, step) => total + step.log.length, 0)} 行
        </span>
      </div>

      <div
        className="soft-inset thin-scroll min-h-0 flex-1 overflow-y-auto rounded-2xl bg-[#fbfdfc] p-2"
        ref={scrollRef}
      >
        {visible.map((step, stepIndex) => {
          const isCurrent = stepIndex === currentStep;
          return (
            <div className={isCurrent ? "" : "opacity-45"} key={step.id}>
              {stepIndex > 0 && <div className="mx-2 my-1.5 h-px bg-[var(--line-soft)]" />}
              {step.log.map((line, lineIndex) => (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="log-line"
                  data-kind={line.kind}
                  initial={isCurrent ? { opacity: 0, x: -6 } : false}
                  key={`${step.id}-${lineIndex}`}
                  transition={{ delay: isCurrent ? lineIndex * 0.08 : 0, duration: 0.28 }}
                >
                  <span className="log-tag font-mono">{TAG_TEXT[line.kind]}</span>
                  <span className="font-mono text-[var(--ink-2)]">{line.text}</span>
                </motion.div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
