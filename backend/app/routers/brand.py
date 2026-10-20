"""Public branding info for the website (no login needed: the login page shows it too).

  GET /brand           -> {"name", "has_logo", "show_name", "version"}
  GET /brand/logo      -> the logo image (backend/brand/logo.png)
  GET /brand/favicon   -> the browser-tab icon
Change the name with APP_NAME and the pictures by replacing the PNG files - see app/core/brand.py."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.brand import brand_version, favicon_path, logo_path
from app.core.config import settings

router = APIRouter(prefix="/brand", tags=["brand"])

# The frontend asks for ?v=<version>, so a long cache is safe: a new logo gets a new version number.
_CACHE = {"Cache-Control": "public, max-age=86400"}


@router.get("")
def brand_info():
    return {
        "name": settings.APP_NAME,
        "has_logo": logo_path() is not None,
        "show_name": settings.SHOW_NAME_BESIDE_LOGO,
        "version": brand_version(),
    }


@router.get("/logo")
def brand_logo():
    path = logo_path()
    if path is None:
        raise HTTPException(404, "No logo uploaded")
    return FileResponse(path, media_type="image/png", headers=_CACHE)


@router.get("/favicon")
def brand_favicon():
    path = favicon_path()
    if path is None:
        raise HTTPException(404, "No logo uploaded")
    return FileResponse(path, media_type="image/png", headers=_CACHE)
