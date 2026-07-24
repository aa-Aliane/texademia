# src/features/texademia/services/template_migrator.py
import re
from src.features.texademia.templates import (
    get_template_files,
    TEMPLATE_NAMES,
)  # CHANGED

_BEGIN_DOC_RE = re.compile(r"\\begin\{document\}")
_END_DOC_RE = re.compile(r"\\end\{document\}")
_USEPACKAGE_RE = re.compile(r"\\usepackage(?:\[[^\]]*\])?\{([^}]*)\}")
_USETIKZLIBRARY_RE = re.compile(r"\\usetikzlibrary\{([^}]*)\}")
_NEWCOMMAND_START_RE = re.compile(r"\\newcommand\*?")

# Fallback for commands that only exist in specific templates' .sty files
# (e.g. arxiv.sty's \keywords). \providecommand is a no-op if the target
# template already defines it. \keywords splits its argument on \and, so
# \and is locally redefined inside a group before expanding #1.
_COMPAT_SHIM = "\\providecommand{\\keywords}[1]{{\\def\\and{, }\\par\\noindent\\textbf{Keywords:} #1\\par}}\n"

_CONFLICTING_PACKAGES = {"authblk", "achemso", "elsarticle"}

# --- body overflow fix (NEW) -------------------------------------------------
_INCLUDEGRAPHICS_RE = re.compile(r"\\includegraphics(\[[^\]]*\])?\{([^}]*)\}")
_ENV_BLOCK_RE = re.compile(r"\\begin\{(figure\*?|table\*?)\}.*?\\end\{\1\}", re.DOTALL)
# Any of these are "raw content" environments that can silently keep the
# source template's wider sizing (a fixed-width tabular, or a tikzpicture
# built with absolute node/coordinate widths) — both get wrapped in
# \resizebox the same way, since resizebox works on arbitrary box content,
# not just tables.
_CONTENT_ENV_RE = re.compile(r"\\begin\{(tabular\*?|tikzpicture)\}")
_ALREADY_WRAPPED_RE = re.compile(r"\\(resizebox|adjustbox)")
# -----------------------------------------------------------------------------


def _split_preamble(tex_source: str) -> tuple[str, str]:
    """(everything before \\begin{document}, everything from \\begin{document} onward)."""
    match = _BEGIN_DOC_RE.search(tex_source)
    if not match:
        return tex_source, ""
    return tex_source[: match.start()], tex_source[match.start() :]


def _extract_body(tex_source: str) -> str:
    """Content strictly between \\begin{document} and \\end{document}."""
    begin = _BEGIN_DOC_RE.search(tex_source)
    end = _END_DOC_RE.search(tex_source)
    if not begin or not end or end.start() < begin.end():
        return tex_source
    return tex_source[begin.end() : end.start()]


def _package_names(preamble: str) -> set[str]:
    names: set[str] = set()
    for m in _USEPACKAGE_RE.finditer(preamble):
        names.update(pkg.strip() for pkg in m.group(1).split(","))
    return names


def _tikz_library_names(preamble: str) -> set[str]:
    names: set[str] = set()
    for m in _USETIKZLIBRARY_RE.finditer(preamble):
        names.update(lib.strip() for lib in m.group(1).split(","))
    return names


def _extra_usepackage_lines(source_preamble: str, target_preamble: str) -> list[str]:
    target_pkgs = _package_names(target_preamble)
    lines = []
    for m in _USEPACKAGE_RE.finditer(source_preamble):
        pkgs = {p.strip() for p in m.group(1).split(",")}
        if pkgs & TEMPLATE_NAMES:
            continue
        if pkgs & _CONFLICTING_PACKAGES:  # NEW
            continue
        if pkgs & target_pkgs:
            continue
        lines.append(m.group(0))
    return lines


def _extra_tikzlibrary_line(source_preamble: str, target_preamble: str) -> str | None:
    """
    Union any \\usetikzlibrary{...} entries from the source that the target
    template doesn't already load. Without this, a body that relies on e.g.
    `right=of <node>` positioning syntax will compile fine in its original
    template but fatally error after conversion, since that syntax silently
    depends on `\\usetikzlibrary{positioning}` being loaded somewhere.
    """
    source_libs = _tikz_library_names(source_preamble)
    if not source_libs:
        return None
    target_libs = _tikz_library_names(target_preamble)
    missing = source_libs - target_libs
    if not missing:
        return None
    return "\\usetikzlibrary{" + ",".join(sorted(missing)) + "}"


