import { useCallback, useEffect, useState } from "react";

export type LessonPlayerStatus = "idle" | "playing" | "paused" | "complete";

export function useLessonPlayer(totalSteps: number, interval = 2400) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const next = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
  }, [totalSteps]);

  const previous = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const goTo = useCallback(
    (step: number) => {
      setIsPlaying(false);
      setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
    },
    [totalSteps],
  );

  const togglePlaying = useCallback(() => {
    if (currentStep === totalSteps - 1) setCurrentStep(0);
    setIsPlaying((playing) => !playing);
  }, [currentStep, totalSteps]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      setCurrentStep((step) => {
        if (step >= totalSteps - 1) {
          setIsPlaying(false);
          return step;
        }
        return step + 1;
      });
    }, interval);
    return () => window.clearTimeout(timer);
  }, [currentStep, interval, isPlaying, totalSteps]);

  // 左右方向键翻步，空格播放/暂停。在输入框里打字时不拦截。
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === " " && target?.tagName !== "BUTTON") {
        event.preventDefault();
        togglePlaying();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, togglePlaying]);

  const status: LessonPlayerStatus = isPlaying
    ? "playing"
    : currentStep === totalSteps - 1
      ? "complete"
      : currentStep === 0
        ? "idle"
        : "paused";

  return {
    currentStep,
    goTo,
    isPlaying,
    next,
    previous,
    reset,
    status,
    togglePlaying,
  };
}
