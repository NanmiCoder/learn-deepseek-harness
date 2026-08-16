import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CaretRight, Check, List, Moon, Sun, Terminal, X } from "@phosphor-icons/react";
import { lessons } from "./lessons";
import { groups } from "./lessons/groups";
import { LessonView } from "./tutorial/LessonView";
import type { Lesson } from "./tutorial/types";

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

/**
 * 目录的阶段分组。
 *
 * 认 lesson.group（指向 groups.ts 里的 id）。eyebrow 不参与分组——它同时供
 * 面包屑和正文头使用，让它兼职分组键的话，文案改一次措辞就会把目录拆散。
 *
 * 按 groups.ts 的顺序排，没登记的 group 和没写 group 的课都会落到最后一个
 * 「其他」桶里，不会丢课。全部课都没写 group 时返回空数组，目录退回平铺——
 * 十几节课每节头上顶一行阶段名，比不分组更难读。
 */
type Stage = { title: string; goal?: string; items: Lesson[] };

function groupIdOf(lesson: Lesson): string | undefined {
  return (lesson as Lesson & { group?: string }).group;
}

function stagesOf(list: Lesson[]): Stage[] {
  if (!list.some((lesson) => groupIdOf(lesson))) return [];

  const buckets = new Map<string, Stage>();
  for (const group of groups) buckets.set(group.id, { title: group.title, goal: group.goal, items: [] });

  const orphans: Lesson[] = [];
  for (const lesson of list) {
    const bucket = buckets.get(groupIdOf(lesson) ?? "");
    if (bucket) bucket.items.push(lesson);
    else orphans.push(lesson);
  }

  const stages = [...buckets.values()].filter((stage) => stage.items.length > 0);
  if (orphans.length > 0) stages.push({ title: "其他", items: orphans });
  return stages;
}

/** 只标「要动手的」，不标「只要读的」——全标等于没标，少数派才扫得到。 */
function isHandsOn(lesson: Lesson): boolean {
  return lesson.kind === "hands-on";
}

