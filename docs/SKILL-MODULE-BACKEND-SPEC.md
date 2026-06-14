# Backend Spec: Модуль 21-дневной тренировки навыков

Документ описывает всё, что нужно реализовать на бэкенде (`fredi-backend-flz2.onrender.com`), чтобы модуль `skill_choice.js` v2.4 работал в режиме реальной ежедневной рассылки заданий и боевого режима.

Frontend готов и уже шлёт нужные запросы. Если эндпоинты ещё не реализованы — frontend gracefully логирует warning и работает локально, но рассылок не будет. После реализации эндпоинтов на бэкенде ничего на фронте менять не нужно.

---

## 1. Общая архитектура

```
┌─────────────────┐
│  Frontend (web) │
│  skill_choice.js│ v2.4
└────────┬────────┘
         │
         │ GET  /api/base-plan/{skill_id}              (новое — кэш базовых планов)
         │ GET  /api/notification-settings/{user_id}
         │ POST /api/notification-settings
         │ POST /api/notification-settings/{user_id}/activate  (новое — боевой режим)
         ▼
┌────────────────────────────────────────────┐
│              fredi-backend                 │
│ ┌──────────────────────────────────────┐   │
│ │ notification_settings (+active_mode) │   │
│ │ user_courses                         │   │
│ │ cached_skill_plans (новое)           │   │
│ │ daily_checkins      (новое)          │   │
│ │ telegram_links / max_links           │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ Cron (каждую минуту):                      │
│ — Пассивный режим: 1 утреннее сообщение    │
│ — Боевой режим: 4 точки касания/день       │
└──┬────────────┬─────────────┬──────────┬───┘
   ▼            ▼             ▼          ▼
Telegram      MAX          Web push     Email
```

---

## 2. База данных (PostgreSQL)

### Таблица `notification_settings` (расширена)

```sql
CREATE TABLE notification_settings (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE,
    skill_id        VARCHAR(64) NOT NULL,
    skill_name      VARCHAR(255) NOT NULL,
    channel         VARCHAR(16) NOT NULL,
    notify_time     VARCHAR(5)  NOT NULL,
    start_date      TIMESTAMP   NOT NULL,
    paused          BOOLEAN DEFAULT FALSE,
    paused_until    TIMESTAMP,
    last_sent_day   INTEGER DEFAULT 0,
    -- НОВЫЕ поля для боевого режима и персонализации
    active_mode     BOOLEAN DEFAULT FALSE,         -- боевой режим вкл/выкл
    personalized    BOOLEAN DEFAULT FALSE,         -- план персонализирован под профиль
    last_morning    DATE,                          -- последняя дата утреннего сообщения
    last_midday     DATE,                          -- последняя дата дневного чек-ина
    last_evening    DATE,                          -- последняя дата вечерней рефлексии
    last_weekly     DATE,                          -- последний воскресный разбор
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notify_time ON notification_settings(notify_time, paused);
CREATE INDEX idx_active_mode ON notification_settings(active_mode);
```

### Таблица `user_courses`

```sql
CREATE TABLE user_courses (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    skill_id        VARCHAR(64) NOT NULL,
    skill_name      VARCHAR(255) NOT NULL,
    plan_json       JSONB NOT NULL,
    days_done       JSONB DEFAULT '[]'::jsonb,
    start_date      TIMESTAMP NOT NULL,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);
```

### НОВАЯ таблица `cached_skill_plans` (базовые планы)

```sql
CREATE TABLE cached_skill_plans (
    skill_id        VARCHAR(64) PRIMARY KEY,
    plan_json       JSONB NOT NULL,
    generated_at    TIMESTAMP DEFAULT NOW(),
    version         INTEGER DEFAULT 1
);
```

Идея: для каждого предопределённого `skill_id` (`confidence`, `discipline`, `speech_influence` и т.д.) генерируется ОДИН базовый план без привязки к профилю и кэшируется. Все пользователи получают этот план мгновенно. Кто хочет — нажимает «Персонализировать» и получает свой персональный.

