from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.deadlines import router as deadlines_router

app = FastAPI(title="Mister Moderator API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deadlines_router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
