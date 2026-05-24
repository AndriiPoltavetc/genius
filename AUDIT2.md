# Genius — Audit 2 Report

_Дата: 2026-05-24. Тільки звіт, нічого не виправлено._

---

## 1. Мертвий код

| Файл | Що не використовується | Дія |
|------|------------------------|-----|
| `server/src/socket/checkers.handler.ts:16` | `import { redis } from '../config/redis'` — redis імпортовано але жодного `redis.` виклику в файлі немає | Видалити |
| `server/src/socket/checkers.handler.ts:18-19` | `type AnyServer` / `type AnySocket` — оголошені локально як `Server<any,any,any,SocketData>` замість використання правильних типів з shared | Замінити правильними typed-параметрами |
| `client/src/features/checkers/CheckersGamePage.tsx:55-118` | 16 `as any` кастів для `socket.emit`/`socket.on`/`socket.off` — checkers-події відсутні у `shared-types/socket.types.ts`, тому весь шаровий typing обходиться | Додати checkers-події до shared socket types |
| `server/src/middleware/auth.middleware.ts:15` | `(req as any).headers` — запит не типізовано через `express.Request` з розширеним типом | Оголосити `interface AuthRequest extends Request` |
| `server/src/modules/games/game.controller.ts:16-18` | `(req as any).user`, `(req as any).query` — повторюється та ж проблема | Те саме виправлення |

---

## 2. Невикористані залежності

| Пакет | client/server | Статус |
|-------|---------------|--------|
| Усі залежності `server/package.json` | server | ✓ Використовуються |
| Усі залежності `client/package.json` | client | ✓ Використовуються |

Невикористаних npm-пакетів не виявлено.

---

## 3. Безпека

| Проблема | Файл | Ризик | Статус |
|----------|------|-------|--------|
| **На disconnect не очищаються `pendingGameReady` таймери** — після матчу шахів сервер ставить setTimeout на 4 с. Якщо гравець від'єднується до закінчення таймера, setTimeout залишається і спрацьовує — emit на мертвий сокет | `server/src/socket/handlers/matchmaking.handler.ts:91-113` + `server/src/socket/index.ts:36-39` | HIGH — memory leak + зайва логіка | NEW |
| **`checkersQueue` не очищається при disconnect** — `socket.on('disconnect')` у `index.ts` викликає тільки `removeFromQueue` (шахова черга). Якщо гравець закрив браузер в черзі шашок — він залишається у `checkersQueue` назавжди | `server/src/socket/index.ts:38` + `server/src/socket/checkers.handler.ts:22` | MEDIUM — memory leak, стала черга | NEW |
| **`checkersGames` Map не очищається при disconnect** — покинуті AI-ігри шашок ніколи не видаляються з пам'яті. Сервер лише видаляє гру на `resign` (`checkersGames.delete(gameId)`) | `server/src/socket/checkers.handler.ts:114` | MEDIUM — memory leak при тривалому uptime | NEW |
| **`console.error` замість logger у env.ts** — два виклики `console.error` при невалідних env-змінних замість winston-logger | `server/src/config/env.ts:18-19` | LOW — порушення logging-конвенції | NEW |
| **Перевірка ходу в шахах** — `isMyTurn` check є ✓ | `server/src/socket/handlers/game.handler.ts:64-71` | — | FIXED |
| **Перевірка учасника гри в шахах** — `getActiveGame` повертає `null` якщо гравець не є учасником ✓ | `server/src/socket/handlers/game.handler.ts` | — | FIXED |
| **Перевірка ходу в шашках** — `isWhite`/`isBlack` + turn check ✓ | `server/src/socket/checkers.handler.ts:69-74` | — | FIXED |
| **Таймер на сервері, не на клієнті** — `gameTimerService.ts` авторитетно керує часом ✓ | `server/src/socket/gameTimerService.ts` | — | FIXED |
| **Rate limiting на /login, /register** — `authRateLimiter` (20 req/15хв) ✓ | `server/src/modules/auth/auth.routes.ts:9-10` | — | FIXED |
| **Helmet підключено** — `app.use(helmet())` ✓ | `server/src/app.ts:16` | — | FIXED |
| **Zod валідація на auth endpoints** — `RegisterSchema`, `LoginSchema` ✓ | `server/src/modules/auth/auth.dto.ts` | — | FIXED |
| **Stack trace не витікає клієнту** — `errorHandler.ts` повертає тільки `'Internal server error'` ✓ | `server/src/middleware/errorHandler.ts` | — | FIXED |
| **SQL ін'єкції** — усі запити через Prisma ORM, `$queryRaw` не використовується ✓ | — | — | FIXED |

---

## 4. Якість коду

