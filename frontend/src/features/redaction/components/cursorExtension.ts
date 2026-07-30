import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";

export interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  pos: number; // character offset in the document
}

export const setRemoteCursors = StateEffect.define<RemoteCursor[]>();

export const remoteCursorsField = StateField.define<RemoteCursor[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursors)) {
        // Incoming positions are already current — no mapping needed.
        return effect.value;
      }
    }
    // On local edits, re-map existing remote cursor positions through the
    // change set so they don't drift out of place while you type above them.
    if (tr.docChanged) {
      return value.map((c) => ({ ...c, pos: tr.changes.mapPos(c.pos) }));
    }
    return value;
  },
});

class RemoteCursorWidget extends WidgetType {
  constructor(
    private name: string,
    private color: string
  ) {
    super();
  }

  eq(other: RemoteCursorWidget) {
    return other.name === this.name && other.color === this.color;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-remote-cursor";
    Object.assign(wrap.style, {
      position: "relative",
      display: "inline-block",
      width: "0",
      height: "1.2em",
      verticalAlign: "text-bottom",
      borderLeft: `2px solid ${this.color}`,
      marginLeft: "-1px",
      pointerEvents: "none",
    });

    const label = document.createElement("span");
    label.textContent = this.name;
    Object.assign(label.style, {
      position: "absolute",
      top: "-1.15em",
      left: "-2px",
      fontSize: "0.7em",
      lineHeight: "1.4",
      padding: "0 4px",
      borderRadius: "3px",
      whiteSpace: "nowrap",
      color: "#fff",
      background: this.color,
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "10",
    });
    wrap.appendChild(label);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

function buildCursorDecorations(cursors: RemoteCursor[]): DecorationSet {
  if (!cursors.length) return Decoration.none;
  // Decoration.set requires ranges in ascending position order.
  const sorted = [...cursors].sort((a, b) => a.pos - b.pos);
  return Decoration.set(
    sorted.map((c) =>
      Decoration.widget({
        widget: new RemoteCursorWidget(c.name, c.color),
        side: 1,
      }).range(c.pos)
    )
  );
}

export const remoteCursorsPlugin = EditorView.decorations.compute(
  [remoteCursorsField],
  (state) => buildCursorDecorations(state.field(remoteCursorsField))
);

export const cursorExtension = [remoteCursorsField, remoteCursorsPlugin];