### НОВАЯ таблица `daily_checkins` (для боевого режима)

```sql
CREATE TABLE daily_checkins (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    skill_id        VARCHAR(64) NOT NULL,
    day_num         INTEGER NOT NULL,
    checkin_type    VARCHAR(16) NOT NULL,     -- 'morning'|'midday'|'evening'|'weekly'
    user_response   TEXT,                     -- ответ пользователя на чек-ин
    ai_analysis     TEXT,                     -- разбор от AI
    sentiment       VARCHAR(16),              -- 'positive'|'neutral'|'struggling'|'avoiding'
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkins_user_skill ON daily_checkins(user_id, skill_id, day_num);
```

### Таблицы линковки (без изменений)

```sql
CREATE TABLE telegram_links (
    user_id BIGINT PRIMARY KEY, chat_id BIGINT NOT NULL, username VARCHAR(255), linked_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE max_links (
    user_id BIGINT PRIMARY KEY, chat_id VARCHAR(64) NOT NULL, linked_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API эндпоинты

### 3.1 `GET /api/base-plan/{skill_id}` 🆕

Возвращает базовый план из кэша. Если плана нет — 404, фронт сделает fallback на AI.

**Ответ 200:**
```json
{
  "skill_id": "speech_influence",
  "plan": {
    "weeks": [
      { "theme": "Базовые языковые паттерны", "exercises": [
        { "day": 1, "task": "...", "dur": "5 мин", "inst": "..." },
        ...
      ]},
      ...
    ]
  },
  "version": 1
}
```

**Ответ 404:** `{ "error": "not_cached" }`

**Логика:**
- Если в кэше план есть — отдаём.
- Если нет — backend сам генерирует через DeepSeek (без `profile`-блока в промпте) и сохраняет в `cached_skill_plans`. Следующий запрос — мгновенно.
- Альтернатива: пред-сгенерить все 19 базовых планов скриптом один раз при деплое (рекомендуется).

### 3.2 `POST /api/notification-settings`

Без изменений в формате запроса, но добавлены поля `active` и `personalized`:

```json
{
  "user_id":      1775006346315,
  "skill_id":     "speech_influence",
  "skill_name":   "Речевое воздействие",
  "channel":      "telegram",
  "notify_time":  "09:00",
  "start_date":   "2026-05-03T10:38:30Z",
  "active":       false,
  "personalized": false
}
```

### 3.3 `GET /api/notification-settings/{user_id}`

Ответ 200 (с расширением):
```json
{
  "channel": "telegram", "notify_time": "09:00",
  "skill_id": "speech_influence", "skill_name": "Речевое воздействие",
  "start_date": "2026-05-03T10:38:30Z",
  "paused": false, "active": false, "personalized": false
}
```

### 3.4 `POST /api/notification-settings/{user_id}/activate` 🆕

Включить или выключить боевой режим.

**Запрос:**
```json
{ "active": true, "skill_id": "speech_influence" }
```

**Ответ 200:** `{ "success": true, "active": true }`

**Логика:**
- Обновить `active_mode` в `notification_settings`.
- Если активирован — отправить юзеру через выбранный канал приветственное сообщение «Боевой режим включён. Завтра в 08:00 — первое задание».

### 3.5 Прочие (без изменений)

- `POST /api/notification-settings/{user_id}/pause` — пауза.
- `POST /api/notification-settings/{user_id}/resume` — снять паузу.
- `DELETE /api/notification-settings/{user_id}` — сброс.

---

## 4. Telegram bot (`@Nanotech_varik_bot`)

### 4.1 Deeplink-флоу (как было)

```python
@bot.message_handler(commands=['start'])
async def handle_start(message):
    parts = message.text.split()
    if len(parts) > 1 and parts[1].isdigit():
        web_user_id = int(parts[1])
        await db.execute(
            "INSERT INTO telegram_links(user_id, chat_id, username) VALUES($1,$2,$3) "
            "ON CONFLICT(user_id) DO UPDATE SET chat_id=$2, username=$3, linked_at=NOW()",
            web_user_id, message.chat.id, message.from_user.username
        )
        await bot.reply_to(message, "✅ Связали с веб-версией Фреди. Буду присылать сюда задания дня.")
