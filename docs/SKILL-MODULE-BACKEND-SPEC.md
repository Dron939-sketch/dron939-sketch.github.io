# Backend Spec: Модуль 21-дневной тренировки навыков

Документ описывает всё, что нужно реализовать на бэкенде (`fredi-backend-flz2.onrender.com`), чтобы модуль `skill_choice.js` v2.2 работал в режиме реальной ежедневной рассылки заданий по выбранному пользователем каналу.

Frontend готов и уже шлёт нужные запросы. Если эндпоинты ещё не реализованы — frontend gracefully логирует warning и работает локально, но рассылок не будет. После реализации эндпоинтов на бэкенде ничего на фронте менять не нужно.

---

## 1. Общая архитектура

```
┌─────────────────┐
│  Frontend (web) │
│  skill_choice.js│
└────────┬────────┘
         │
         │ POST /api/notification-settings (создание/обновление)
         │ GET  /api/notification-settings/{user_id} (чтение при загрузке)
         ▼
┌────────────────────────────────────────────┐
│              fredi-backend                 │
│ ┌──────────────────────────────────────┐   │
│ │ notification_settings table          │   │
│ │ user_courses table (план + прогресс) │   │
│ │ telegram_links / max_links table     │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ Cron (1 раз в минуту):                     │
│ 1) выбрать всех, у кого notify_time=now    │
│ 2) для каждого построить задание дня       │
│ 3) отправить через выбранный канал         │
└──┬────────────┬─────────────┬──────────┬───┘
   │            │             │          │
   ▼            ▼             ▼          ▼
Telegram      MAX          Web push     Email
Bot API     Bot API      (VAPID/SW)   (SMTP/SES)
```

---

## 2. База данных (PostgreSQL пример)

### Таблица `notification_settings`

Главная таблица, в которую пишет фронт.

```sql
CREATE TABLE notification_settings (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE,
    skill_id        VARCHAR(64) NOT NULL,
    skill_name      VARCHAR(255) NOT NULL,
    channel         VARCHAR(16) NOT NULL,        -- 'telegram'|'max'|'web'|'email'
    notify_time     VARCHAR(5)  NOT NULL,        -- 'HH:MM'
    start_date      TIMESTAMP   NOT NULL,
    paused          BOOLEAN DEFAULT FALSE,
    paused_until    TIMESTAMP,
    last_sent_day   INTEGER DEFAULT 0,           -- последний день, по которому ушло сообщение
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notify_time ON notification_settings(notify_time, paused);
```

### Таблица `user_courses` (содержит план и прогресс — fronend дублирует в localStorage)

```sql
CREATE TABLE user_courses (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    skill_id        VARCHAR(64) NOT NULL,
    skill_name      VARCHAR(255) NOT NULL,
    plan_json       JSONB NOT NULL,              -- {weeks:[{theme,exercises:[...]}]}
    days_done       JSONB DEFAULT '[]'::jsonb,   -- [1,2,3,...]
    start_date      TIMESTAMP NOT NULL,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);
```

### Таблицы для линковки чат-ID

```sql
CREATE TABLE telegram_links (
    user_id      BIGINT PRIMARY KEY,
    chat_id      BIGINT NOT NULL,
    username     VARCHAR(255),
    linked_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE max_links (
    user_id      BIGINT PRIMARY KEY,
    chat_id      VARCHAR(64) NOT NULL,
    linked_at    TIMESTAMP DEFAULT NOW()
);
```

### Уже существует на бэкенде (для веб-пуша)

```sql
-- Уже есть, не трогаем
CREATE TABLE push_subscriptions (
    user_id        BIGINT,
    endpoint       TEXT,
    keys_p256dh    TEXT,
    keys_auth      TEXT,
    created_at     TIMESTAMP
);
```

---

## 3. API эндпоинты

### 3.1 `POST /api/notification-settings`

Принимает настройки от фронта при подтверждении выбора канала.

**Запрос:**
```json
{
  "user_id":     1775006346315,
  "skill_id":    "speech_influence",
  "skill_name":  "Речевое воздействие",
  "channel":     "telegram",
  "notify_time": "09:00",
  "start_date":  "2026-05-03T10:38:30.000Z"
}
```

**Ответ 200:**
```json
{ "success": true }
```

**Логика:**
- `INSERT ... ON CONFLICT (user_id) DO UPDATE` — у пользователя только один активный курс одновременно.
- При смене канала/skill_id — `last_sent_day` сбрасывается в 0.

### 3.2 `GET /api/notification-settings/{user_id}`

Получение текущих настроек — фронт вызывает при загрузке экрана выбора навыка, чтобы прелодить сохранённые значения.

**Ответ 200:**
```json
{
  "channel":     "telegram",
  "notify_time": "09:00",
  "skill_id":    "speech_influence",
  "skill_name":  "Речевое воздействие",
  "start_date":  "2026-05-03T10:38:30.000Z",
  "paused":      false
}
```

**Ответ 404 (если ещё нет):** просто 404 — фронт расценивает это как «настроек нет, используем дефолты».

