# API «Мистера Модератора»

Полная машиночитаемая спецификация — [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1). Интерактивная документация (Swagger UI) доступна у запущенного решения:

| Где | Swagger UI | OpenAPI JSON |
|---|---|---|
| Локально через nginx | http://localhost:8080/api/docs | http://localhost:8080/api/openapi.json |
| Локально напрямую в API | http://localhost:8000/api/docs | http://localhost:8000/api/openapi.json |
| Публично | `https://<публичный-адрес>/api/docs` | `https://<публичный-адрес>/api/openapi.json` |

Как обновить `openapi.yaml` после изменений в API:

```bash
docker compose exec -T api python -m app.export_openapi > docs/openapi.yaml
```

## Общие правила

- **Базовый путь:** `/api`. Через nginx (`web`) и туннель API доступен на том же домене, что и мини-приложение.
- **Формат:** JSON, поля в `camelCase`. Даты в ответах — ISO 8601 (`2026-10-05T18:00:00`) без часового пояса, время UTC. Даты в запросах: `YYYY-MM-DD`, время — `HH:mm`.
- **Идентификаторы** в ответах — строки (`"id": "1"`), в путях — числа.
- **Авторизация:** заголовок `X-Max-Init-Data` со строкой `WebApp.initData` из MAX Bridge.
  - `STRICT_AUTH=true` — заголовок обязателен, подпись проверяется токеном бота; иначе `401`.
  - `STRICT_AUTH=false` (демо, по умолчанию) — заголовок не нужен, все запросы выполняются от тестового старосты «Тест Тестов» (`id=1`) в группе `TEST-GROUP-01`. Группа и пользователь создаются при первом запросе.

### Коды ответов

| Код | Когда |
|---|---|
| `200` / `201` | Успех (`201` — объект создан) |
| `307` | Скачивание материала: редирект на прямую ссылку |
| `400` | Некорректные данные (неверная дата), пользователь не в группе |
| `401` | Нет или невалиден `X-Max-Init-Data` (только `STRICT_AUTH=true`) |
| `403` | Не хватает прав роли |
| `404` | Объект не найден |
| `422` | Тело запроса не прошло валидацию (нет обязательного поля, неверный тип) |

Формат ошибки:

```json
{ "detail": "Напоминалка не найдена" }
```

или

```json
{ "detail": { "error": { "code": "permission_denied", "message": "Нет права roles.assign" } } }
```

## Методы

