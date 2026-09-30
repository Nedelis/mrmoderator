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

* `STRICT_AUTH=true` — заголовок обязателен и подпись проверяется; иначе ответ `401`.
* `STRICT_AUTH=false` (демо-режим, по умолчанию) — без заголовка запросы выполняются
  от тестового старосты (`max_user_id = test_user_001`): при `USE_TEST_DATA=true` это
  староста группы `iu7-42b` из `backend/seed/test_data.json`, иначе автоматически создаётся
  «Тест Тестов» в группе `TEST-GROUP-01`. Если заголовок передан, пользователь берётся
  из его поля `user` **без проверки подписи** — так проверяются остальные роли.

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
    401: "Нет заголовка X-Max-Init-Data (при STRICT_AUTH=true) или он невалиден",
    403: "Недостаточно прав для операции",
    404: "Объект не найден или принадлежит другой группе",
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
        "description": (
            "Пользователь, определённый по initData (или тестовый в демо-режиме), с группой и "
            "ролью. Новый пользователь создаётся с ролью `student` без группы: пустой `groupId` "
            "означает, что нужно вступить в группу через бота (`/creategroup` или `/join`)."
        ),
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
        "description": (
            "Право `roles.assign`. Нельзя менять роль себе и участникам своего или более высокого "
            "уровня, нельзя назначить роль не ниже своей. Назначение `starosta` доступно только "
            "старосте и означает передачу роли: текущий староста становится студентом."
        ),
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
        "description": (
            "`scope`: `personal` — личная (право `reminder.create.personal`), `group` — всей "
            "группе, `selected` — выбранным участникам из `studentIds` (право "
            "`reminder.create.group`). Дата — `YYYY-MM-DD`, время — `HH:mm`."
        ),
        "errors": [400, 403],
    },
    ("put", "/api/reminders/{reminder_id}"): {
        "summary": "Изменить напоминалку",
        "description": (
            "Частичное обновление: меняются только переданные поля. Личную напоминалку меняет "
            "только автор, групповую — автор или обладатель права `reminder.remind`. `date` и "
            "`time` пересобирают дедлайн; `scope` меняет адресатов (`selected` — вместе с "
            "`studentIds`) и требует того же права, что и создание."
        ),
        "errors": [400, 403, 404],
    },
    ("delete", "/api/reminders/{reminder_id}"): {
        "summary": "Удалить напоминалку",
        "description": (
            "Личную напоминалку удаляет только автор, групповую — автор или обладатель права "
            "`reminder.remind`."
        ),
        "errors": [403, 404],
    },
    ("put", "/api/reminders/{reminder_id}/complete"): {
        "summary": "Отметить выполнение",
        "description": (
            "Добавляет или убирает текущего пользователя из `completedBy`. Чужая личная "
            "напоминалка недоступна (`404`)."
        ),
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
        "description": (
            "С правом `debts.view.all` — долги всей группы, иначе только свои. `status`: `active` "
            "или `overdue` — вычисляется по дедлайну."
        ),
    },
    ("post", "/api/debts"): {
        "summary": "Добавить долг",
        "description": (
            "Себе — право `debts.create.own`; любому участнику своей группы — право `debts.edit`. "
            "`deadline` — `YYYY-MM-DD`. `404`, если участник с `studentId` не найден в группе."
        ),
        "errors": [400, 403, 404],
    },
    ("put", "/api/debts/{debt_id}"): {
        "summary": "Изменить долг",
        "description": (
            "Частичное обновление. С правом `debts.edit` — любой долг своей группы, без него — "
            "только свой. Переназначить долг другому участнику (`studentId`) может только "
            "обладатель `debts.edit`."
        ),
        "errors": [400, 403, 404],
    },
    ("delete", "/api/debts/{debt_id}"): {
        "summary": "Удалить (закрыть) долг",
        "description": ("С правом `debts.edit` — любой долг своей группы, без него — только свой."),
        "errors": [403, 404],
    },
    # --- Экзамены ---
    ("get", "/api/exams"): {
        "summary": "Расписание экзаменов",
        "description": (
            "Экзамены и консультации группы с прикреплёнными материалами, по возрастанию даты. "
            "`date` — `YYYY-MM-DDTHH:mm`, `time` — `HH:mm`."
        ),
    },
    ("post", "/api/exams"): {
        "summary": "Добавить экзамен",
        "description": (
            "Право `exam.create`. `date` — `YYYY-MM-DD`, `time` — `HH:mm`, `type` — `exam` или "
            "`consultation`."
        ),
        "errors": [400, 403],
    },
    ("put", "/api/exams/{exam_id}"): {
        "summary": "Изменить экзамен",
        "description": (
            "Право `exam.edit`. Частичное обновление: меняются только переданные поля; `date` и "
            "`time` можно менять по отдельности."
        ),
        "errors": [400, 403, 404],
    },
    ("delete", "/api/exams/{exam_id}"): {
        "summary": "Удалить экзамен",
        "description": (
            "Право `exam.delete`. Вместе с экзаменом удаляются прикреплённые к нему материалы."
        ),
        "errors": [403, 404],
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
        "description": (
            "Право `material.upload`. JSON: `title`, `type` (`pdf`, `video`, `other`) и `url` — "
            "ссылка на файл. Сами файлы хранятся в MAX или облаке, API хранит метаданные и "
            "ссылку."
        ),
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
        "description": (
            "Письма группы из подключённых ящиков деканата, кафедр и преподавателей. **MVP:** "
            "синхронизация с почтовыми серверами не реализована — список берётся из БД (тестовые "
            "данные)."
        ),
    },
    ("post", "/api/mail/{mail_id}/forward"): {
        "summary": "Переслать письмо в группу",
        "description": (
            "Право `mail.forward`. Бот отправляет письмо (отправитель, тема, превью) личным "
            "сообщением каждому участнику группы. `sentTo` — сколько сообщений доставлено."
        ),
        "errors": [403, 404],
    },
    ("post", "/api/mail/refresh"): {
        "summary": "Проверить новые письма",
        "description": (
            "**MVP-заглушка:** синхронизация по IMAP не реализована, `newMessages` всегда 0."
        ),
    },
    ("post", "/api/mail/configure"): {
        "summary": "Настроить ящики",
        "description": (
            "Право `mail.configure`. Для каждого ящика из `mailboxes` обновляет `connected` и "
            "`autoForward` (только переданные поля). Ящики других групп и несуществующие `id` "
            "пропускаются."
        ),
        "errors": [400, 403],
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
}


