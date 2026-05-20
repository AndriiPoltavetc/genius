# BUGS.md — Журнал відомих помилок

> Фіксуй кожну знайдену помилку одразу, поки контекст свіжий.  
> Кожен запис — це матеріал для розділу «Тестування та відлагодження» диплому.

---

## Шаблон запису

### [YYYY-MM-DD] Коротка назва помилки

- **Контекст:** де виникло (файл, функція, етап розробки)
- **Симптом:** що саме не працювало / яка помилка в консолі
- **Причина:** чому це сталося (root cause)
- **Рішення:** як виправлено
- **Як уникнути:** правило / best practice на майбутнє

---

## Поширені пастки на проєкті

> Попередньо заповнено типовими помилками для цього стеку. Ці пастки ДУЖЕ ймовірні.

### [Prisma] Забув запустити `prisma generate` після зміни schema

- **Контекст:** `server/prisma/schema.prisma`, будь-який етап
- **Симптом:** `PrismaClientKnownRequestError` або помилка типів у моделях
- **Причина:** Prisma Client генерується окремо від схеми. Зміна `.prisma` без regeneration залишає старий клієнт
- **Рішення:** `npm run prisma:generate` після кожної зміни схеми
- **Як уникнути:** Додати в `postinstall` або налаштувати хук у CI перед тестами

---

### [Socket.IO] CORS не налаштований для WebSocket окремо від REST

- **Контекст:** `server/src/socket/index.ts`, ініціалізація Socket.IO
- **Симптом:** З'єднання WebSocket падає з помилкою CORS у браузері, хоча REST API працює
- **Причина:** `cors()` middleware Express не застосовується до WebSocket upgrade-запитів. Socket.IO має власний CORS конфіг
- **Рішення:** Передавати `cors: { origin }` у конструктор `new Server(httpServer, { cors: ... })`
- **Як уникнути:** Завжди налаштовувати CORS окремо для Socket.IO навіть якщо Express CORS вже є

---

### [chess.js] `undefined` при некоректній FEN — завжди обгортати в try/catch

- **Контекст:** `server/src/utils/chess.ts`, `parseFen()`
- **Симптом:** Сервер падає з `Error: Invalid FEN` при передачі некоректного рядка
- **Причина:** `new Chess(invalidFen)` кидає виняток, не повертає null
- **Рішення:** Обгортати в `try/catch`, повертати `null` при помилці
- **Як уникнути:** Завжди валідувати FEN перед передачею в chess.js. Не довіряти клієнту

---

### [JWT] Різні секрети в `.env` між сервісами або забутий `.env` файл

- **Контекст:** `server/src/config/env.ts`, `server/src/socket/middleware/socketAuth.ts`
- **Симптом:** `JsonWebTokenError: invalid signature` або `jwt malformed`
- **Причина:** Токен підписаний одним ключем, а верифікація йде з іншим
- **Рішення:** Переконатись, що `.env` скопійовано з `.env.example` і заповнено. Один `JWT_SECRET` для всього сервісу
- **Як уникнути:** Валідація env через `zod` при старті (вже реалізовано в `config/env.ts`)

---

### [Redis] Не закритий клієнт у тестах призводить до hanging

- **Контекст:** `server/tests/`, будь-який тест що імпортує Redis
- **Симптом:** Jest зависає після завершення тестів, не виходить
- **Причина:** `ioredis` тримає з'єднання відкритим — Jest чекає завершення всіх handles
- **Рішення:** Викликати `redis.quit()` в `afterAll()` в кожному тест-файлі де використовується Redis
- **Як уникнути:** Створювати окремий Redis клієнт в тестах, закривати в `afterAll`

---

### [React] Забутий dependency у `useEffect` → infinite loop

