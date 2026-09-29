import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

import aiohttp
from fastapi import HTTPException, status
from maxapi.client.ssl import create_default_ssl_context
from maxapi.connection.base import BaseConnection

from app.core.config import SETTINGS

# ═══════════════════════════════════════════════════════════════
# Проверка токена бота
# ═══════════════════════════════════════════════════════════════

_bot_verified = False


async def verify_bot_token() -> bool:
    """
    Проверяет токен бота через GET /me.
    Кеширует только успешный результат, чтобы не дёргать MAX на каждый запрос;
    после сетевой ошибки проверка повторится на следующем запросе.
    """
    global _bot_verified

    if _bot_verified:
        return True

    token = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    if not token:
        return False

    # Сертификат platform-api.max.ru выпущен НУЦ Минцифры — его корень
    # есть в maxapi, но не в стандартном наборе CA
    connector = aiohttp.TCPConnector(ssl=create_default_ssl_context())
    try:
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(
                f"{BaseConnection.API_URL}/me",
                headers={"Authorization": token},
            ) as resp:
                _bot_verified = resp.status == 200
    except aiohttp.ClientError:
        return False

    return _bot_verified

    token = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    if not token:
        _bot_verified = False
        return False

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://platform-api2.max.ru/me",
                headers={"Authorization": token},
            ) as resp:
                _bot_verified = resp.status == 200
    except Exception:
        _bot_verified = False

    return _bot_verified


# ═══════════════════════════════════════════════════════════════
# Парсинг initData
# ═══════════════════════════════════════════════════════════════


def parse_init_data(init_data: str) -> dict:
    return dict(parse_qsl(init_data, keep_blank_values=True))


# ═══════════════════════════════════════════════════════════════
# Валидация initData
# ═══════════════════════════════════════════════════════════════


async def validate_init_data(init_data: str) -> dict:
    """
    Валидирует initData от MAX.

    - Проверяет, что токен бота валиден (через GET /me).
    - Проверяет HMAC-подпись.
    - Проверяет срок действия auth_date.
    """
    # 1. Токен бота должен быть валидным
    if not await verify_bot_token():
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "invalid_bot_token",
                    "message": "Токен бота невалиден или бот не существует",
                }
            },
        )

    # 2. initData не пустой
    if not init_data:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "no_init_data", "message": "initData отсутствует"}},
        )

    parsed = parse_init_data(init_data)

    # 3. Режим разработки — без проверки подписи
    if not SETTINGS.STRICT_AUTH:
        user_raw = parsed.get("user", "{}")
        try:
            user = json.loads(user_raw)
        except json.JSONDecodeError:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail={"error": {"code": "bad_user", "message": "Некорректный user"}},
            )
        return {"user": user, "auth_date": int(time.time())}

    # 4. Извлекаем hash
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "no_hash", "message": "hash отсутствует"}},
        )

    # 5. Собираем data_check_string
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))

    # 6. Считаем подпись
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

    # 7. Сравниваем
    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "bad_signature", "message": "Невалидная подпись"}},
        )

    # 8. Проверяем свежесть
    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > 3600:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "expired", "message": "initData просрочен"}},
        )

    # 9. Парсим user
    user_raw = parsed.get("user", "{}")
    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "bad_user", "message": "Некорректный user"}},
        )

    return {"user": user, "auth_date": auth_date}