### 3.3 `POST /api/notification-settings/{user_id}/pause`

Поставить курс на паузу (например, после 3+ пропусков подряд).

**Запрос:**
```json
{ "days": 7 }
```

**Ответ 200:** `{ "paused_until": "2026-05-10T10:38:30Z" }`

### 3.4 `POST /api/notification-settings/{user_id}/resume`

Снять паузу.

### 3.5 `DELETE /api/notification-settings/{user_id}`

Удалить настройки (сброс курса).

---

## 4. Telegram bot (`@Nanotech_varik_bot`)

### 4.1 Deeplink-флоу

Frontend открывает `https://t.me/Nanotech_varik_bot?start={user_id}`.

Когда юзер жмёт «Start» в боте, Telegram отправляет ему `/start {user_id}`. Бот:

```python
@bot.message_handler(commands=['start'])
async def handle_start(message):
    parts = message.text.split()
    if len(parts) > 1 and parts[1].isdigit():
        web_user_id = int(parts[1])
        # Связываем
        await db.execute(
            "INSERT INTO telegram_links(user_id, chat_id, username) "
            "VALUES($1, $2, $3) "
            "ON CONFLICT(user_id) DO UPDATE SET chat_id=$2, username=$3, linked_at=NOW()",
            web_user_id, message.chat.id, message.from_user.username
        )
        await bot.reply_to(message, "✅ Связали с веб-версией Фреди. Теперь буду присылать сюда задания по навыку каждый день.")
    else:
        await bot.reply_to(message, "Привет! Это бот Фреди. Чтобы начать, откройте веб-версию: https://meysternlp.ru/fredi/")
```

### 4.2 Отправка задания

```python
async def send_telegram_task(user_id: int, day: int, exercise: dict):
    chat_id = await db.fetchval("SELECT chat_id FROM telegram_links WHERE user_id=$1", user_id)
    if not chat_id: return False  # не связан
    text = (
        f"⚡ День {day} из 21 · {exercise['task']}\n\n"
        f"⏱ {exercise['dur']}\n\n"
        f"{exercise['inst']}\n\n"
        f"Когда выполните — нажмите кнопку «Готово»."
    )
    keyboard = InlineKeyboardMarkup()
    keyboard.add(InlineKeyboardButton("✅ Готово", callback_data=f"done_{user_id}_{day}"))
    keyboard.add(InlineKeyboardButton("📲 Открыть в Фреди", url=f"https://meysternlp.ru/fredi/"))
    await bot.send_message(chat_id, text, reply_markup=keyboard)
    return True
```

### 4.3 Callback «Готово»

```python
@bot.callback_query_handler(func=lambda c: c.data.startswith('done_'))
async def handle_done(callback):
    _, user_id, day = callback.data.split('_')
    user_id, day = int(user_id), int(day)
    # Обновить days_done в user_courses
    await db.execute(
        "UPDATE user_courses SET days_done = days_done || $1::jsonb WHERE user_id=$2",
        json.dumps([day]), user_id
    )
    await bot.answer_callback_query(callback.id, "✅ Зачтено!")
```

---

## 5. MAX bot (`502238728185_bot`)

Логика идентична Telegram, но через MAX Bot API (`https://api.max.ru/v1/bot{token}/...`). Ключевые моменты:

- Deeplink: `https://max.ru/id502238728185_bot` — MAX пока не передаёт start-параметр через URL стабильно. Альтернатива: показать пользователю инструкцию «отправить боту команду `/link USER_ID`» (фронт показывает USER_ID).
- Webhook: настроить на тот же бэкенд, обрабатывать события `message` и `callback`.

В первой итерации можно не делать MAX и оставить как «coming soon» (просто принимать настройку, но не слать) — пользователи MAX немного.

---

## 6. Web push (уже работает)

Backend уже имеет `/api/push/subscribe` и `/api/push/vapid-public-key`. Cron должен:

```python
async def send_web_push(user_id: int, day: int, exercise: dict):
    sub = await db.fetchrow(
        "SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id=$1",
        user_id
    )
    if not sub: return False
    payload = json.dumps({
        "title": f"День {day}: {exercise['task']}",
        "body":  exercise['inst'][:120] + '...',
        "url":   "/fredi/"
    })
    pywebpush.webpush(
        subscription_info={"endpoint": sub['endpoint'], "keys":{"p256dh": sub['keys_p256dh'], "auth": sub['keys_auth']}},
        data=payload,
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_claims={"sub": "mailto:meysternlp@yandex.ru"}
    )
    return True
```

---

## 7. Email

Любой провайдер (SMTP, Postmark, SendGrid, Mailgun). Шаблон письма:

```
Тема: [Фреди] День {N}: {задание}

Привет!

Сегодня день {N} из 21 в курсе «{skill_name}».

⏱ Время: {dur}
Задание: {task}

{inst}

Когда выполните — отметьте в приложении: https://meysternlp.ru/fredi/

—
Андрей Мейстер
```

Email-адрес у юзера сейчас не сохраняется. Добавить поле `email VARCHAR(255)` в `notification_settings` и спрашивать его на фронте, если выбран email-канал. **Это требует фронт-апдейта** (можно отдельным PR, когда email будет готов).

