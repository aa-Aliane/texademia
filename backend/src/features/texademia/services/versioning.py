# src/features/texademia/services/versioning.py
import uuid
from datetime import datetime
from diff_match_patch import diff_match_patch
import difflib
from sqlmodel.ext.asyncio.session import AsyncSession

from src.features.texademia.models.document import (
    Document,
    DocumentFile,
    DocumentFileVersion,
    DocumentVersion,
    VersionTrigger,
)

_dmp = diff_match_patch()


def create_document_checkpoint(
    session: AsyncSession, document: Document, trigger: VersionTrigger, author: str
) -> DocumentVersion | None:
    """
    Creates one commit for the whole document, containing a reverse-patch
    entry for every file whose content changed since its own last checkpoint.
    Files with no changes are simply omitted from the commit — same as a
    git commit only touching a subset of files. Returns None (no commit
    created) if nothing changed anywhere.
    """
    now = datetime.utcnow()
    pending: list[tuple[DocumentFile, str]] = []

    for f in document.files:
        baseline = (
            f.last_checkpoint_content
            if f.last_checkpoint_content is not None
            else f.content
        )
        if baseline == f.content:
            continue
        patches = _dmp.patch_make(f.content, baseline)
        pending.append((f, _dmp.patch_toText(patches)))

    if not pending:
        return None

    commit = DocumentVersion(trigger=trigger, author=author, created_at=now)
    commit.document = document  # keeps document.versions in sync in-memory
    session.add(commit)

    for f, reverse_patch in pending:
        version = DocumentFileVersion(
            trigger=trigger,
            author=author,
            reverse_patch=reverse_patch,
            created_at=now,
        )
        version.file = f  # keeps f.versions in sync in-memory
        version.commit = commit  # keeps commit.file_versions in sync in-memory
        f.last_checkpoint_content = f.content
        session.add(version)
        session.add(f)

    return commit


def _reconstruct_undoing(
    document: Document, commit_ids_to_undo: set[uuid.UUID]
) -> dict[uuid.UUID, str]:
    result: dict[uuid.UUID, str] = {}
    for f in document.files:
        content = f.content
        file_versions = sorted(
            [v for v in f.versions if v.commit_id in commit_ids_to_undo],
            key=lambda v: v.created_at,
            reverse=True,
        )
        for v in file_versions:
            patches = _dmp.patch_fromText(v.reverse_patch)
            content, results = _dmp.patch_apply(patches, content)
            if not all(results):
                raise ValueError(
                    f"Patch failed to apply cleanly for version {v.id} (file {f.id})"
                )
        result[f.id] = content
    return result


def _target_index(document: Document, target_commit_id: uuid.UUID) -> tuple[list, int]:
    commits_desc = sorted(document.versions, key=lambda c: c.created_at, reverse=True)
    idx = next(
        (i for i, c in enumerate(commits_desc) if c.id == target_commit_id), None
    )
    if idx is None:
        raise ValueError("Commit not found for this document")
    return commits_desc, idx


def reconstruct_document_after(
    document: Document, target_commit_id: uuid.UUID
) -> dict[uuid.UUID, str]:
    """Content as it was right AFTER target_commit_id was made (undoes only
    commits strictly newer than target). Used to compute a single commit's
    own diff/summary — never for restore."""
    commits_desc, idx = _target_index(document, target_commit_id)
    newer_ids = {c.id for c in commits_desc[:idx]}
    return _reconstruct_undoing(document, newer_ids)


def reconstruct_document_before(
    document: Document, target_commit_id: uuid.UUID
) -> dict[uuid.UUID, str]:
    """Content as it was right BEFORE target_commit_id's changes were applied
    (undoes target_commit_id itself plus everything newer). This is what
    'restore this version' should give you: the state before that change."""
    commits_desc, idx = _target_index(document, target_commit_id)
    ids_to_undo = {c.id for c in commits_desc[: idx + 1]}
    return _reconstruct_undoing(document, ids_to_undo)


async def delete_versions_after(
    document: Document, target_commit_id: uuid.UUID, session: AsyncSession
) -> None:
    """
    Deletes target_commit_id and every commit newer than it — since restoring
    rolls back to the state BEFORE target_commit_id's change, that change
    (and anything after it) no longer has a meaningful place in history.
    """
    commits_desc, idx = _target_index(document, target_commit_id)
    for commit in commits_desc[: idx + 1]:
        await session.delete(commit)


def compute_commit_summary(document: Document, commit: DocumentVersion) -> str:
    """A short '+N -M in K files' string, computed by diffing each file's
    pre/post content for this specific commit."""
    after_by_file = reconstruct_document_after(document, commit.id)
    total_add = 0
    total_remove = 0

    for fv in commit.file_versions:
        after_content = after_by_file.get(fv.file_id, "")
        patches = _dmp.patch_fromText(fv.reverse_patch)
        before_content, results = _dmp.patch_apply(patches, after_content)
        if not all(results):
            continue
        sm = difflib.SequenceMatcher(
            a=before_content.split("\n"), b=after_content.split("\n"), autojunk=False
        )
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag in ("replace", "delete"):
                total_remove += i2 - i1
            if tag in ("replace", "insert"):
                total_add += j2 - j1

    n_files = len(commit.file_versions)
    return f"+{total_add} -{total_remove} in {n_files} {'file' if n_files == 1 else 'files'}"


def get_commit_diff(document: Document, commit_id: uuid.UUID) -> list[dict]:
    """Per-file line diff for a single commit, for the 'Details' view."""
    commit = next((c for c in document.versions if c.id == commit_id), None)
    if not commit:
        raise ValueError("Commit not found for this document")

    after_by_file = reconstruct_document_after(document, commit_id)
    file_names = {f.id: f.name for f in document.files}

    diffs = []
    for fv in commit.file_versions:
        after_content = after_by_file.get(fv.file_id, "")
        patches = _dmp.patch_fromText(fv.reverse_patch)
        before_content, results = _dmp.patch_apply(patches, after_content)
        if not all(results):
            raise ValueError(f"Could not reconstruct diff for file {fv.file_id}")

        sm = difflib.SequenceMatcher(
            a=before_content.split("\n"), b=after_content.split("\n"), autojunk=False
        )
        lines = []
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                lines += [
                    {"type": "context", "content": l}
                    for l in after_content.split("\n")[j1:j2]
                ]
            else:
                lines += [
                    {"type": "remove", "content": l}
                    for l in before_content.split("\n")[i1:i2]
                ]
                lines += [
                    {"type": "add", "content": l}
                    for l in after_content.split("\n")[j1:j2]
                ]

        diffs.append(
            {"file_name": file_names.get(fv.file_id, "unknown"), "lines": lines}
        )

    return diffs
