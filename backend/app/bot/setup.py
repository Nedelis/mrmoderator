import logging

from maxapi import Bot, Dispatcher

from app.bot.handlers import dp
from app.core.config import SETTINGS
from app.services import notify_service

logger = logging.getLogger("bot")


def init_bot() -> tuple[Bot, Dispatcher]:
    token = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    if not token:
        raise ValueError("MAX_BOT_TOKEN не задан в .env")

    bot = Bot(token=token)

    async def sender(chat_id: str, text: str) -> bool:
        try:
            await bot.send_message(chat_id=chat_id, text=text)
            return True
        except Exception as e:
            logger.error("Ошибка отправки в %s: %s", chat_id, e)
            return False

    notify_service.register_sender(sender)
    logger.info("Sender зарегистрирован")

    return bot, dp
