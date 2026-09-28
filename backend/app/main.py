from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import SETTINGS

app = FastAPI(title="Mister Moderator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=SETTINGS.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
