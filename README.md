# Giveaway-BOT for MAX

MVP-проект бота и mini app для розыгрышей в MAX, построенный на:

- **Bot API:** [`@maxhub/max-bot-api`](https://github.com/max-messenger/max-bot-api-client-ts)
- **UI kit:** [`@maxhub/max-ui`](https://github.com/max-messenger/max-ui)
- **Mini app bridge:** API-мост MAX (`window.MaxBridge`) из [документации](https://dev.max.ru/docs/webapps/bridge)

## Что реализовано

### Bot backend
- Бот с обработкой `bot_started` и командой `/participate <giveawayId>`.
- Генерация сценария участия по диплинку `gw_<id>`.
- REST API для создания, публикации, участия и выбора победителей.
- Валидация входных данных розыгрыша (`zod`).

### Mini app (Admin UI)
- Простая адаптивная форма создания розыгрыша.
- Список розыгрышей со статусами и кнопками действий (опубликовать / выбрать победителей).
- Инициализация MAX bridge при старте приложения (`ready`, `expand`, `setHeaderColor`).

## Быстрый старт

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## ENV

Создайте `.env` при необходимости:

```env
MAX_BOT_TOKEN=...
MAX_BOT_USERNAME=your_bot
PORT=3000
VITE_API_URL=http://localhost:3000
```

Если `MAX_BOT_TOKEN` не задан, API и mini app продолжают работать, а бот не запускается.

## API (MVP)

- `GET /api/giveaways`
- `POST /api/giveaways`
- `POST /api/giveaways/:id/publish`
- `POST /api/giveaways/:id/join`
- `POST /api/giveaways/:id/draw`

## Ограничения текущего MVP

- Данные хранятся в памяти процесса (без PostgreSQL).
- Проверка подписки пока mock-логикой (без реального вызова `/chats/{chatId}/members`).
- Нет очередей/планировщика задач и автопереопубликования постов.
