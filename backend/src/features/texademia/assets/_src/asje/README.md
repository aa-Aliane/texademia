# AJSE asset (vendored from the official Springer Nature `sn-jnl` template)

Same story as `acm_tallip/` and `neurocomputing/`: the Arabian Journal for
Science and Engineering doesn't have its own bespoke class either — it uses
Springer Nature's unified journal-article LaTeX template, class file
`sn-jnl.cls`, the same template shared across the huge majority of Springer
journals. AJSE's own submission guidelines say exactly this: *"We recommend
using Springer Nature's LaTeX template and choosing the formatting option
`[iicol]`."* (https://link.springer.com/journal/13369/submission-guidelines)

Source: the official Springer Nature LaTeX Author Support package
(https://www.springernature.com/gp/authors/campaigns/latex-author-support),
pulled here via a GitHub mirror of that exact package
(https://github.com/godkingjay/springer-nature-latex-template) since
springernature.com itself isn't reachable from this sandbox's network
allowlist. `sn-jnl.cls` is Springer's own docstrip-generated output — the
header inside the file says so — so this is the real, unmodified class.

## Why `sn-basic` + `Numbered`

AJSE's Guide for Authors gives citation examples like `[3]`, `[1-3, 7]` and
a reference-list example ("Hamburger, C.: Quasimonotonicity...") that match
Springer's **Basic** numbered reference style exactly. `sn-basic.bst`
supports both name-date and numbered citation; AJSE needs the numbered
variant, so the class must be loaded with both `sn-basic` **and**
`Numbered` — `sn-basic` alone defaults to name-date.

## Why both `iicol` and `twocolumn`

This is a real quirk of the class, confirmed by test-compiling: the
`iicol` option only switches the page **geometry** to double-column margins
(see `sn-jnl.cls` around the `\if@iicol` block). It does *not* by itself
put the class into LaTeX's two-column typesetting mode — that's a
separate, older `\if@twocolumn` switch toggled by the class's own
`twocolumn` option. To actually get a two-column body (which is what AJSE
expects), you need **both**:

```latex
\documentclass[pdflatex,sn-basic,Numbered,iicol,twocolumn]{sn-jnl}
```

Using `iicol` alone silently produces a single-column body with
double-column-width margins, which is *not* what AJSE wants. This was
verified visually by test-compiling with and without `twocolumn` —
see `test_ajse.tex`.

## Required packages the class doesn't load itself

`sn-jnl.cls` assumes a specific set of packages are loaded by the document
preamble (this is Springer's own documented behavior, not a bug) —
`manyfoot` in particular, without which the class's footnote-hook commands
(`\SetFootnoteHook`, `\DeclareNewFootnote`) are undefined and compilation
fails at `\begin{document}`. The exact preamble Springer's own official
sample uses (and what `test_ajse.tex` in this folder replicates) is:

```latex
\usepackage{graphicx}
\usepackage{multirow}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{amsthm}
\usepackage{mathrsfs}
\usepackage[title]{appendix}
\usepackage{xcolor}
\usepackage{textcomp}
\usepackage{manyfoot}
\usepackage{booktabs}
\usepackage{algorithm}
\usepackage{algorithmicx}
\usepackage{algpseudocode}
\usepackage{listings}
\usepackage{geometry}
```

## Files

- `sn-jnl.cls` — the class file. Needed by `\documentclass{sn-jnl}`.
- `sn-basic.bst` — the bib style AJSE needs (used with the `Numbered`
  class option).
- `sn-mathphys.bst`, `sn-vancouver.bst`, `sn-apa.bst` (via `sn-apacite.bst`),
  `sn-chicago.bst`, `sn-nature.bst`, `sn-aps.bst` — the other reference
  styles the class supports, kept for other Springer journals in case you
  add more later. Not needed for AJSE.
- `sn-article-official-sample.tex` — Springer's own official starter
  template, unmodified, useful as a reference for all available front
  matter commands (multiple affiliations, ORCID, structured abstracts,
  etc. — far more than the minimal smoke test below uses).
- `sn-bibliography.bib` — Springer's own sample `.bib` file (referenced by
  the sample above).
- `test_ajse.tex` / `refs.bib` — minimal AJSE-configured smoke test.
  Compiled cleanly with `pdflatex → bibtex → pdflatex ×2`, verified to
  produce genuine two-column body text with numbered `[1] [2]` references
  in the Springer Basic format.

## Minimal usage in a paper

```latex
\documentclass[pdflatex,sn-basic,Numbered,iicol,twocolumn]{sn-jnl}

\usepackage{graphicx}
\usepackage{multirow}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{amsthm}
\usepackage{mathrsfs}
\usepackage[title]{appendix}
\usepackage{xcolor}
\usepackage{textcomp}
\usepackage{manyfoot}
\usepackage{booktabs}
\usepackage{algorithm}
\usepackage{algorithmicx}
\usepackage{algpseudocode}
\usepackage{listings}
\usepackage{geometry}

\begin{document}

\title[Short title]{Full Article Title}
\author*[1]{\fnm{First} \sur{Last}}\email{author@example.org}
\affil*[1]{\orgdiv{Department}, \orgname{University}, \orgaddress{\city{City}, \country{Country}}}

\abstract{...}
\keywords{keyword one, keyword two, ...}

\maketitle

\section{Introduction}\label{sec1}
...

\bibliography{refs}
\end{document}
```

## Updating later

Pull a newer copy of `sn-jnl.cls` and the `.bst` files from Springer's own
LaTeX Author Support page (https://www.springernature.com/gp/authors/campaigns/latex-author-support)
or the GitHub mirror https://github.com/godkingjay/springer-nature-latex-template.
The class file ships pre-generated by Springer (no `.dtx`/`.ins` step is
distributed for this template), so updating is just a file replacement.