```

### 4.2 Conversation state machine для боевого режима 🆕

Когда юзер отвечает на дневной/вечерний чек-ин в Telegram, бот должен:
1. Найти, к какому чек-ину относится ответ (по последнему отправленному `daily_checkins` без `user_response`).
2. Сохранить `user_response`.
3. Прогнать через AI: классифицировать sentiment + сгенерировать короткий разбор.
4. Записать `ai_analysis` и `sentiment`.
5. Ответить юзеру разбором.
6. Если `sentiment='struggling'` 3 дня подряд — предложить паузу или упрощение.

```python
@bot.message_handler(content_types=['text'])
async def handle_checkin_response(message):
    # Найти открытый чек-ин (отправлен, но не отвечен)
    pending = await db.fetchrow(
        "SELECT * FROM daily_checkins WHERE user_id=(SELECT user_id FROM telegram_links WHERE chat_id=$1) "
        "AND user_response IS NULL ORDER BY created_at DESC LIMIT 1",
        message.chat.id
    )
    if not pending: return  # обычное сообщение, не чек-ин

    # AI-разбор
    analysis_prompt = f"""Пользователь ответил на чек-ин '{pending['checkin_type']}' для навыка '{pending['skill_id']}', день {pending['day_num']}.
Ответ: {message.text}
Дай: 1) sentiment (positive/neutral/struggling/avoiding), 2) короткий разбор 2-3 предложения."""
    ai_result = await deepseek_generate(analysis_prompt)
    sentiment, analysis = parse_ai_result(ai_result)

    await db.execute(
        "UPDATE daily_checkins SET user_response=$1, ai_analysis=$2, sentiment=$3 WHERE id=$4",
        message.text, analysis, sentiment, pending['id']
    )
    await bot.reply_to(message, analysis)
```

---

## 5. MAX bot

Логика идентична Telegram. Особенность — нет стабильного `?start=USER_ID`, поэтому MVP можно запустить на Telegram-only, а MAX добавить позже.

---

## 6. Web push & Email

Без изменений из v2.3-spec — отправка задания дня по тому же шаблону, что и в Telegram, через push или email-провайдера.

В боевом режиме через web push отправляются только утреннее задание + воскресный разбор (push-уведомления плохо подходят для длинных текстовых ответов). Полные диалоги — только Telegram/MAX.

---

## 7. Cron job 🆕 (расширен под боевой режим)

```python
import asyncio
from datetime import datetime, timezone, timedelta

async def cron_loop():
    while True:
        now = datetime.now(timezone.utc)
        await tick_passive(now)
        await tick_combat(now)
        await asyncio.sleep(60)

async def tick_passive(now):
    """Раньше: 1 утреннее сообщение в notify_time. Без изменений."""
    time_str = now.strftime('%H:%M')
    rows = await db.fetch("""
        SELECT user_id, channel, skill_id, start_date, last_sent_day FROM notification_settings
        WHERE notify_time=$1 AND (paused=false OR paused_until<NOW())
              AND active_mode=false
    """, time_str)
    for row in rows:
        await send_morning_task(row, now)

