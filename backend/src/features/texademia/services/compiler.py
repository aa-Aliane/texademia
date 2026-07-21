import asyncio
import shutil
import tempfile
import uuid
from pathlib import Path

from src.features.texademia.models.document import DocumentFile

OUTPUT_DIR = Path("compiled_pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)

COMPILE_TIMEOUT_SECONDS = 30


class CompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        self.message = message
        self.log = log
        super().__init__(message)


async def compile_latex(files: list[DocumentFile], document_id: uuid.UUID) -> str:
    if not shutil.which("latexmk"):
        raise CompileError("latexmk is not installed on the server.")

    main_file = next((f for f in files if f.name.endswith(".tex")), None)
    if main_file is None:
        raise CompileError("No .tex file found in the project.")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        for f in files:
            (tmp_path / f.name).write_text(f.content, encoding="utf-8")

        cmd = [
            "latexmk",
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-no-shell-escape",
            main_file.name,
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=tmp_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            stdout, _ = await asyncio.wait_for(
                proc.communicate(), timeout=COMPILE_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise CompileError("Compilation timed out.")

        log_text = stdout.decode(errors="replace")
        pdf_path = tmp_path / Path(main_file.name).with_suffix(".pdf").name

        if proc.returncode != 0 or not pdf_path.exists():
            raise CompileError("LaTeX compilation failed.", log=log_text)

        dest_path = OUTPUT_DIR / f"{document_id}.pdf"
        shutil.copyfile(pdf_path, dest_path)

    return f"/static/compiled/{document_id}.pdf"
