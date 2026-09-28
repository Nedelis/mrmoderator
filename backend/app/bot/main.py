import asyncio
import logging

from maxapi.methods.set_commands import SetCommands
from maxapi.types import BotCommand

from app.bot.setup import init_bot

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bot")


async def register_commands(bot) -> None:
    """Регистрирует список команд для подсказок при вводе /."""
    commands = [
        BotCommand(name="start", description="Запустить бота"),
        BotCommand(name="help", description="Список команд"),
        BotCommand(name="creategroup", description="Создать группу"),
        BotCommand(name="join", description="Вступить в группу по коду"),
        BotCommand(name="invite", description="Код приглашения (староста)"),
        BotCommand(name="setchat", description="Привязать чат (староста)"),
        BotCommand(name="open", description="Открыть приложение"),
        BotCommand(name="test_notify", description="Тест уведомления"),
    ]
    try:
        await SetCommands(bot, commands).fetch()
        logger.info("Список команд зарегистрирован")
    except Exception as e:
        logger.error("Не удалось зарегистрировать команды: %s", e)


async def main() -> None:
    bot, dp = init_bot()
    await register_commands(bot)
    logger.info("Бот запущен. Polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
