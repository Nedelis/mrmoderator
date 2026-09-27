from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.deadline import Deadline

router = APIRouter(prefix="/deadlines", tags=["deadlines"])

@router.get("/")
async def get_deadlines(group_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deadline).where(Deadline.group_id == group_id))
    return result.scalars().all()
