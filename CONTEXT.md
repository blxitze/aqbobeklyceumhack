# Aqbobek Lyceum Portal — Agent Summary for Cursor AI

## Контекст
Хакатон aqbobek lyceum
Многоролевой школьный портал с AI-аналитикой и умным расписанием.
Заказчик: Aqbobek Lyceum.

---

## Финальное решение: что строим

### ✅ СТРОИМ — обязательно (влияет на баллы)

#### 1. Mock BilimClass API (`/api/bilimclass/`)
- Собственный Mock-сервер с правдоподобным JSON (оценки, посещаемость, темы)
- Формат: `{ studentId, subject, topic, score, date, attendance }`
- Seed-данные: 3 класса × 25 учеников × 5 предметов × 10 оценок
- Без реверс-инжиниринга bilimclass.kz

#### 2. AI-Наставник — полная цепочка (killer-фича #1)
**Алгоритм (FastAPI, НЕ только LLM):**
```
Оценки по темам + посещаемость
  → Logistic Regression (вместо XGBoost) → вероятность провала СОЧ (%)
  → Граф знаний (networkx) → prereq-рёбра → корень проблемы
  → Профориентация: сильные предметы → рекомендация направления (IT / Science / Humanities)
  → LLM (OpenAI) → человеческий текст
```
**Результат:** "С вероятностью 78% ты завалишь СОЧ по физике из-за пробела в Динамике. По сильным предметам (математика, информатика) — рекомендуем IT направление."

**Роуты FastAPI:**
- `POST /ai/analyze/{student_id}` → JSON с risk_score, root_topic, career_hint
- `POST /ai/tutor-text` → LLM генерирует финальный текст

#### 3. Kiosk Mode `/kiosk` (killer-фича #2)
- `setInterval` 10 сек — автосмена слайдов
- Framer Motion `AnimatePresence` — анимация переходов
- Fullscreen, шрифт 48px+, без мыши/клавиатуры
- Слайды: топ учеников дня | замены в расписании (Pusher real-time) | анонсы мероприятий

#### 4. Smart Schedule (Hardcore-модуль, 20% баллов)
- **CP-SAT (ortools)** — только один день, без лент (ленты — бонус если останется время)
- Constraints: учитель не в двух местах, кабинет не занят дважды
- Болезнь учителя → пересчёт текущего дня → diff → Pusher push → уведомления
- `POST /schedule/generate` (FastAPI) — генерация
- `POST /schedule/substitute` — замена учителя + пересчёт

#### 5. Ролевая модель и дашборды
- NextAuth.js v5: роли STUDENT / TEACHER / PARENT / ADMIN
- Student: дашборд оценок, AI-тьютор, портфолио (загрузка файлов), лидерборд
- Teacher: Early Warning System (кто падает), AI-отчёт класса за 1 клик
- Parent: дашборд ребёнка, AI-выжимка за неделю
- Admin: глобальная аналитика, Smart Schedule UI, центр уведомлений

---

### ⚡ УПРОЩАЕМ (делаем, но минимально)

| Модуль | Полная версия | Упрощённая версия |
|--------|--------------|-------------------|
| XGBoost | сложная модель | Logistic Regression — проще объяснить жюри |
| Ленты расписания | параллельные группы | только базовые уроки; ленты как бонус |
| Refine (админка) | полный CRUD | простые страницы без Refine если не успеем |
| RadarChart граф знаний | интерактивный граф | LineChart + список тем достаточно |
| Геймификация | ачивки + лидерборд | только лидерборд |

---

### ❌ УБИРАЕМ (не влияет на баллы, только тратит время)

- Верификация портфолио (сложная логика) → просто загрузка файлов
- Ачивки за закрытые цели → лидерборд закрывает геймификацию
- Vercel AI SDK стриминг → прямой OpenAI SDK из FastAPI (проще, без лишнего слоя)
- Пересчёт всей недели при болезни → только текущий день

---

## Стек (финальный)

