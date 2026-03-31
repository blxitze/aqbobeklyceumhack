# Aqbobek Lyceum Portal

## Описание

Многоролевой школьный портал с AI-аналитикой успеваемости и умным управлением расписанием. Разработан для хакатона **AIS Hack 3.0**.

Проект — **монорепозиторий**:

- `aqbobek-portal/` — Next.js 15 (интерфейс, API-шлюз, авторизация, Prisma, триггеры Pusher).
- `aqbobek-fastapi/` — внутренний сервис: расписание (CP-SAT), генерация текста тьютора через OpenAI.

Браузер **никогда** не обращается к FastAPI напрямую: только через Route Handlers Next.js с заголовком `X-Internal-Token`.

---

## Стек

| Слой | Технологии |
|------|------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, Pusher JS |
| **Backend (Next.js)** | Route Handlers, NextAuth.js v5, Prisma ORM |
| **Backend (Python)** | FastAPI, OR-Tools CP-SAT, SQLAlchemy, OpenAI SDK |
| **База данных** | PostgreSQL (например, Railway) |
| **Real-time** | Pusher |

---

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/blxitze/aqbobeklyceumhack.git
cd aqbobeklyceumhack
```

На этом уровне лежат каталоги `aqbobek-portal/` и `aqbobek-fastapi/`.

---

### 2. Установить зависимости

**Next.js**

```bash
cd aqbobek-portal
npm install
```

**FastAPI**

```bash
cd ../aqbobek-fastapi
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

### 3. Настроить переменные окружения

#### `aqbobek-portal/.env.local`, .env

Создать файл `aqbobek-portal/.env.local`, `aqbobek-portal/.env`  со следующими переменными:

```env
DATABASE_URL=            # PostgreSQL URL из Railway
NEXTAUTH_SECRET=         # openssl rand -base64 32
AUTH_SECRET=             # openssl rand -base64 32
INTERNAL_SECRET=         # openssl rand -base64 32 (общий секрет с FastAPI)
FASTAPI_URL=http://localhost:8000
OPENAI_API_KEY=          # platform.openai.com
PUSHER_APP_ID=           # pusher.com → App Keys
PUSHER_KEY=              # pusher.com → App Keys
PUSHER_SECRET=           # pusher.com → App Keys
PUSHER_CLUSTER=eu
NEXT_PUBLIC_PUSHER_KEY=  # то же значение, что PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER=eu
```

#### `aqbobek-fastapi/.env`

Создать файл `aqbobek-fastapi/.env`:

```env
DATABASE_URL=            # тот же PostgreSQL URL
OPENAI_API_KEY=          # тот же ключ (опционально, для tutor-text)
INTERNAL_SECRET=         # тот же, что в portal
```

---

### 4. Применить схему БД и залить данные

Из каталога **портала**:

```bash
cd aqbobek-portal
npx prisma generate
npx prisma db push
npx prisma db seed
```

---

### 5. Запустить проект

**Терминал 1 — Next.js**

```bash
cd aqbobek-portal
npm run dev
```

**Терминал 2 — FastAPI**

```bash
cd aqbobek-fastapi
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Открыть в браузере: [http://localhost:3000](http://localhost:3000)

---

## Демо-аккаунты

Данные создаются скриптом `npx prisma db seed`.

| Роль          | Email                 | Пароль     |
|---------------|-----------------------|------------|
| Ученик        | `student@aqbobek.kz`  | `student123` |
| Учитель       | `teacher1@aqbobek.kz` | `teacher123` |
| Родитель      | `parent001@aqbobek.kz`| `parent123`  |
| Администратор | `admin@aqbobek.kz`    | `admin123`   |

---

## Kiosk Mode

Открыть [http://localhost:3000/kiosk](http://localhost:3000/kiosk) в браузере → **F11** для полноэкранного режима.

Страница **не требует** авторизации (доступ с общего экрана в коридоре).

---

## Архитектура

```text
Browser
  └── Next.js (UI + CRUD + Auth + Pusher trigger)
        ├── PostgreSQL (Prisma ORM)
        ├── FastAPI (X-Internal-Token) — сложная логика
        │     ├── PostgreSQL (SQLAlchemy)
        │     ├── OR-Tools CP-SAT (расписание)
        │     └── OpenAI API (генерация текста)
        └── Pusher (real-time уведомления)
```

- **Mock BilimClass:** эндпоинты вида `/api/bilimclass/*` отдают данные из PostgreSQL (реалистичный seed).
- **Расписание:** генерация и замена учителя вызываются с Next.js на FastAPI; после успешной операции при необходимости тригерится Pusher.

---

## AI-архитектура (три слоя)

| Слой | Назначение |
|------|------------|
| **Data Layer** | Оценки, посещаемость и связанные записи из БД |
| **Logic Layer** | Детерминированный расчёт риска (rule-based), граф тем / предпосылок, подготовка структуры для отчётов |
| **AI Layer** | LLM формирует **только текст** на основе уже посчитанных данных (числа и выводы не выдумываются) |

**LLM используется только в трёх пользовательских сценариях:**

1. **AI-тьютор** для ученика (текст на основе анализа успеваемости и тем).
2. **Отчёт класса** для учителя.
3. **AI-выжимка** для родителя.

Аналитика (уровень риска, корневая тема и т.д.) считается **до** вызова модели; LLM не подменяет собой классификатор или решатель расписания.

---

## Полезные пути

| URL / путь | Описание |
|------------|----------|
| `/login` | Вход |
| `/student/dashboard` | Дашборд ученика |
| `/teacher/dashboard` | Дашборд учителя |
| `/parent/dashboard` | Дашборд родителя |
| `/admin/dashboard` | Панель администратора |
| `/kiosk` | Режим интерактивной стенгазеты |

---

## Лицензия и контакт

Проект подготовлен для (Aqbobek Lyceum). 