- **Контекст:** `client/src/features/game/components/`, будь-який компонент з `useEffect`
- **Симптом:** Компонент ре-рендериться нескінченно, браузер гальмує
- **Причина:** Об'єкт або функція в deps — нова при кожному рендері, тригерить effect знову
- **Рішення:** `useCallback`/`useMemo` для стабілізації посилань; ESLint plugin `react-hooks/exhaustive-deps`
- **Як уникнути:** Тримати deps масив мінімальним; не класти об'єкти напряму

---

### [Worker Threads] Непідтримувані типи у `postMessage`

- **Контекст:** `server/src/ai/worker.ts`, `server/src/ai/aiService.ts`
- **Симптом:** `DataCloneError: ... could not be cloned`
- **Причина:** `postMessage` серіалізує через structured clone algorithm — не підтримує функції, класи, Set/Map з непримітивами
- **Рішення:** Передавати лише прості об'єкти (рядки, числа, plain objects, arrays)
- **Як уникнути:** Worker ↔ main комунікація тільки через JSON-сумісні структури

---

### [Vite] Env змінні без префіксу `VITE_` — `undefined` у браузері

- **Контекст:** `client/src/`, будь-який файл що читає `import.meta.env`
- **Симптом:** `import.meta.env.API_URL` = `undefined` в браузері
- **Причина:** Vite expose в браузер тільки змінні з префіксом `VITE_` — решта доступна лише в Node-контексті (vite.config)
- **Рішення:** Перейменувати `API_URL` → `VITE_API_URL` в `.env`
- **Як уникнути:** Дотримуватись конвенції: всі клієнтські змінні починаються з `VITE_`

---

## Реальні помилки під час розробки

### [2026-05-20] Реєстрація завжди повертає "email або нікнейм вже зайнятий"

- **Контекст:** `server/.env`, `client/.env`, `client/src/pages/RegisterPage.tsx`
- **Симптом:** При будь-якій спробі реєстрації (навіть у порожній БД) показується помилка "Помилка реєстрації. Можливо, такий email або нікнейм вже зайнятий"
- **Причина:** Невідповідність портів — сервер запускається на `PORT=3001` (`server/.env`), але клієнт відправляє запити на `http://localhost:4000` (`VITE_API_URL` у `client/.env`). Запит ніколи не досягає сервера (connection refused). `catch {}` у `RegisterPage.tsx` перехоплює будь-яку помилку (включно з мережевою) і показує статичний рядок перекладу `auth.registerError`, приховуючи справжню причину
- **Рішення:** Змінено `PORT=3001` → `PORT=4000` у `server/.env` (відповідно до дефолту в `env.ts` та очікувань клієнта). Покращено `catch` блок у `RegisterPage.tsx` — у dev-режимі показується реальне повідомлення від сервера (`apiError.data.error`). Додано детальне логування у `auth.service.ts`
- **Як уникнути:** Тримати `PORT` у `server/.env` та `VITE_API_URL` у `client/.env` синхронізованими. Ніколи не використовувати `catch {}` без логування — мінімум `console.error`

---

### [2026-05-20] "Socket not initialized" при натисканні кнопок ШІ після оновлення сторінки

- **Контекст:** `client/src/pages/LobbyPage.tsx:24`, `client/src/features/game/socket.ts`, `client/src/App.tsx`
- **Симптом:** `Uncaught Error: Socket not initialized. Call initSocket() first.` при натисканні "Легкий / Середній / Важкий" у LobbyPage. Відтворюється після F5 або прямого переходу на `/lobby` з валідним токеном у localStorage
- **Причина:** `socket` — module-level змінна в `socket.ts`, яка скидається в `null` при кожному завантаженні сторінки. `LoginPage` та `RegisterPage` правильно викликають `initSocket()` після входу, але при оновленні сторінки Redux відновлює токен з localStorage (`isAuthenticated = true`), а `initSocket()` більше не викликається — `App.tsx` не мав жодного `useEffect` для реініціалізації сокету
- **Рішення:** Додано `useEffect` в `App.tsx` що слідкує за `auth.accessToken` з Redux store. При появі токену — викликає `initSocket(token)`, при виході — `disconnectSocket()`. Сокет тепер завжди ініціалізований поки є активна сесія, незалежно від способу входу або оновлення сторінки
- **Як уникнути:** Lifecycle глобальних singleton-ресурсів (socket, websocket, SSE) керувати в кореневому компоненті через `useEffect`, а не в окремих сторінках. Ніколи не покладатись на те, що якийсь конкретний маршрут завжди виконається перед іншим