def _find_balanced_brace(text: str, brace_start: int) -> str:
    """text[brace_start] must be '{'; return its content up to the matching '}'."""
    depth = 0
    for i in range(brace_start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[brace_start + 1 : i]
    return text[brace_start + 1 :]  # unbalanced — best effort


def _extract_command_arg(text: str, command: str) -> str | None:
    """Find \\command[...]{...} (options optional) and return the {...} content."""
    m = re.search(r"\\" + re.escape(command) + r"(?:\[[^\]]*\])?\s*\{", text)
    if not m:
        return None
    return _find_balanced_brace(text, m.end() - 1)


def _replace_command_arg(preamble: str, command: str, new_arg: str) -> str:
    """Replace an existing \\command{...} argument, or append a fresh \\command{...} if missing."""
    m = re.search(r"\\" + re.escape(command) + r"(?:\[[^\]]*\])?\s*\{", preamble)
    if not m:
        return preamble + f"\\{command}{{{new_arg}}}\n"
    brace_start = m.end() - 1
    old_arg = _find_balanced_brace(preamble, brace_start)
    return (
        preamble[: brace_start + 1]
        + new_arg
        + preamble[brace_start + 1 + len(old_arg) :]
    )


def _parse_newcommands(preamble: str) -> list[tuple[str, str]]:  # NEW
    """
    Returns [(command_name, full_definition_text), ...] for each
    \\newcommand/\\renewcommand found in the preamble. Handles both
    \\newcommand{\\foo}... and \\newcommand\\foo... forms, plus optional
    [nargs] and [default] specs before the body brace group.
    """
    results = []
    for m in _NEWCOMMAND_START_RE.finditer(preamble):
        start = m.start()
        pos = m.end()
        while pos < len(preamble) and preamble[pos].isspace():
            pos += 1

        name = None
        if pos < len(preamble) and preamble[pos] == "{":
            arg = _find_balanced_brace(preamble, pos)
            name = arg.lstrip("\\").strip()
            pos += len(arg) + 2
        elif pos < len(preamble) and preamble[pos] == "\\":
            name_match = re.match(r"\\([a-zA-Z]+)", preamble[pos:])
            if name_match:
                name = name_match.group(1)
                pos += name_match.end()

        if name is None:
            continue

        while pos < len(preamble) and preamble[pos].isspace():
            pos += 1
        # skip up to two optional [...] groups: [nargs] and [default]
        for _ in range(2):
            if pos < len(preamble) and preamble[pos] == "[":
                close = preamble.find("]", pos)
                if close == -1:
                    break
                pos = close + 1
                while pos < len(preamble) and preamble[pos].isspace():
                    pos += 1
            else:
                break

        if pos >= len(preamble) or preamble[pos] != "{":
            continue  # not a brace-bodied definition — skip, best effort

        body = _find_balanced_brace(preamble, pos)
        end = pos + len(body) + 2
        results.append((name, preamble[start:end]))
    return results


def _extra_newcommand_lines(
    source_preamble: str, target_preamble: str
) -> list[str]:  # NEW
    """
    Carry over custom \\newcommand/\\renewcommand macros the body relies on
    (e.g. a \\best{} helper used to bold the top score in a results table)
    that the target template doesn't already define. Without this, swapping
    templates silently drops any macro the original author defined for their
    own body content, and the body fails with 'Undefined control sequence'.
    """
    target_names = {name for name, _ in _parse_newcommands(target_preamble)}
    target_names.add("keywords")  # already covered by _COMPAT_SHIM

    lines = []
    seen = set()
    for name, definition in _parse_newcommands(source_preamble):
        if name in target_names or name in seen:
            continue
        seen.add(name)
        lines.append(definition)
    return lines


def _target_width_macro(env_name: str) -> str:  # NEW
    """Starred (spanning) envs get \\textwidth; single-column envs get \\columnwidth."""
    return "\\textwidth" if env_name.endswith("*") else "\\columnwidth"


def _fix_includegraphics_widths(block: str, width_macro: str) -> str:  # NEW
    def _replace(m: re.Match) -> str:
        opts, path = m.group(1) or "", m.group(2)
        # Already relative to the right thing (columnwidth/linewidth/textwidth) — leave it.
        if opts and re.search(r"width\s*=\s*\\(column|line|text)width", opts):
            return m.group(0)
        if not opts:
            return f"\\includegraphics[width={width_macro}]{{{path}}}"
        if "width=" in opts:
            opts = re.sub(r"width\s*=\s*[^,\]]+", f"width={width_macro}", opts)
        else:
            opts = opts[:-1] + f",width={width_macro}]"
        return f"\\includegraphics{opts}{{{path}}}"

    return _INCLUDEGRAPHICS_RE.sub(_replace, block)


def _fix_content_overflow(block: str, width_macro: str) -> str:  # NEW
    """
    Wraps the first raw-content environment in a figure/table block (a
    tabular, or a tikzpicture) in \\resizebox, unless it's already wrapped
    in resizebox/adjustbox. This is what actually catches figures made of
    plain TikZ nodes/arrows with hardcoded absolute widths — those have no
    \\includegraphics and no tabular, so they'd otherwise pass through the
    migration completely unscaled and keep overflowing the narrower target
    column.
    """
    if _ALREADY_WRAPPED_RE.search(block):
        return block  # author already handled scaling, don't double-wrap

    m = _CONTENT_ENV_RE.search(block)
    if not m:
        return block

    env_name = m.group(1)
    begin = m.start()
    end_marker = f"\\end{{{env_name}}}"
    end_idx = block.find(end_marker, begin)
    if end_idx == -1:
        return block  # unbalanced — best effort, leave as-is
    end_idx += len(end_marker)

    content = block[begin:end_idx]
    wrapped = f"\\resizebox{{{width_macro}}}{{!}}{{%\n{content}}}"
    return block[:begin] + wrapped + block[end_idx:]


def _fix_body_overflow(body: str) -> str:  # NEW
    """
    Rewrites figure/table environments so their contents scale to the
    target template's column width instead of keeping the source
    template's (often wider) sizing, which otherwise overflows into the
    margin/gutter after a single->two-column style migration.

    - Plain figure/table -> width rewritten to \\columnwidth.
    - figure*/table* (already spanning) -> width rewritten to \\textwidth.
    - includegraphics widths already relative to \\columnwidth/\\linewidth/
      \\textwidth are left untouched.
    - Bare tabular or tikzpicture content with no existing resizebox/
      adjustbox gets wrapped in \\resizebox{<width_macro>}{!}{...}. This is
      what catches figures built directly out of raw TikZ (nodes, arrows,
      boxes) with hardcoded absolute widths — there's no includegraphics
      or tabular to key off of otherwise, so without this they pass
      through untouched and keep overflowing.
    """

    def _fix_block(m: re.Match) -> str:
        env_name = m.group(1)
        block = m.group(0)
        width_macro = _target_width_macro(env_name)
        block = _fix_includegraphics_widths(block, width_macro)
        block = _fix_content_overflow(block, width_macro)
        return block

    return _ENV_BLOCK_RE.sub(_fix_block, body)


def migrate_files_to_template(
    files: list[dict],  # [{"name", "language", "content"}, ...]
    target_template: str,
) -> list[dict]:
    """
    Rebuild each .tex file for the target template: swap \\documentclass and
    the template's own style package, but keep the author's actual title,
    author block, extra \\usepackage lines, custom macros, and full body
    content intact (with figure/table widths rescaled to the target
    template's column width to avoid overflow). Non-.tex files (bib, etc.)
    pass through unchanged.
    """
    starters = {
        name: content for name, _lang, content in get_template_files(target_template)
    }

    migrated = []
    for f in files:
        starter = starters.get(f["name"])
        if f["name"].endswith(".tex") and starter is not None:
            source_preamble, _ = _split_preamble(f["content"])
            target_preamble, _ = _split_preamble(starter)

            extra_pkgs = _extra_usepackage_lines(source_preamble, target_preamble)
            new_preamble = target_preamble
            if extra_pkgs:
                new_preamble = (
                    new_preamble.rstrip("\n") + "\n" + "\n".join(extra_pkgs) + "\n"
                )

            extra_tikzlib = _extra_tikzlibrary_line(source_preamble, target_preamble)
            if extra_tikzlib:
                new_preamble = new_preamble.rstrip("\n") + "\n" + extra_tikzlib + "\n"

            # Carry over custom \newcommand/\renewcommand macros the body needs
            extra_macros = _extra_newcommand_lines(source_preamble, target_preamble)
            if extra_macros:
                new_preamble = (
                    new_preamble.rstrip("\n") + "\n" + "\n".join(extra_macros) + "\n"
                )

            source_title = _extract_command_arg(source_preamble, "title")
            if source_title is not None:
                new_preamble = _replace_command_arg(new_preamble, "title", source_title)
            source_author = _extract_command_arg(source_preamble, "author")
            if source_author is not None:
                new_preamble = _replace_command_arg(
                    new_preamble, "author", source_author
                )

            new_preamble += _COMPAT_SHIM

            body = _extract_body(f["content"])
            body = _fix_body_overflow(body)  # NEW — rescale figure/table widths
            migrated.append(
                {
                    **f,
                    "content": f"{new_preamble}\\begin{{document}}\n{body}\\end{{document}}\n",
                }
            )
        else:
            migrated.append(f)
    return migrated
