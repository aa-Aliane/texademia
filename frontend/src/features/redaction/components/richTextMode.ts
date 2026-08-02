import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { RangeSetBuilder, StateField, type EditorState } from "@codemirror/state";
import katex from "katex";
import "katex/dist/katex.min.css";

// ---------- helpers ----------

function cursorInRange(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some((r) => r.from <= to && r.to >= from);
}

class KatexWidget extends WidgetType {
  constructor(private source: string, private displayMode: boolean) {
    super();
  }
  eq(other: KatexWidget) {
    return other.source === this.source && other.displayMode === this.displayMode;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = this.displayMode ? "cm-katex-widget cm-katex-display" : "cm-katex-widget";
    try {
      katex.render(this.source, span, { throwOnError: false, displayMode: this.displayMode });
    } catch {
      span.textContent = this.source;
      span.style.color = "#fa5252";
    }
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "•";
    span.style.marginRight = "6px";
    span.style.opacity = "0.7";
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

// Renders a simple LaTeX tabular body as an HTML table.
// Handles \\ row separators, & cells, and strips \hline / booktabs rules.
class TableWidget extends WidgetType {
  constructor(private body: string) {
    super();
  }
  eq(other: TableWidget) {
    return other.body === this.body;
  }
  toDOM() {
    const table = document.createElement("table");
    table.className = "cm-rich-table";
    const rows = this.body
      .replace(/\\(hline|toprule|midrule|bottomrule|cmidrule(\{[^}]*\})?)\b/g, "")
      .split(/\\\\/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    for (const row of rows) {
      const tr = document.createElement("tr");
      for (const cell of row.split(/(?<!\\)&/)) {
        const td = document.createElement("td");
        td.textContent = cell.trim().replace(/\\&/g, "&");
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    const wrap = document.createElement("span");
    wrap.className = "cm-rich-table-wrap";
    wrap.appendChild(table);
    return wrap;
  }
  ignoreEvent() {
    return true;
  }
}

const hiddenMark = Decoration.mark({ attributes: { style: "display:none" } });
const boldMark = Decoration.mark({ attributes: { style: "font-weight:600" } });
const italicMark = Decoration.mark({ attributes: { style: "font-style:italic" } });
const linkMark = Decoration.mark({
  attributes: {
    style:
      "color:var(--color-accent);text-decoration:underline;" +
      "text-decoration-color:color-mix(in srgb, var(--color-accent) 50%, transparent);" +
      "text-underline-offset:2px",
  },
});
const sectionMark: Record<string, Decoration> = {
  section: Decoration.mark({ attributes: { style: "font-weight:700;font-size:1.35em" } }),
  subsection: Decoration.mark({ attributes: { style: "font-weight:700;font-size:1.18em" } }),
  subsubsection: Decoration.mark({ attributes: { style: "font-weight:700;font-size:1.06em" } }),
};

// ---------- decoration builder ----------

function buildDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = state.doc.toString();
  const events: { pos: number; deco: Decoration; end?: number }[] = [];

  const push = (from: number, to: number, deco: Decoration) => {
    events.push({ pos: from, end: to, deco });
  };

  // \textbf{...} \textit{...} \emph{...}
  const styleRe = /\\(textbf|textit|emph)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = styleRe.exec(text))) {
    const [full, cmd] = m;
    const from = m.index;
    const to = from + full.length;
    if (cursorInRange(state, from, to)) continue;

    const openLen = `\\${cmd}{`.length;
    const contentFrom = from + openLen;
    const contentTo = to - 1;

    push(from, contentFrom, hiddenMark);
    push(contentTo, to, hiddenMark);
    const mark = cmd === "textit" || cmd === "emph" ? italicMark : boldMark;
    push(contentFrom, contentTo, mark);
  }

  // \section{...} \subsection{...} \subsubsection{...}
  const secRe = /\\(section|subsection|subsubsection)\*?\{([^{}]*)\}/g;
  while ((m = secRe.exec(text))) {
    const [full, level] = m;
    const from = m.index;
    const to = from + full.length;
    if (cursorInRange(state, from, to)) continue;

    const braceOpen = text.indexOf("{", from);
    const contentFrom = braceOpen + 1;
    const contentTo = to - 1;

    push(from, contentFrom, hiddenMark);
    push(contentTo, to, hiddenMark);
    push(contentFrom, contentTo, sectionMark[level]);
  }

  // \url{...} and \href{url}{text} — show as accent-colored links
  const urlRe = /\\url\{([^{}]*)\}/g;
  while ((m = urlRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    if (cursorInRange(state, from, to)) continue;
    push(from, from + 5, hiddenMark);
    push(from + 5, to - 1, linkMark);
    push(to - 1, to, hiddenMark);
  }
  const hrefRe = /\\href\{([^{}]*)\}\{([^{}]*)\}/g;
  while ((m = hrefRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    if (cursorInRange(state, from, to)) continue;
    // hide "\href{url}{", style the visible text, hide closing "}"
    const textOpen = text.indexOf("{", from + 6 + m[1].length + 1);
    if (textOpen === -1 || textOpen >= to) continue;
    push(from, textOpen + 1, hiddenMark);
    push(textOpen + 1, to - 1, linkMark);
    push(to - 1, to, hiddenMark);
  }

  // \item  (line-leading only)
  const itemRe = /^([ \t]*)\\item\b[ \t]*/gm;
  while ((m = itemRe.exec(text))) {
    const from = m.index + m[1].length;
    const to = m.index + m[0].length;
    if (cursorInRange(state, from, to)) continue;
    events.push({ pos: from, deco: Decoration.replace({ widget: new BulletWidget() }), end: to });
  }

  // tabular: render as an HTML table when the cursor is outside
  const tableRe = /\\begin\{tabular\}(?:\[[^\]]*\])?\{[^{}]*\}([\s\S]*?)\\end\{tabular\}/g;
  while ((m = tableRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    if (cursorInRange(state, from, to)) continue;
    events.push({
      pos: from,
      deco: Decoration.replace({ widget: new TableWidget(m[1]) }),
      end: to,
    });
  }

  // display math: \[...\]  or  $$...$$ — rendered as a centered widget
  const displayRe = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g;
  while ((m = displayRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    const source = (m[1] ?? m[2] ?? "").trim();
    if (cursorInRange(state, from, to)) continue;
    if (!source) continue;
    events.push({
      pos: from,
      deco: Decoration.replace({ widget: new KatexWidget(source, true) }),
      end: to,
    });
  }

  // inline math: $...$  (not preceded/followed by another $, avoids clashing with $$)
  const inlineRe = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;
  while ((m = inlineRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    if (cursorInRange(state, from, to)) continue;
    events.push({ pos: from, deco: Decoration.replace({ widget: new KatexWidget(m[1], false) }), end: to });
  }

  events.sort((a, b) => a.pos - b.pos || (a.end ?? a.pos) - (b.end ?? b.pos));
  for (const e of events) {
    if (e.end !== undefined) builder.add(e.pos, e.end, e.deco);
  }

  return builder.finish();
}

// ---------- plugin ----------

// StateField (not a ViewPlugin) because plugin-provided decorations may not
// replace line breaks, and multi-line math/tables need exactly that.
const richTextField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const richTextTheme = EditorView.baseTheme({
  // Serif "document" feel — only applies while rich mode is on.
  ".cm-content": {
    fontFamily: '"Latin Modern Roman", "Computer Modern Serif", Georgia, "Times New Roman", serif',
    fontSize: "15.5px",
    lineHeight: "1.65",
    padding: "16px 24px",
    maxWidth: "78ch",
  },
  ".cm-katex-widget": { display: "inline-block" },
  ".cm-katex-display": {
    display: "block",
    textAlign: "center",
    padding: "10px 0",
    fontSize: "1.08em",
  },
  ".cm-rich-table-wrap": {
    display: "block",
    padding: "8px 0",
    overflowX: "auto",
  },
  ".cm-rich-table": {
    borderCollapse: "collapse",
    margin: "0 auto",
  },
  ".cm-rich-table td": {
    border: "1px solid #373a40",
    padding: "4px 14px",
    fontSize: "0.95em",
  },
  ".cm-rich-table tr:first-child td": {
    borderBottom: "2px solid color-mix(in srgb, var(--color-accent) 60%, transparent)",
    fontWeight: "600",
  },
});

export const richTextExtension = [richTextField, richTextTheme];