---

### [2026-05-20] Ходи не зберігаються — фігура повертається після drag-and-drop

- **Контекст:** `server/src/socket/handlers/game.handler.ts:54`, `client/src/pages/GamePage.tsx:42`
- **Симптом:** Drag-and-drop візуально спрацьовує, але фігура повертається на місце. Сервер отримує подію `move`, але клієнт не отримує підтвердження
- **Причина (1 — головна):** У обробнику `move` після `applyMove` створювався `new Chess(state.fen)` — Chess-інстанс ініціалізований з FEN не має move history. Тому `chess.history({ verbose: true }).at(-1)` повертав `undefined`, спрацьовував `if (!move) return` і жодна подія `move` не надсилалась клієнту. Фігура повертала на місце бо Redux state не оновлювався
- **Причина (2 — мертвий код):** У блоці AI-ходу був `await applyMove(gameId, '', '', undefined)` — запис з порожніми from/to кидав `AppError`, перериваючи весь AI-блок
- **Причина (3 — побічна):** `GamePage.tsx` мав `gameState` у deps масиві `useEffect`, що реєстрував socket listeners. Кожне оновлення стану (кожен хід) знімало і перереєстровувало слухачі, створюючи race condition
- **Рішення:** Замінено `new Chess(state.fen)` на `const chess = new Chess(); chess.loadPgn(state.pgn)` — PGN містить повну historію. Видалено мертвий `applyMove(gameId, '', '', undefined)`. Розділено `useEffect` у `GamePage.tsx` на два: один для навігації (з `gameState` у deps), другий для socket listeners (тільки `[dispatch]`)
- **Як уникнути:** `new Chess(fen)` дає позицію без history. Для доступу до history — `chess.loadPgn(pgn)`. `useEffect` з socket listeners не повинен залежати від ігрового стану — реєструй один раз при монтуванні

---

### [2026-05-20] Кнопка "Здатися" показує confirm але нічого не робить

- **Контекст:** `server/src/socket/handlers/game.handler.ts:141`, `shared/types/socket.types.ts:99-103`
- **Симптом:** `window.confirm` з'являється, після OK socket емітить `resign`, але гра не завершується
- **Причина:** Обробник `resign` на сервері використовував `socket.data.currentGameId` для пошуку активної гри, але це поле ніколи не встановлювалось. `getActiveGame('')` повертав `null`, обробник виходив мовчки без жодних дій. `SocketData` тип мав `currentGameId?: string` але ніхто його не заповнював
- **Рішення:** Додано `socket.data.currentGameId = state.gameId` одразу після `socket.join(state.gameId)` у `startAiGame` handler та в обох гілках matchmaking handler (`whiteSocket.data.currentGameId`, `blackSocket.data.currentGameId`)
- **Як уникнути:** Якщо тип визначає опційне поле — перевір що воно реально заповнюється перед використанням. Обробники які мовчки повертають `null` без логування маскують такі баги — додавай `logger.warn` при відсутньому ресурсі

---

### [2026-05-20] Кольори клітин шахівниці — не стандартний chess.com стиль

- **Контекст:** `client/src/features/game/components/Chessboard.tsx`
- **Симптом:** Дошка мала кольори `#b58863`/`#f0d9b5` (lichess wood-стиль) замість загальновідомих `#769656`/`#eeeed2` (chess.com green-стиль)
- **Причина:** Неправильно вибрані кольори при ініціалізації компонента
- **Рішення:** Змінено `customDarkSquareStyle` на `#769656` та `customLightSquareStyle` на `#eeeed2`
- **Як уникнути:** Використовувати chess.com кольори як стандарт для гравців, що звикли до них

