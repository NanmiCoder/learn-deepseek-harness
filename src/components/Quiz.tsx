import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowCounterClockwise, Check, SealCheck, X } from "@phosphor-icons/react";
import type { QuizItem } from "../tutorial/types";

const LABELS = ["A", "B", "C", "D"];

export function Quiz({
  items,
  lessonId,
  passed,
  onPass,
}: {
  items: QuizItem[];
  lessonId: string;
  passed: boolean;
  onPass: () => void;
}) {
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));

  // 换课时清空作答
  useEffect(() => {
    setPicked(items.map(() => null));
  }, [items, lessonId]);

  const allRight = items.every((item, index) => picked[index] === item.answer);

  useEffect(() => {
    if (allRight && !passed) onPass();
  }, [allRight, onPass, passed]);

  function choose(questionIndex: number, optionIndex: number) {
    setPicked((current) => {
      const next = [...current];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  return (
    <section aria-labelledby={`quiz-${lessonId}`} className="soft-panel rounded-[1.75rem] p-5 backdrop-blur-2xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--teal-soft)] text-[var(--teal-deep)]">
            <SealCheck aria-hidden="true" size={18} weight="regular" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]" id={`quiz-${lessonId}`}>
              完成检查
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--ink-3)]">两题都答对，这一课才算学完。</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {picked.some((value) => value !== null) && !allRight && (
            <button
              className="soft-button flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-[var(--ink-3)] active:scale-[0.97]"
              onClick={() => setPicked(items.map(() => null))}
              type="button"
            >
              <ArrowCounterClockwise aria-hidden="true" size={12} weight="regular" />
              重答
            </button>
          )}
          <AnimatePresence>
            {allRight && (
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 rounded-full bg-[var(--teal-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--teal-deep)]"
                initial={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check aria-hidden="true" size={13} weight="bold" />
                已通过
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ol className="mt-5 space-y-5">
        {items.map((item, questionIndex) => {
          const answer = picked[questionIndex];
          const answered = answer !== null;
          const correct = answer === item.answer;

          return (
            <li key={`${lessonId}-${questionIndex}`}>
              <p className="flex gap-2 text-[13px] font-semibold leading-relaxed text-[var(--ink)]">
                <span className="font-mono text-[11px] text-[var(--ink-4)]">{questionIndex + 1}.</span>
                {item.question}
              </p>

              <div className="mt-3 space-y-2">
                {item.options.map((option, optionIndex) => {
                  const isPicked = answer === optionIndex;
                  const isAnswer = optionIndex === item.answer;
                  const state = !answered
                    ? undefined
                    : isAnswer && (isPicked || correct)
                      ? "right"
                      : isPicked
                        ? "wrong"
                        : undefined;

                  return (
                    <button
                      className="quiz-option"
                      data-state={state}
                      disabled={correct}
                      key={optionIndex}
                      onClick={() => choose(questionIndex, optionIndex)}
                      type="button"
                    >
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-lg font-mono text-[10px] font-bold ${
                          state === "right"
                            ? "bg-[var(--teal)] text-white"
                            : state === "wrong"
                              ? "bg-[var(--hot)] text-white"
                              : "bg-[var(--line-soft)] text-[var(--ink-4)]"
                        }`}
                      >
                        {state === "right" ? (
                          <Check aria-hidden="true" size={11} weight="bold" />
                        ) : state === "wrong" ? (
                          <X aria-hidden="true" size={11} weight="bold" />
                        ) : (
                          LABELS[optionIndex]
                        )}
                      </span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence initial={false}>
                {answered && (
                  <motion.p
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden text-[11.5px] leading-relaxed text-[var(--ink-2)]"
                    exit={{ opacity: 0, height: 0 }}
                    initial={{ opacity: 0, height: 0 }}
                  >
                    <span
                      className={`mt-2.5 block rounded-2xl px-3 py-2.5 ${
                        correct ? "bg-[var(--teal-wash)]" : "bg-[var(--hot-wash)]"
                      }`}
                    >
                      {correct
                        ? item.explain
                        : (answer !== null && item.wrongExplains?.[answer]?.trim()) ||
                          "这个不对。回到上面的分步演示再走一遍，重点看运行记录那几行。"}
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
