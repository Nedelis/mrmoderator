from typing import Final


# ============================================================
# ПРАВА
# ============================================================

PERMISSIONS: Final[dict[str, str]] = {
    "reminder.create.personal": "Создание личных напоминалок",
    "reminder.create.group": "Создание групповых напоминалок",
    "reminder.remind": "Отправка напоминаний",
    "material.upload": "Загрузка материалов",
    "material.delete.any": "Удаление любых материалов",
    "material.delete.own": "Удаление своих материалов",
    "mail.configure": "Настройка почтовых ящиков",
    "mail.forward": "Пересылка писем в группу",
    "debts.edit": "Редактирование и удаление долгов",
    "debts.create.own": "Добавление своих долгов",
    "debts.view.all": "Просмотр долгов всей группы",
    "roles.assign": "Назначение ролей",
    "group.edit": "Управление составом группы",
    "exam.create": "Создание экзаменов",
    "exam.addMaterial": "Добавление материалов к экзаменам",
    "task.create.group": "Создание групповых заданий",
    "task.create.personal": "Создание личных заданий",
    "task.edit": "Редактирование групповых заданий",
    "task.delete": "Удаление групповых заданий",
    "task.remind": "Отправка напоминаний о заданиях",
}


# ============================================================
# РОЛИ
# ============================================================

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
        "menu": [
            "/", "/my-stats", "/reminders", "/debts", "/exams",
            "/tasks", "/materials", "/mail", "/roles",
        ],
        "permissions": [
            "reminder.create.group",
            "reminder.create.personal",
            "reminder.remind",
            "material.upload",
            "material.delete.any",
            "material.delete.own",
            "mail.configure",
            "mail.forward",
            "debts.edit",
            "debts.create.own",
            "debts.view.all",
            "roles.assign",
            "group.edit",
            "exam.create",
            "exam.addMaterial",
            "task.create.group",
            "task.create.personal",
            "task.edit",
            "task.delete",
            "task.remind",
        ],
    },
    "zam": {
        "id": "zam",
        "label": "Замстаросты",
        "shortLabel": "Зам",
        "description": "Полный доступ, кроме выдачи высших ролей и правки состава",
        "level": 3,
        "badgeClass": "role-zam",
        "badgeIcon": "🛡️",
        "badgeText": "Высокая",
        "menu": [
            "/", "/my-stats", "/reminders", "/debts", "/exams",
            "/tasks", "/materials", "/mail", "/roles",
        ],
        "permissions": [
            "reminder.create.group",
            "reminder.create.personal",
            "reminder.remind",
            "material.upload",
            "material.delete.any",
            "material.delete.own",
            "mail.configure",
            "mail.forward",
            "debts.edit",
            "debts.create.own",
            "debts.view.all",
            "roles.assign",
            "exam.create",
            "exam.addMaterial",
            "task.create.group",
            "task.create.personal",
            "task.edit",
            "task.delete",
            "task.remind",
        ],
    },
    "proforg": {
        "id": "proforg",
        "label": "Профорг / Групорг",
        "shortLabel": "Профорг",
        "description": "Материалы, объявления и личные задачи",
        "level": 2,
        "badgeClass": "role-proforg",
        "badgeIcon": "📢",
        "badgeText": "Средняя",
        "menu": [
            "/my-stats", "/reminders", "/debts", "/exams",
            "/tasks", "/materials", "/mail",
        ],
        "permissions": [
            "reminder.create.personal",
            "material.upload",
            "material.delete.own",
            "mail.forward",
            "debts.create.own",
            "task.create.personal",
        ],
    },
    "student": {
        "id": "student",
        "label": "Студент",
        "shortLabel": "Студент",
        "description": "Просмотр материалов и личные задачи",
        "level": 1,
        "badgeClass": "role-student",
        "badgeIcon": "👤",
        "badgeText": "Базовая",
        "menu": [
            "/my-stats", "/reminders", "/debts", "/exams",
            "/tasks", "/materials",
        ],
        "permissions": [
            "reminder.create.personal",
            "material.upload",
            "material.delete.own",
            "debts.create.own",
            "task.create.personal",
        ],
    },
}


# ============================================================
# ХЕЛПЕРЫ
# ============================================================

def get_role(role_id: str) -> dict | None:
    """Возвращает конфиг роли или None."""
    return ROLES.get(role_id)


def has_permission(role_id: str, permission: str) -> bool:
    """Есть ли у роли право."""
    role = ROLES.get(role_id)
    if not role:
        return False
    return permission in role["permissions"]


def can_assign_role(actor_role_id: str, target_role_id: str) -> bool:
    """
    Может ли роль `actor` назначить роль `target`.
    - Старосту нельзя назначить через UI (только через админа системы).
    - Роли равного уровня назначать нельзя.
    - Зам не может назначать роли с level >= своего.
    """
    if target_role_id == "starosta":
        return False

    actor = ROLES.get(actor_role_id)
    target = ROLES.get(target_role_id)
    if not actor or not target:
        return False

    return target["level"] < actor["level"]


def assignable_roles(actor_role_id: str) -> list[dict]:
    """Роли, доступные для назначения текущим актором."""
    return [r for r in ROLES.values() if can_assign_role(actor_role_id, r["id"])]