---

### [2026-05-20] Всі шахові фігури відображаються однаковим кольором (білим)

- **Контекст:** `client/src/features/game/components/Chessboard.tsx`, `client/src/styles/index.css`
- **Симптом:** І білі, і чорні фігури відображаються у світлому (білому) кольорі. Дошка рендериться, але фігури невиразні
- **Причина:** Tailwind встановлює `body { color: #f3f4f6 }` через `text-gray-100` — майже білий колір. Браузер у деяких режимах рендерингу застосовує успадкований `color` як `currentColor` до SVG-елементів всередині вкладених SVG (react-chessboard рендерить фігури як `<svg><g><svg>path</svg></g></svg>`). Зовнішній SVG не має явного `colorScheme`, тому браузер може успадковувати "темний" режим від body, де `CanvasText = white`. Результат — обидва набори фігур виглядають світлими
- **Рішення:** Додано `style={{ colorScheme: 'light' }}` до wrapper-div шахівниці. `color-scheme: light` явно вказує браузеру використовувати світлу схему кольорів для цього елемента та нащадків, що встановлює `color: CanvasText = black` як базовий колір для SVG рендерингу. Inline-стилі фігур (`fill: #ffffff` / `fill: #000000`) мають вищий пріоритет і зберігаються
- **Як уникнути:** Компоненти з вбудованими SVG що залежать від конкретних кольорів повинні ізолювати `color-scheme` від глобального контексту. При використанні Tailwind dark theme з темним body — завжди обгортати light-mode віджети в `colorScheme: 'light'`

---

### [2026-05-20] ШІ не робить ходів — Worker Thread не знаходить worker.js при запуску через tsx

- **Контекст:** `server/src/ai/aiService.ts`, `server/package.json` (`dev: "tsx watch src/index.ts"`)
- **Симптом:** Гравець робить хід, хід підтверджується (після попереднього фіксу), але ШІ не відповідає. У логах сервера помилка типу `ENOENT: no such file or directory, worker.js` або worker завершується з ненульовим кодом
- **Причина:** `aiService.ts` використовує Worker Thread: `new Worker(path.resolve(__dirname, 'worker.js'))`. Коли сервер запускається через `tsx watch`, TypeScript виконується напряму (без компіляції), тому `__dirname = src/ai/`. У цій директорії є `worker.ts` але НЕ `worker.js`. Worker Thread запускається в окремому процесі Node.js без TypeScript-лоадера `tsx`, тому навіть вказавши `worker.ts` він не зміг би виконати TypeScript. Worker не стартує → `worker.on('error')` → `reject(err)` → `getBestMove` throws → AI-блок у game handler caught → ШІ мовчить
- **Рішення:** Замінено Worker Thread на прямий синхронний виклик `findBestMove(fen, depth)` з `minimax.ts`. Функція `getBestMove` стала простою async-оберткою над синхронним minimax. Для EASY (depth=2) час < 10ms, MEDIUM (depth=3) < 100ms, HARD (depth=4) < 2s — прийнятно для дипломного проєкту
- **Як уникнути:** Worker Threads + TypeScript + tsx потребують окремого налаштування (реєстрація `tsx` як worker loader через `--import` або збірка перед запуском). Для dev-режиму завжди перевіряй що worker-файл існує у тому форматі що шукається. Альтернатива: використовувати `worker_threads` тільки в production build де є скомпільовані `.js` файли

---

### [2026-05-20] Чорні фігури невидимі — всі фігури відображаються білими

