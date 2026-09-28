from pathlib import Path
from typing import Final

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py лежит в backend/app/core/
# parents[0] = core/
# parents[1] = app/
# parents[2] = backend/
# parents[3] = корень проекта (mrmoderator/)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # === MAX ===
    MAX_BOT_TOKEN: SecretStr = SecretStr("")

    # === App ===
    DEBUG: bool = False
    STRICT_AUTH: bool = False
    USE_TEST_DATA: bool = False

    # === Database ===
    # Дефолт — для локальной разработки (uvicorn без Docker).
    # В Docker compose перебивает через environment: DATABASE_URL=...@db:5432/...
    DATABASE_URL: str = "postgresql+asyncpg://mrmod:mrmod@localhost:5432/mrmod"

    # === Uploads ===
    UPLOAD_DIR: Path = BACKEND_DIR / "uploads"
    MAX_FILE_SIZE: int = 20 * 1024 * 1024  # 20 MB

    # === CORS ===
    # Pydantic-settings парсит list[str] из JSON-строки в .env:
    # CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ]

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


SETTINGS: Final[Settings] = Settings()
