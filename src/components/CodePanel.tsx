import { Fragment, useMemo } from "react";
import { FileCode, Lightbulb } from "@phosphor-icons/react";
import type { CodeBlock } from "../tutorial/types";

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "import", "export", "from", "default", "class", "extends", "implements",
  "new", "async", "await", "type", "interface", "public", "private", "protected",
  "readonly", "static", "this", "null", "undefined", "true", "false", "void",
  "as", "in", "of", "typeof", "instanceof", "throw", "try", "catch", "finally",
  "switch", "case", "break", "continue", "yield", "declare", "namespace", "enum",
  "satisfies", "super", "get", "set",
]);

type Token = { text: string; cls: string };

const PATTERN =
  /(\/\/[^\n]*)|(`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

/** 很轻的高亮：只区分注释、字符串、关键字、数字和函数名，颜色都压得很淡。 */
function tokenize(line: string, insideBlockComment: boolean): { tokens: Token[]; stillInside: boolean } {
  if (insideBlockComment) {
    const end = line.indexOf("*/");
    if (end === -1) return { tokens: [{ text: line, cls: "tok-com" }], stillInside: true };
    return {
      tokens: [
        { text: line.slice(0, end + 2), cls: "tok-com" },
        ...tokenize(line.slice(end + 2), false).tokens,
      ],
      stillInside: false,
    };
  }

  const blockStart = line.indexOf("/*");
  if (blockStart !== -1 && !line.slice(0, blockStart).includes("//")) {
    const head = tokenize(line.slice(0, blockStart), false).tokens;
    const rest = tokenize(line.slice(blockStart + 2), true);
    return {
      tokens: [...head, { text: "/*", cls: "tok-com" }, ...rest.tokens],
      stillInside: rest.stillInside,
    };
  }

  const tokens: Token[] = [];
  let cursor = 0;
  PATTERN.lastIndex = 0;
  let match = PATTERN.exec(line);

  while (match) {
    if (match.index > cursor) tokens.push({ text: line.slice(cursor, match.index), cls: "" });

    const [raw, comment, str, num, word] = match;
    if (comment) tokens.push({ text: raw, cls: "tok-com" });
    else if (str) tokens.push({ text: raw, cls: "tok-str" });
    else if (num) tokens.push({ text: raw, cls: "tok-num" });
    else if (word) {
      const isCall = line[match.index + raw.length] === "(";
      tokens.push({ text: raw, cls: KEYWORDS.has(word) ? "tok-key" : isCall ? "tok-fn" : "" });
    }

    cursor = match.index + raw.length;
    match = PATTERN.exec(line);
  }

  if (cursor < line.length) tokens.push({ text: line.slice(cursor), cls: "" });
  return { tokens, stillInside: false };
}

export function CodePanel({ code }: { code: CodeBlock }) {
  const lines = useMemo(() => {
    const raw = code.content.replace(/\n+$/, "").split("\n");
    let inside = false;
    return raw.map((line) => {
      const result = tokenize(line, inside);
      inside = result.stillInside;
      return result.tokens;
    });
  }, [code.content]);

  const highlight = new Set(code.highlight ?? []);

  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <div className="flex items-center gap-2 px-1 pb-2">
        <FileCode aria-hidden="true" className="text-[var(--cyan-deep)]" size={13} weight="regular" />
        <span className="truncate font-mono text-[10px] text-[var(--ink-3)]" title={code.source}>
          {code.source}
        </span>
        {code.partial && (
          <span className="shrink-0 rounded-md bg-[var(--amber-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--amber)]">
            写到这一步的样子
          </span>
        )}
      </div>

      <div className="code-surface thin-scroll min-h-0 overflow-auto rounded-2xl py-2">
        <pre className="font-mono text-[11px] leading-[1.72]">
          {lines.map((tokens, index) => (
            <div className="code-line" data-hl={highlight.has(index + 1)} key={index}>
              <span className="select-none text-right text-[var(--ink-4)] opacity-55">{index + 1}</span>
              <code className="whitespace-pre text-[var(--ink)]">
                {tokens.map((token, tokenIndex) => (
                  <Fragment key={tokenIndex}>
                    {token.cls ? <span className={token.cls}>{token.text}</span> : token.text}
                  </Fragment>
                ))}
              </code>
            </div>
          ))}
        </pre>
      </div>

      <div className="mt-2.5 flex items-start gap-2 rounded-2xl bg-[var(--mint-wash)] px-3 py-2.5">
        <Lightbulb
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[var(--mint-deep)]"
          size={13}
          weight="regular"
        />
        <p className="text-[11.5px] leading-relaxed text-[var(--ink-2)]">{code.note}</p>
      </div>
    </div>
  );
}
