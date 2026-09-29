"""
Описание API для OpenAPI-схемы: русские summary/description, коды ошибок,
схема авторизации через заголовок X-Max-Init-Data.

Схема отдаётся по /api/openapi.json (Swagger UI — /api/docs)
и выгружается в docs/openapi.yaml командой `python -m app.export_openapi`.
"""

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

API_DESCRIPTION = """
API мини-приложения **«Мистер Модератор»** для MAX — помощника старосты студенческой группы:
напоминания, задания, долги, экзамены, материалы, почта и роли внутри группы.

### Авторизация
Мини-приложение передаёт в каждом запросе заголовок `X-Max-Init-Data` — строку
`WebApp.initData` из MAX Bridge. Сервер проверяет её HMAC-подпись токеном бота.

* `STRICT_AUTH=true` — заголовок обязателен, без него ответ `401`.
* `STRICT_AUTH=false` (демо-режим, по умолчанию) — заголовок игнорируется, все запросы
  выполняются от тестового пользователя «Тест Тестов» с ролью **староста**
  в группе `TEST-GROUP-01`. Группа и пользователь создаются автоматически при первом запросе.

### Роли
`starosta` (4) → `zam` (3) → `proforg` (2) → `student` (1). Права каждой роли —
в ответе `GET /api/roles`. При нехватке прав — `403`.

### Формат ошибок
`{"detail": "<сообщение>"}` или `{"detail": {"error": {"code": "...", "message": "..."}}}`.
Ошибки валидации тела запроса — `422` в стандартном формате FastAPI.
"""

# Описания ошибок, которые подставляются в responses
_ERRORS: dict[int, str] = {
    400: "Некорректные данные (например, неверный формат даты) или пользователь не в группе",
    401: "Нет или невалиден заголовок X-Max-Init-Data (только при STRICT_AUTH=true)",
    403: "Недостаточно прав для операции",
    404: "Объект не найден",
}