async def tick_combat(now):
    """Боевой режим: 4 точки касания в день."""
    settings = await db.fetch("""
        SELECT * FROM notification_settings
        WHERE active_mode=true AND (paused=false OR paused_until<NOW())
    """)
    today = now.date()
    weekday = now.weekday()  # 0=Monday, 6=Sunday

    for s in settings:
        day = (now.date() - s['start_date'].date()).days + 1
        if day < 1 or day > 21: continue

        h = now.hour

        # 08:00 — утреннее задание (или индивидуальное notify_time)
        morning_h = int(s['notify_time'].split(':')[0])
        if h == morning_h and s['last_morning'] != today:
            await send_morning_combat(s, day, today)

        # 13:00 — дневной чек-ин (только если утром было задание)
        if h == 13 and s['last_morning'] == today and s['last_midday'] != today:
            await send_midday_checkin(s, day, today)

        # 20:00 — вечерняя рефлексия
        if h == 20 and s['last_morning'] == today and s['last_evening'] != today:
            await send_evening_reflection(s, day, today)

        # ВС 20:30 — недельный разбор
        if weekday == 6 and h == 20 and now.minute >= 30 and s['last_weekly'] != today:
            await send_weekly_review(s, day, today)
```

### 7.1 `send_morning_combat(s, day, today)`

```python
async def send_morning_combat(s, day, today):
    course = await db.fetchrow("SELECT plan_json FROM user_courses WHERE user_id=$1 AND skill_id=$2",
                                s['user_id'], s['skill_id'])
    ex = find_exercise_by_day(course['plan_json'], day)
    text = (
        f"🌅 Доброе утро! День {day} из 21.\n\n"
        f"⚡ <b>{ex['task']}</b>\n"
        f"⏱ {ex['dur']}\n\n"
        f"{ex['inst']}\n\n"
        f"Запиши себе в календарь окно для практики. Днём я спрошу, как идёт."
    )
    await send_via_channel(s, text, attach_audio=True)
    await db.execute(
        "INSERT INTO daily_checkins(user_id, skill_id, day_num, checkin_type) VALUES($1,$2,$3,'morning')",
        s['user_id'], s['skill_id'], day
    )
    await db.execute("UPDATE notification_settings SET last_morning=$1 WHERE user_id=$2", today, s['user_id'])
```

### 7.2 `send_midday_checkin(s, day, today)`

```python
async def send_midday_checkin(s, day, today):
    text = (
        f"🌤 Привет! Как идёт сегодняшняя практика?\n\n"
        f"Ответь одним сообщением: получилось начать? Что заметил? Если не успел — что мешает?"
    )
    await send_via_channel(s, text)
    await db.execute(
        "INSERT INTO daily_checkins(user_id, skill_id, day_num, checkin_type) VALUES($1,$2,$3,'midday')",
        s['user_id'], s['skill_id'], day
    )
    await db.execute("UPDATE notification_settings SET last_midday=$1 WHERE user_id=$2", today, s['user_id'])
```

### 7.3 `send_evening_reflection(s, day, today)`

```python
async def send_evening_reflection(s, day, today):
    text = (
        f"🌙 День близится к концу. Давай зафиксируем опыт.\n\n"
        f"Опиши одну ситуацию из сегодняшнего дня, в которой получилось применить то, что мы тренировали. "
        f"Если не получилось — опиши тот момент, где была возможность, но ты её не использовал. Это важнее, чем кажется."
    )
    await send_via_channel(s, text)
    await db.execute(
        "INSERT INTO daily_checkins(user_id, skill_id, day_num, checkin_type) VALUES($1,$2,$3,'evening')",
        s['user_id'], s['skill_id'], day
    )
    await db.execute("UPDATE notification_settings SET last_evening=$1 WHERE user_id=$2", today, s['user_id'])
