"""Tiny in-memory rate limiter for the public (not logged in) pages.

It lives in the memory of ONE server process. That is fine for a single Render instance; if you
ever run several workers, each keeps its own count, so move this to Redis at that point. The
per-phone limits in services/otp.py are stored in the database and do not have this limitation."""
import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings


class SlidingWindow:
    def __init__(self, limit: int, seconds: int):
        self.limit, self.seconds = limit, seconds
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """True and records the hit if `key` is under the limit; False (records nothing) otherwise."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.seconds:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True


    # --- "count only the failures" use (wrong passwords): check first, record after a failure ---
    def blocked(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.seconds:
                hits.popleft()
            return len(hits) >= self.limit

    def record(self, key: str) -> None:
        with self._lock:
            self._hits[key].append(time.monotonic())

    def clear(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


signup_per_ip = SlidingWindow(settings.SIGNUP_MAX_PER_IP_PER_HOUR, 3600)
resend_per_ip = SlidingWindow(30, 3600)
forgot_per_ip = SlidingWindow(20, 3600)  # "forgot password" requests from one visitor
login_failures = SlidingWindow(10, 900)  # wrong passwords per phone number, per 15 minutes
otp_global = SlidingWindow(settings.OTP_GLOBAL_MAX_PER_HOUR, 3600)  # total OTP SMS the public pages may trigger


def client_ip(request: Request) -> str:
    """Behind Render's proxy the real visitor is the LAST address in X-Forwarded-For (the one the
    proxy itself added); earlier entries can be forged by the visitor."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"
