# src/features/texademia/services/versioning.py
import uuid
from diff_match_patch import diff_match_patch
from sqlmodel.ext.asyncio.session import AsyncSession

from src.features.texademia.models.document import (
    DocumentFile,
    DocumentFileVersion,
    VersionTrigger,
)

_dmp = diff_match_patch()


def create_checkpoint(
    file: DocumentFile, trigger: VersionTrigger, author: str
) -> DocumentFileVersion | None:
    """
    Diffs the file's current content against the last checkpoint and stores
    a reverse patch (current -> baseline). No-op if nothing changed since
    the last checkpoint (e.g. two idle-triggers with no edits in between).
    """
    baseline = (
        file.last_checkpoint_content
        if file.last_checkpoint_content is not None
        else file.content
    )
    if baseline == file.content:
        return None

    patches = _dmp.patch_make(file.content, baseline)
    reverse_patch = _dmp.patch_toText(patches)

    version = DocumentFileVersion(
        file_id=file.id,
        trigger=trigger,
        author=author,
        reverse_patch=reverse_patch,
    )
    file.last_checkpoint_content = file.content
    return version


def reconstruct_content_at(
    versions_desc: list[DocumentFileVersion],  # must be sorted newest -> oldest
    current_content: str,
    target_version_id: uuid.UUID,
) -> str:
    content = current_content
    for v in versions_desc:
        patches = _dmp.patch_fromText(v.reverse_patch)
        content, results = _dmp.patch_apply(patches, content)
        if not all(results):
            raise ValueError(f"Patch failed to apply cleanly for version {v.id}")
        if v.id == target_version_id:
            return content
    raise ValueError("Version not found in history for this file")
