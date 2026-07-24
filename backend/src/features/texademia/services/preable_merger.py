# src/features/texademia/services/preamble_merger.py
import re

# Commands that accumulate — safe to merge/union across preambles
ACCUMULATOR_PATTERNS = {
    "usepackage": re.compile(
        r"\\usepackage(?:\[(?P<opts>[^\]]*)\])?\{(?P<name>[^}]+)\}"
    ),
    "usetikzlibrary": re.compile(r"\\usetikzlibrary\{(?P<name>[^}]+)\}"),
    "newcommand": re.compile(r"\\(?:re)?newcommand\{?\\(?P<name>[a-zA-Z]+)\}?"),
}

# Packages where the TARGET template's version should always win
# (they usually set document geometry/typography and conflict if duplicated)
TEMPLATE_OWNED_PACKAGES = {
    "geometry",
    "hyperref",
    "fontenc",
    "inputenc",
    "times",
    "natbib",
    "lineno",
    "caption",
}


def _extract_preamble(tex: str) -> str:
    match = re.search(r"(.*?)\\begin\{document\}", tex, re.DOTALL)
    return match.group(1) if match else tex


def _parse_packages(preamble: str) -> dict[str, str | None]:
    """Returns {package_name: options_or_None} preserving order via insertion."""
    pkgs = {}
    for m in ACCUMULATOR_PATTERNS["usepackage"].finditer(preamble):
        name = m.group("name").strip()
        # \usepackage{a,b,c} form -> split
        for single in [n.strip() for n in name.split(",")]:
            pkgs[single] = m.group("opts")
    return pkgs


def _parse_tikz_libraries(preamble: str) -> set[str]:
    libs = set()
    for m in ACCUMULATOR_PATTERNS["usetikzlibrary"].finditer(preamble):
        for lib in m.group("name").split(","):
            libs.add(lib.strip())
    return libs


def merge_preambles(source_tex: str, target_preamble: str) -> str:
    """
    source_tex: full .tex of the ORIGINAL document (e.g. arxiv version)
    target_preamble: preamble of the TARGET template (e.g. acl.sty-based main.tex),
                      including everything up to (not including) \\begin{document}

    Returns the merged preamble to use in the duplicated/converted document.
    """
    source_preamble = _extract_preamble(source_tex)

    source_pkgs = _parse_packages(source_preamble)
    target_pkgs = _parse_packages(target_preamble)

    source_tikz_libs = _parse_tikz_libraries(source_preamble)
    target_tikz_libs = _parse_tikz_libraries(target_preamble)
    missing_tikz_libs = source_tikz_libs - target_tikz_libs

    merged = target_preamble.rstrip()

    # 1. Add tikz libraries the source needed but target doesn't have
    if missing_tikz_libs:
        # only add if tikz itself is loaded somewhere (target or source)
        if "tikz" in target_pkgs or "tikz" in source_pkgs:
            merged += "\n\\usetikzlibrary{" + ",".join(sorted(missing_tikz_libs)) + "}"

    # 2. Add any package the source had that target doesn't, and that
    #    isn't one of the template-owned/conflicting ones
    for pkg, opts in source_pkgs.items():
        if pkg in target_pkgs:
            continue
        if pkg in TEMPLATE_OWNED_PACKAGES:
            continue
        line = (
            f"\\usepackage{{{pkg}}}" if not opts else f"\\usepackage[{opts}]{{{pkg}}}"
        )
        merged += f"\n{line}"

    # 3. Carry over any custom \newcommand / \renewcommand macros the body relies on
    for m in ACCUMULATOR_PATTERNS["newcommand"].finditer(source_preamble):
        macro_name = m.group("name")
        if f"\\{macro_name}" not in target_preamble:
            # grab the full line so we keep the definition, not just the name
            line_match = re.search(
                rf"\\(?:re)?newcommand\{{?\\{macro_name}\}}?.*", source_preamble
            )
            if line_match:
                merged += f"\n{line_match.group(0)}"

    return merged
