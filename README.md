# Time Notes (Vue 3 + Tailwind)

Сайт заметок на Vue 3: вводите текст, заметка сохраняется в SQLite с временной меткой.

## Стек

- Vue 3 + TypeScript + Vite
- Vue Router
- Pinia
- TanStack Vue Query + Axios
- Zod (валидация данных)
- Fastify API + SQLite (`better-sqlite3`)
- Tailwind CSS v4
- ESLint (flat config) + Prettier

## Быстрый старт

```bash
npm install
npm run dev
```

## Скрипты

- `npm run dev` - запуск dev-сервера
- `npm run dev:client` - запуск только frontend
- `npm run dev:server` - запуск только backend API
- `npm run build` - type-check + production build
- `npm run preview` - локальный preview build
- `npm run start:server` - запуск backend без watch
- `npm run typecheck` - проверка типов
- `npm run lint` - линтинг
- `npm run lint:fix` - автофикс линтинга
- `npm run format` - форматирование
- `npm run format:check` - проверка форматирования

## API

- `GET /api/notes?limit=10&offset=0` - получить список заметок с пагинацией
- `POST /api/notes` - создать заметку (`{ "text": "..." }`)
- `PATCH /api/notes/:id` - обновить текст заметки (`{ "text": "..." }`)
- `DELETE /api/notes/:id` - удалить заметку
- `GET /api/notes/:id/versions` - получить историю версий заметки
- `POST /api/notes/:id/versions/:version/restore` - восстановить выбранную версию
- `GET /api/notes/:id/comments` - получить комментарии заметки
- `POST /api/notes/:id/comments` - добавить комментарий (`{ "text": "..." }`)
- `PATCH /api/comments/:commentId` - обновить комментарий
- `DELETE /api/comments/:commentId` - удалить комментарий
- `POST /api/ai/improve` - улучшить текст через ИИ (`{ "text": "..." }`)
- `GET /api/groups` - список групп заметок
- `POST /api/groups` - создать группу (`{ "name": "...", "noteIds": [1,2,3] }`)
- `DELETE /api/groups/:id` - удалить группу (заметки не удаляются)
- `GET /api/notes?groupId=1&limit=10&offset=0` - заметки конкретной группы

База данных создается автоматически в `data/notes.db`.

## ИИ-улучшение текста (Yandex)

Используется OpenAI SDK с Yandex AI API (`baseURL: https://ai.api.cloud.yandex.net/v1`).

Нужны переменные окружения:

- `YANDEX_API_KEY` - API ключ Yandex AI
- `YANDEX_PROJECT_ID` - ID проекта для заголовка `OpenAI-Project`
- `YANDEX_PROMPT_ID` - ID промпта в Yandex
- `YANDEX_BASE_URL` - опционально, URL API (по умолчанию `https://ai.api.cloud.yandex.net/v1`)

Совместимость:

- `AI_API_KEY` поддерживается как fallback для `YANDEX_API_KEY`.

Если обязательные переменные не заданы, используется локальное улучшение (пунктуация/пробелы/регистр) без внешнего запроса.
