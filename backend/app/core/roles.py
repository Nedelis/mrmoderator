from typing import Final

PERMISSIONS: Final[dict[str, str]] = {
    "reminder.create.personal": "Создавать личные напоминалки",
    "reminder.create.group": "Создавать групповые напоминалки",
    "reminder.remind": "Принудительные напоминания",
    "debts.create.own": "Создавать долги себе",
    "debts.edit": "Редактировать любые долги",
    "debts.view.all": "Видеть долги всей группы",
    "task.create.personal": "Создавать личные задания",
    "task.create.group": "Создавать групповые задания",
    "task.edit": "Редактировать групповые задания",
    "task.delete": "Удалять групповые задания",
    "task.remind": "Принудительные напоминания о заданиях",
    "material.upload": "Загружать материалы",
    "material.delete.own": "Удалять свои материалы",
    "material.delete.any": "Удалять любые материалы",
    "mail.forward": "Пересылать письма в группу",
    "mail.configure": "Настраивать почтовые ящики",
    "exam.addMaterial": "Добавлять материалы к экзаменам",
    "roles.assign": "Назначать роли",
    "group.edit": "Управлять составом группы",
    "settings.edit": "Менять настройки",
}

ROLES: Final[dict[str, dict]] = {
    "starosta": {
        "id": "starosta",
        "label": "Староста",
        "shortLabel": "Староста",
        "description": "Полный доступ к управлению группой",
        "level": 4,
        "badgeClass": "role-starosta",
        "badgeIcon": "👑",
        "badgeText": "Высшая",
        "menu": ["/", "/students", "/reminders", "/debts", "/tasks",
                 "/materials", "/exams", "/mail", "/settings"],
        "permissions": list(PERMISSIONS.keys()),
    },
    "zam": {
        "id": "zam",
        "label": "Заместитель старосты",
        "shortLabel": "Зам",
        "description": "Помощник старосты, ограничен в правах",
        "level": 3,
        "badgeClass": "role-zam",
        "badgeIcon": "🛡️",
        "badgeText": "Средняя",
        "menu": ["/", "/students", "/reminders", "/debts", "/tasks", "/materials"],
        "permissions": [
            "reminder.create.personal", "reminder.create.group", "reminder.remind",
            "debts.create.own", "debts.view.all",
            "task.create.personal", "task.create.group", "task.edit", "task.remind",
            "material.upload", "material.delete.own",
            "exam.addMaterial",
        ],
    },
    "proforg": {
        "id": "proforg",
        "label": "Профорг",
        "shortLabel": "Профорг",
        "description": "Отвечает за профсоюзную работу",
        "level": 2,
        "badgeClass": "role-proforg",
        "badgeIcon": "🤝",
        "badgeText": "Средняя",
        "menu": ["/", "/reminders", "/materials", "/mail"],
        "permissions": [
            "reminder.create.personal", "reminder.create.group",
            "material.upload", "material.delete.own",
            "mail.forward", "mail.configure",
        ],
    },
    "student": {
        "id": "student",
        "label": "Студент",
        "shortLabel": "Студент",
        "description": "Обычный участник группы",
        "level": 1,
        "badgeClass": "role-student",
        "badgeIcon": "🎓",
        "badgeText": "Базовая",
        "menu": ["/", "/reminders", "/debts", "/tasks", "/materials", "/exams"],
        "permissions": [
            "reminder.create.personal",
            "debts.create.own",
            "task.create.personal",
        ],
    },
}


def has_permission(role_id: str, permission: str) -> bool:
    role = ROLES.get(role_id)
    if not role:
        return False
    return permission in role["permissions"]
