"""Phone mode (version 2): lets a phone on the same Wi-Fi open the app. Safe to run any time, on any network.

It does ONE thing in backend/.env and cleans up ONE thing in frontend/.env:
  backend/.env   CORS_ORIGIN_REGEX=...   allow pages opened from this PC or any address on a home / office network
  frontend/.env  removes an old  VITE_API_URL=http://192.168.x.x:8000  that an earlier version wrote
The frontend now finds the backend from the address it was opened from, so no IP is written anywhere and
nothing breaks when you change network. The PC keeps working at localhost:5173, the phone at http://<PC IP>:5173.

Usage (start-phone.bat runs this for you):
  python phone_mode.py                 set it up and show the address to open on the phone
  python phone_mode.py 192.168.43.7    show this address instead (if detection picked the wrong network)

Only the Python standard library is used."""
import ipaddress
import re
import socket
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
# localhost, or an address from a private (home / office / hotspot) network, on the dev-server port 5173
REGEX = r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):5173$"


def detect_ip() -> str:
    """The address this PC uses on the network in use right now. Nothing is sent: connecting a UDP
    socket only makes the system pick the route."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except OSError:
        pass
    for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
        if not ip.startswith(("127.", "169.254.")):
            return ip
    raise SystemExit("Sikuweza kupata IP ya PC. Unganisha Wi-Fi kisha jaribu tena, au andika IP: python phone_mode.py 192.168.x.x")


def set_line(path: Path, key: str, value: str) -> None:
    """Replace the `key=...` line (or add it); every other line is kept exactly as it is."""
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    new = f"{key}={value}"
    for i, line in enumerate(lines):
        if line.split("=", 1)[0].strip() == key:
            lines[i] = new
            break
    else:
        lines.append(new)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def is_local_host(host: str) -> bool:
    if host in ("localhost", ""):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False


def clean_frontend_env(path: Path) -> str:
    """Remove a VITE_API_URL that points at this PC / a home network (written by the old version).
    A URL pointing at a real server (https://...) is left alone, with a warning."""
    if not path.exists():
        return "frontend/.env haipo - sawa"
    kept, removed, warn = [], [], []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.split("=", 1)[0].strip() == "VITE_API_URL":
            value = line.split("=", 1)[1].strip().strip('"').strip("'") if "=" in line else ""
            if is_local_host(urlparse(value).hostname or ""):
                removed.append(value)
                continue
            warn.append(value)
        kept.append(line)
    if kept and any(k.strip() for k in kept):
        path.write_text("\n".join(kept) + "\n", encoding="utf-8")
    else:
        path.unlink()  # nothing else was in it
    out = f"imeondoa VITE_API_URL ya zamani ({removed[0]})" if removed else "hakuna VITE_API_URL ya zamani - sawa"
    if warn:
        out += f"\n  ONYO: frontend/.env ina VITE_API_URL={warn[0]} (seva halisi). Frontend itaitumia hiyo badala ya backend ya PC.\n        Ukitaka backend ya PC, ondoa mstari huo."
    return out


def main() -> None:
    host = sys.argv[1] if len(sys.argv) > 1 else detect_ip()
    backend_env = ROOT / "backend" / ".env"
    if not backend_env.parent.exists():
        raise SystemExit("Sioni folda ya backend. Weka skripti hii kwenye folda kuu ya project (ile yenye backend na frontend).")
    set_line(backend_env, "CORS_ORIGIN_REGEX", REGEX)
    front = clean_frontend_env(ROOT / "frontend" / ".env") if (ROOT / "frontend").exists() else "folda ya frontend haipo"

    print("=" * 60)
    print("  Hali ya simu - tayari")
    print("=" * 60)
    print(f"  backend/.env   : CORS_ORIGIN_REGEX imewekwa")
    print(f"  frontend/.env  : {front}")
    print()
    print(f"  Kwenye PC     : http://localhost:5173")
    print(f"  Kwenye simu   : http://{host}:5173   (Wi-Fi ile ile)")
    print(f"  Jaribu backend: http://{host}:8000/docs")
    print("=" * 60)


if __name__ == "__main__":
    main()
