"""All settings come from the .env file (or real environment variables)."""
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./smarttaka.db"
    SECRET_KEY: str  # required: the app will not start without it
    ACCESS_TOKEN_MINUTES: int = 60 * 8
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]  # your React dev server
    # Optional pattern for origins allowed in addition to CORS_ORIGINS. For testing from a phone on your Wi-Fi
    # (the phone's address changes with every network) - see phone_mode.py. Leave empty on a hosted server.
    CORS_ORIGIN_REGEX: str = ""
    APP_URL: str = "http://localhost:5173"  # link customers get in the billing SMS

    # ---- payments ----
    PAYMENT_PROVIDER: str = "harakapay"  # "harakapay" (real) or "mock" (fake, development only)
    HARAKAPAY_API_KEY: str = ""
    HARAKAPAY_BASE_URL: str = "https://harakapay.net"
    HARAKAPAY_WEBHOOK_TOKEN: str = ""
    HARAKAPAY_WEBHOOK_URL: str = ""
    MONTHLY_FEE_TZS: int = 200  # testing value - set the real fee in .env

    # ---- branding: the ONE place the system name lives. Change it here (or APP_NAME in .env / Render)
    # and it changes everywhere: login page, headers, browser tab, SMS texts, PDFs, payment descriptions.
    # The logo is the file backend/brand/logo.png (+ brand/favicon.png for the browser-tab icon).
    APP_NAME: str = "Smart Taka"
    SHOW_NAME_BESIDE_LOGO: bool = True  # set false when the logo image already contains the name

    # A customer only sees their payments from the last N months (a rolling window).
    # Older rows stay in the database for admins and reports; they are just not shown to the customer.
    CUSTOMER_HISTORY_MONTHS: int = 12

    # ---- bank transfer (customer pays into the company account, then uploads the receipt) ----
    BANK_ACCOUNT_NUMBER: str = "31410034454"  # empty = hide the bank option from customers
    BANK_NAME: str = "NMB"       # shown to the customer next to the number (override with BANK_NAME in .env)
    BANK_ACCOUNT_NAME: str = "ADMIN SALU"  # the name the account is registered under (override in .env)
    RECEIPT_MAX_MB: int = 5      # largest receipt image/PDF a customer can upload
    RECEIPT_MAX_UPLOADS_PER_DAY: int = 5  # per customer, so nobody floods the review queue

    # ---- phone verification (OTP) for new customers ----
    OTP_TTL_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5               # wrong guesses allowed per code, then a new code is needed
    OTP_RESEND_COOLDOWN_SECONDS: int = 60   # minimum gap between two codes to the same phone
    OTP_MAX_SENDS_PER_HOUR: int = 5         # per phone number
    SIGNUP_MAX_PER_IP_PER_HOUR: int = 10    # public self-registrations from one address
    OTP_GLOBAL_MAX_PER_HOUR: int = 200      # hard ceiling on OTP SMS triggered by the public pages

    # ---- SMS (Briq) ----
    SMS_PROVIDER: str = "briq"  # "briq", "meseji" (real) or "mock" (prints the SMS in the server console)
    BRIQ_API_KEY: str = ""
    BRIQ_BASE_URL: str = "https://karibu.briq.tz"
    BRIQ_SENDER_ID: str = "BRIQ"  # use your approved sender ID
    MESEJI_API_KEY: str = ""
    MESEJI_BASE_URL: str = "https://meseji.co.tz/api/v1"
    MESEJI_SENDER_ID: str = "MESEJI"  # "MESEJI" is the default sender available to everyone; use your own once approved

    # ---- IoT bin sensors ----
    SENSOR_API_KEY: str = ""  # sensors send this in the X-Sensor-Key header. Empty = sensors are refused.
    BIN_FULL_THRESHOLD: int = 80  # % fill level at which a bin counts as "full"

    # ---- route optimization ----
    DEPOT_LATITUDE: float = -6.838848  # where trucks start and end the day - SET YOUR REAL DEPOT
    DEPOT_LONGITUDE: float = 39.271071
    FUEL_PRICE_TZS_PER_LITER: int = 3000  # PLACEHOLDER - set today's real pump price
    TRIP_FIXED_COST_TZS: int = 0          # optional extra cost per trip (driver allowance, etc.)
    STOP_SERVICE_MINUTES: int = 3         # time spent at each stop (placeholder)
    ROAD_FACTOR: float = 1.3              # estimate: road distance = straight line x this
    AVG_SPEED_KMH: float = 25.0           # estimate only: average city speed


settings = Settings()