# (метод, путь) -> summary, description, дополнительные коды ошибок
_OPS: dict[tuple[str, str], dict[str, Any]] = {
    # --- Служебное ---
    ("get", "/api/health"): {
        "summary": "Проверка работоспособности",
        "description": "Не требует авторизации. Используется healthcheck'ом Docker.",
        "public": True,
    },
    ("get", "/api/roles"): {
        "summary": "Справочник ролей",
        "description": "Все роли с уровнем, правами (`permissions`) и доступными разделами "
        "мини-приложения (`menu`). Фронтенд строит по нему меню и проверки прав.",
    },
    ("get", "/api/me"): {
        "summary": "Текущий пользователь",
        "description": "Пользователь, определённый по initData (или тестовый в демо-режиме), "
        "с группой и ролью. Пустой `groupId` — пользователь ещё не вступил в группу "
        "(вступление — через бота: `/creategroup` или `/join`).",
    },
    # --- Группа ---
    ("get", "/api/group"): {
        "summary": "Информация о группе",
        "description": "Название, курс, семестр и число участников группы текущего пользователя.",
    },
    ("get", "/api/students"): {
        "summary": "Участники группы",
        "description": "Список участников группы с ролями и количеством долгов.",
    },
    ("post", "/api/group/leave"): {
        "summary": "Выйти из группы",
        "description": "Удаляет личные сущности пользователя (долги, задания, напоминалки, "
        "материалы) и отвязывает его от группы. Староста выйти не может — "
        "сначала нужно передать роль.",
        "errors": [400, 403],
    },
    ("post", "/api/roles/assign"): {
        "summary": "Назначить роль участнику",
        "description": "Право `roles.assign`. Нельзя менять роль себе и участникам своего "
        "или более высокого уровня. Назначение `starosta` доступно только старосте и "
        "означает передачу роли: текущий староста становится студентом.",
        "errors": [403, 404],
    },
    ("delete", "/api/group/members/{student_id}"): {
        "summary": "Исключить участника",
        "description": "Право `group.edit` (только староста). Нельзя исключить себя "
        "и участника своего или более высокого уровня.",
        "errors": [403, 404],
    },
    ("patch", "/api/group/members/{student_id}/name"): {
        "summary": "Переименовать участника",
        "description": "Право `group.edit`. Задаёт отображаемое имя участника в группе.",
        "errors": [403, 404],
    },
    # --- Напоминалки ---
    ("get", "/api/reminders"): {
        "summary": "Список напоминалок",
        "description": "Групповые напоминалки и личные напоминалки текущего пользователя, "
        "отсортированные по дедлайну.",
    },
    ("post", "/api/reminders"): {
        "summary": "Создать напоминалку",
        "description": "`scope`: `personal` — личная (право `reminder.create.personal`), "
        "`group` — всей группе, `selected` — выбранным участникам из `studentIds` "
        "(право `reminder.create.group`). Дата — `YYYY-MM-DD`, время — `HH:mm`.",
        "errors": [400, 403],
    },
    ("put", "/api/reminders/{reminder_id}"): {
        "summary": "Изменить напоминалку",
        "description": "Автор или обладатель права `reminder.remind`.",
        "errors": [403, 404],
    },
    ("delete", "/api/reminders/{reminder_id}"): {
        "summary": "Удалить напоминалку",
        "description": "Автор или обладатель права `reminder.remind`.",
        "errors": [403, 404],
    },
    ("put", "/api/reminders/{reminder_id}/complete"): {
        "summary": "Отметить выполнение",
        "description": "Добавляет или убирает текущего пользователя из `completedBy`.",
        "errors": [404],
    },
    ("post", "/api/reminders/{reminder_id}/remind"): {
        "summary": "Напомнить всем",
        "description": "Право `reminder.remind`. Бот отправляет личное сообщение в MAX "
        "каждому участнику группы. `sentTo` — сколько сообщений доставлено.",
        "errors": [403, 404],
    },
    # --- Задания ---
    ("get", "/api/tasks"): {
        "summary": "Список заданий",
        "description": "Групповые и личные задания. `status` вычисляется по дедлайну: "
        "`active`, `soon` (≤ 3 дней), `overdue`, `done`.",
    },
    ("post", "/api/tasks"): {
        "summary": "Создать задание",
        "description": "`type=personal` — право `task.create.personal`, `type=group` — "
        "`task.create.group`. `deadline` — `YYYY-MM-DD` или `YYYY-MM-DDTHH:mm`.",
        "errors": [400, 403],
    },
    ("put", "/api/tasks/{task_id}"): {
        "summary": "Изменить задание",
        "description": "Личное — только автор, групповое — право `task.edit`.",
        "errors": [400, 403, 404],
    },
    ("delete", "/api/tasks/{task_id}"): {
        "summary": "Удалить задание",
        "description": "Личное — только автор, групповое — право `task.delete`.",
        "errors": [403, 404],
    },
    ("post", "/api/tasks/{task_id}/remind"): {
        "summary": "Напомнить о задании",
        "description": "Право `task.remind`. Бот отправляет личное сообщение каждому "
        "участнику группы.",
        "errors": [403, 404],
    },
    # --- Долги ---
    ("get", "/api/debts"): {
        "summary": "Список долгов",
        "description": "С правом `debts.view.all` — долги всей группы, иначе только свои.",
    },
    ("post", "/api/debts"): {
        "summary": "Добавить долг",
        "description": "Право `debts.create.own` — себе; с правом `debts.edit` — любому "
        "участнику группы. `deadline` — `YYYY-MM-DD`.",
        "errors": [400, 403, 404],
    },
    ("put", "/api/debts/{debt_id}"): {
        "summary": "Изменить долг",
        "description": "Право `debts.edit`.",
        "errors": [400, 403, 404],
    },
    ("delete", "/api/debts/{debt_id}"): {
        "summary": "Удалить (закрыть) долг",
        "description": "Право `debts.edit`.",
        "errors": [403, 404],
    },
    # --- Экзамены ---
    ("get", "/api/exams"): {
        "summary": "Расписание экзаменов",
        "description": "Экзамены и консультации группы с прикреплёнными материалами.",
    },
    ("post", "/api/exams"): {
        "summary": "Добавить экзамен",
        "description": "Право `exam.addMaterial`. `date` — `YYYY-MM-DD`, `time` — `HH:mm`.",
        "errors": [400, 403],
    },
    ("post", "/api/exams/{exam_id}/materials"): {
        "summary": "Прикрепить материал к экзамену",
        "description": "Право `exam.addMaterial`. Форма: `title` и необязательная ссылка `url`.",
        "errors": [403, 404],
    },
    ("delete", "/api/exams/{exam_id}/materials/{material_id}"): {
        "summary": "Открепить материал от экзамена",
        "description": "Право `exam.addMaterial`.",
        "errors": [403, 404],
    },
    # --- Материалы ---
    ("get", "/api/materials"): {
        "summary": "Учебные материалы группы",
        "description": "Список материалов с автором и относительным временем добавления.",
    },
    ("post", "/api/materials"): {
        "summary": "Добавить материал",
        "description": "Право `material.upload`. Форма: `title`, `type` (`pdf`, `video`, "
        "`other`) и `url` — ссылка на файл. Сами файлы хранятся в MAX, API хранит метаданные.",
        "errors": [400, 403],
    },
    ("get", "/api/materials/{material_id}/download"): {
        "summary": "Скачать материал",
        "description": "Если у материала есть прямая ссылка — редирект `307` на неё, иначе — "
        "метаданные файла в MAX для скачивания через MAX Bridge.",
        "errors": [404],
        "redirect": True,
    },
    ("delete", "/api/materials/{material_id}"): {
        "summary": "Удалить материал",
        "description": "Право `material.delete.any` или `material.delete.own` для своих.",
        "errors": [403, 404],
    },
    # --- Почта ---
    ("get", "/api/mail"): {
        "summary": "Входящие письма",
        "description": "Письма из подключённых ящиков деканата, кафедр и преподавателей. "
        "**MVP:** синхронизация с почтой не реализована, список заполняется данными из БД.",
    },
    ("post", "/api/mail/{mail_id}/forward"): {
        "summary": "Переслать письмо в группу",
        "description": "Право `mail.forward`. **MVP-заглушка:** возвращает подтверждение "
        "без реальной пересылки.",
        "errors": [403],
    },
    ("post", "/api/mail/refresh"): {
        "summary": "Проверить новые письма",
        "description": "**MVP-заглушка:** IMAP-синхронизация не реализована, `newMessages` "
        "всегда 0.",
    },
    ("post", "/api/mail/configure"): {
        "summary": "Настроить ящики",
        "description": "Право `mail.configure`. **MVP-заглушка:** настройки не сохраняются.",
        "errors": [403],
    },
    ("get", "/api/mail/mailboxes"): {
        "summary": "Подключённые почтовые ящики",
        "description": "Право `mail.configure`.",
        "errors": [403],
    },
    ("post", "/api/mail/mailboxes"): {
        "summary": "Добавить почтовый ящик",
        "description": "Право `mail.configure`. Сохраняет адрес и признак автопересылки.",
        "errors": [400, 403],
    },
    ("delete", "/api/mail/mailboxes/{mailbox_id}"): {
        "summary": "Удалить почтовый ящик",
        "description": "Право `mail.configure`.",
        "errors": [403, 404],
    },
    # --- Настройки ---
    ("get", "/api/settings"): {
        "summary": "Настройки уведомлений группы",
        "description": "Требует право `settings.edit`, которого в текущей версии нет ни у одной "
        "роли — эндпоинт зарезервирован и отвечает `403`.",
        "errors": [403],
    },
    ("put", "/api/settings"): {
        "summary": "Сохранить настройки уведомлений",
        "description": "Зарезервировано (см. `GET /api/settings`).",
        "errors": [403],
    },
}