- **Контекст:** `client/src/features/game/components/Chessboard.tsx`, `client/src/styles/index.css`
- **Симптом:** На шахівниці видно лише білі фігури. Чорні фігури невидимі або відображаються тим самим кольором що й білі
- **Причина:** Tailwind встановлює на `body` клас `text-gray-100` (`color: #f3f4f6` ≈ білий). `react-chessboard` рендерить фігури як вкладені `<svg>` без явного `color-scheme`. Браузер у такому контексті може застосовувати успадкований `color` як `CanvasText` для SVG-рендерингу, що робить всі нарисовані шляхи зовні світлими. Додатково, `customPieces` який міг бути переданий з некоректними SVG перетирає стандартний набір фігур бібліотеки
- **Рішення:** Переконались що `customPieces` не передається (react-chessboard має вбудовані чорно-білі фігури). Додано `colorScheme: 'light'` на wrapper-div шахівниці — явно ізолює SVG-контекст від темного body і гарантує `CanvasText = black`
- **Як уникнути:** Ніколи не передавай `customPieces` якщо немає необхідності у кастомному дизайні фігур. При вкладених SVG у темному UI-контексті завжди встановлюй `colorScheme: 'light'` на контейнер

---

### [2026-05-20] Шахівниця замала — ігрова сторінка виглядає порожньою

- **Контекст:** `client/src/pages/GamePage.tsx`, `client/src/features/game/components/Chessboard.tsx`
- **Симптом:** Дошка займає малу частину екрану. Більша частина ігрової сторінки — порожній темний фон
- **Причина:** Wrapper `Chessboard.tsx` мав `w-full max-w-[560px] aspect-square` — обмежував дошку до 560px незалежно від розміру вікна. `GamePage.tsx` використовував `flex items-center justify-center` у `min-h-screen` без явного розподілу ширини між колонками. Результат: колонка з дошкою не розширювалась, sidebar займав фіксовані 288px (`w-72`), решта площі була порожньою
- **Рішення:** `GamePage.tsx` переведено на `h-screen overflow-hidden` з двома колонками: ліва (`flex-1`) розтягується, права (`w-80 flex-shrink-0`) фіксована. Wrapper дошки змінено на `width: min(55vw, 600px); aspectRatio: 1` — дошка займає 55% вікна максимум 600px, адаптивно масштабується через `react-chessboard` ResizeObserver
- **Як уникнути:** Ігрові сторінки з шахівницею мають використовувати `h-screen` (не `min-h-screen`), щоб уникнути scroll і забезпечити повне заповнення екрану. `flex-1` на лівій колонці гарантує що дошка займає максимально доступний простір

---

### [2026-05-20] Не підсвічуються доступні ходи при кліку на фігуру

- **Контекст:** `client/src/features/game/components/Chessboard.tsx`
- **Симптом:** При кліку на фігуру не з'являються підказки куди можна ходити. Гравець не бачить допустимих ходів
- **Причина:** `handleSquareClick` відразу емітував хід (при виборі першої клітини встановлював `selectedSquare`, при другому кліку — відправляв хід). Логіка підрахунку можливих ходів через `chess.js` та їхнього підсвічування була відсутня. Стан `moveSquares` не існував
- **Рішення:** Додано стан `moveSquares: SquareStyles`. При першому кліку (вибір фігури): створюється `new Chess(gameState.fen)`, викликається `chess.moves({ square, verbose: true })`, для кожного можливого ходу додається `radial-gradient` dot підсвічування на клітину призначення. При другому кліку (виконання ходу) або `onPieceDrop` — `moveSquares` очищається. `customSquareStyles` об'єднує `moveSquares` та підсвічування вибраної клітини (`selectedSquare`)
- **Як уникнути:** Chess UI без підсвічування ходів значно знижує UX. `chess.js` вже є залежністю клієнта — використовуй його для будь-яких локальних розрахунків позиції без звернення до сервера

---

### [2026-05-20] Кольори дошки не відповідають класичному "дерев'яному" стилю

