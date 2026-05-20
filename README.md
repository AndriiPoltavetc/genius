# ♟ Genius — Шахова платформа з ШІ

> **Дипломна робота:** «Розробка моделі гри Genius з використанням технологій реального часу та методів штучного інтелекту»

Genius — це веб-платформа для гри в шахи у реальному часі. Гравці можуть змагатись проти ШІ (Minimax + Alpha-Beta) або реальних суперників через матчмейкінг на основі рейтингу ELO.

---

## Технологічний стек

| Шар | Технологія |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite, Redux Toolkit + RTK Query, Tailwind CSS, Framer Motion |
| **Backend** | Node.js 20 + Express + TypeScript, Socket.IO |
| **AI** | chess.js + власний Minimax з Alpha-Beta (Worker Threads) |
| **БД** | PostgreSQL 16 via Prisma ORM |
| **Cache/Queue** | Redis 7 (ioredis) |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Deploy** | Vercel (frontend), Railway (backend), Upstash (Redis) |
| **CI/CD** | GitHub Actions |

---

## Структура проєкту

```
genius/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
│   └── src/ai/      # ⭐ AI модуль (Minimax + Alpha-Beta)
├── shared/          # Спільні TypeScript типи
├── docker-compose.yml
└── .github/workflows/
```

---

## Швидкий старт

### Передумови

- Node.js 20+
- Docker + Docker Compose
- npm 9+

### 1. Клонування та встановлення залежностей

```bash
git clone <repo-url> genius
cd genius
npm install
```

### 2. Налаштування середовища

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Відредагуйте `server/.env` — всі значення за замовчуванням вже підходять для локальної розробки з Docker Compose.

### 3. Запуск PostgreSQL + Redis

```bash
npm run docker:up
```

### 4. Міграція бази даних

```bash
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed     # опціонально — тестові користувачі
```

### 5. Запуск у режимі розробки

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:4000
- **Health check:** http://localhost:4000/health

---

## npm скрипти

| Скрипт | Опис |
|---|---|
| `npm run dev` | Запуск frontend + backend у dev-режимі |
| `npm run build` | Збірка всіх пакетів |
| `npm run lint` | ESLint по всіх пакетах |
| `npm run typecheck` | TypeScript перевірка типів |
| `npm run test` | Всі тести |
| `npm run docker:up` | Запуск PostgreSQL + Redis |
| `npm run docker:down` | Зупинка контейнерів |
| `npm run prisma:migrate` | Застосування міграцій |
| `npm run prisma:generate` | Генерація Prisma Client |
| `npm run prisma:studio` | Відкрити Prisma Studio |
| `npm run prisma:seed` | Заповнення БД тестовими даними |

---

## AI модуль — центр диплому

Файли у `server/src/ai/`:

| Файл | Призначення |
|---|---|
| `pieceSquareTables.ts` | Таблиці бонусів позицій для кожного типу фігури (8×8) |
| `evaluation.ts` | Функція оцінки позиції (матеріал + позиція) |
| `minimax.ts` | Алгоритм Minimax з Alpha-Beta відсіканням + MVV-LVA сортування ходів |
| `moveGenerator.ts` | Обгортка над chess.js з упорядкуванням ходів |
| `aiService.ts` | Публічний API: `getBestMove(fen, level)` — запуск у Worker Thread |
| `worker.ts` | Worker Thread entry point |

### Рівні складності

| Рівень | Глибина | Очікуваний час |
|---|---|---|
| EASY | 2 | < 100 мс |
| MEDIUM | 3 | 200–500 мс |
| HARD | 4 | 1–2 с |

---

## Сторінки

| Шлях | Доступ | Опис |
|---|---|---|
| `/` | Публічний | Лендінг |
| `/login` | Публічний | Вхід |
| `/register` | Публічний | Реєстрація |
| `/leaderboard` | Публічний | Топ-100 гравців |
| `/lobby` | Авторизований | Вибір режиму гри |
| `/game/:gameId` | Авторизований | Активна гра |
| `/history` | Авторизований | Моя історія партій |
| `/profile/:userId` | Авторизований | Профіль гравця |

---

## Автор

**Полтавець Артур**  
Спеціальність: Комп'ютерні науки  
Науковий керівник: _[ПІБ керівника]_

---

## Ліцензія

MIT
