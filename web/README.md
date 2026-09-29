# web — мини-приложение «Мистер Модератор»

React 19 + TypeScript + Vite. Запуск, переменные окружения и архитектура — в [корневом README](../README.md) и [docs/architecture.md](../docs/architecture.md).

```bash
npm ci
npm run dev          # dev-сервер на http://localhost:3000
npm run build        # проверка типов + сборка в dist/
npm run lint         # ESLint
npm run format       # Prettier
```

`VITE_API_BASE` — базовый путь API (по умолчанию `/api`), `VITE_USE_API_MOCK=true` — работа на моках из `src/api/mock.ts` без бэкенда.