### Frontend
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts (LineChart / BarChart для дашбордов)
- Framer Motion (Kiosk Mode)
- Pusher JS (real-time уведомления)

### Backend A — Next.js Route Handlers
- CRUD, авторизация
- NextAuth.js v5 (роли)
- Prisma ORM → PostgreSQL

### Backend B — FastAPI (Python)
- Logistic Regression (scikit-learn) — предиктивная аналитика
- networkx — граф знаний (prereq-рёбра тем)
- ortools CP-SAT — генерация расписания
- OpenAI SDK — только текстовая генерация (последний шаг)

### Инфраструктура
- Railway: 3 сервиса (Next.js, FastAPI, PostgreSQL)
- Pusher free tier (WebSocket)
- Keep-alive пинг на FastAPI каждые 5 минут (Railway не засыпает)

---

## Архитектура вызовов

```
Browser
  └── Next.js (UI + CRUD + Auth)
        ├── PostgreSQL (Prisma)
        ├── FastAPI (X-Internal-Token header) — только сложная логика
        │     ├── PostgreSQL (SQLAlchemy)
        │     ├── scikit-learn / networkx
        │     ├── ortools CP-SAT
        │     └── OpenAI API
        └── Pusher (real-time)
```

FastAPI НЕ открыт публично — только через Next.js с `X-Internal-Token`.

---

## Структура роутов

```
/app
  /(auth)/login
  /(student)/dashboard
  /(student)/portfolio
  /(student)/schedule
  /(student)/leaderboard
  /(teacher)/dashboard
  /(teacher)/class/[id]
  /(teacher)/reports
  /(parent)/dashboard
  /(admin)/dashboard
  /(admin)/schedule
  /(admin)/notifications
  /kiosk
  /api/bilimclass/grades
  /api/bilimclass/students
  /api/ai/tutor
  /api/ai/report
  /api/ai/parent-summary
  /api/schedule/generate
  /api/schedule/substitute
```

---

## Порядок разработки (3 дня)

### День 1
- [ ] Prisma схема + seed (студенты, оценки, темы, расписание)
- [ ] NextAuth роли x4
- [ ] Mock BilimClass API (`/api/bilimclass/`)
- [ ] Базовые дашборды student / teacher / parent / admin

### День 2
- [ ] FastAPI: Logistic Regression + networkx граф знаний + профориентация
- [ ] FastAPI: CP-SAT расписание (один день, без лент)
- [ ] LLM интеграция (OpenAI SDK) — тьютор + отчёт + выжимка родителю
- [ ] Early Warning System (teacher)

### День 3
- [ ] Замены учителя + Pusher push
- [ ] Kiosk Mode (Framer Motion, автосмена)
- [ ] Лидерборд
- [ ] Портфолио (загрузка файлов)
- [ ] Polish UI + keep-alive пинг

---

## Env переменные

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
OPENAI_API_KEY=...
INTERNAL_SECRET=...
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
FASTAPI_URL=https://...railway.app
```

---

## Три слоя AI (архитектурный принцип — объяснять жюри)

```
Data Layer   → оценки, посещаемость, темы из БД
Logic Layer  → Logistic Regression + networkx граф знаний (твои алгоритмы)
AI Layer     → только LLM: объяснение результата человеческим языком
```

LLM используется ТОЛЬКО в 3 местах:
1. AI-тьютор → объяснение риска ученику + профориентация
2. Отчёт учителя за 1 клик
3. AI-выжимка для родителя за неделю

Везде схема: `алгоритм → JSON → LLM → текст`

---

## Критерии жюри и покрытие

| Критерий | Вес | Что закрывает |
|---------|-----|--------------|
| Ядро + UI/UX | 25% | Роли, авторизация, Kiosk Mode, дашборды |
| Глубина AI | 25% | LR + граф знаний + профориентация + LLM |
| Расписание | 20% | CP-SAT + Pusher замены |
| Архитектура | 15% | FastAPI + Mock BilimClass + Prisma |
| Защита | 15% | 3-слойная AI архитектура, объяснение LR |