# Примеры тел запросов — показываются в Swagger UI и попадают в openapi.yaml
_EXAMPLES: dict[tuple[str, str], dict[str, Any]] = {
    ("post", "/api/reminders"): {
        "title": "Сдать реферат",
        "description": "Тема на выбор, 10–15 страниц",
        "date": "2026-10-05",
        "time": "18:00",
        "scope": "group",
    },
    ("put", "/api/reminders/{reminder_id}"): {
        "title": "Сдать реферат (перенос)",
        "date": "2026-10-07",
        "time": "12:00",
        "scope": "selected",
        "studentIds": ["2", "3"],
    },
    ("put", "/api/reminders/{reminder_id}/complete"): {"completed": True},
    ("post", "/api/tasks"): {
        "title": "Лабораторная №3",
        "description": "Базы данных",
        "deadline": "2026-10-10",
        "type": "group",
    },
    ("put", "/api/tasks/{task_id}"): {"title": "Лабораторная №3 (v2)", "deadline": "2026-10-12"},
    ("post", "/api/debts"): {
        "studentId": "2",
        "subject": "Математический анализ",
        "type": "Экзамен",
        "deadline": "2026-10-15",
    },
    ("put", "/api/debts/{debt_id}"): {"subject": "Матанализ", "deadline": "2026-10-20"},
    ("post", "/api/exams"): {
        "subject": "Физика",
        "date": "2026-12-20",
        "time": "10:00",
        "room": "501",
        "teacher": "Смирнов А. В.",
        "type": "exam",
    },
    ("put", "/api/exams/{exam_id}"): {"date": "2026-12-22", "time": "14:30", "room": "305"},
    ("post", "/api/materials"): {
        "title": "Конспект лекций по матанализу",
        "type": "pdf",
        "url": "https://example.com/matan.pdf",
    },
    ("post", "/api/mail/mailboxes"): {
        "email": "dean@university.example",
        "label": "Деканат",
        "autoForward": True,
    },
    ("post", "/api/mail/configure"): {
        "mailboxes": [{"id": "1", "connected": True, "autoForward": False}]
    },
    ("post", "/api/roles/assign"): {"studentId": "2", "roleId": "zam"},
    ("patch", "/api/group/members/{student_id}/name"): {"name": "Иванов Дмитрий"},
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
        {
            "url": "/",
            "description": "Текущий хост (через nginx: https://discreetly-enjoyable-koi.cloudpub.ru/)",
        },
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

            example = _EXAMPLES.get((method, path))
            if example is not None:
                for media in op.get("requestBody", {}).get("content", {}).values():
                    media["example"] = example

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
