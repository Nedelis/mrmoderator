from maxapi import Dispatcher
from maxapi.filters.command import Command, CommandStart
from maxapi.types import (
    BotStarted,
    CallbackButton,
    LinkButton,
    MessageCallback,
    MessageCreated,
)
from maxapi.types.attachments.buttons.attachment_button import AttachmentButton
from maxapi.utils.inline_keyboard import InlineKeyboardBuilder

from app.bot.bot_info import BotInfo
from app.core.database import async_session
from app.core.roles import ROLES
from app.models.user import User
from app.services import group_service, notify_service, user_service

dp = Dispatcher()


# ═══════════════════════════════════════════════════════════════
# КЛАВИАТУРЫ
# ═══════════════════════════════════════════════════════════════


def main_menu_kb() -> AttachmentButton:
    builder = InlineKeyboardBuilder()
    builder.row(LinkButton(text="🔗 Открыть приложение", url=BotInfo.build_mini_app_url()))
    builder.row(
        CallbackButton(text="📚 Моя группа", payload="my_group"),
        CallbackButton(text="🔑 Приглашение", payload="invite"),
    )
    return builder.as_markup()


def no_group_kb() -> AttachmentButton:
    builder = InlineKeyboardBuilder()
    builder.row(
        CallbackButton(text="➕ Создать группу", payload="create_group"),
        CallbackButton(text="🚪 Вступить по коду", payload="join_group"),
    )
    return builder.as_markup()


# ═══════════════════════════════════════════════════════════════
# Диплинк /start с payload (invite_XXX)
# ═══════════════════════════════════════════════════════════════


@dp.bot_started()
async def on_bot_started(event: BotStarted):
    """Обработка запуска бота (в т.ч. через диплинк)."""
    payload = event.payload  # ← сюда приходит "invite_ABC123"

    if not payload or not payload.startswith("invite_"):
        return

    invite_code = payload.replace("invite_", "", 1).strip()
    max_user_id = str(event.user.user_id)

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)
        if user is None:
            user = User(
                max_user_id=max_user_id,
                first_name=getattr(event.user, "first_name", "") or "",
                last_name=getattr(event.user, "last_name", "") or "",
                role_id="student",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        if user.group_id:
            await event.bot.send_message(
                user_id=max_user_id,
                text="Ты уже в группе. Сначала выйди из текущей.",
            )
            return

        group = await group_service.join_group_by_invite(db, user, invite_code)
        if group:
            await event.bot.send_message(
                chat_id=event.chat_id,
                text=f"✅ Ты вступил в группу «{group.name}»!\nОткрой приложение: /open",
            )
        else:
            await event.bot.send_message(chat_id=event.chat_id, text="❌ Неверный код приглашения.")


# ═══════════════════════════════════════════════════════════════
# /start
# ═══════════════════════════════════════════════════════════════


@dp.message_created(CommandStart())
async def cmd_start(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)
    first_name = getattr(sender, "first_name", "") or ""
    last_name = getattr(sender, "last_name", "") or ""

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)
        if user is None:
            user = User(
                max_user_id=max_user_id,
                first_name=first_name,
                last_name=last_name,
                role_id="student",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    commands_text = (
        "📖 Доступные команды:\n\n"
        "/start — начать\n"
        "/help — список команд\n"
        "/creategroup НАЗВАНИЕ — создать группу\n"
        "/join КОД — вступить по коду\n"
        "/invite — код приглашения (староста)\n"
        "/setchat — привязать чат (староста)\n"
        "/open — открыть приложение\n"
        "/test_notify — тест уведомления"
    )

    if not user.group_id:
        await event.message.answer(
            f"Привет, {first_name or 'друг'}! 👋\n\n"
            "Я — Мистер Модератор.\n\n"
            "Ты пока не в группе. Выбери действие:\n\n" + commands_text,
            attachments=[no_group_kb()],
        )
        return

    await event.message.answer(
        f"Привет, {first_name or 'друг'}! 👋\n\nТы в группе.\n\n" + commands_text,
        attachments=[main_menu_kb()],
    )


# ═══════════════════════════════════════════════════════════════
# /help
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("help"))
async def cmd_help(event: MessageCreated):
    await event.message.answer(
        "📖 Команды:\n\n"
        "/start — начать\n"
        "/creategroup НАЗВАНИЕ — создать группу\n"
        "/join КОД — вступить по коду\n"
        "/invite — код приглашения (староста)\n"
        "/setchat — привязать чат (староста, в группе)\n"
        "/open — открыть приложение\n"
        "/test_notify — тест уведомления"
    )


# ═══════════════════════════════════════════════════════════════
# /creategroup
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("creategroup"))
async def cmd_creategroup(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)
    text = event.message.body.text or ""
    name = text.replace("/creategroup", "", 1).strip()

    if not name:
        await event.message.answer(
            "Использование: /creategroup НАЗВАНИЕ\nНапример: /creategroup ИС-21"
        )
        return

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)
        if not user:
            await event.message.answer("Сначала напиши /start")
            return
        if user.group_id:
            await event.message.answer("Ты уже в группе. Сначала выйди из текущей.")
            return

        try:
            group = await group_service.create_group(db, user, name)
        except ValueError as e:
            if str(e) == "already_in_group":
                await event.message.answer("Ты уже в группе.")
                return
            raise

        await event.message.answer(
            f"✅ Группа «{group.name}» создана!\n"
            f"Ты — староста.\n\n"
            f"🔑 Ссылка-приглашение:\n{BotInfo.build_start_invitation(group.invite_code)}\n\n"
            f"Или код для ручного ввода: {group.invite_code}\n\n"
            f"Теперь создай групповой чат в MAX, добавь туда меня\n"
            f"и напиши в нём /setchat — чтобы я мог отправлять уведомления."
        )


