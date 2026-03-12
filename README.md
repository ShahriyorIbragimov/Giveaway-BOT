# Giveaway-BOT for MAX (Bun + MAX UI)

MVP-проект бота и mini app для розыгрышей в MAX.

## Стек

- **Runtime / package manager:** Bun
- **Bot API:** [`@maxhub/max-bot-api`](https://github.com/max-messenger/max-bot-api-client-ts)
- **UI kit:** [`@maxhub/max-ui`](https://github.com/max-messenger/max-ui)
- **Mini app bridge:** `window.MaxBridge` из [официальной документации](https://dev.max.ru/docs/webapps/bridge)
- **Backend:** Express + TypeScript
- **Frontend:** React + Vite + TypeScript

## Что сделано (MVP)

### Backend
- создание, публикация и завершение розыгрыша;
- регистрация участников;
- случайный выбор победителей по количеству призовых мест;
- deep-link для старта через `startapp=gw_<id>`;
- проверка доступа бота в каналах/группах (`добавлен как админ` + права `add_remove_members`, `write`, `pin_message`).

### Mini app UI
- светлая адаптивная тема без тёмного «хвоста» внизу страницы;
- форма с несколькими каналами/группами (добавление/удаление строк);
- кнопка проверки доступа бота по всем указанным каналам/группам;
- вывод детального отчёта проверки перед созданием розыгрыша.

---

## Какие токены/переменные нужны

Создайте файл `.env` в корне проекта:

```env
MAX_BOT_TOKEN=your_real_max_bot_token
MAX_BOT_USERNAME=your_bot_username
PORT=3000
VITE_API_URL=http://localhost:3000
```

### Что означает каждая переменная
- `MAX_BOT_TOKEN` — токен бота из Master Bot (обязателен для проверки доступа бота и реального запуска бота).
- `MAX_BOT_USERNAME` — username бота (используется для генерации deep-link в API publish).
- `PORT` — порт backend сервера.
- `VITE_API_URL` — URL backend, откуда mini app берет данные.

---

## Запуск через Bun

```bash
bun install
bun run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Сборка и проверка

```bash
bun run lint
bun run build
```

## REST API

- `GET /api/giveaways`
- `POST /api/giveaways`
- `POST /api/chats/validate-bot-access`
- `POST /api/giveaways/:id/publish`
- `POST /api/giveaways/:id/join`
- `POST /api/giveaways/:id/draw`

### Пример проверки доступа бота

```bash
curl -X POST http://localhost:3000/api/chats/validate-bot-access \
  -H "Content-Type: application/json" \
  -d '{"chats": ["https://max.ru/id123_channel", "123456789"]}'
```

## Ограничения текущего MVP

- данные хранятся in-memory (без PostgreSQL);
- проверка подписки участников на каналы пока не реализована (реальную проверку можно подключить через `/chats/{chatId}/members`);
- нет очереди/планировщика для авто-публикации/авто-обновления.
