# API «Мистера Модератора»

Полная машиночитаемая спецификация — [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1): все методы, схемы запросов и ответов, коды ошибок и примеры тел. Конфигурация автоматической проверки — [`DATA-API.yaml`](DATA-API.yaml). Интерактивная документация (Swagger UI) доступна у запущенного решения:

| Где | Swagger UI | OpenAPI JSON |
|---|---|---|
| Локально через nginx | http://localhost:8080/api/docs | http://localhost:8080/api/openapi.json |
| Локально напрямую в API | http://localhost:8000/api/docs | http://localhost:8000/api/openapi.json |
| Публично | https://discreetly-enjoyable-koi.cloudpub.ru/api/docs | https://discreetly-enjoyable-koi.cloudpub.ru/api/openapi.json |

`openapi.yaml` генерируется из кода. После изменений в API его нужно выгрузить заново:

```bash
docker compose exec -T api python -m app.export_openapi > docs/openapi.yaml
```

Описания методов, коды ошибок и примеры тел запросов лежат в `backend/app/core/openapi.py` — при добавлении эндпоинта его нужно описать там.

## Общие правила

- **Базовый путь:** `/api`. Через nginx (`web`) и туннель API доступен на том же домене, что и мини-приложение.
- **Формат:** JSON, поля в `camelCase`. Исключение — `POST /api/exams/{id}/materials`, он принимает форму (`application/x-www-form-urlencoded`).
- **Даты в запросах:** дата — `YYYY-MM-DD`, время — `HH:mm`. **Даты в ответах:** ISO 8601 без часового пояса (`2026-10-05T18:00:00`), у экзаменов — с точностью до минут (`2026-12-20T10:00`).
- **Идентификаторы** в ответах и телах запросов — строки (`"id": "1"`), в путях — целые числа. Нечисловой `id` в пути — `422`.
- **Частичное обновление:** все `PUT`-методы меняют только переданные поля.
- **Изоляция групп:** объект другой группы ведёт себя как несуществующий — `404`.

### Авторизация

Мини-приложение передаёт в каждом запросе заголовок `X-Max-Init-Data` со строкой `WebApp.initData` из MAX Bridge. По полю `user.id` из неё сервер находит пользователя; нового создаёт с ролью `student` без группы.

| Режим | Без заголовка | С заголовком |
|---|---|---|
| `STRICT_AUTH=true` | `401` | Проверяется подпись HMAC-SHA256 токеном бота и срок действия (1 час). Неверная подпись или просроченные данные — `401` |
| `STRICT_AUTH=false` (демо, по умолчанию) | Запрос выполняется от тестового старосты (`max_user_id = test_user_001`) | Пользователь берётся из поля `user` **без проверки подписи** |

Тестовый староста в демо-режиме:

- при `USE_TEST_DATA=true` — **Иван Петров** (`id=1`) из группы **`iu7-42b` «ИУ7-42Б»**; база при старте API заполняется из `backend/seed/test_data.json` (12 участников, напоминалки, долги, задания, экзамены, материалы, письма);
- при `USE_TEST_DATA=false` — автоматически создаётся «Тест Тестов» в пустой группе `TEST-GROUP-01`.

Чтобы в демо-режиме выполнить запрос от другой роли, передайте заголовок с `max_user_id` нужного пользователя из тестовых данных:

| Роль | `id` | `max_user_id` | Заголовок |
|---|---|---|---|
| Староста | 1 | `test_user_001` | не нужен |
| Студент | 2 | `test_user_434583486` | `X-Max-Init-Data: user=%7B%22id%22%3A%22test_user_434583486%22%7D` |
| Профорг | 4 | `test_user_434583488` | `X-Max-Init-Data: user=%7B%22id%22%3A%22test_user_434583488%22%7D` |
| Замстаросты | 7 | `test_user_434583491` | `X-Max-Init-Data: user=%7B%22id%22%3A%22test_user_434583491%22%7D` |

Значение заголовка — URL-кодированное `user={"id":"<max_user_id>"}`.

### Коды ответов

| Код | Когда |
|---|---|
| `200` / `201` | Успех (`201` — объект создан) |
| `307` | Скачивание материала: редирект на ссылку файла |
| `400` | Неверный формат даты или времени; пользователь не состоит в группе |
| `401` | Нет заголовка `X-Max-Init-Data` (при `STRICT_AUTH=true`) или он невалиден |
| `403` | Не хватает прав роли или объект чужой (например, чужая личная напоминалка) |
| `404` | Объект не найден или принадлежит другой группе |
| `422` | Запрос не прошёл валидацию: нет обязательного поля, неверный тип, недопустимое значение |

