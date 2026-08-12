"""
Starter file sets per document theme. Add a new entry here whenever you
support another style — the .cls/.sty it needs must exist in the server's
TeX distribution (e.g. IEEEtran needs texlive-publishers installed).
"""

from typing import TypedDict, List, Tuple

from src.features.texademia.schemas import TemplateRead


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

# Official IEEE template — requires the real IEEEtran.cls, which lives in
# texlive-publishers on the server. Keep this around for people who need
# the exact official class (e.g. camera-ready submission requirements).
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

# IEEE Access template — built on our own ieeeaccess.sty (article-based, no
# IEEEtran.cls dependency), so this one only needs texlive-latex-base plus
# the ieeeaccess.sty asset shipped alongside acl.sty / arxiv.sty. Prefer
# this over `_IEEE` unless the official class is specifically required.
_IEEE_ACCESS: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[10pt]{article}\n"
        "\\usepackage[final]{ieeeaccess}\n"
        "\\ieeeaccessdoi{10.1109/ACCESS.2026.0000000}\n"
        "\\ieeeaccessvolume{XX}\n"
        "\\corrauthor{Your Name (e-mail: you@example.com)}\n"
        "\\shortauthorlist{Y. Name \\emph{et al.}}\n"
        "\\shortpapertitle{Your Paper Title}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name$^{1}$\\\\\n"
        "\\normalsize $^{1}$Your Affiliation, City, Country}\n"
        "\\begin{document}\n"
        "\\maketitle\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\begin{IEEEkeywords}\nkeyword one, keyword two, keyword three\n\\end{IEEEkeywords}\n"
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
        "\\usepackage{times}\n"
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
    "ieee_access": _IEEE_ACCESS,
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


def get_available_templates() -> List[TemplateRead]:
    import json

    # Open and load the JSON file
    with open("./src/features/texademia/templates.json", "r", encoding="utf-8") as file:
        data = json.load(file)

    # Access the 'templates' list
    templates = data["templates"]

    # Loop through the entries
    return templates
