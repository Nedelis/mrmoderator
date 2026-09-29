from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from maxapi import Bot

from app.api.v1.router import api_router
from app.bot.bot_info import BotInfo
from app.core.config import SETTINGS
from app.core.openapi import install_openapi
from app.services import notify_service

@asynccontextmanager
async def lifespan(_: FastAPI):
    """При старте API регистрируем sender и заполняем BotInfo + сидим тестовую БД если есть такой флаг."""
    token: str = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    api_bot: Bot | None = None

    if SETTINGS.USE_TEST_DATA:
        print("[api] USE_TEST_DATA=true — запускаем сидинг")
        try:
            from seed.seed import main as seed_main
            await seed_main(True)
        except Exception as e:
            print(f"[api] Ошибка сидинга: {e}")

    if token:
        api_bot = Bot(token=token)

        try:
            bot_info = await api_bot.get_me()
            if bot_info is None:
                raise ValueError("get_me вернул пустой результат")

            username = getattr(bot_info, "username", None)
            if not username:
                raise ValueError("get_me не вернул username")

            BotInfo.username = username
            BotInfo.bot_url = f"https://max.ru/{username}"

            print(f"[api] Bot username: {BotInfo.username}")
            print(f"[api] Mini App URL: {BotInfo.build_mini_app_url()}")
        except Exception as e:
            print(f"[api] Не удалось получить bot_info: {e}")

        async def sender(user_id: int, text: str) -> bool:
            try:
                await api_bot.send_message(user_id=user_id, text=text)
                return True
            except Exception as e:
                print(f"[api] Ошибка отправки в {user_id}: {e}")
                return False

        notify_service.register_sender(sender)
        print("[api] Sender зарегистрирован")
    else:
        print("[api] MAX_BOT_TOKEN пустой — sender не зарегистрирован")

    yield

    if api_bot is not None:
        await api_bot.close_session()
        print("[api] Bot закрыт")


app = FastAPI(
    title="Mister Moderator API",
    version="1.0.0",
    lifespan=lifespan,
    # Под префиксом /api, чтобы документация была доступна через nginx и туннель
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
install_openapi(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Max-Init-Data"],
)

app.include_router(api_router, prefix="/api")


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Некорректные данные (например, неверный формат даты) — 400, а не 500."""
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/health")
async def health():
    return {"status": "ok"}
