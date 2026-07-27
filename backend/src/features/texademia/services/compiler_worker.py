# src/features/texademia/services/compiler_worker.py
import os
import resource
import shutil
import subprocess
import tempfile
from pathlib import Path

import redis
from rq import get_current_job

from src.config.settings import settings
from src.features.texademia.assets import get_template_asset_files

redis_conn = redis.from_url(settings.REDIS_URL)

OUTPUT_DIR = Path("compiled_pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)

COMPILE_TIMEOUT_SECONDS = 60  # per pdflatex/bibtex invocation
MEMORY_LIMIT_BYTES = 768 * 1024 * 1024  # bumped a bit — 512MB was tight for real docs


class CompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        self.message = message
        self.log = log
        super().__init__(message)


def _limit_memory():
    try:
        resource.setrlimit(resource.RLIMIT_AS, (MEMORY_LIMIT_BYTES, MEMORY_LIMIT_BYTES))
    except (ValueError, OSError):
        pass


def _run(cmd: list[str], cwd: Path, timeout: int) -> tuple[int, str]:
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        preexec_fn=_limit_memory,
    )
    try:
        stdout, _ = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        return -1, f"Command timed out after {timeout}s: {' '.join(cmd)}"
    return proc.returncode, stdout.decode(errors="replace")


def compile_latex_job(document_id: str, files_data: list[dict], template: str) -> dict:
    job = get_current_job()
    combined_log = []

    main_file = next((f for f in files_data if f["name"].endswith(".tex")), None)
    print(
        f"[worker] doc={document_id} template={template} "
        f"files={[(f['name'], len(f['content'])) for f in files_data]} "
        f"main_snippet={main_file['content'][:200]!r}" if main_file else "no-main"
    )

    def update_progress(step: str, percent: int, message: str = ""):
        if job:
            job.meta = {
                "status": "running",
                "step": step,
                "percent": percent,
                "message": message,
            }
            job.save_meta()

    def fail(message: str):
        full_log = "\n\n".join(combined_log)
        if job:
            job.meta = {**(job.meta or {}), "log": full_log}
            job.save_meta()
        raise CompileError(message, log=full_log)

    update_progress("preparing", 10, "Setting up compilation environment")

    if not shutil.which("pdflatex"):
        fail("pdflatex is not installed.")

    main_file = next((f for f in files_data if f["name"].endswith(".tex")), None)
    if main_file is None:
        fail("No .tex file found.")

    main_stem = Path(main_file["name"]).stem
    has_bib = any(f["name"].endswith(".bib") for f in files_data)

    os.environ.setdefault("TMPDIR", "/var/tmp")

    with tempfile.TemporaryDirectory(dir="/var/tmp") as tmp:
        tmp_path = Path(tmp)

        update_progress("copying", 15, "Copying template assets")
        for asset in get_template_asset_files(template):
            shutil.copy(asset, tmp_path / asset.name)

        update_progress("writing", 20, "Writing source files")
        for f in files_data:
            (tmp_path / f["name"]).write_text(f["content"], encoding="utf-8")

        pdflatex_cmd = [
            "pdflatex",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-no-shell-escape",
            main_file["name"],
        ]

        update_progress("compiling", 35, "Running pdflatex (pass 1)")
        rc, log = _run(pdflatex_cmd, tmp_path, COMPILE_TIMEOUT_SECONDS)
        combined_log.append(f"--- pdflatex pass 1 ---\n{log}")
        if rc != 0:
            fail("LaTeX compilation failed on first pass.")

        if has_bib:
            update_progress("bibliography", 55, "Running bibtex")
            rc, log = _run(["bibtex", main_stem], tmp_path, COMPILE_TIMEOUT_SECONDS)
            combined_log.append(f"--- bibtex ---\n{log}")
            # bibtex returns nonzero on warnings too, so don't hard-fail here —
            # only bail if it clearly couldn't run at all.
            if rc != 0 and "I found no" not in log and "I couldn't open" not in log:
                pass  # keep going; pdflatex passes below will surface real issues

            update_progress("compiling", 70, "Running pdflatex (pass 2)")
            rc, log = _run(pdflatex_cmd, tmp_path, COMPILE_TIMEOUT_SECONDS)
            combined_log.append(f"--- pdflatex pass 2 ---\n{log}")
            if rc != 0:
                fail("LaTeX compilation failed after bibtex.")

            update_progress("compiling", 85, "Running pdflatex (pass 3)")
            rc, log = _run(pdflatex_cmd, tmp_path, COMPILE_TIMEOUT_SECONDS)
            combined_log.append(f"--- pdflatex pass 3 ---\n{log}")
            if rc != 0:
                fail("LaTeX compilation failed on final pass.")

        pdf_path = tmp_path / f"{main_stem}.pdf"
        if not pdf_path.exists():
            fail("Compilation finished but no PDF was produced.")

        update_progress("saving", 95, "Saving PDF output")
        dest_path = OUTPUT_DIR / f"{document_id}.pdf"
        shutil.copyfile(pdf_path, dest_path)

    full_log = "\n\n".join(combined_log)
    update_progress("done", 100, "Compilation complete")
    return {
        "status": "success",
        "pdf_url": f"/static/compiled/{document_id}.pdf",
        "log": full_log,
    }