```

### 7.4 `send_weekly_review(s, day, today)`

```python
async def send_weekly_review(s, day, today):
    # Собрать все evening reflections за неделю
    week_start = today - timedelta(days=6)
    checkins = await db.fetch("""
        SELECT day_num, user_response, sentiment FROM daily_checkins
        WHERE user_id=$1 AND skill_id=$2 AND checkin_type='evening' AND created_at>=$3
        ORDER BY day_num
    """, s['user_id'], s['skill_id'], week_start)

    review_prompt = f"""Пользователь прошёл неделю в курсе '{s['skill_name']}'. Вот его рефлексии:
{chr(10).join(f"День {c['day_num']}: {c['user_response']} ({c['sentiment']})" for c in checkins)}

Сделай:
1) Что у пользователя получилось лучше всего за неделю
2) Где есть зона роста
3) Один конкретный фокус на следующую неделю"""
    review = await deepseek_generate(review_prompt)

    text = f"📊 Разбор недели по навыку <b>{s['skill_name']}</b>\n\n{review}"
    await send_via_channel(s, text)
    await db.execute(
        "INSERT INTO daily_checkins(user_id, skill_id, day_num, checkin_type, ai_analysis) VALUES($1,$2,$3,'weekly',$4)",
        s['user_id'], s['skill_id'], day, review
    )
    await db.execute("UPDATE notification_settings SET last_weekly=$1 WHERE user_id=$2", today, s['user_id'])
```

---

## 8. Адаптивный план (опционально, после MVP)

Если в `daily_checkins` за последние 3 дня `sentiment='struggling'` — упростить план:
- Утром: вместо нового упражнения — закрепляющее старое.
- Текст более поддерживающий.

Если 3 дня `sentiment='positive'` и нет пропусков — повысить сложность:
- Добавить в задание дня бонус-челлендж.

```python
async def adapt_difficulty(user_id, skill_id, day):
    last3 = await db.fetch("""
        SELECT sentiment FROM daily_checkins
        WHERE user_id=$1 AND skill_id=$2 AND checkin_type='evening'
        ORDER BY created_at DESC LIMIT 3
    """, user_id, skill_id)
    sentiments = [r['sentiment'] for r in last3]
    if sentiments.count('struggling') >= 2: return 'easier'
    if sentiments.count('positive')   >= 3: return 'harder'
    return 'normal'
```

---

## 9. Контент-стратегия 21-дневной программы

Рекомендации:
1. **Базовый план в кэше** для всех 19 предопределённых навыков — генерируется один раз при деплое скриптом, кладётся в `cached_skill_plans`.
2. **Персонализация** доступна по нажатию кнопки на фронте — backend получает `user_id`, читает профиль 4×6, генерит план через `/api/ai/generate` с promptом, учитывающим векторы.
3. **Custom-навыки** — всегда генерируются на лету, не кэшируются.

---

## 10. Тестовый чек-лист после деплоя

- [ ] `GET /api/base-plan/confidence` возвращает план из кэша или генерит и кэширует.
- [ ] `POST /api/notification-settings` принимает поле `active`.
- [ ] `POST /api/notification-settings/{id}/activate` переключает флаг.
- [ ] Telegram-бот при `/start {user_id}` записывает в `telegram_links`.
- [ ] Cron в активном режиме шлёт 4 сообщения в день.
- [ ] Бот сохраняет ответы пользователя в `daily_checkins`.
- [ ] AI разбирает sentiment и пишет analysis.
- [ ] Воскресный разбор приходит в 20:30.
- [ ] При выключении боевого режима — рассылка возвращается к 1 утреннему сообщению.

---

## 11. Что фронтенд уже делает

- При выборе навыка → клик «Показать план» → `GET /api/base-plan/{skill_id}` → если 200, открывает мгновенно. Если 404 → AI fallback (текущий путь).
- При нажатии «Персонализировать» → `POST /api/ai/generate` с профилем → план обновляется, флаг `personalized=true`.
- При нажатии «Активировать боевой режим» → confirmation modal → `POST /api/notification-settings/{id}/activate {active:true}`.
- При выключении боевого режима → `POST .../activate {active:false}`.
- Подтягивает настройки `GET /api/notification-settings/{user_id}` при загрузке (graceful).
- Открывает deeplink `t.me/Nanotech_varik_bot?start={user_id}`.
- Сохраняет всё локально в `localStorage` как fallback.

Frontend готов работать с бэкендом, как только эндпоинты будут реализованы. Никаких изменений на фронте после релиза бэкенда не потребуется.

---

**Контакт:** Андрей Мейстер · meysternlp@yandex.ru · t.me/meysternlp