Колонка «Право» — какое право роли требуется (см. `GET /api/roles` и [architecture.md](architecture.md#авторизация-и-права)). «—» — доступно любому участнику группы.

### Служебное и группа

| Метод | Путь | Право | Описание |
|---|---|---|---|
| GET | `/api/health` | без авторизации | Проверка работоспособности |
| GET | `/api/me` | — | Текущий пользователь, его группа и роль |
| GET | `/api/roles` | — | Справочник ролей: права и разделы меню |
| GET | `/api/group` | — | Название, курс, семестр, число участников |
| GET | `/api/students` | — | Участники группы с ролями и числом долгов |
| POST | `/api/group/leave` | — (кроме старосты) | Выйти из группы |
| POST | `/api/roles/assign` | `roles.assign` | Назначить роль участнику; `starosta` — передача роли |
| PATCH | `/api/group/members/{id}/name` | `group.edit` | Переименовать участника |
| DELETE | `/api/group/members/{id}` | `group.edit` | Исключить участника |

### Напоминалки

| Метод | Путь | Право | Описание |
|---|---|---|---|
| GET | `/api/reminders` | — | Групповые и свои личные напоминалки |
| POST | `/api/reminders` | `reminder.create.personal` / `reminder.create.group` | Создать: `scope` = `personal`, `group` или `selected` (+ `studentIds`) |
| PUT | `/api/reminders/{id}` | автор или `reminder.remind` | Изменить заголовок или описание |
| PUT | `/api/reminders/{id}/complete` | — | Отметить выполнение (`completed: true/false`) |
| POST | `/api/reminders/{id}/remind` | `reminder.remind` | Бот пишет каждому участнику группы |
| DELETE | `/api/reminders/{id}` | автор или `reminder.remind` | Удалить |

### Задания

| Метод | Путь | Право | Описание |
|---|---|---|---|
| GET | `/api/tasks` | — | Задания; `status`: `active`, `soon` (≤ 3 дней), `overdue`, `done` |
| POST | `/api/tasks` | `task.create.personal` / `task.create.group` | Создать задание |
| PUT | `/api/tasks/{id}` | автор (личное) / `task.edit` (групповое) | Изменить |
| POST | `/api/tasks/{id}/remind` | `task.remind` | Бот пишет каждому участнику группы |
| DELETE | `/api/tasks/{id}` | автор (личное) / `task.delete` (групповое) | Удалить |

### Долги

| Метод | Путь | Право | Описание |
|---|---|---|---|
| GET | `/api/debts` | — | Свои долги; с `debts.view.all` — долги всей группы |
| POST | `/api/debts` | `debts.create.own` (себе) / `debts.edit` (любому) | Добавить долг |
| PUT | `/api/debts/{id}` | `debts.edit` | Изменить |
| DELETE | `/api/debts/{id}` | `debts.edit` | Удалить (закрыть) |

### Экзамены и материалы

| Метод | Путь | Право | Описание |
|---|---|---|---|
| GET | `/api/exams` | — | Расписание экзаменов с материалами |
| POST | `/api/exams` | `exam.addMaterial` | Добавить экзамен |
| POST | `/api/exams/{id}/materials` | `exam.addMaterial` | Прикрепить материал (форма: `title`, `url`) |
| DELETE | `/api/exams/{id}/materials/{materialId}` | `exam.addMaterial` | Открепить материал |
| GET | `/api/materials` | — | Учебные материалы группы |
| POST | `/api/materials` | `material.upload` | Добавить материал (форма: `title`, `type`, `url`) |
| GET | `/api/materials/{id}/download` | — | Редирект на файл или метаданные файла в MAX |
| DELETE | `/api/materials/{id}` | `material.delete.any` / `material.delete.own` | Удалить |

### Почта

> **MVP:** синхронизация с почтовыми ящиками не реализована. Ящики сохраняются в БД, а `refresh`, `configure` и `forward` возвращают успешный ответ без реального действия.

| Метод | Путь | Право | Описание |
|---|---|---|---|
| GET | `/api/mail` | — | Письма группы |
| POST | `/api/mail/{id}/forward` | `mail.forward` | Переслать в группу (заглушка) |
| POST | `/api/mail/refresh` | — | Проверить новые письма (заглушка) |
| POST | `/api/mail/configure` | `mail.configure` | Настроить ящики (заглушка) |
| GET | `/api/mail/mailboxes` | `mail.configure` | Подключённые ящики |
| POST | `/api/mail/mailboxes` | `mail.configure` | Добавить ящик |
| DELETE | `/api/mail/mailboxes/{id}` | `mail.configure` | Удалить ящик |

### Настройки

`GET /api/settings`, `PUT /api/settings` зарезервированы: требуют право `settings.edit`, которого пока нет ни у одной роли, и отвечают `403`.

## Примеры

Команды рассчитаны на демо-режим (`STRICT_AUTH=false`). Для публичного адреса замените `http://localhost:8080` на адрес туннеля.

```bash
# Кто я
curl http://localhost:8080/api/me
```

```json
{"user":{"id":"1","firstName":"Тест","lastName":"Тестов","username":"test_user","photoUrl":null,"groupId":"TEST-GROUP-01","groupName":"Тестовая группа","roleId":"starosta"}}
```

```bash
# Групповая напоминалка
curl -X POST http://localhost:8080/api/reminders \
  -H 'Content-Type: application/json' \
  -d '{"title":"Сдать реферат","description":"по истории","date":"2026-10-05","time":"18:00","scope":"group"}'
```

```json
{"id":"1","title":"Сдать реферат","description":"по истории","deadline":"2026-10-05T18:00:00","type":"group","priority":"medium","targetStudentIds":[],"completedBy":[]}
```

```bash
# Долг участнику с id=1
curl -X POST http://localhost:8080/api/debts \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"1","subject":"Матанализ","type":"Экзамен","deadline":"2026-09-20"}'
```

```bash
# Разослать напоминание всем участникам группы
curl -X POST http://localhost:8080/api/reminders/1/remind
```

```json
{"ok":true,"id":"1","title":"Сдать реферат","sentTo":0,"sentAt":"2026-09-29T12:40:00Z"}
```

`sentTo` — сколько личных сообщений доставлено. У тестового пользователя нет настоящего аккаунта MAX, поэтому в демо-режиме это `0`; у реальных участников, вступивших через бота, сообщения приходят в чат с ботом.

```bash
# Ошибка: нет обязательных полей → 422; неверная дата → 400; чужой объект → 404
curl -X POST http://localhost:8080/api/reminders -H 'Content-Type: application/json' -d '{"title":"x"}'
```
