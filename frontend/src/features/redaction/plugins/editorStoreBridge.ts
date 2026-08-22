// editorStoreBridge.ts
import { EditorView, ViewPlugin, type PluginValue } from "@codemirror/view";
import { setLineAuthors } from "../components/blameExtension";
import { setRemoteCursors } from "../components/cursorExtension";
import { useCodeEditorStore } from "../store/codeEditorStore";

/**
 * Generic factory: subscribe a CodeMirror view to a slice of the Zustand
 * store, and dispatch a StateEffect into the view whenever that slice
 * changes. Runs entirely inside CodeMirror's own lifecycle — construction
 * subscribes, destroy() unsubscribes — so it works regardless of whether
 * React re-renders, and survives remounts cleanly since a fresh view means
 * a fresh subscription.
 */
function storeSyncPlugin<T>(
  select: (s: ReturnType<typeof useCodeEditorStore.getState>) => T,
  toEffect: (value: T) => Parameters<EditorView["dispatch"]>[0]["effects"]
) {
  return ViewPlugin.define((view) => {
    const unsub = useCodeEditorStore.subscribe((state) => {
      view.dispatch({ effects: toEffect(select(state)) });
    });
    // Push the current value immediately on construction — otherwise the
    // view starts empty and only updates on the *next* store change.
    view.dispatch({ effects: toEffect(select(useCodeEditorStore.getState())) });
    return { destroy: unsub } satisfies PluginValue;
  });
}

/** Pushes lineAuthors from the store into blameExtension's gutter rendering. */
export const lineAuthorSync = storeSyncPlugin(
  (s) => s.lineAuthors,
  (v) => setLineAuthors.of(v)
);

/** Pushes remoteCursors from the store into cursorExtension's caret rendering. */
export const remoteCursorSync = storeSyncPlugin(
  (s) => s.remoteCursors,
  (v) => setRemoteCursors.of(v)
);

/**
 * Not a simple value-sync — gotoLineRequest uses a `nonce` so the same
 * line number can be requested twice in a row (e.g. clicking the same
 * compile error twice) and still trigger a jump both times.
 */
export const gotoLineSync = ViewPlugin.define((view) => {
  let lastNonce = -1;

  const unsub = useCodeEditorStore.subscribe((state) => {
    const req = state.gotoLineRequest;
    if (!req || req.nonce === lastNonce) return;
    lastNonce = req.nonce;

    const line = Math.max(1, Math.min(req.line, view.state.doc.lines));
    const pos = view.state.doc.line(line).from;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  });

  return { destroy: unsub };
});
