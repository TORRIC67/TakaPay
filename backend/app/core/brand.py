"""Branding: the system name and logo, in one place.

  * Name: APP_NAME in config.py / .env (default "Smart Taka"). Every SMS text, PDF, payment
    description, the API title and (through GET /brand) the whole website read it from there.
  * Logo: the PNG file  backend/brand/logo.png  (a wide logo, transparent background looks best).
    The small icon in the browser tab is  backend/brand/favicon.png  (square). If favicon.png is
    missing, logo.png is used for it too.

To white-label the system for another company: change APP_NAME and replace those PNG files.
Nothing else needs editing and the frontend does not need to be rebuilt."""
from pathlib import Path
from typing import Optional

from app.core.config import settings

BRAND_DIR = Path(__file__).resolve().parents[2] / "brand"


def logo_path() -> Optional[Path]:
    p = BRAND_DIR / "logo.png"
    return p if p.is_file() else None


def favicon_path() -> Optional[Path]:
    p = BRAND_DIR / "favicon.png"
    return p if p.is_file() else logo_path()


def brand_version() -> int:
    """Changes whenever a logo file is replaced, so browsers fetch the new picture instead of an old cached one."""
    stamps = [int(p.stat().st_mtime) for p in (logo_path(), favicon_path()) if p]
    return max(stamps, default=0)


def draw_pdf_logo(pdf, height: float = 18) -> None:
    """Draws the logo centred at the top of the current PDF page. A missing or unreadable logo
    never breaks a receipt or report - the PDF is simply made without it."""
    path = logo_path()
    if path is None:
        return
    try:
        from PIL import Image  # installed together with fpdf2

        with Image.open(path) as im:
            width = height * im.width / im.height
        pdf.image(str(path), x=(pdf.w - width) / 2, y=8, h=height)
        pdf.set_y(8 + height + 3)
    except Exception:  # noqa: BLE001
        return
