import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, List, Moon, Sun, X } from "@phosphor-icons/react";
import { lessons } from "./lessons";
import { LessonView } from "./tutorial/LessonView";

const STORAGE_KEY = "dsh-course-progress-v3";
const THEME_STORAGE_KEY = "dsh-theme";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function lessonIdFromHash(): string {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  return lessons.some((lesson) => lesson.id === hash) ? hash : lessons[0].id;
}

function Sidebar({
  activeId,
  done,
  onPick,
}: {
  activeId: string;
  done: Set<string>;
  onPick: (id: string) => void;
}) {
  const percent = Math.round((done.size / lessons.length) * 100);

  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <span className="brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[17px] font-bold text-white">
          H
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
            读懂 DeepSeek Harness
          </span>
          <span className="mt-0.5 block text-[10px] text-[var(--ink-4)]">{lessons.length} 节课，从零开始</span>
        </span>
      </div>

      <div className="sidebar-progress mt-6 rounded-[1.125rem] px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-[var(--ink-3)]">学习进度</span>
          <span className="font-mono text-[11px] font-semibold text-[var(--mint-deep)]">
            {done.size}/{lessons.length}
          </span>
        </div>
        <div className="progress-track mt-2.5 h-1.5 overflow-hidden rounded-full">
          <motion.div
            animate={{ width: `${percent}%` }}
            className="progress-fill h-full rounded-full"
            initial={false}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
        </div>
      </div>

      <nav aria-label="课程目录" className="thin-scroll mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <ol className="space-y-1.5">
          {lessons.map((lesson) => {
            const active = lesson.id === activeId;
            const finished = done.has(lesson.id);

            return (
              <li key={lesson.id}>
                <button
                  aria-current={active ? "page" : undefined}
                  className={`group relative grid w-full grid-cols-[30px_1fr] items-start gap-2.5 rounded-2xl px-3 py-3 text-left transition-colors active:scale-[0.99] ${
                    active ? "" : "sidebar-lesson-button--idle"
                  }`}
                  onClick={() => onPick(lesson.id)}
                  type="button"
                >
                  {active && (
                    <motion.span
                      className="sidebar-active-surface absolute inset-0 rounded-2xl"
                      layoutId="sidebar-active"
                      transition={{ type: "spring", stiffness: 210, damping: 26 }}
                    />
                  )}
                  <span
                    className={`relative grid h-[26px] w-[26px] place-items-center rounded-xl font-mono text-[10px] font-bold transition-colors ${
                      finished
                        ? "bg-[var(--teal)] text-white"
                        : active
                          ? "bg-[var(--mint-soft)] text-[var(--mint-deep)]"
                          : "sidebar-index-surface text-[var(--ink-4)]"
                    }`}
                  >
                    {finished ? <Check aria-hidden="true" size={13} weight="bold" /> : lesson.index}
                  </span>
                  <span className="relative min-w-0">
                    <span
                      className={`block text-[13px] font-semibold leading-tight tracking-[-0.01em] ${
                        active ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
                      }`}
                    >
                      {lesson.title}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-[var(--ink-4)]">{lesson.summary}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="sidebar-note mt-4 rounded-[1.125rem] p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--ink-3)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          内部资料
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--ink-4)]">
          内容基于源码整理，仅在私有仓库内使用。
        </p>
      </div>
    </>
  );
}

