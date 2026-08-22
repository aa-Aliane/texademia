// cursorPersistencePlugin.ts
import { EditorView, ViewPlugin, type PluginValue, type ViewUpdate } from "@codemirror/view";
import { useCodeEditorStore } from "../store/codeEditorStore";

export function cursorPersistencePlugin(documentId: string) {
  return ViewPlugin.define((view): PluginValue => {
    const { cursorPositions, scrollPositions } = useCodeEditorStore.getState();
    const savedPos = cursorPositions[documentId];
    const savedScroll = scrollPositions[documentId];

    if (savedPos != null) {
      const pos = Math.max(0, Math.min(savedPos, view.state.doc.length));
      queueMicrotask(() => {
        view.dispatch({ selection: { anchor: pos } });
        if (savedScroll != null) {
          view.scrollDOM.scrollTop = savedScroll;
        } else {
          view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "center" }) });
        }
      });
    }

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      // debounce — don't hammer the store (and localStorage) on every
      // scroll frame
      scrollTimeout = setTimeout(() => {
        useCodeEditorStore.getState().saveScroll(documentId, view.scrollDOM.scrollTop);
      }, 200);
    };
    view.scrollDOM.addEventListener("scroll", onScroll);

    return {
      update(update: ViewUpdate) {
        if (update.selectionSet) {
          useCodeEditorStore.getState().saveCursor(documentId, update.state.selection.main.head);
        }
      },
      destroy() {
        clearTimeout(scrollTimeout);
        view.scrollDOM.removeEventListener("scroll", onScroll);
      },
    };
  });
}
