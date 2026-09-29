import logging

from maxapi import Bot, Dispatcher

from app.bot.bot_info import BotInfo
from app.bot.handlers import dp
from app.core.config import SETTINGS
from app.services import notify_service

logger = logging.getLogger("bot")


async def init_bot() -> tuple[Bot, Dispatcher]:
    token = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    if not token:
        raise ValueError("MAX_BOT_TOKEN не задан в .env")

    bot = Bot(token=token)

    # Проверка токена + получение информации о боте
    try:
        bot_info = await bot.get_me()
    except Exception as e:
        raise ValueError(f"Токен бота невалиден: {e}")

    if bot_info is None:
        raise ValueError("get_me вернул пустой результат — токен невалиден")

    username = getattr(bot_info, "username", None)
    if not username:
        raise ValueError("get_me не вернул username")

    BotInfo.username = username
    BotInfo.bot_url = f"https://max.ru/{username}"

    logger.info("Bot username: %s", BotInfo.username)
    logger.info("Bot URL: %s", BotInfo.bot_url)

    # Sender для notify_service
    async def sender(user_id: str, text: str) -> bool:
        try:
            await bot.send_message(user_id=user_id, text=text)
            return True
        except Exception as e:
            logger.error("Ошибка отправки в %s: %s", user_id, e)
            return False

    notify_service.register_sender(sender)
    logger.info("Sender зарегистрирован")

    return bot, dp
