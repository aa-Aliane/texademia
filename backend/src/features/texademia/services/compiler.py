# src/features/texademia/services/compiler.py
import uuid
from pathlib import Path

import redis
from rq import Queue

from src.config.settings import settings
from src.features.texademia.models.document import (
    DocumentFile,
)

redis_conn = redis.from_url(settings.REDIS_URL)
compile_queue = Queue("latex_compile", connection=redis_conn)

OUTPUT_DIR = Path("compiled_pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)


class CompileError(Exception):
    def __init__(self, message: str, log: str = ""):
        self.message = message
        self.log = log
        super().__init__(message)


def enqueue_compile_job(
    document_id: uuid.UUID, files: list[DocumentFile], template: str
) -> str:
    """
    Enqueues a compilation job and returns the job ID for polling.
    """
    files_data = [
        {"id": str(f.id), "name": f.name, "language": f.language, "content": f.content}
        for f in files
    ]

    from src.features.texademia.services.compiler_worker import compile_latex_job

    job = compile_queue.enqueue(
        compile_latex_job,
        str(document_id),
        files_data,
        template,
        job_timeout=180,
        result_ttl=3600,
    )
    return job.id


def get_job_status(job_id: str) -> dict:
    """Poll job status from Redis."""
    from rq.job import Job

    job = Job.fetch(job_id, connection=redis_conn)

    if job.is_finished:
        return {
            "status": "done",
            "result": job.result,
        }
    elif job.is_failed:
        meta = job.meta or {}
        return {
            "status": "error",
            "error": str(job.exc_info) if job.exc_info else "Unknown error",
            "log": meta.get("log", ""),
        }
    else:
        meta = job.meta or {}
        return {
            "status": meta.get("status", "queued"),
            "step": meta.get("step", "waiting"),
            "percent": meta.get("percent", 0),
            "message": meta.get("message", "Job is queued..."),
        }