def _error_response(description: str) -> dict[str, Any]:
    return {
        "description": description,
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/HTTPError"}}},
    }


def build_openapi(app: FastAPI) -> dict[str, Any]:
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=API_DESCRIPTION.strip(),
        routes=app.routes,
    )
    schema["servers"] = [
        {"url": "/", "description": "Текущий хост (через nginx: https://<публичный-адрес>/)"},
        {"url": "http://localhost:8080", "description": "Локальный запуск через Docker (nginx)"},
        {"url": "http://localhost:8000", "description": "Локальный запуск через Docker (API)"},
    ]

    components = schema.setdefault("components", {})
    components.setdefault("schemas", {})["HTTPError"] = {
        "title": "HTTPError",
        "type": "object",
        "required": ["detail"],
        "properties": {
            "detail": {
                "description": "Текст ошибки или объект {error: {code, message}}",
                "oneOf": [
                    {"type": "string"},
                    {"$ref": "#/components/schemas/ErrorResponse"},
                ],
            }
        },
    }
    components["schemas"].setdefault(
        "ErrorResponse",
        {
            "title": "ErrorResponse",
            "type": "object",
            "required": ["error"],
            "properties": {
                "error": {
                    "type": "object",
                    "required": ["code", "message"],
                    "properties": {
                        "code": {"type": "string", "example": "permission_denied"},
                        "message": {"type": "string", "example": "Нет права roles.assign"},
                    },
                }
            },
        },
    )
    components["securitySchemes"] = {
        "MaxInitData": {
            "type": "apiKey",
            "in": "header",
            "name": "X-Max-Init-Data",
            "description": "Строка WebApp.initData из MAX Bridge. Обязательна при STRICT_AUTH=true.",
        }
    }

    for path, ops in schema["paths"].items():
        for method, op in ops.items():
            meta = _OPS.get((method, path), {})
            if "summary" in meta:
                op["summary"] = meta["summary"]
            if "description" in meta:
                op["description"] = meta["description"]

            responses = op.setdefault("responses", {})
            for code, resp in responses.items():
                if resp.get("description") == "Successful Response":
                    resp["description"] = "Успешный ответ"
                elif code == "422":
                    resp["description"] = "Ошибка валидации параметров или тела запроса"
            if meta.get("public"):
                op["security"] = []
                continue

            # Заголовок X-Max-Init-Data описан схемой безопасности, а не параметром
            op["parameters"] = [
                p for p in op.get("parameters", []) if p.get("name") != "X-Max-Init-Data"
            ]
            if not op["parameters"]:
                op.pop("parameters")
                # Без параметров и тела запроса ошибке валидации взяться неоткуда
                if "requestBody" not in op:
                    responses.pop("422", None)
            op["security"] = [{"MaxInitData": []}, {}]

            for code in [401, *meta.get("errors", [])]:
                responses.setdefault(str(code), _error_response(_ERRORS[code]))
            if meta.get("redirect"):
                responses["307"] = {"description": "Редирект на прямую ссылку на файл"}

    return schema


def install_openapi(app: FastAPI) -> None:
    """Подменяет генерацию схемы на расширенную (с кешированием, как в FastAPI)."""

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema is None:
            app.openapi_schema = build_openapi(app)
        return app.openapi_schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
