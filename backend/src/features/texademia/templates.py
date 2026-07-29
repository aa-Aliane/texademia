"""
Starter file sets per document theme. Add a new entry here whenever you
support another style — the .cls/.sty it needs must exist in the server's
TeX distribution (e.g. IEEEtran needs texlive-publishers installed).
"""

from typing import TypedDict, List, Tuple


class TemplateFile(TypedDict):
    name: str
    language: str
    content: str


# Raw starter tuples: (filename, language, content)
_DEFAULT: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_ARXIV: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass{article}\n"
        "\\usepackage{arxiv}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name}\n"
        "\\begin{document}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\section{Introduction}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_IEEE: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[conference]{IEEEtran}\n"
        "\\begin{document}\n"
        "\\title{Your Paper Title}\n"
        "\\author{\\IEEEauthorblockN{Your Name}}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\section{Introduction}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_ACL: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[11pt]{article}\n"
        "\\usepackage[review]{acl}\n"
        "\\package{times}\n"
        "\\usepackage{latexsym}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name \\\\ Your Affiliation \\\\ \\texttt{you@example.com}}\n"
        "\\begin{document}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\section{Introduction}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

_TEMPLATES = {
    "default": _DEFAULT,
    "arxiv": _ARXIV,
    "ieee": _IEEE,
    "acl": _ACL,
}

TEMPLATE_NAMES = set(_TEMPLATES.keys())


def get_template_files(template: str) -> List[TemplateFile]:
    """
    Returns the starter files for a template as structured dictionaries.
    """
    raw_files = _TEMPLATES.get(template, _DEFAULT)
    return [
        {"name": name, "language": lang, "content": content}
        for name, lang, content in raw_files
    ]
