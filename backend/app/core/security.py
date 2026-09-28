import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl
from fastapi import HTTPException, status
from app.core.config import SETTINGS


def parse_init_data(init_data: str) -> dict:
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    return parsed


def validate_init_data(init_data: str) -> dict:
    if not init_data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "initData отсутствует")

    parsed = parse_init_data(init_data)

    if not SETTINGS.STRICT_AUTH:
        user_raw = parsed.get("user", "{}")
        try:
            user = json.loads(user_raw)
        except json.JSONDecodeError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Некорректный user")
        return {"user": user, "auth_date": int(time.time())}

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "hash отсутствует")

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )

    secret_key = hmac.new(
        b"WebAppData",
        SETTINGS.MAX_BOT_TOKEN.get_secret_value().encode(),
        hashlib.sha256,
    ).digest()

    expected_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Невалидная подпись")

    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > 3600:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "initData просрочен")

    user_raw = parsed.get("user", "{}")
    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Некорректный user")

    return {"user": user, "auth_date": auth_date}
