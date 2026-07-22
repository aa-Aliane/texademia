# src/features/texademia/assets.py
from pathlib import Path

ASSETS_DIR = Path(__file__).parent / "assets"


def get_template_asset_files(template: str) -> list[Path]:
    """Extra .sty/.cls/.bst files a template needs at compile time."""
    template_dir = ASSETS_DIR / template
    if not template_dir.exists():
        return []
    return [f for f in template_dir.iterdir() if f.is_file()]