Форматы ошибок:

```json
{ "detail": "Напоминалка не найдена" }
```

```json
{ "detail": { "error": { "code": "permission_denied", "message": "Нет права exam.delete" } } }
```

```json
{ "detail": [ { "type": "literal_error", "loc": ["body", "roleId"], "msg": "Input should be 'starosta', 'zam', 'proforg' or 'student'" } ] }
```

Первый — ошибки предметной логики, второй — проверка прав и авторизация (коды: `permission_denied`, `no_init_data`, `bad_signature`, `expired`, `invalid_bot_token`, `not_in_group`, `starosta_cannot_leave`), третий — валидация (`422`).

### Роли и права

| Право | Староста | Зам | Профорг | Студент |
|---|:-:|:-:|:-:|:-:|
| `reminder.create.personal`, `task.create.personal`, `debts.create.own`, `material.upload`, `material.delete.own` | ✓ | ✓ | ✓ | ✓ |
| `reminder.create.group` | ✓ | ✓ | ✓ | |
| `mail.forward` | ✓ | ✓ | ✓ | |
| `reminder.remind`, `task.create.group`, `task.edit`, `task.delete`, `task.remind` | ✓ | ✓ | | |
| `debts.edit`, `debts.view.all` | ✓ | ✓ | | |
| `exam.create`, `exam.edit`, `exam.delete`, `exam.addMaterial` | ✓ | ✓ | | |
| `material.delete.any`, `mail.configure`, `roles.assign` | ✓ | ✓ | | |
| `group.edit` | ✓ | | | |

Актуальный список всегда отдаёт `GET /api/roles`.

## Методы

Колонка «Доступ» — какое право роли требуется. «Участник» — любой авторизованный пользователь.

### Служебное и группа

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/health` | без авторизации | `{"status":"ok"}` |
| GET | `/api/me` | участник | Текущий пользователь, его группа и роль. Пустой `groupId` — пользователь ещё не в группе |
| GET | `/api/roles` | участник | Справочник ролей: уровень, права и разделы меню |
| GET | `/api/group` | участник | `name`, `course`, `semester`, `studentsCount` |
| GET | `/api/students` | участник | Участники группы: `id`, `name`, `role`. Поля `avgScore`, `attendance`, `debts` зарезервированы (`null` / `0`) |
| POST | `/api/group/leave` | участник, кроме старосты | Выйти из группы: личные сущности удаляются. Староста — `403`, не в группе — `400` |
| POST | `/api/roles/assign` | `roles.assign` | Тело: `studentId`, `roleId` (`starosta`, `zam`, `proforg`, `student`). Нельзя менять роль себе и участникам своего или более высокого уровня; нельзя назначить роль не ниже своей. `starosta` назначает только староста — это передача роли |
| PATCH | `/api/group/members/{id}/name` | `group.edit` | Тело: `name`. Ответ: `oldName`, `newName` |
| DELETE | `/api/group/members/{id}` | `group.edit` | Исключить участника. Ответ: `removed`. Себя и равных по уровню — `403` |

### Напоминалки

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/reminders` | участник | Групповые и свои личные напоминалки, по возрастанию дедлайна |
| POST | `/api/reminders` | `reminder.create.personal` / `reminder.create.group` | Тело: `title`, `date`, `time`, `scope`, необязательные `description`, `studentIds`. `scope`: `personal` — личная, `group` — всей группе, `selected` — участникам из `studentIds` |
| PUT | `/api/reminders/{id}` | личная — автор; групповая — автор или `reminder.remind` | Необязательные `title`, `description`, `date`, `time`, `scope`, `studentIds`. Смена `scope` требует того же права, что и создание |
| PUT | `/api/reminders/{id}/complete` | участник | Тело: `completed` (`true` / `false`) — добавляет или убирает пользователя из `completedBy` |
| POST | `/api/reminders/{id}/remind` | `reminder.remind` | Бот пишет каждому участнику группы. Ответ: `sentTo`, `sentAt` |
| DELETE | `/api/reminders/{id}` | как у `PUT` | Удалить |

Ответ — объект `Reminder`: `id`, `title`, `description`, `deadline`, `type` (`personal` / `group`), `priority`, `targetStudentIds`, `completedBy`.