function LessonRow({
  activeId,
  activeRef,
  done,
  lesson,
  onPick,
}: {
  activeId: string;
  activeRef: RefObject<HTMLButtonElement | null>;
  done: Set<string>;
  lesson: Lesson;
  onPick: (id: string) => void;
}) {
  const active = lesson.id === activeId;
  const finished = done.has(lesson.id);

  return (
    <li>
      <button
        aria-current={active ? "page" : undefined}
        className={`sidebar-lesson ${active ? "is-active" : ""}`}
        onClick={() => onPick(lesson.id)}
        ref={active ? activeRef : undefined}
        type="button"
      >
        {/* 完成态挂角标而不是换掉数字：学到一半时列表不会变成一串勾，编号还在 */}
        <span className={`sidebar-lesson-index ${finished ? "is-done" : ""}`}>
          {lesson.index}
          {finished && (
            <span className="sidebar-lesson-tick">
              <Check aria-hidden="true" size={7} weight="bold" />
            </span>
          )}
        </span>
        <span className="flex-1 truncate text-left" title={lesson.title}>
          {lesson.title}
        </span>
        {isHandsOn(lesson) && (
          <span className="sidebar-lesson-hands" title="这节要打开终端动手">
            <Terminal aria-hidden="true" size={10} weight="bold" />
          </span>
        )}
      </button>
      {/* summary 只给当前课：十几行列表里每行都带副标题会变成噪音，阶段名已经交代了「这段在讲什么」 */}
      {active && (
        <p className="mb-1 mt-0.5 pl-[34px] text-[10.5px] leading-snug text-[var(--ink-4)]">{lesson.summary}</p>
      )}
    </li>
  );
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
  const stages = useMemo(() => stagesOf(lessons), []);
  const grouped = stages.length > 0;
  const activeStage = stages.find((stage) => stage.items.some((item) => item.id === activeId));
  const activeStageIndex = activeStage ? stages.indexOf(activeStage) : -1;

  // 默认只展开当前阶段。十几节课平铺会溢出一屏，折叠之后读者先看到的是
  // 「一共几个阶段、我在第几个」，展开的那一组才给到课程粒度。
  const [openStages, setOpenStages] = useState<Set<string>>(
    () => new Set(activeStage ? [activeStage.title] : []),
  );
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeStage) return;
    setOpenStages((current) => (current.has(activeStage.title) ? current : new Set(current).add(activeStage.title)));
  }, [activeStage]);

  // 目录比可视区长时，当前课可能落在视口外。nearest 只在真的看不见时才滚，
  // 不会每次切课都把整列甩一下。
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  function toggleStage(title: string) {
    setOpenStages((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

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
          <span className="mt-0.5 block text-[10px] text-[var(--ink-4)]">{lessons.length} 节课，从「模型只会说话」讲起</span>
        </span>
      </div>

      {/* 进度：左边答「我在整条路的哪一段」，右边答「一共多长、走了多少」。十几节之后单给总数颗粒度太粗。 */}
      <div className="sidebar-progress mt-5 rounded-[1.125rem] px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[11px] font-semibold text-[var(--ink-3)]">
            {activeStage ? `阶段 ${activeStageIndex + 1}/${stages.length} · ${activeStage.title}` : "学习进度"}
          </span>
          <span className="shrink-0 font-mono text-[11px] font-semibold text-[var(--mint-deep)]">
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

      <nav aria-label="课程目录" className="thin-scroll mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {!grouped && (
          <ol className="space-y-0.5">
            {lessons.map((lesson) => (
              <LessonRow
                activeId={activeId}
                activeRef={activeRef}
                done={done}
                key={lesson.id}
                lesson={lesson}
                onPick={onPick}
              />
            ))}
          </ol>
        )}

        {stages.map((stage) => {
          const doneCount = stage.items.filter((item) => done.has(item.id)).length;
          const open = openStages.has(stage.title);
          const hasActive = stage === activeStage;

          return (
            <section className="mb-1.5" key={stage.title}>
              <button
                aria-expanded={open}
                className="sidebar-stage-head"
                onClick={() => toggleStage(stage.title)}
                title={stage.goal}
                type="button"
              >
                <CaretRight
                  aria-hidden="true"
                  className={`shrink-0 text-[var(--ink-4)] transition-transform ${open ? "rotate-90" : ""}`}
                  size={11}
                  weight="bold"
                />
                <span
                  className={`flex-1 truncate text-left text-[11.5px] font-semibold ${
                    hasActive ? "text-[var(--ink)]" : "text-[var(--ink-2)]"
                  }`}
                >
                  {stage.title}
                </span>
                <span aria-hidden="true" className="sidebar-stage-bar">
                  <i style={{ width: `${(doneCount / stage.items.length) * 100}%` }} />
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--ink-4)]">
                  {doneCount}/{stage.items.length}
                </span>
              </button>

              {open && (
                <ol className="mt-0.5 space-y-0.5 pl-1.5">
                  {stage.items.map((lesson) => (
                    <LessonRow
                      activeId={activeId}
                      activeRef={activeRef}
                      done={done}
                      key={lesson.id}
                      lesson={lesson}
                      onPick={onPick}
                    />
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </nav>

      {/* 代码出处由每节正文底部的落款负责（那处是现算的，不会失真）。这里放仓库入口。 */}
      <a
        className="sidebar-note mt-3 block rounded-[1.125rem] px-3 py-2 text-center text-[10px] text-[var(--ink-4)]"
        href="https://github.com/NanmiCoder/learn-deepseek-harness"
        target="_blank"
        rel="noreferrer"
      >
        GitHub · MIT
      </a>
    </>
  );
}

export function App() {
  const [activeId, setActiveId] = useState<string>(lessonIdFromHash);
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

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
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // 抽屉是模态层：打开时焦点进去，Tab 在里面循环，关闭后还给汉堡按钮。
  // 不做的话 Tab 会走到背后被遮住的正文里，键盘用户看不见焦点在哪。
  useEffect(() => {
    if (!drawerOpen) return;
    const raf = window.requestAnimationFrame(() => drawerCloseRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  }, []);

  const trapDrawerTab = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

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

  const found = lessons.findIndex((lesson) => lesson.id === activeId);
  const index = found === -1 ? 0 : found;
  const lesson = lessons[index];
  const previous = lessons[index - 1];
  const next = lessons[index + 1];

  return (
    <div className="min-h-[100dvh] bg-[var(--paper)] p-2 text-[var(--ink)] sm:p-3 lg:p-4">
      <div className="tutorial-shell mx-auto flex h-[calc(100dvh-1rem)] min-h-0 max-w-[1560px] overflow-hidden rounded-[1.75rem] sm:h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] lg:h-[calc(100dvh-2rem)]">
        {/*
          侧边栏 284px + 分步演示的步骤条 212px 一起吃掉 500 多 px。断点放在 lg(1024) 时，
          1024 宽下留给关系图的只剩 376px，图会被整体缩到 0.41，节点标签只剩 3.7px 完全读不了。
          抬到 xl(1280) 之后，1024~1279 走的是宽屏单栏布局，图拿到整幅宽度。
        */}
        <aside className="soft-sidebar hidden w-[284px] shrink-0 flex-col p-5 backdrop-blur-3xl xl:flex">
          <Sidebar activeId={activeId} done={done} onPick={pick} />
        </aside>

        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-30 bg-[#014e60]/24 p-3 backdrop-blur-sm xl:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={closeDrawer}
            >
              <motion.aside
                aria-label="课程目录"
                aria-modal="true"
                animate={{ x: 0 }}
                className="soft-panel flex h-full w-[min(88vw,320px)] flex-col rounded-[1.75rem] p-5"
                exit={{ x: -24 }}
                initial={{ x: -24 }}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={trapDrawerTab}
                ref={drawerRef}
                role="dialog"
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
              >
                <div className="mb-3 flex justify-end">
                  <button
                    aria-label="关闭课程目录"
                    className="soft-button grid h-11 w-11 place-items-center rounded-xl active:scale-95"
                    onClick={closeDrawer}
                    ref={drawerCloseRef}
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
                className="soft-button grid h-11 w-11 shrink-0 place-items-center rounded-xl active:scale-95 xl:hidden"
                onClick={() => setDrawerOpen(true)}
                ref={drawerTriggerRef}
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
                  nextLesson={next}
                  onGoNext={next ? () => pick(next.id) : undefined}
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
                  {previous?.title ?? "这是第一课"}
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
                  {next?.title ?? "这是最后一课"}
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