export function App() {
  const [activeId, setActiveId] = useState<string>(lessonIdFromHash);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "dark" ? "#06171d" : "#e9f1f2");
  }, [theme]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
      setDone(new Set(saved.filter((id) => lessons.some((lesson) => lesson.id === id))));
    } catch {
      setDone(new Set());
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveId(lessonIdFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const pick = useCallback((id: string) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    window.location.hash = id;
    setActiveId(id);
    setDrawerOpen(false);
  }, []);

  const markDone = useCallback((id: string) => {
    setDone((current) => {
      if (current.has(id)) return current;
      const next = new Set(current).add(id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const nextTheme = current === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Private browsing can reject storage; the in-memory theme still works.
      }
      return nextTheme;
    });
  }, []);

  const index = lessons.findIndex((lesson) => lesson.id === activeId);
  const lesson = lessons[index];
  const previous = lessons[index - 1];
  const next = lessons[index + 1];

  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] p-2 text-[var(--ink)] sm:p-3 lg:p-4">
      <div className="tutorial-shell mx-auto flex h-[calc(100dvh-1rem)] min-h-0 max-w-[1560px] overflow-hidden rounded-[1.75rem] sm:h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] lg:h-[calc(100dvh-2rem)]">
        <aside className="soft-sidebar hidden w-[284px] shrink-0 flex-col p-5 backdrop-blur-3xl lg:flex">
          <Sidebar activeId={activeId} done={done} onPick={pick} />
        </aside>

        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-30 bg-[#014e60]/24 p-3 backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            >
              <motion.aside
                animate={{ x: 0 }}
                className="soft-panel flex h-full w-[min(88vw,320px)] flex-col rounded-[1.75rem] p-5"
                exit={{ x: -24 }}
                initial={{ x: -24 }}
                onClick={(event) => event.stopPropagation()}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
              >
                <div className="mb-3 flex justify-end">
                  <button
                    aria-label="关闭课程目录"
                    className="soft-button grid h-11 w-11 place-items-center rounded-xl active:scale-95"
                    onClick={() => setDrawerOpen(false)}
                    type="button"
                  >
                    <X aria-hidden="true" size={16} weight="regular" />
                  </button>
                </div>
                <Sidebar activeId={activeId} done={done} onPick={pick} />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="app-chrome flex min-h-[60px] shrink-0 items-center justify-between gap-3 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="打开课程目录"
                className="soft-button grid h-11 w-11 shrink-0 place-items-center rounded-xl active:scale-95 lg:hidden"
                onClick={() => setDrawerOpen(true)}
                type="button"
              >
                <List aria-hidden="true" size={17} weight="regular" />
              </button>
              <div className="flex min-w-0 items-center gap-2 text-[11px] text-[var(--ink-3)]">
                <span className="shrink-0">{lesson.eyebrow}</span>
                <span className="text-[var(--ink-4)]">/</span>
                <span className="truncate font-semibold text-[var(--ink-2)]">{lesson.title}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {done.has(lesson.id) && (
                <span className="hidden items-center gap-1.5 rounded-full bg-[var(--teal-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--teal-deep)] sm:inline-flex">
                  <Check aria-hidden="true" size={11} weight="bold" />
                  已完成
                </span>
              )}
              <button
                aria-label={theme === "dark" ? "切换到浅色模式" : "切换到暗色模式"}
                aria-pressed={theme === "dark"}
                className="soft-button theme-toggle grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                onClick={toggleTheme}
                title={theme === "dark" ? "切换到浅色模式" : "切换到暗色模式"}
                type="button"
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: theme === "dark" ? -45 : 45, scale: 0.7 }}
                    initial={{ opacity: 0, rotate: theme === "dark" ? 45 : -45, scale: 0.7 }}
                    key={theme}
                    transition={{ duration: 0.18 }}
                  >
                    {theme === "dark" ? (
                      <Sun aria-hidden="true" size={17} weight="regular" />
                    ) : (
                      <Moon aria-hidden="true" size={17} weight="regular" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
              <span className="font-mono text-[10px] text-[var(--ink-4)]">
                {lesson.index}/{String(lessons.length).padStart(2, "0")}
              </span>
            </div>
          </header>

          <div className="thin-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" ref={scrollRef}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                initial={{ opacity: 0, x: 14 }}
                key={lesson.id}
                transition={{ type: "spring", stiffness: 170, damping: 24 }}
              >
                <LessonView
                  key={lesson.id}
                  lesson={lesson}
                  onPass={() => markDone(lesson.id)}
                  passed={done.has(lesson.id)}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="app-chrome grid min-h-[62px] shrink-0 grid-cols-2 backdrop-blur-xl">
            <button
              className="app-nav-button flex items-center gap-2.5 px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35 sm:px-6"
              disabled={!previous}
              onClick={() => previous && pick(previous.id)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="shrink-0 text-[var(--ink-3)]" size={16} weight="regular" />
              <span className="min-w-0">
                <span className="block text-[9px] font-semibold tracking-[0.06em] text-[var(--ink-4)]">上一课</span>
                <span className="mt-0.5 block truncate text-[12px] font-semibold text-[var(--ink-2)]">
                  {previous?.title ?? "这里是起点"}
                </span>
              </span>
            </button>
            <button
              className="app-nav-button flex items-center justify-end gap-2.5 border-l border-[var(--border-glass)] px-4 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-35 sm:px-6"
              disabled={!next}
              onClick={() => next && pick(next.id)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block text-[9px] font-semibold tracking-[0.06em] text-[var(--ink-4)]">下一课</span>
                <span className="mt-0.5 block truncate text-[12px] font-semibold text-[var(--ink-2)]">
                  {next?.title ?? "全部学完了"}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="shrink-0 text-[var(--ink-3)]" size={16} weight="regular" />
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
}
