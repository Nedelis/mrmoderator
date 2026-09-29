from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from maxapi import Bot

from app.api.v1.router import api_router
from app.core.config import SETTINGS
from app.core.openapi import install_openapi
from app.services import notify_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """При старте API регистрируем sender для notify_service."""
    token: str = SETTINGS.MAX_BOT_TOKEN.get_secret_value()
    api_bot: Bot | None = None

    if token:
        api_bot = Bot(token=token)

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