- **Контекст:** `client/src/features/game/components/Chessboard.tsx`
- **Симптом:** Дошка відображається у зелено-кремових кольорах (`#769656` / `#eeeed2`) — стиль chess.com — замість класичного дерев'яного коричневого стилю
- **Причина:** При первинній реалізації використовувались кольори chess.com за замовчуванням замість класичних "дерев'яних" кольорів lichess-стилю
- **Рішення:** Змінено `customDarkSquareStyle` на `{ backgroundColor: '#b58863' }` та `customLightSquareStyle` на `{ backgroundColor: '#f0d9b5' }` у `ReactChessboard` компоненті
- **Як уникнути:** Визначати та зафіксувати стиль дошки на початку проєкту. Класичні дерев'яні кольори `#b58863` / `#f0d9b5` — загальновідомий стандарт

---

### [2026-05-20] Кнопка "Здатися" використовує нативний `window.confirm()` замість кастомного модала

- **Контекст:** `client/src/pages/GamePage.tsx`, `client/src/components/ui/ConfirmModal.tsx`
- **Симптом:** При натисканні "Здатися" відкривається стандартне браузерне вікно підтвердження (`window.confirm`), яке: (1) зупиняє таймер, бо блокує UI-thread; (2) не вписується у дизайн темного інтерфейсу; (3) не дозволяє кастомізацію тексту та стилів
- **Причина:** Використання `window.confirm()` — найпростіший спосіб підтвердження, але він блокує JavaScript-event-loop, що призводить до зупинки всіх `setTimeout`-based таймерів поки вікно відкрите
- **Рішення:** Створено `ConfirmModal.tsx` — React-компонент з темним оверлеєм, framer-motion анімацією, підтримкою ESC-клавіші та кліку поза модалом. У `GamePage.tsx` доданий стан `showResignModal`, кнопка встановлює `true`, підтвердження емітить `resign` і закриває. Таймери (`isActive` пропси) не залежать від `showResignModal` — залежать лише від `gameState.isGameOver`
- **Як уникнути:** Ніколи не використовувати `window.confirm/alert/prompt` у React-додатках — вони блокують event loop і порушують UX. Завжди використовувати кастомні модальні компоненти

---

### [2026-05-20] Відсутні сповіщення про шах та шах і мат — гравець не розуміє стан гри

- **Контекст:** `client/src/features/game/components/Chessboard.tsx`
- **Симптом:** Коли король під шахом або настає шах і мат — жодних візуальних сповіщень. Гравець не отримує feedback про критичні події гри
- **Причина:** Компонент `Chessboard.tsx` відображав лише позицію з FEN без аналізу стану. Не було логіки для визначення шаху/мату через `chess.js`, підсвічування короля або toast-повідомлень
- **Рішення:** Додано `useEffect` що слідкує за `gameState.fen`. При зміні FEN: (1) ініціалізується `new Chess(fen)`, (2) перевіряється `chess.isCheckmate()` / `chess.isDraw()` / `chess.isCheck()`, (3) через `findKingSquare()` (ітерація `chess.board()`) знаходиться клітина короля під шахом, (4) встановлюється `checkSquare` для підсвічування червоним (`rgba(220, 38, 38, 0.7)`), (5) встановлюється `toast` — текстове повідомлення. Другий `useEffect` авто-приховує toast через 3 секунди (`setTimeout`). Першочерговий рендер (монтування) ігнорується через `prevFenRef` щоб не показувати хибний шах
- **Як уникнути:** Критичні ігрові події (шах, мат, нічия) повинні мати явний візуальний feedback. `chess.js` надає всі необхідні методи (`isCheck`, `isCheckmate`, `isDraw`) — використовуй їх на клієнті для миттєвого UX без очікування серверної відповіді

---

### [2026-05-20] GitHub Actions деплоїв на Railway замість Render

- **Контекст:** `.github/workflows/deploy.yml`
- **Симптом:** CI/CD pipeline намагався деплоїти бекенд на Railway (`railway up --service genius-server`) замість Render. Деплой падав бо `RAILWAY_TOKEN` секрет не налаштований, а сервер деплоюється на Render
- **Причина:** GitHub Actions workflow був згенерований з блоком `deploy-backend` для Railway. Render деплоїться автоматично через вебхук при push в `main` — окремий крок у GitHub Actions не потрібен
- **Рішення:** Видалено повністю job `deploy-backend (Railway)` з `deploy.yml`. Залишено лише `deploy-frontend (Vercel)`. Видалено `needs: [deploy-backend]` з frontend job
- **Як уникнути:** Перевіряти відповідність CI/CD конфігурації реальній платформі деплою ще до першого push. Render не потребує CLI-деплою з GitHub Actions — він підключається напряму до репозиторію