---

## 8. Cron job (главный механизм рассылки)

Логика — каждую минуту:

```python
import asyncio
from datetime import datetime, timezone

async def cron_send_daily_tasks():
    while True:
        now = datetime.now(timezone.utc)
        time_hh_mm = now.strftime('%H:%M')
        # Найти всех, у кого notify_time == текущему времени и не на паузе
        rows = await db.fetch(
            "SELECT user_id, channel, skill_id, start_date, last_sent_day "
            "FROM notification_settings "
            "WHERE notify_time=$1 AND (paused=false OR paused_until<NOW())",
            time_hh_mm
        )
        for row in rows:
            day = (now - row['start_date']).days + 1
            if day < 1 or day > 21:    continue   # курс закончен или не начат
            if day <= row['last_sent_day']: continue   # уже слали сегодня
            # Получить упражнение
            course = await db.fetchrow(
                "SELECT plan_json FROM user_courses WHERE user_id=$1 AND skill_id=$2",
                row['user_id'], row['skill_id']
            )
            if not course: continue
            ex = find_exercise_by_day(course['plan_json'], day)
            if not ex: continue
            # Отправить по каналу
            sent = False
            if row['channel'] == 'telegram': sent = await send_telegram_task(row['user_id'], day, ex)
            if row['channel'] == 'max':      sent = await send_max_task(row['user_id'], day, ex)
            if row['channel'] == 'web':      sent = await send_web_push(row['user_id'], day, ex)
            if row['channel'] == 'email':    sent = await send_email(row['user_id'], day, ex)
            if sent:
                await db.execute(
                    "UPDATE notification_settings SET last_sent_day=$1, updated_at=NOW() "
                    "WHERE user_id=$2",
                    day, row['user_id']
                )
        await asyncio.sleep(60)  # минута до следующей итерации
```

**Защита от спама:**
- `last_sent_day` гарантирует, что в один день шлём не больше одного утреннего сообщения.
- Если `paused_until` в прошлом — pause снимается автоматически на этой же итерации.

---

## 9. Авто-пауза при пропусках

Если 3+ пропуска подряд — предложить паузу. Логика встраивается в cron:

```python
# До отправки задания дня N — проверить, не пропустил ли пользователь дни N-3..N-1
gap = await db.fetchval(
    "SELECT NOT (days_done @> $1::jsonb) FROM user_courses WHERE user_id=$2 AND skill_id=$3",
    json.dumps([day-1, day-2, day-3]), user_id, skill_id
)
if gap and day >= 4:
    # Шлём специальное сообщение с предложением паузы вместо обычного задания
    await send_pause_offer(user_id, day, channel)
    continue
```

---

## 10. Контент-стратегия 21-дневной программы

Frontend сейчас генерирует план через `POST /api/ai/generate` при первом создании курса (DeepSeek, ~25 секунд). Этого достаточно для MVP.

Для масштабирования рекомендую один из двух путей:

**A. Кэшировать AI-планы** в `user_courses.plan_json` (уже делается) + в дополнительную таблицу `cached_skill_plans` per (skill_id, profile_hash). Тогда новые пользователи с похожим профилем получают план мгновенно.

**B. Редакторский контент.** Авторские планы для каждого из 19 предопределённых навыков. Пользователь получает гарантированный качественный контент. Для custom-навыков остаётся AI.

Рекомендую B для топ-5 навыков (управление эмоциями, концентрация, стрессоустойчивость, речевое воздействие, прокрастинация) и A для остальных.

---

## 11. Тестовый чек-лист после деплоя

- [ ] `POST /api/notification-settings` принимает payload, возвращает 200.
- [ ] `GET /api/notification-settings/{user_id}` отдаёт сохранённые настройки.
- [ ] Telegram-бот при `/start {user_id}` записывает chat_id в `telegram_links`.
- [ ] Cron в 09:00 UTC отправляет задание дня всем подписчикам с `notify_time=09:00`.
- [ ] Кнопка «✅ Готово» в Telegram пишет день в `days_done`.
- [ ] Web push доставляется (если разрешения даны).
- [ ] При 3+ пропусках идёт offer паузы вместо задания.
- [ ] Курс автоматически завершается при `day > 21` и шлёт поздравительное сообщение.

---

## 12. Что фронтенд уже делает (не трогать)

- При выборе канала и времени → `POST /api/notification-settings` (graceful fallback если 404).
- При входе на экран выбора навыка → `GET /api/notification-settings/{user_id}` (graceful, синхронизирует state).
- Открывает deeplink `https://t.me/Nanotech_varik_bot?start={user_id}` для регистрации в боте.
- Сохраняет план и прогресс в localStorage (как fallback на случай отсутствия бэкенда).
- Web push — уже использует существующие `/api/push/*` через `PushManager_Fredi`.

Frontend готов к работе с бэкендом, как только эндпоинты будут реализованы.

---

**Контакт для уточнений:** Андрей Мейстер · meysternlp@yandex.ru · t.me/meysternlp
