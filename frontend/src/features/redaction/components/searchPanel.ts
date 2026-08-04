import {
	closeSearchPanel,
	findNext,
	findPrevious,
	getSearchQuery,
	openSearchPanel,
	replaceAll,
	replaceNext,
	SearchQuery,
	search,
	setSearchQuery,
} from "@codemirror/search";
import {
	EditorView,
	getPanel,
	type Panel,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view";

// Zed-style search: floating top-right panel, live highlights, match
// counter, Enter/Shift+Enter navigation, regex/whole-word/case toggles,
// replace & replace-all, Esc closes and refocuses editor.

function countMatches(view: EditorView): { total: number; current: number } {
	const query = getSearchQuery(view.state);
	if (!query.valid || !query.search) return { total: 0, current: 0 };

	const sel = view.state.selection.main;
	let total = 0;
	let current = 0;
	const cursor = query.getCursor(view.state);
	let result = cursor.next();
	while (!result.done) {
		total++;
		if (result.value.from === sel.from && result.value.to === sel.to) {
			current = total;
		}
		result = cursor.next();
	}
	// Selection not exactly on a match (e.g. live-typing): show nearest next.
	if (current === 0 && total > 0) current = 1;
	return { total, current };
}

const ACCENT = "var(--color-accent)";

const BTN_BASE =
	"background:transparent;border:none;border-radius:var(--radius-sm);" +
	"color:var(--color-text-secondary);cursor:pointer;padding:3px 7px;" +
	"font:inherit;line-height:1;";

const INPUT_STYLE =
	"background:var(--color-bg);border:1px solid var(--color-border);" +
	"border-radius:var(--radius-sm);outline:none;color:var(--color-text);" +
	"font:inherit;padding:3px 8px;";

function zedSearchPanel(view: EditorView): Panel {
	const dom = document.createElement("div");
	dom.className = "cm-zed-search";
	dom.style.cssText =
		"display:flex;flex-direction:column;gap:6px;padding:8px;" +
		"background:var(--color-surface-raised);border:1px solid var(--color-border);" +
		"border-radius:var(--radius-md);box-shadow:var(--shadow-lg);" +
		"font-size:13px;font-family:var(--font-family);";

	const row = () => {
		const r = document.createElement("div");
		r.style.cssText = "display:flex;align-items:center;gap:4px;";
		return r;
	};
	const findRow = row();
	const replaceRow = row();

	const input = document.createElement("input");
	input.placeholder = "Find";
	input.setAttribute("aria-label", "Find in file");
	input.style.cssText = INPUT_STYLE + "width:200px;";

	const replaceInput = document.createElement("input");
	replaceInput.placeholder = "Replace";
	replaceInput.setAttribute("aria-label", "Replace with");
	replaceInput.style.cssText = INPUT_STYLE + "width:200px;";

	for (const el of [input, replaceInput]) {
		el.onfocus = () => (el.style.borderColor = ACCENT);
		el.onblur = () => (el.style.borderColor = "var(--color-border)");
	}

	const counter = document.createElement("span");
	counter.style.cssText =
		"color:var(--color-text-muted);min-width:44px;text-align:center;" +
		"font-variant-numeric:tabular-nums;user-select:none;";

	const mkBtn = (label: string, title: string, onClick: () => void) => {
		const btn = document.createElement("button");
		btn.textContent = label;
		btn.title = title;
		btn.type = "button";
		btn.style.cssText = BTN_BASE;
		btn.onmouseenter = () =>
			(btn.style.background = "var(--color-accent-subtle)");
		btn.onmouseleave = () =>
			(btn.style.background =
				btn.dataset.active === "1" ? ACCENT : "transparent");
		btn.onclick = (e) => {
			e.preventDefault();
			onClick();
		};
		return btn;
	};

	const initialQuery = getSearchQuery(view.state);
	let caseSensitive = initialQuery.caseSensitive;
	let regexp = initialQuery.regexp;
	let wholeWord = initialQuery.wholeWord;

	const updateCounter = () => {
		const { total, current } = countMatches(view);
		counter.textContent = input.value
			? total
				? `${current}/${total}`
				: "0/0"
			: "";
	};

	const applyQuery = (selectFirst: boolean) => {
		view.dispatch({
			effects: setSearchQuery.of(
				new SearchQuery({
					search: input.value,
					replace: replaceInput.value,
					caseSensitive,
					regexp,
					wholeWord,
				}),
			),
		});
		if (selectFirst && input.value) findNext(view);
	};

	const mkToggle = (
		label: string,
		title: string,
		get: () => boolean,
		set: (v: boolean) => void,
	) => {
		const btn = mkBtn(label, title, () => {
			set(!get());
			sync();
			applyQuery(true);
			input.focus();
		});
		const sync = () => {
			const on = get();
			btn.dataset.active = on ? "1" : "0";
			btn.style.background = on ? ACCENT : "transparent";
			btn.style.color = on ? "#fff" : "var(--color-text-secondary)";
		};
		sync();
		return btn;
	};

	const caseBtn = mkToggle(
		"Aa",
		"Match case",
		() => caseSensitive,
		(v) => (caseSensitive = v),
	);
	const regexBtn = mkToggle(
		".*",
		"Use regular expression",
		() => regexp,
		(v) => (regexp = v),
	);
	const wordBtn = mkToggle(
		"W",
		"Match whole word",
		() => wholeWord,
		(v) => (wholeWord = v),
	);

	const prevBtn = mkBtn("↑", "Previous match (Shift+Enter)", () => {
		findPrevious(view);
		updateCounter();
		input.focus();
	});
	const nextBtn = mkBtn("↓", "Next match (Enter)", () => {
		findNext(view);
		updateCounter();
		input.focus();
	});
	const closeBtn = mkBtn("×", "Close (Esc)", () => {
		closeSearchPanel(view);
		view.focus();
	});

	const replaceBtn = mkBtn("Replace", "Replace current match", () => {
		applyQuery(false);
		replaceNext(view);
		updateCounter();
		replaceInput.focus();
	});
	const replaceAllBtn = mkBtn("All", "Replace all matches", () => {
		applyQuery(false);
		replaceAll(view);
		updateCounter();
		replaceInput.focus();
	});

	input.addEventListener("input", () => {
		applyQuery(true);
		updateCounter();
	});
	replaceInput.addEventListener("input", () => {
		applyQuery(false);
	});

	const onKey = (e: KeyboardEvent, isReplace: boolean) => {
		if (e.key === "Enter") {
			e.preventDefault();
			if (isReplace) {
				applyQuery(false);
				replaceNext(view);
			} else if (e.shiftKey) {
				findPrevious(view);
			} else {
				findNext(view);
			}
			updateCounter();
		} else if (e.key === "Escape") {
			e.preventDefault();
			e.stopPropagation();
			closeSearchPanel(view);
			view.focus();
		}
	};
	input.addEventListener("keydown", (e) => onKey(e, false));
	replaceInput.addEventListener("keydown", (e) => onKey(e, true));

	findRow.append(input, counter, caseBtn, regexBtn, wordBtn, prevBtn, nextBtn, closeBtn);
	replaceRow.append(replaceInput, replaceBtn, replaceAllBtn);
	dom.append(findRow, replaceRow);

	// Prefill with the current selection (Zed behavior) or an open query.
	const sel = view.state.selection.main;
	if (initialQuery.valid && initialQuery.search) {
		input.value = initialQuery.search;
		replaceInput.value = initialQuery.replace;
	} else if (!sel.empty) {
		input.value = view.state.sliceDoc(sel.from, sel.to);
	}

	return {
		dom,
		mount() {
			if (input.value) applyQuery(true);
			updateCounter();
			input.focus();
			input.select();
		},
		update() {
			updateCounter();
		},
	};
}

const searchPanelTheme = EditorView.theme({
	".cm-panels": {
		position: "absolute",
		top: "8px",
		right: "12px",
		left: "auto",
		border: "none",
		backgroundColor: "transparent",
		zIndex: "30",
		padding: "0",
	},
	".cm-editor": { position: "relative" },
	".cm-searchMatch": {
		backgroundColor: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
		outline:
			"1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)",
	},
	".cm-searchMatch-selected": {
		backgroundColor: "color-mix(in srgb, var(--color-accent) 55%, transparent)",
	},
});

// Floating search icon (top-right, Zed-style) that opens the panel.
const searchIconPlugin = ViewPlugin.fromClass(
	class {
		private btn: HTMLButtonElement;

		constructor(private view: EditorView) {
			this.btn = document.createElement("button");
			this.btn.type = "button";
			this.btn.title = "Find in file (Ctrl+F)";
			this.btn.setAttribute("aria-label", "Find in file");
			this.btn.innerHTML =
				'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
			this.btn.style.cssText =
				"position:absolute;top:8px;right:12px;z-index:25;display:flex;" +
				"align-items:center;justify-content:center;width:28px;height:28px;" +
				"background:var(--color-accent);color:#fff;border:none;border-radius:6px;" +
				"cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.35);opacity:0.85;";
			this.btn.onmouseenter = () => (this.btn.style.opacity = "1");
			this.btn.onmouseleave = () => (this.btn.style.opacity = "0.85");
			this.btn.onclick = (e) => {
				e.preventDefault();
				openSearchPanel(this.view);
			};
			view.dom.appendChild(this.btn);
		}

		update(_update: ViewUpdate) {
			// Hide the icon while the panel is open.
			this.btn.style.display = getPanel(this.view, zedSearchPanel)
				? "none"
				: "flex";
		}

		destroy() {
			this.btn.remove();
		}
	},
);

export const zedSearchExtension = [
	search({ createPanel: zedSearchPanel }),
	searchIconPlugin,
	searchPanelTheme,
];