---

### [2026-05-20] `Property 'headers'/'query' does not exist on type 'AuthRequest'` на Render

- **Контекст:** `server/src/middleware/auth.middleware.ts:12`, `server/src/modules/games/game.controller.ts:17-18`
- **Симптом:** Render збірка падала з помилками TypeScript: `Property 'headers' does not exist on type 'AuthRequest'` та `Property 'query' does not exist on type 'AuthRequest'`. Локально помилок не було
- **Причина:** У `server/src/` були 32 застарілі `.d.ts` файли згенеровані попередньою збіркою коли `outDir` вказував на `.` (корінь) замість `./dist`. Коли `tsc` знаходить і `.ts` і `.d.ts` для одного модуля, він використовує `.d.ts` як декларацію. Стара `auth.middleware.d.ts` мала `AuthRequest extends Request` але з типом `Request` без повного набору властивостей (стара версія типів або неправильний контекст при генерації). В результаті `headers`, `query`, `body` були недоступні
- **Рішення:** Видалено всі стале `.d.ts` файли з `server/src/` командою `del /s /q server/src/*.d.ts`. Поточний `tsconfig.json` має `outDir: "./dist"` та `rootDir: "./src"` — нові збірки більше не потраплятимуть у `src/`
- **Як уникнути:** Якщо `outDir` змінюється — спочатку видаляти артефакти з попереднього місця. Додати `src/` до `.gitignore` патернів для `*.d.ts` та `*.js` щоб вони ніколи не потрапляли у репозиторій. Встановити `"declaration": false` у tsconfig якщо декларації не потрібні для публічного API

---

### [2026-05-20] `AuthRequest extends Request` — `headers`/`query` недоступні на Render

- **Контекст:** `server/src/middleware/auth.middleware.ts`, `server/src/modules/games/game.controller.ts`
- **Симптом:** Render збірка падала з `Property 'headers' does not exist on type 'AuthRequest'` та `Property 'query' does not exist on type 'AuthRequest'`. Також: `Property 'userId' does not exist` в `game.controller.ts:16`
- **Причина (1 — interface extends):** `interface AuthRequest extends Request` — в середовищі Render з конкретною версією TypeScript та `moduleResolution: Node` інтерфейс не успадковував властивості `Request` (headers, query, body). Це відтворюється коли модулі express резолвляться інакше ніж локально — наприклад якщо `@types/express` не встановлено або версія відрізняється. Рішення: перейти з `interface AuthRequest extends Request` на `type AuthRequest = Request & { user?: ... }` (type intersection гарантовано включає всі поля)
- **Причина (2 — userId vs id):** Middleware визначав `user.id`, але: (а) `jwt.sign` у `auth.service.ts` записував поле як `userId`, (б) `game.controller.ts` читав `req.user!.userId`. Три місця використовували різні назви поля — типи не відображали реальну структуру JWT payload
- **Рішення:** Перейшли з `interface extends` на `type intersection`: `type AuthRequest = Request & { user?: { userId: string; ... } }`. Для `headers` та `query` використовується `(req as any).headers?.authorization` та `(req as any).query` — ізольований `as any` замість поширення помилки. Поле `userId` вирівняне з `AuthTokenPayload` у `@genius/shared`
- **Як уникнути:** При розширенні Express `Request` — перевіряти збірку у чистому середовищі (docker або CI) одразу, не покладатись лише на локальний запуск. Type intersection (`Request & {...}`) надійніша ніж `interface extends` для Express типів — менше залежить від порядку резолвінгу модулів

