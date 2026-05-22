# AUDIT.md — Genius Chess Platform

Дата: 2026-05-22. Аудит охоплює `server/src/**`, `client/src/**`, `shared/`.
НЕ виправляти автоматично — звіт для ручного перегляду.

---

## Безпека

| # | Файл | Рядок | Опис | Ризик | Рекомендація |
|---|------|-------|------|-------|--------------|
| 1 | `server/src/modules/games/game.routes.ts` | 9 | `GET /api/games/:gameId` не має `authMiddleware`. Будь-який неавтентифікований клієнт може отримати повні дані гри (гравці, ходи, рейтинги) за UUID гри. | **MEDIUM** | Додати `authMiddleware` перед `getGameHandler`, або принаймні перевіряти, що запитувач є учасником гри. |
| 2 | `server/src/socket/handlers/chat.handler.ts` | 11–31 | `chatMessage` не перевіряє, чи є відправник учасником гри. Будь-який автентифікований сокет-користувач може передати довільний `gameId` і записати повідомлення до БД та розіслати всім у кімнаті. | **MEDIUM** | Перевіряти, що `userId` ∈ `{ whitePlayerId, blackPlayerId }` поточної гри (через `getActiveGame(gameId)`). |
| 3 | `server/src/app.ts` | 19 | `'http://localhost:5173'` жорстко вшитий у масив `origin` CORS — завжди дозволений, включно з продакшеном. Будь-який сервер на localhost:5173 може робити credentialed-запити до API. | **LOW** | Перенести в env-змінну (`CORS_DEV_ORIGIN`), яка встановлюється тільки в dev-оточенні, або взагалі прибрати. |
| 4 | `server/src/modules/games/game.controller.ts` | 16–17 | `(req as any).userId` обходить TypeScript type safety. Якщо `authMiddleware` не встановив `userId`, це буде `undefined` без помилки компіляції. | **LOW** | Використати типізований `AuthRequest extends Request` або `req as AuthenticatedRequest`. |
| 5 | `server/src/socket/middleware/socketAuth.ts` | 24–28 | DB-запит при кожному сокет-підключенні (без кешування). При масових підключеннях — N з'єднань = N запитів до Postgres. Вектор DoS-підсилення. | **LOW** | Кешувати результат `findUnique` в Redis на 60–300 с. Ключ — `userId` із JWT payload. |
| 6 | `server/src/modules/games/game.service.ts` | 73 | `JSON.parse(data) as ActiveGameState` — без runtime-валідації. Пошкоджені дані в Redis спричинять unhandled runtime error в будь-якому handler, що читає активну гру. | **LOW** | Додати Zod-схему для `ActiveGameState` і `safeParse` замість `as`. |
| 7 | `server/src/modules/auth/auth.service.ts` | 37 | Email користувача пишеться в лог у plaintext: `logger.info('Register attempt', { email: dto.email })`. Email — персональні дані (PII). | **LOW** | Видалити `email` з логу або замаскувати (`dto.email.replace(/.+@/, '***@')`). |

### Підтверджені захисти (все ОК)

- `helmet()` підключений у `app.ts` ✓  
- `authRateLimiter` (20/15 хв) на `/api/auth/login` та `/register` ✓  
- `JWT_SECRET` min 32 символи — примусово через Zod ✓  
- Zod-валідація вхідних даних на авторизаційних маршрутах ✓  
- `errorHandler` не витікає stack trace у продакшені ✓  
- bcrypt 10 rounds ✓  
- Перевірка черги ходу (turn validation) в `move` handler ✓  
- Таймер управляється сервером, клієнт — тільки відображення ✓  

---

## Мертвий код

| # | Шлях | Що невикористано | Рекомендація |
|---|------|------------------|--------------|
| 1 | `server/src/utils/chess.ts:6–13` | `parseFen()` — експортується, але ніде не імпортується. Grep по всьому `server/src` підтверджує нульове використання. | **DELETE** |
| 2 | `server/src/utils/chess.ts:44–46` | `toUci()` — експортується, але ніде не імпортується. Handler використовує вбудований template literal замість неї. | **DELETE** |
| 3 | `server/src/socket/handlers/game.handler.ts:18,231` | `username` деструктурується з `socket.data`, але в game-handler не використовується. Придушується через `void username;`. | **CLEAN UP** — прибрати з деструктурування і видалити рядок `void username;`. |
| 4 | `client/src/features/game/components/MoveHistory.tsx` | Рендериться в `GamePage`, але `buildGameState()` на сервері завжди надсилає `moves: [] as []`. Компонент завжди відображає порожню таблицю. | **CONNECT** — наповнити `moves` з `chess.history({ verbose: true })` перед emit, або **DELETE** компонент і виклик у `GamePage`. |
| 5 | `client/src/pages/ProfilePage.tsx:13` | Використовує сирий `fetch()` без `.catch()` — unhandled promise rejection при мережевій помилці. Решта сторінок використовують RTK Query (`useGetUserByIdQuery`). | **REFACTOR** — замінити на `useGetUserByIdQuery` (вже є в `authApi.ts`) для уніфікації та обробки помилок. |
| 6 | `client/src/i18n/` | i18n ініціалізований і використовується лише в `HomePage`, `LoginPage`, `RegisterPage`. `LobbyPage`, `GamePage`, `ProfilePage`, `HistoryPage`, `LeaderboardPage` — захардкоджений український текст, `useTranslation` не використовується. | **KEEP** (якщо плануєте розширювати) або прибрати з тих трьох сторінок, де він є, щоб не підтримувати напівреалізовану абстракцію. |
