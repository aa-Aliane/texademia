# Neurocomputing asset (vendored from the official `elsarticle` project)

Same approach as `acm_tallip/`: Neurocomputing (like every ScienceDirect
journal) doesn't have its own bespoke LaTeX class — it uses Elsevier's
shared **`elsarticle`** document class, developed for Elsevier by STM
Document Engineering Pvt Ltd and distributed via CTAN
(https://ctan.org/pkg/elsarticle).

This copy was docstrip-generated from the official `.dtx`/`.ins` sources
(pulled via a GitHub mirror since CTAN itself isn't reachable from this
sandbox's network allowlist; the `.dtx` checksum — `\CheckSum{3243}` —
matches the CTAN listing, confirming it's the authentic, unmodified
source), exactly the way Elsevier's own instructions say to build it.

## Files

- `elsarticle.cls` — the generated class file. Needed by
  `\documentclass{elsarticle}`.
- `elsarticle-num.bst` — numbered bibliography style (`[1]`, `[2]`, ...).
  **This is the one Neurocomputing uses** — its Guide for Authors specifies
  sequential-number, square-bracket citations.
- `elsarticle-harv.bst` — author-year (Harvard) style, kept for other
  Elsevier journals that use it; not needed for Neurocomputing.
- `elsarticle-num-names.bst` — numbered style with `Jones et al. [21]`-style
  in-text names; also kept for completeness, not the Neurocomputing default.
- `elsarticle.dtx` / `elsarticle.ins` — original docstrip sources, kept so
  `elsarticle.cls` can be regenerated/audited/updated later.
- `elsarticle-template-num.tex` / `elsarticle-template-harv.tex` — Elsevier's
  own official starter templates, useful as a reference for available
  front-matter commands.
- `test_neurocomputing.tex` / `refs.bib` — minimal smoke-test document.
  Compiled cleanly with `pdflatex` → `bibtex` → `pdflatex` ×2, producing a
  correct Neurocomputing-style page (title/abstract in single column,
  two-column body, numbered `[1] [2]` references, "Preprint submitted to
  Neurocomputing" footer from `\journal{Neurocomputing}`).

## Minimal usage in a paper

```latex
\documentclass[5p,times,twocolumn]{elsarticle}
\usepackage{amssymb,amsmath}
\journal{Neurocomputing}

\begin{document}

\begin{frontmatter}
\title{...}
\author{...}
\address{...}

\begin{abstract} ... \end{abstract}

\begin{keyword}
keyword one \sep keyword two
\end{keyword}
\end{frontmatter}

\section{Introduction}
...

\bibliographystyle{elsarticle-num}
\bibliography{refs}
\end{document}
```

`5p,times,twocolumn` is the standard Elsevier "5+" journal layout
(two-column, Times fonts) that Neurocomputing and most of Elsevier's
computer-science/engineering journals use for the typeset version;
`\journal{...}` just sets the name printed in the running footer — it
doesn't change layout, since (unlike `acmart`) `elsarticle` has no
per-journal metadata switch.

## Updating later

To pull a newer release, replace `elsarticle.dtx`/`elsarticle.ins` (and the
three `.bst` files) from CTAN (https://ctan.org/pkg/elsarticle) or the
GitHub mirror https://github.com/yaoyz96/elsarticle, and regenerate:

```
latex elsarticle.ins
```
