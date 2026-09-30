from fastapi import APIRouter

from app.api.v1 import auth, debts, exams, group, mail, materials, reminders, roles, tasks

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(group.router)
api_router.include_router(reminders.router)
api_router.include_router(debts.router)
api_router.include_router(tasks.router)
api_router.include_router(materials.router)
api_router.include_router(exams.router)
api_router.include_router(mail.router)
api_router.include_router(roles.router)