### Задания

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/tasks` | участник | Групповые и свои личные задания |
| POST | `/api/tasks` | `task.create.personal` / `task.create.group` | Тело: `title`, `deadline`, `type` (`personal` / `group`), необязательное `description` |
| PUT | `/api/tasks/{id}` | личное — автор; групповое — `task.edit` | Необязательные `title`, `description`, `deadline`, `type` |
| POST | `/api/tasks/{id}/remind` | `task.remind` | Бот пишет каждому участнику группы |
| DELETE | `/api/tasks/{id}` | личное — автор; групповое — `task.delete` | Удалить |

Ответ — объект `Task`: `id`, `title`, `description`, `deadline`, `type`, `status` (`active`, `soon` — до дедлайна ≤ 3 дней, `overdue`).

### Долги

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/debts` | участник | Свои долги; с `debts.view.all` — долги всей группы |
| POST | `/api/debts` | себе — `debts.create.own`; любому участнику — `debts.edit` | Тело: `studentId`, `subject`, `type`, `deadline`. Участник не из группы — `404` |
| PUT | `/api/debts/{id}` | свой долг — `debts.create.own`; любой — `debts.edit` | Необязательные `studentId`, `subject`, `type`, `deadline`. Переназначить долг другому участнику может только обладатель `debts.edit` |
| DELETE | `/api/debts/{id}` | как у `PUT` | Удалить (закрыть) долг |

Ответ — объект `Debt`: `id`, `studentId`, `studentName`, `subject`, `type`, `deadline`, `status` (`active` / `overdue`).

### Экзамены

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/exams` | участник | Экзамены и консультации с материалами, по возрастанию даты |
| POST | `/api/exams` | `exam.create` | Тело: `subject`, `date`, необязательные `time`, `room`, `teacher`, `icon`, `type` (`exam` / `consultation`) |
| PUT | `/api/exams/{id}` | `exam.edit` | Любые из полей создания; `date` и `time` можно менять по отдельности |
| DELETE | `/api/exams/{id}` | `exam.delete` | Удалить экзамен вместе с его материалами |
| POST | `/api/exams/{id}/materials` | `exam.addMaterial` | **Форма:** `title`, необязательный `url` |
| DELETE | `/api/exams/{id}/materials/{materialId}` | `exam.addMaterial` | Открепить материал |

Ответ — объект `Exam`: `id`, `subject`, `date` (`YYYY-MM-DDTHH:mm`), `time`, `room`, `teacher`, `icon`, `type`, `materials[]` (`id`, `examId`, `title`, `url`, `addedBy`, `addedAt`).

### Материалы

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/materials` | участник | Материалы группы: `id`, `title`, `author`, `type`, `createdAt` (относительное время), `maxUrl` (ссылка для открытия) |
| POST | `/api/materials` | `material.upload` | Тело: `title`, `type` (`pdf`, `video`, `other`), `url`. Файлы на сервер не загружаются — хранится ссылка |
| GET | `/api/materials/{id}/download` | участник | `307` на ссылку материала |
| DELETE | `/api/materials/{id}` | любой — `material.delete.any`; свой — `material.delete.own` | Удалить |

### Почта

> **MVP:** синхронизация с почтовыми серверами не реализована. Письма берутся из БД (тестовые данные), `refresh` всегда возвращает `newMessages: 0`. Пересылка и настройка ящиков работают.

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/mail` | участник | Письма группы: `id`, `from`, `subject`, `preview`, `source`, `autoForward` |
| POST | `/api/mail/{id}/forward` | `mail.forward` | Бот пересылает письмо личным сообщением каждому участнику. Ответ: `forwardedTo`, `sentTo` |
| POST | `/api/mail/refresh` | участник | Заглушка: `{"ok": true, "newMessages": 0}` |
| GET | `/api/mail/mailboxes` | `mail.configure` | Ящики группы: `id`, `email`, `label`, `connected`, `autoForward` |
| POST | `/api/mail/mailboxes` | `mail.configure` | Тело: `email`, `label`, необязательный `autoForward` |
| POST | `/api/mail/configure` | `mail.configure` | Тело: `mailboxes[]` из `id` и необязательных `connected`, `autoForward`. Несуществующие и чужие ящики пропускаются |
| DELETE | `/api/mail/mailboxes/{id}` | `mail.configure` | Удалить ящик |

## Примеры

Команды рассчитаны на демо-режим с тестовыми данными (`STRICT_AUTH=false`, `USE_TEST_DATA=true`). Для публичного адреса замените `http://localhost:8080` на `https://discreetly-enjoyable-koi.cloudpub.ru`.

Кто я — без заголовка это тестовый староста:

```bash
curl http://localhost:8080/api/me
```

```json
{"user":{"id":"1","firstName":"Иван","lastName":"Петров","username":"ivan_petrov","photoUrl":null,"groupId":"iu7-42b","groupName":"ИУ7-42Б","roleId":"starosta"}}
```

Тот же запрос от студента:

```bash
curl http://localhost:8080/api/me -H 'X-Max-Init-Data: user=%7B%22id%22%3A%22test_user_434583486%22%7D'
```

```json
{"user":{"id":"2","firstName":"Дмитрий","lastName":"Иванов","username":"dmitry_ivanov","photoUrl":null,"groupId":"iu7-42b","groupName":"ИУ7-42Б","roleId":"student"}}
```

Групповая напоминалка:

```bash
curl -X POST http://localhost:8080/api/reminders -H 'Content-Type: application/json' -d '{"title":"Сдать реферат","description":"по истории","date":"2026-10-05","time":"18:00","scope":"group"}'
```

```json
{"id":"9","title":"Сдать реферат","description":"по истории","deadline":"2026-10-05T18:00:00","type":"group","priority":"medium","targetStudentIds":[],"completedBy":[]}
```

Перенести её на другой день и время:

```bash
curl -X PUT http://localhost:8080/api/reminders/9 -H 'Content-Type: application/json' -d '{"date":"2026-10-07","time":"12:00"}'
```

```json
{"ok":true}
```

Разослать напоминание всем участникам группы:

```bash
curl -X POST http://localhost:8080/api/reminders/9/remind
```

```json
{"ok":true,"id":"9","title":"Сдать реферат","sentTo":0,"sentAt":"2026-09-30T09:56:34.789622Z"}
```

`sentTo` — сколько личных сообщений доставлено. У тестовых пользователей вымышленные `max_user_id`, поэтому на тестовых данных это `0`; реальным участникам, вступившим через бота, сообщения приходят в чат с ботом.

Долг участнику с `id=2`:

```bash
curl -X POST http://localhost:8080/api/debts -H 'Content-Type: application/json' -d '{"studentId":"2","subject":"Матанализ","type":"Экзамен","deadline":"2026-10-15"}'
```

```json
{"id":"7","studentId":"2","studentName":"Иванов Д.","subject":"Матанализ","type":"Экзамен","deadline":"2026-10-15T00:00:00","status":"active"}
```

Экзамен:

```bash
curl -X POST http://localhost:8080/api/exams -H 'Content-Type: application/json' -d '{"subject":"Физика","date":"2026-12-20","time":"10:00","room":"501","teacher":"Смирнов А. В.","type":"exam"}'
```

```json
{"id":"7","subject":"Физика","date":"2026-12-20T10:00","time":"10:00","room":"501","teacher":"Смирнов А. В.","icon":"📚","type":"exam","materials":[]}
```

Материал:

```bash
curl -X POST http://localhost:8080/api/materials -H 'Content-Type: application/json' -d '{"title":"Конспект","type":"pdf","url":"https://example.com/k.pdf"}'
```

```json
{"id":"8","title":"Конспект","author":"Петров И.","type":"pdf","createdAt":"только что","maxUrl":"https://example.com/k.pdf"}
```

### Примеры ошибок

Студент пытается удалить экзамен — `403`:

```bash
curl -X DELETE http://localhost:8080/api/exams/1 -H 'X-Max-Init-Data: user=%7B%22id%22%3A%22test_user_434583486%22%7D'
```

```json
{"detail":{"error":{"code":"permission_denied","message":"Нет права exam.delete"}}}
```

Неверный формат даты — `400`:

```bash
curl -X POST http://localhost:8080/api/tasks -H 'Content-Type: application/json' -d '{"title":"x","deadline":"завтра","type":"group"}'
```

```json
{"detail":"Invalid isoformat string: 'завтра'"}
```

Несуществующий объект — `404`:

```bash
curl -X DELETE http://localhost:8080/api/reminders/999
```

```json
{"detail":"Напоминалка не найдена"}
```

Недопустимое значение поля — `422`:

```bash
curl -X POST http://localhost:8080/api/roles/assign -H 'Content-Type: application/json' -d '{"studentId":"2","roleId":"king"}'
```

```json
{"detail":[{"type":"literal_error","loc":["body","roleId"],"msg":"Input should be 'starosta', 'zam', 'proforg' or 'student'","input":"king","ctx":{"expected":"'starosta', 'zam', 'proforg' or 'student'"}}]}
```
