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

# ACM TALLIP journal — acmart.cls (acmsmall = journal format) shipped in
# assets/acm_tallip/ along with ACM-Reference-Format.bst.
_ACM_TALLIP: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[acmsmall]{acmart}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name}\n"
        "\\affiliation{%\n"
        "  \\institution{Your Affiliation}\n"
        "  \\city{City}\n"
        "  \\country{Country}}\n"
        "\\email{you@example.com}\n"
        "\\begin{document}\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\maketitle\n"
        "\\section{Introduction}\n"
        "\\bibliographystyle{ACM-Reference-Format}\n"
        "\\bibliography{references}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

# Elsevier Neurocomputing — elsarticle.cls shipped in assets/neurocomputing/
# with the elsarticle-num bibliography style.
_NEUROCOMPUTING: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[preprint,12pt]{elsarticle}\n"
        "\\journal{Neurocomputing}\n"
        "\\begin{document}\n"
        "\\begin{frontmatter}\n"
        "\\title{Your Paper Title}\n"
        "\\author{Your Name}\n"
        "\\ead{you@example.com}\n"
        "\\affiliation{organization={Your Affiliation}, city={City}, country={Country}}\n"
        "\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n"
        "\\end{frontmatter}\n"
        "\\section{Introduction}\n"
        "\\bibliographystyle{elsarticle-num}\n"
        "\\bibliography{references}\n"
        "\\end{document}\n",
    ),
    ("references.bib", "bibtex", ""),
]

# ASJE — Springer Nature journal class (sn-jnl.cls) shipped in assets/asje/
# with the sn-* bibliography styles. sn-basic+Numbered = numbered refs,
# iicol/twocolumn = two-column layout. manyfoot repairs sn-jnl v0.1's
# unmet \SetFootnoteHook dependency on modern TeX Live.
_ASJE: List[Tuple[str, str, str]] = [
    (
        "main.tex",
        "latex",
        "\\documentclass[pdflatex,sn-basic,Numbered,iicol,twocolumn]{sn-jnl}\n"
        "\n"
        "\\usepackage{graphicx}\n"
        "\\usepackage{multirow}\n"
        "\\usepackage{amsmath,amssymb,amsfonts}\n"
        "\\usepackage{amsthm}\n"
        "\\usepackage{mathrsfs}\n"
        "\\usepackage[title]{appendix}\n"
        "\\usepackage{xcolor}\n"
        "\\usepackage{textcomp}\n"
        "\\usepackage{manyfoot}\n"
        "\\usepackage{booktabs}\n"
        "\\usepackage{algorithm}\n"
        "\\usepackage{algorithmicx}\n"
        "\\usepackage{algpseudocode}\n"
        "\\usepackage{listings}\n"
        "\\usepackage{geometry}\n"
        "\n"
        "\\begin{document}\n"
        "\\title{Your Paper Title}\n"
        "\\author*[1]{\\fnm{Your} \\sur{Name}}\\email{you@example.com}\n"
        "\\affil*[1]{\\orgname{Your Affiliation}, \\city{City}, \\country{Country}}\n"
        "\\abstract{Write your abstract here.}\n"
        "\\keywords{keyword one, keyword two, keyword three}\n"
        "\\maketitle\n"
        "\\section{Introduction}\\label{sec1}\n"
        "\\bibliography{references}\n"
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
    "acm_tallip": _ACM_TALLIP,
    "neurocomputing": _NEUROCOMPUTING,
    "asje": _ASJE,
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
