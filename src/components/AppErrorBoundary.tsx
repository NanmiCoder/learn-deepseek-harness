import { Component, type ErrorInfo, type ReactNode } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("页面渲染失败", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--paper)] px-6 text-[var(--ink)]">
        <section className="soft-panel w-full max-w-md rounded-[1.75rem] bg-white/70 p-8 backdrop-blur-xl">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">这一页没能显示出来</h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
            刷新一下通常就好了。学习进度存在浏览器本地，不会因为刷新丢掉。
          </p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--mint)] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_20px_rgba(47,196,122,0.24)] transition-transform active:translate-y-px"
            onClick={() => window.location.reload()}
            type="button"
          >
            <ArrowClockwise aria-hidden="true" size={16} weight="regular" />
            刷新页面
          </button>
        </section>
      </main>
    );
  }
}
