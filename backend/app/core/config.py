from pathlib import Path
from typing import Final
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    MAX_BOT_TOKEN: SecretStr = SecretStr("")

    DATABASE_URL: str = "sqlite+aiosqlite:///./mrmod.db"

    DEBUG: bool = False
    STRICT_AUTH: bool = False

    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_FILE_SIZE: int = 20 * 1024 * 1024

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


SETTINGS: Final[Settings] = Settings()