import { ArrowCounterClockwise, CaretLeft, CaretRight, Pause, Play } from "@phosphor-icons/react";

export function LessonControls({
  currentStep,
  isPlaying,
  onGoTo,
  onNext,
  onPrevious,
  onReset,
  onTogglePlaying,
  stepTitles,
}: {
  currentStep: number;
  isPlaying: boolean;
  onGoTo: (step: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onTogglePlaying: () => void;
  stepTitles: string[];
}) {
  const totalSteps = stepTitles.length;
  const atEnd = currentStep === totalSteps - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-[var(--line-soft)] bg-white/45 px-4 py-3 backdrop-blur-xl sm:px-5">
      <div className="flex items-center gap-2">
        <button
          aria-label="重置到第一步"
          className="lesson-control-button"
          onClick={onReset}
          title="重置"
          type="button"
        >
          <ArrowCounterClockwise aria-hidden="true" size={16} weight="regular" />
        </button>
        <button
          aria-label="上一步"
          className="lesson-control-button"
          disabled={currentStep === 0}
          onClick={onPrevious}
          title="上一步"
          type="button"
        >
          <CaretLeft aria-hidden="true" size={16} weight="bold" />
        </button>
        <button
          aria-label={isPlaying ? "暂停" : atEnd ? "从头播放" : "自动播放"}
          className="lesson-control-button"
          data-tone="play"
          onClick={onTogglePlaying}
          title={isPlaying ? "暂停" : atEnd ? "从头播放" : "播放"}
          type="button"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" size={15} weight="fill" />
          ) : (
            <Play aria-hidden="true" size={15} weight="fill" />
          )}
        </button>
        <button
          aria-label="下一步"
          className="lesson-control-button"
          disabled={atEnd}
          onClick={onNext}
          title="下一步"
          type="button"
        >
          <CaretRight aria-hidden="true" size={16} weight="bold" />
        </button>
      </div>

      <span className="hidden items-center gap-1.5 text-[10px] text-[var(--ink-4)] xl:flex">
        <kbd className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[9px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">←</kbd>
        <kbd className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[9px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">→</kbd>
        翻步
      </span>

      <div className="flex min-w-[170px] flex-1 items-center justify-end gap-3">
        <div aria-label={`第 ${currentStep + 1} 步，共 ${totalSteps} 步`} className="flex items-center gap-1.5">
          {stepTitles.map((title, index) => (
            <button
              aria-label={`第 ${index + 1} 步：${title}`}
              aria-current={index === currentStep ? "step" : undefined}
              className={`h-2.5 rounded-full transition-[width,background-color] duration-300 active:scale-90 ${
                index === currentStep
                  ? "w-7 bg-[var(--mint)]"
                  : index < currentStep
                    ? "w-2.5 bg-[#9ee0bd]"
                    : "w-2.5 bg-[#dde9e5] hover:bg-[#c6ddd5]"
              }`}
              key={index}
              onClick={() => onGoTo(index)}
              title={`${String(index + 1).padStart(2, "0")} ${title}`}
              type="button"
            />
          ))}
        </div>
        <span className="w-11 shrink-0 text-right font-mono text-[10px] text-[var(--ink-3)]">
          {String(currentStep + 1).padStart(2, "0")}/{String(totalSteps).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
