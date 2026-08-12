export function LessonControls({
  currentStep,
  isPlaying,
  onNext,
  onPrevious,
  onReset,
  onTogglePlaying,
  positionLabel,
  stepTitles,
}: {
  currentStep: number;
  isPlaying: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onTogglePlaying: () => void;
  positionLabel?: string;
  stepTitles: string[];
}) {
  const totalSteps = stepTitles.length;
  const atEnd = currentStep === totalSteps - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-[1.125rem] pt-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className="soft-action" onClick={onReset} title="重置到第一步" type="button">
          ↺ <span className="hidden sm:inline">重置</span>
        </button>
        <button className="soft-action" disabled={currentStep === 0} onClick={onPrevious} type="button">
          ← 上一步
        </button>
        <button className="soft-action soft-action--primary" onClick={onTogglePlaying} type="button">
          {isPlaying ? "❙❙ 暂停" : atEnd ? "▶ 从头播" : "▶ 播放"}
        </button>
        <button className="soft-action" disabled={atEnd} onClick={onNext} type="button">
          下一步 →
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/*
          原来这条只在 xl 以上显示，笔记本屏幕根本看不到——快捷键做了等于没做。
          窄屏收成两个箭头键，宽屏才把「空格 播放」也摆出来。
        */}
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-3)]">
          <kbd className="control-kbd">←</kbd>
          <kbd className="control-kbd">→</kbd>
          翻步
          <span className="hidden items-center gap-1.5 sm:flex">
            <kbd className="control-kbd ml-1">空格</kbd>
            播放
          </span>
        </span>
        <span className="font-mono text-[11px] font-semibold text-[var(--ink)]">
          {positionLabel ?? `${String(currentStep + 1).padStart(2, "0")} / ${String(totalSteps).padStart(2, "0")}`}
        </span>
      </div>
    </div>
  );
}