# ═══════════════════════════════════════════════════════════════
# /join
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("join"))
async def cmd_join(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)
    text = event.message.body.text or ""
    code = text.replace("/join", "", 1).strip()

    if not code:
        await event.message.answer("Использование: /join КОД")
        return

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)
        if not user:
            await event.message.answer("Сначала напиши /start")
            return
        if user.group_id:
            await event.message.answer("Ты уже в группе. Сначала выйди из текущей.")
            return

        group = await group_service.join_group_by_invite(db, user, code)
        if not group:
            await event.message.answer("❌ Неверный код приглашения.")
            return

        await event.message.answer(
            f"✅ Ты вступил в группу «{group.name}»!\nТеперь можешь открыть приложение: /open"
        )


# ═══════════════════════════════════════════════════════════════
# /invite
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("invite"))
async def cmd_invite(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)
        if not user or not user.group_id:
            await event.message.answer("Ты не в группе.")
            return
        if user.role_id != "starosta":
            await event.message.answer("Только староста может выдавать приглашения.")
            return

        group = await group_service.get_group(db, user.group_id)
        if not group or not group.invite_code:
            await event.message.answer("Код не найден.")
            return

        await event.message.answer(
            f"🔑 Ссылка-приглашение:\n{BotInfo.build_start_invitation(group.invite_code)}\n\n"
            f"Или код для ручного ввода: {group.invite_code}"
        )


# ═══════════════════════════════════════════════════════════════
# /setchat
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("setchat"))
async def cmd_setchat(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)
    chat_id = str(event.message.recipient.chat_id)

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)
        if not user or not user.group_id:
            await event.message.answer("Ты не в группе.")
            return
        if user.role_id != "starosta":
            await event.message.answer("Только староста может привязать чат.")
            return

        await group_service.save_chat_id(db, user.group_id, chat_id)
        await event.message.answer(
            "✅ Чат привязан к группе. Теперь уведомления будут приходить сюда."
        )


# ═══════════════════════════════════════════════════════════════
# /open
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("open"))
async def cmd_open(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)

    async with async_session() as db:
        user = await user_service.get_user_by_max_id(db, max_user_id)

    if not user or not user.group_id:
        await event.message.answer(
            "❌ Чтобы открыть приложение, ты должен быть в группе.\n"
            "Создай /creategroup НАЗВАНИЕ или вступи /join КОД"
        )
        return

    await event.message.answer(f"🔗 Открой приложение:\n{BotInfo.build_mini_app_url()}")


# ═══════════════════════════════════════════════════════════════
# /test_notify
# ═══════════════════════════════════════════════════════════════


@dp.message_created(Command("test_notify"))
async def cmd_test_notify(event: MessageCreated):
    sender = event.message.sender
    max_user_id = str(sender.user_id)
    ok = await notify_service.send_to_user(
        max_user_id, "🔔 Тестовое уведомление от Мистера Модератора."
    )
    if ok:
        await event.message.answer("✅ Уведомление отправлено.")
    else:
        await event.message.answer("❌ Не удалось отправить.")


# ═══════════════════════════════════════════════════════════════
# ФОЛБЕК — ловит всё, что не подошло выше
# ═══════════════════════════════════════════════════════════════


@dp.message_created()
async def fallback_handler(event: MessageCreated):
    """Ловит все сообщения, которые не подошли под другие хендлеры."""
    text = (event.message.body.text or "").strip()

    if not text:
        return

    if text.startswith("/"):
        await event.message.answer(
            f"❓ Неизвестная команда: {text.split()[0]}\n\n"
            "Напиши /help, чтобы увидеть список доступных команд."
        )
        return

    # Если это обычный текст — подсказываем, что делать
    await event.message.answer("Я понимаю только команды. Напиши /help, чтобы увидеть список.")


# ═══════════════════════════════════════════════════════════════
# CALLBACK-ОБРАБОТЧИКИ
# ═══════════════════════════════════════════════════════════════


@dp.message_callback()
async def on_callback(event: MessageCallback):
    payload = event.callback.payload
    user = event.callback.user
    max_user_id = str(user.user_id)

    if payload == "my_group":
        async with async_session() as db:
            user_db = await user_service.get_user_by_max_id(db, max_user_id)
            if not user_db or not user_db.group_id:
                await event.message.answer("Ты не в группе.")
                return
            group = await group_service.get_group(db, user_db.group_id)
            if group:
                role_label = ROLES.get(user_db.role_id, {}).get("label", user_db.role_id)
                await event.message.answer(f"📚 Группа: {group.name}\nТвоя роль: {role_label}")

    elif payload == "invite":
        async with async_session() as db:
            user_db = await user_service.get_user_by_max_id(db, max_user_id)
            if not user_db or not user_db.group_id:
                await event.message.answer("Ты не в группе.")
                return
            if user_db.role_id != "starosta":
                await event.message.answer("Только староста может выдавать приглашения.")
                return
            group = await group_service.get_group(db, user_db.group_id)
            if not group or not group.invite_code:
                await event.message.answer("Код не найден.")
                return
            await event.message.answer(
                f"🔑 Ссылка-приглашение:\n{BotInfo.build_start_invitation(group.invite_code)}"
            )

    elif payload == "create_group":
        await event.message.answer("Напиши: /creategroup НАЗВАНИЕ\nНапример: /creategroup ИС-21")

    elif payload == "join_group":
        await event.message.answer("Напиши: /join КОД\nКод можно получить у старосты группы.")
