from typing import Final
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

class _Settings(BaseSettings):
    MAX_BOT_TOKEN: SecretStr = SecretStr("")
    DATABASE_URL: str = ""
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

SETTINGS: Final[_Settings] = _Settings()