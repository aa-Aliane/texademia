"""
Starter file sets per document theme. Add a new entry here whenever you
support another style — the .cls/.sty it needs must exist in the server's
TeX distribution (e.g. IEEEtran needs texlive-publishers installed).
"""

_DEFAULT = [
    ("main.tex", "latex",
     "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n"),
    ("references.bib", "bibtex", ""),
]

_ARXIV = [
    ("main.tex", "latex",
     "\\documentclass{article}\n"
     "\\usepackage{arxiv}\n"
     "\\title{Your Paper Title}\n"
     "\\author{Your Name}\n"
     "\\begin{document}\n"
     "\\maketitle\n"
     "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
     "\\section{Introduction}\n"
     "\\end{document}\n"),
    ("references.bib", "bibtex", ""),
]

_IEEE = [
    ("main.tex", "latex",
     "\\documentclass[conference]{IEEEtran}\n"
     "\\begin{document}\n"
     "\\title{Your Paper Title}\n"
     "\\author{\\IEEEauthorblockN{Your Name}}\n"
     "\\maketitle\n"
     "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
     "\\section{Introduction}\n"
     "\\end{document}\n"),
    ("references.bib", "bibtex", ""),
]

_TEMPLATES = {"default": _DEFAULT, "arxiv": _ARXIV, "ieee": _IEEE}


def get_template_files(template: str):
    return _TEMPLATES.get(template, _DEFAULT)
