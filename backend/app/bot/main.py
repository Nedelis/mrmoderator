import asyncio
from maxapi import Bot, Dispatcher
from maxapi.filters.command import CommandStart
from maxapi.types import BotStarted, MessageCreated, InputMedia
from app.core.config import SETTINGS

bot = Bot(SETTINGS.MAX_BOT_TOKEN.get_secret_value())
dp = Dispatcher()

@dp.bot_started()
async def on_start(event: BotStarted):
    await bot.send_message(chat_id=event.chat_id, text="Привет! Я Мистер Модератор.")

@dp.message_created(CommandStart())
async def on_command(event: MessageCreated):
    await event.message.answer("Команды скоро появятся. Пока просто привет!", [InputMedia(r"C:\Users\dimos\Downloads\Telegram Desktop\IMG_0775.MP4")])

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())