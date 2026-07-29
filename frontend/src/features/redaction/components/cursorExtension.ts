import { StateField, StateEffect } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, type DecorationSet } from "@codemirror/view";

export interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  pos: number; // character offset in the doc
}

export const setRemoteCursors = StateEffect.define<RemoteCursor[]>();

export const remoteCursorsField = StateField.define<RemoteCursor[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setRemoteCursors)) return effect.value;
    }
    // map positions through local edits so cursors don't drift on your own typing
    return value.map((c) => ({ ...c, pos: tr.changes.mapPos(c.pos) }));
  },
});

class CursorWidget extends WidgetType {
  constructor(private name: string, private color: string) {
    super();
  }
  eq(other: CursorWidget) {
    return other.name === this.name && other.color === this.color;
  }
  toDOM() {
    const wrap = document.createElement("span");
    wrap.style.position = "relative";
    wrap.style.borderLeft = `2px solid ${this.color}`;
    wrap.style.marginLeft = "-1px";

    const label = document.createElement("span");
    label.textContent = this.name;
    Object.assign(label.style, {
      position: "absolute",
      top: "-1.2em",
      left: "0",
      fontSize: "0.7em",
      padding: "1px 4px",
      borderRadius: "3px",
      whiteSpace: "nowrap",
      color: "#fff",
      background: this.color,
      pointerEvents: "none",
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
  const sorted = [...cursors].sort((a, b) => a.pos - b.pos);
  return Decoration.set(
    sorted.map((c) =>
      Decoration.widget({ widget: new CursorWidget(c.name, c.color), side: 1 }).range(c.pos)
    )
  );
}

export const remoteCursorsPlugin = EditorView.decorations.compute(
  [remoteCursorsField],
  (state) => buildCursorDecorations(state.field(remoteCursorsField))
);

export const cursorExtension = [remoteCursorsField, remoteCursorsPlugin];