| Проблема | Файл | Пріоритет |
|----------|------|-----------|
| **`checkersElo` ніколи не оновлюється** — поле додано до схеми Prisma і показується у лідерборді, але жоден обробник не записує нове значення після завершення гри шашок. Всі гравці назавжди залишаться з рейтингом 1200 | `server/src/socket/checkers.handler.ts` (resign, game end) | CRITICAL |
| **Статистика гравця не оновлюється після гри у шашки** — `gamesPlayed`, `gamesWon`, `gamesLost` для шашок не пишуться в БД. Шахові stats оновлює `finalizeGame` у `game.service.ts`, але аналогічної функції для шашок немає | `server/src/socket/checkers.handler.ts:83-87, 113-114` | HIGH |
| **Disconnect handler не чистить checkers-стан** — `socket.on('disconnect')` викликає тільки `removeFromQueue` (шаховий матчмейкінг). Потрібно також: `checkersQueue.delete(userId)` та завершувати активну гру суперника | `server/src/socket/index.ts:36-39` | HIGH |
| **Імпортований `redis` у checkers.handler не використовується** — dead import збільшує когнітивне навантаження | `server/src/socket/checkers.handler.ts:16` | MEDIUM |
| **16 `as any` кастів у CheckersGamePage** — через відсутність типів checkers-подій у shared socket types | `client/src/features/checkers/CheckersGamePage.tsx:55-118` | MEDIUM |
| **`AnyServer` / `AnySocket` з `any` generic** — ширший тип для SocketData не потрібен, достатньо передати правильні generic-параметри | `server/src/socket/checkers.handler.ts:18-19` | MEDIUM |
| **`req as any` в auth middleware і game controller** — обхід TypeScript-типізації запитів Express | `server/src/middleware/auth.middleware.ts:15`, `server/src/modules/games/game.controller.ts:16-18` | LOW |
| **Timers/Workers** — clearInterval для шахового таймера викликається ✓, Worker threads завершуються з timeout ✓, Redis-ключі видаляються після шахових ігор ✓ | `server/src/socket/gameTimerService.ts`, `server/src/modules/games/game.service.ts:196-201` | — |

---

## 5. Шашки — логічні помилки

| Проблема | Файл | Опис |
|----------|------|------|
| **Обов'язкове взяття реалізовано правильно** ✓ | `checkers.engine.ts:176` | `return captures.length > 0 ? captures : quietMoves` — прості ходи заборонені при наявності взять |
| **Умова поразки правильна** ✓ | `checkers.engine.ts:210` | `if (moves.length === 0) return opponent(currentTurn)` — програє той хто не може ходити |
| **Нічия при 25+ ходах без взяття** ✓ | `checkers.engine.ts:207` + `checkers.service.ts:83` | Лічильник `movesSinceCapture` скидається при кожному взятті, нічия оголошується при `>= 25` |
| **Множинне взяття через рекурсію** ✓ | `checkers.engine.ts:80-87` | `findCaptures` рекурсивно продовжує пошук з нової позиції; якщо подальші взяття є — прості стрибки не додаються |
| **Дамка продовжує захоплення після промоції** ✓ | `checkers.engine.ts:76-78` | При promotionу під час ланцюжка взяти тип оновлюється і `findCaptures` продовжується з новим типом |
| **Логіка шашок не зберігається в БД** — шашкові ігри існують лише у `checkersGames` Map в пам'яті. При рестарті сервера усі активні ігри втрачаються; немає `HistoryPage`-еквівалента для шашок | `server/src/socket/checkers.handler.ts` + `server/src/checkers/checkers.service.ts` | KNOWN LIMITATION — не баг рушія, але архітектурна прогалина |

---

## Підсумок

| Категорія | Кількість |
|-----------|-----------|
| Критичних (CRITICAL) | **1** — checkersElo ніколи не оновлюється |
| Високих (HIGH) | **3** — stats шашок, disconnect cleanup, pendingGameReady leak |
| Середніх (MEDIUM) | **4** — checkersQueue leak, dead import, as any, AnyServer/AnySocket |
| Низьких (LOW) | **3** — console.error в env.ts, req as any, leaderboard показує всіх з 1200 |
| Виправлено з минулого аудиту | **9** — turn check, participant check, timer authority, rate limit, helmet, zod, stack trace, SQL injection, worker cleanup |

### Топ-3 пріоритети для наступного спринту

1. **Disconnect cleanup** — в `socket/index.ts` на `disconnect` додати `checkersQueue.delete(userId)` + завершення шашкової гри + очищення `pendingGameReady`
2. **Checkers ELO + stats** — після завершення шашкової гри (win/resign) оновлювати `checkersElo`, `gamesPlayed`, `gamesWon`, `gamesLost` через Prisma
3. **Checkers socket types** — додати checkers-події до `shared-types/socket.types.ts` щоб прибрати 16 `as any` кастів у CheckersGamePage
