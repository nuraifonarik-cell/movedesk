# MoveDesk — Moving Company CRM

## Быстрый старт

### 1. Supabase
1. Зайди на supabase.com → New Project
2. Открой SQL Editor
3. Вставь и выполни содержимое файла `supabase_schema.sql`
4. Скопируй Project URL и anon key (Settings → API)

### 2. Переменные окружения
Создай файл `.env` в корне проекта:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Установка и запуск
```bash
npm install
npm run dev
```

### 4. Railway (деплой)
```bash
npm run build
# Загрузи папку dist/ на Railway или Netlify
```

## Структура проекта
```
src/
  contexts/   AuthContext (авторизация)
  lib/        supabase.js (клиент + хелперы)
  pages/      Dashboard, Jobs, Estimate, Calendar, Customers, Crew
  components/ Layout (сайдбар + навигация)
```

## Следующие этапы
- [ ] Страница детали заявки (/jobs/:id)
- [ ] PDF инвойс
- [ ] Stripe оплата
- [ ] Crew PWA (мобильное приложение)
- [ ] Публичная форма заявки для клиентов
