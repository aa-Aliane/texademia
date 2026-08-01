import { ViewPlugin, Decoration, EditorView, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import katex from "katex";
import "katex/dist/katex.min.css";

// ---------- helpers ----------

function cursorInRange(view: EditorView, from: number, to: number): boolean {
  return view.state.selection.ranges.some((r) => r.from <= to && r.to >= from);
}

class KatexWidget extends WidgetType {
  constructor(private source: string, private displayMode: boolean) {
    super();
  }
  eq(other: KatexWidget) {
    return other.source === this.source && other.displayMode === this.displayMode;
  }
  toDOM() {
    const span = document.createElement(this.displayMode ? "div" : "span");
    span.className = "cm-katex-widget";
    try {
      katex.render(this.source, span, { throwOnError: false, displayMode: this.displayMode });
    } catch {
      span.textContent = this.source;
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

const hiddenMark = Decoration.mark({ attributes: { style: "display:none" } });
const boldMark = Decoration.mark({ attributes: { style: "font-weight:600" } });
const italicMark = Decoration.mark({ attributes: { style: "font-style:italic" } });
const sectionMark: Record<string, Decoration> = {
  section: Decoration.mark({ attributes: { style: "font-weight:700;font-size:1.35em" } }),
  subsection: Decoration.mark({ attributes: { style: "font-weight:700;font-size:1.18em" } }),
  subsubsection: Decoration.mark({ attributes: { style: "font-weight:700;font-size:1.06em" } }),
};

// ---------- decoration builder ----------

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const text = view.state.doc.toString();
  const events: { pos: number; deco: Decoration; end?: number }[] = [];

  const push = (from: number, to: number, deco: Decoration) => {
    events.push({ pos: from, end: to, deco });
  };

  // \textbf{...} \textit{...} \emph{...}
  const styleRe = /\\(textbf|textit|emph)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = styleRe.exec(text))) {
    const [full, cmd, content] = m;
    const from = m.index;
    const to = from + full.length;
    if (cursorInRange(view, from, to)) continue;

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
    if (cursorInRange(view, from, to)) continue;

    const braceOpen = text.indexOf("{", from);
    const contentFrom = braceOpen + 1;
    const contentTo = to - 1;

    push(from, contentFrom, hiddenMark);
    push(contentTo, to, hiddenMark);
    push(contentFrom, contentTo, sectionMark[level]);
  }

  // \item  (line-leading only)
  const itemRe = /^([ \t]*)\\item\b[ \t]*/gm;
  while ((m = itemRe.exec(text))) {
    const from = m.index + m[1].length;
    const to = m.index + m[0].length;
    if (cursorInRange(view, from, to)) continue;
    events.push({ pos: from, deco: Decoration.replace({ widget: new BulletWidget() }), end: to });
  }

  // display math: \[...\]  or  $$...$$
  const displayRe = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g;
  while ((m = displayRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    const source = (m[1] ?? m[2] ?? "").trim();
    if (cursorInRange(view, from, to)) continue;
    if (!source) continue;
    events.push({ pos: from, deco: Decoration.replace({ widget: new KatexWidget(source, true), block: false }), end: to });
  }

  // inline math: $...$  (not preceded/followed by another $, avoids clashing with $$)
  const inlineRe = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;
  while ((m = inlineRe.exec(text))) {
    const from = m.index;
    const to = from + m[0].length;
    if (cursorInRange(view, from, to)) continue;
    events.push({ pos: from, deco: Decoration.replace({ widget: new KatexWidget(m[1], false) }), end: to });
  }

  events.sort((a, b) => a.pos - b.pos || (a.end ?? a.pos) - (b.end ?? b.pos));
  for (const e of events) {
    if (e.end !== undefined) builder.add(e.pos, e.end, e.deco);
  }

  return builder.finish();
}

// ---------- plugin ----------

const richTextPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

const richTextTheme = EditorView.baseTheme({
  ".cm-katex-widget": { display: "inline-block" },
});

export const richTextExtension = [richTextPlugin, richTextTheme];
