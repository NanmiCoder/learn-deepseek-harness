import type { Lesson } from "../tutorial/types";

/**
 * 业务场景是 ToDo 网站；事件名称和父子会话关系取自真实 JSONL 运行快照。
 * 这节刻意少讲概念，把信息密度留给架构图与逐步运行记录。
 */
export const todoAgentFlow: Lesson = {
  id: "todo-agent-flow",
  index: "08",
  title: "三个 Agent，做出一个 ToDo 网站",
  summary: "看清一次真实协作的数据流",
  eyebrow: "真实业务实战",
  readingMinutes: 8,
  oneLiner: "从一句需求到可验收网站，沿着事件看清整条协作链。",
  architectureFirst: true,
  analogy:
    "主 Agent 像交付负责人：先拆任务，再把界面、状态逻辑和验收分给三位同事。每个人都在自己的会话里工作，但共享同一份项目；结果回到负责人手里后，统一验收和交付。ToDo 是业务外壳，图里的事件关系来自真实运行快照。",
  concepts: [
    {
      term: "主 Agent",
      plain: "保留总目标，负责规划、派工、汇总和最后交付。",
      source: "父会话 · delegationDepth=0",
    },
    {
      term: "子 Agent",
      plain: "拿到一个边界清楚的子任务，在独立会话里完成并返回结果。",
      source: "子会话 · origin=subagent",
    },
    {
      term: "工具回路",
      plain: "模型只提出调用；Harness 执行后把结果写回下一步上下文。",
      source: "tool/call → tool/result",
    },
    {
      term: "共享工作区",
      plain: "代码和构建产物是多方协作的共同事实，不靠口头同步。",
      source: "read / edit / bash",
    },
  ],
  stage: {
    columnLabels: ["01 · 输入", "02 · 编排", "03 · 并行执行", "04 · 工具与产物"],
    legendLabels: {
      core: "主控",
      plugin: "子 Agent",
      external: "人 / 工具",
      data: "计划 / 产物",
    },
    scrollOnMobile: true,
    overview: {
      columnLabels: ["01 · 输入", "02 · 编排", "03 · 协作", "04 · 执行"],
      summary: "需求 → 规划 → 并发协作 → 工具落盘 → 验收 → 统一交付",
      nodes: [
        { id: "overview-user", label: "产品需求", sub: "业务目标", col: 0, row: 1, kind: "external", kindLabel: "输入" },
        { id: "overview-delivery", label: "可验收网站", sub: "统一交付", col: 0, row: 2, kind: "data", kindLabel: "交付" },
        { id: "overview-plan", label: "任务计划", sub: "规划与更新", col: 1, row: 0, kind: "data", kindLabel: "任务图" },
        { id: "overview-main", label: "主 Agent", sub: "编排与汇总", col: 1, row: 1, kind: "core", kindLabel: "主控" },
        { id: "overview-agents", label: "子 Agent 组", sub: "界面 · 逻辑 · 验收", col: 2, row: 1, kind: "plugin", kindLabel: "并行协作" },
        { id: "overview-tools", label: "工具执行层", sub: "read · edit · bash", col: 3, row: 1, kind: "external", kindLabel: "工具" },
        { id: "overview-workspace", label: "共享工作区", sub: "源码 · 构建产物", col: 3, row: 2, kind: "data", kindLabel: "共同事实" },
      ],
      edges: [
        { from: "overview-user", to: "overview-main" },
        { from: "overview-main", to: "overview-plan" },
        { from: "overview-main", to: "overview-agents" },
        { from: "overview-agents", to: "overview-tools" },
        { from: "overview-tools", to: "overview-workspace" },
        { from: "overview-main", to: "overview-delivery" },
        { from: "overview-delivery", to: "overview-user" },
      ],
    },
    nodes: [
      { id: "user", label: "产品需求", sub: "做一个 ToDo 网站", col: 0, row: 1, kind: "external", kindLabel: "输入" },
      { id: "delivery", label: "可验收网站", sub: "界面 + 逻辑 + 测试", col: 0, row: 2, kind: "data", kindLabel: "交付" },
      { id: "plan", label: "任务计划", sub: "todo_write", col: 1, row: 0, kind: "data", kindLabel: "任务图" },
      { id: "main", label: "主 Agent", sub: "父会话 · 总目标", col: 1, row: 1, kind: "core", kindLabel: "主控" },
      { id: "ui", label: "界面 Agent", sub: "列表 · 表单 · 主题", col: 2, row: 0, kind: "plugin", kindLabel: "子 AGENT" },
      { id: "logic", label: "逻辑 Agent", sub: "增删改 · 持久化", col: 2, row: 1, kind: "plugin", kindLabel: "子 AGENT" },
      { id: "qa", label: "验收 Agent", sub: "构建 · 交互 · 回归", col: 2, row: 2, kind: "plugin", kindLabel: "子 AGENT" },
      { id: "tools", label: "工具执行层", sub: "read · edit · bash", col: 3, row: 1, kind: "external", kindLabel: "工具" },
      { id: "workspace", label: "共享工作区", sub: "源码 · 构建产物", col: 3, row: 2, kind: "data", kindLabel: "共同事实" },
    ],
    edges: [
      { from: "user", to: "main", label: "需求" },
      { from: "main", to: "plan", label: "拆任务" },
      { from: "plan", to: "main", label: "任务图" },
      { from: "main", to: "ui", label: "派工" },
      { from: "ui", to: "main", label: "结果" },
      { from: "main", to: "logic", label: "派工" },
      { from: "logic", to: "main", label: "结果" },
      { from: "main", to: "qa", label: "派工" },
      { from: "qa", to: "main", label: "报告" },
      { from: "ui", to: "tools", label: "读写" },
      { from: "logic", to: "tools", label: "读写" },
      { from: "qa", to: "tools", label: "运行" },
      { from: "tools", to: "workspace", label: "执行" },
      { from: "workspace", to: "qa", label: "验收物" },
      { from: "main", to: "delivery", label: "汇总" },
      { from: "delivery", to: "user", label: "交付" },
    ],
  },
  steps: [
    {
      id: "s1",
      title: "需求先进入父会话",
      detail: "用户只给业务目标。Harness 建立父会话，把原话记成 user/message，再开启第一个 turn。",
      activeNodes: ["user", "main"],
      activeEdges: ["user->main"],
      log: [
        { kind: "event", text: "session { delegationDepth=0 }" },
        { kind: "io", text: "user/message { goal=开发一个简单的 ToDo 管理网站 }" },
        { kind: "event", text: "turn/start { turn=1 }" },
      ],
    },
    {
      id: "s2",
      title: "主 Agent 先写任务图",
      detail: "它不直接开写，而是用 todo_write 固化三条任务；计划也成为可观察、可更新的数据。",
      activeNodes: ["main", "plan"],
      activeEdges: ["main->plan", "plan->main"],
      log: [
        { kind: "call", text: "assistant/message { tool-call: todo_write }" },
        { kind: "call", text: "tool/call { name=todo_write, todos=3 }" },
        { kind: "state", text: "界面与逻辑 in_progress · 验收 pending" },
        { kind: "ok", text: "tool/result { 1 pending, 2 in progress, 0 completed }" },
      ],
    },
    {
      id: "s3",
      title: "同一响应并发派出三路",
      detail: "一个 assistant/message 同时带出三次 subagent 调用；调度层并发启动，不用排队等前一个完成。",
      activeNodes: ["plan", "main", "ui", "logic", "qa"],
      activeEdges: ["plan->main", "main->ui", "main->logic", "main->qa"],
      log: [
        { kind: "call", text: "assistant/message { tool-call × 3 }" },
        { kind: "call", text: "tool/call { name=subagent, label=界面 Agent }" },
        { kind: "call", text: "tool/call { name=subagent, label=逻辑 Agent }" },
        { kind: "call", text: "tool/call { name=subagent, label=验收 Agent }" },
      ],
    },
    {
      id: "s4",
      title: "每个子任务都有独立会话",
      detail: "三个子 Agent 各有上下文和日志，并用 parentSession 指回父会话；权限不会在子会话里变宽。",
      activeNodes: ["main", "ui", "logic", "qa"],
      activeEdges: ["main->ui", "main->logic", "main->qa"],
      log: [
        { kind: "event", text: "session { origin=subagent, parentSession=main, delegationDepth=1 }" },
        { kind: "event", text: "subagent/descriptor { mode=one-shot, label=界面 Agent }" },
        { kind: "event", text: "subagent/descriptor { mode=one-shot, label=逻辑 Agent }" },
        { kind: "event", text: "subagent/descriptor { mode=one-shot, label=验收 Agent }" },
      ],
    },
    {
      id: "s5",
      title: "Agent 通过工具改变项目",
      detail: "Agent 只请求 read、edit、bash；真正读写和运行命令的是工具执行层，结果落进共享工作区。",
      activeNodes: ["ui", "logic", "qa", "tools", "workspace"],
      activeEdges: ["ui->tools", "logic->tools", "qa->tools", "tools->workspace", "workspace->qa"],
      log: [
        { kind: "call", text: "tool/call { name=read, target=现有项目结构 }" },
        { kind: "call", text: "tool/call { name=edit, target=界面与状态逻辑 }" },
        { kind: "call", text: "tool/call { name=bash, command=构建与测试 }" },
        { kind: "io", text: "workspace { App.tsx, styles.css, tests }" },
      ],
    },
    {
      id: "s6",
      title: "结果逐层回流",
      detail: "callId 先把工具请求和结果配成一对；子 Agent 再把结论返回父会话，主 Agent 据此决定是否返工。",
      activeNodes: ["workspace", "tools", "ui", "logic", "qa", "main"],
      activeEdges: ["tools->workspace", "workspace->qa", "ui->main", "logic->main", "qa->main"],
      log: [
        { kind: "ok", text: "tool/result { callId=build, isError=false }" },
        { kind: "ok", text: "tool/result { callId=ui-agent, text=UI_DONE }" },
        { kind: "ok", text: "tool/result { callId=logic-agent, text=LOGIC_DONE }" },
        { kind: "state", text: "tool/result { callId=qa-agent, text=验收通过 }" },
      ],
    },
    {
      id: "s7",
      title: "主 Agent 汇总后统一交付",
      detail: "父会话更新计划、核对验收结果并生成最终答复；整条因果链留在 JSONL 中，可追踪也可重放。",
      activeNodes: ["user", "delivery", "main", "plan", "qa", "workspace"],
      activeEdges: ["qa->main", "plan->main", "main->delivery", "delivery->user"],
      log: [
        { kind: "call", text: "tool/call { name=todo_write, completed=3 }" },
        { kind: "ok", text: "assistant/message { ToDo 网站已完成并通过构建与交互验收 }" },
        { kind: "event", text: "turn/end { reason=completed }" },
        { kind: "state", text: "JSONL：需求 → 计划 → 派工 → 工具 → 结果 → 交付" },
      ],
    },
  ],
  misconceptions: [
    {
      wrong: "三个 Agent 是三段提示词，仍然共用同一份上下文。",
      right:
        "每个子 Agent 都有独立 session，带 parentSession、origin=subagent 和 delegationDepth。它们共享项目文件，不共享一锅不断膨胀的对话上下文。",
    },
    {
      wrong: "子 Agent 改完代码，主 Agent 会自动知道所有细节。",
      right:
        "主 Agent 能看到的是子任务结果和共享工作区的新状态。关键结论要在 tool/result 里返回，最终质量仍由父会话的汇总与验收负责。",
    },
  ],
  takeaways: [
    {
      title: "把图上的箭头翻译成 JSONL",
      intro: "业务流程很大，但落盘后始终是这几类事件在接力。",
      items: [
        { label: "需求进入", text: "user/message 把用户原话写进父会话。" },
        { label: "规划成形", text: "todo_write 的 tool/call 与 tool/result 记录任务状态。" },
        { label: "并发派工", text: "同一条 assistant/message 可以携带多次 subagent 调用。" },
        { label: "子会话", text: "session 通过 parentSession 指回主控，delegationDepth 记录层级。" },
        { label: "真实执行", text: "read、edit、bash 产生 tool/call，执行结果用 callId 配对回填。" },
        { label: "结束交付", text: "assistant/message 给出最终结果，turn/end 关闭本轮。" },
      ],
    },
  ],
  quiz: [
    {
      question: "为什么子 Agent 的结果必须回到主 Agent，而不是直接分别回复用户？",
      options: [
        "因为子 Agent 没有模型能力",
        "因为主 Agent 保留总目标，要负责合并、冲突处理和统一验收",
        "因为 JSONL 只能保存一个 Agent",
      ],
      answer: 1,
      explain: "子 Agent 优化局部任务，主 Agent 才拥有总目标和交付责任。fan-out 之后必须 fan-in，协作才形成闭环。",
    },
    {
      question: "图中真正改变项目文件的是谁？",
      options: ["模型输出的文字本身", "工具执行层", "任务计划"],
      answer: 1,
      explain: "模型和 Agent 只提出工具调用；执行层完成读写与命令运行，再把结果作为 tool/result 写回会话。",
    },
  ],
  evidence: "事件结构来自真实 JSONL 运行快照",
  bridge:
    "八节课到这里形成闭环：前七节拆开解释零件，这一节把它们重新装回真实交付。以后读任何一段 Harness 运行记录，都先找父会话，再沿着计划、子会话、tool/call 与 tool/result 一路追到最终产物。",
};
