// ============================================
// skill_choice_v25_patch.js
// Накатывается ПОСЛЕ skill_choice.js (v2.4) и переключает поведение на v2.5:
//   • «Показать план» — открывается мгновенно из захардкоренного шаблона
//     (или из бэкенд-кэша, если он есть). AI больше не вызывается на этом шаге.
//   • _scGeneratePlan (используется только при «Персонализировать»):
//       - max_tokens: 2000 → 4000 (для 21 упражнения)
//       - вместо JSON.parse — _scTryParseJSON, который ремонтирует обрезанный JSON
//   • Сам v2.4-файл не трогаем — патч безопасно отключается удалением <script>.
// ============================================
(function () {
    'use strict';

    if (typeof _scLoadBasePlan !== 'function' || typeof _scRender !== 'function') {
        console.warn('[skill_choice v2.5 patch] базовый skill_choice.js не загружен — пропускаю патч');
        return;
    }

    // --- 1. JSON repair: чинит обрезанный AI-ответ ---
    window._scTryParseJSON = function (text) {
        try { return JSON.parse(text); } catch (e) {}
        var fixed = String(text).trim();
        if ((fixed.match(/"/g) || []).length % 2 !== 0) fixed += '"';
        var opens   = (fixed.match(/\{/g) || []).length,
            closes  = (fixed.match(/\}/g) || []).length,
            opensA  = (fixed.match(/\[/g) || []).length,
            closesA = (fixed.match(/\]/g) || []).length;
        while (closesA < opensA) { fixed += ']'; closesA++; }
        while (closes  < opens)  { fixed += '}'; closes++;  }
        try { return JSON.parse(fixed); } catch (e) { return null; }
    };

    // --- 2. Локальный шаблон 21-дневного плана (мгновенный) ---
    window.DEFAULT_TEMPLATE_PLAN = {
        weeks: [
            {
                theme: 'Знакомство и калибровка',
                exercises: [
                    { day:1, task:'Зачем вам этот навык',     dur:'5 мин',  inst:'Запишите 3 конкретные ситуации, где этот навык изменил бы исход.' },
                    { day:2, task:'Замечание',                 dur:'10 мин', inst:'В течение дня замечайте моменты, где навык бы понадобился. Записывайте 1–3 ситуации без оценки.' },
                    { day:3, task:'Триггеры',                  dur:'7 мин',  inst:'Какие 3 ситуации запускают вашу старую реакцию? Конкретно: место, человек, время, ваша мысль.' },
                    { day:4, task:'Микро-эксперимент',         dur:'15 мин', inst:'В одной безопасной ситуации попробуйте действовать по-новому. Зафиксируйте, что произошло.' },
                    { day:5, task:'Рефлексия',                 dur:'5 мин',  inst:'Что было неудобно вчера? Назовите чувство одним словом — это точка роста.' },
                    { day:6, task:'Повтор с поправкой',        dur:'15 мин', inst:'Похожая ситуация, что и в день 4 — но с поправкой на вчерашнюю рефлексию.' },
                    { day:7, task:'Итог недели',               dur:'10 мин', inst:'Один главный инсайт за неделю. На сколько процентов продвинулись?' }
                ]
            },
            {
                theme: 'Активная тренировка',
                exercises: [
                    { day:8,  task:'Усложнение',           dur:'15 мин', inst:'Та же техника, но в более сложной ситуации. Где раньше избегали.' },
                    { day:9,  task:'Постановка якоря',     dur:'7 мин',  inst:'Когда сегодня получится — запомните телесное состояние и сожмите большой и указательный пальцы на 5 секунд.' },
                    { day:10, task:'Препятствие',          dur:'10 мин', inst:'Что в окружении мешает практике? Один конкретный фактор и один шаг по его устранению.' },
                    { day:11, task:'Поддержка',            dur:'5 мин',  inst:'Расскажите близкому, что проходите 21 день навыка. Попросите не оценивать прогресс.' },
                    { day:12, task:'Худший момент',        dur:'10 мин', inst:'Что было самым трудным? Опишите 3 предложениями. Что бы посоветовали другу?' },
                    { day:13, task:'Маленькая победа',     dur:'15 мин', inst:'Найдите ситуацию, где точно получится. Зафиксируйте успех — текстом, голосом, в дневнике.' },
                    { day:14, task:'Полу-итог',            dur:'10 мин', inst:'На сколько процентов продвинулись? Что главное изменилось? Что осталось на третью неделю?' }
                ]
            },
            {
                theme: 'Закрепление и интеграция',
                exercises: [
                    { day:15, task:'Естественная среда',  dur:'12 мин', inst:'Применяйте навык без специальных условий — в обычном дне.' },
                    { day:16, task:'Без напоминаний',     dur:'10 мин', inst:'Сделайте без подсказки. К вечеру отметьте, удалось ли.' },
                    { day:17, task:'Перенос',             dur:'15 мин', inst:'Новая ситуация, где раньше не пробовали. Что переносится, что нет?' },
                    { day:18, task:'Глубже',              dur:'15 мин', inst:'Усложните: больше людей, выше ставки, дольше время.' },
                    { day:19, task:'Помощь другому',      dur:'10 мин', inst:'Объясните принцип кому-то ещё в 2–3 предложениях. Это закрепляет понимание.' },
                    { day:20, task:'Письмо себе',         dur:'15 мин', inst:'Напишите себе через год — что хотите помнить из этого 21 дня.' },
                    { day:21, task:'Итог цикла',          dur:'15 мин', inst:'Сравните: где были в день 1 и где сегодня. Что точно изменилось? Что дальше?' }
                ]
            }
        ]
    };

    window._scLocalPlan = function () {
        return JSON.parse(JSON.stringify(window.DEFAULT_TEMPLATE_PLAN));
    };

    // --- 3. Override: «Показать план» открывается мгновенно, без AI ---
    window._scShowPlanScenario = async function () {
        if (!_sc.skillId || !_sc.skillName) { _scToast('Выберите навык', 'error'); return; }

        // Хардкор: пытаемся подтянуть из кэша бэкенда — если нет, мгновенно даём локальный шаблон.
        // AI используется ТОЛЬКО при нажатии «Персонализировать», а не при «Показать план».
        var plan = await _scLoadBasePlan(_sc.skillId);
        if (!plan) plan = window._scLocalPlan();

        _sc.plan           = plan;
        _sc.daysDone       = [];
        _sc.startDate      = new Date().toISOString();
        _sc.isPersonalized = false;
        if (!_sc.channel)    _sc.channel    = 'telegram';
        if (!_sc.notifyTime) _sc.notifyTime = '09:00';
        _scSave();
        _sc.view = 'channel';
        _scRender();
    };

    // --- 4. Override: _scGeneratePlan с увеличенным max_tokens и JSON repair ---
    //     (используется в _scPersonalizeScenario — путь «Персонализировать»)
    window._scGeneratePlan = async function (skillName, skillDesc, profile) {
        var v = profile.vectors;
        var prompt = 'Ты — Фреди, психолог-тренер. Создай персональный 21-дневный план развития навыка.\n\n' +
            'Пользователь: ' + (typeof _scName === 'function' ? _scName() : 'друг') + '\n' +
            'Навык: "' + skillName + '" — ' + skillDesc + '\n' +
            'Психологический профиль: СБ-' + v.СБ + ' ТФ-' + v.ТФ + ' УБ-' + v.УБ + ' ЧВ-' + v.ЧВ + '\n' +
            'Уровень мышления: ' + profile.level + '/9\n\n' +
            'Требования:\n' +
            '— 21 упражнение (по одному на день), разбить на 3 недели\n' +
            '— Каждая неделя — своя тема (нарастающая сложность)\n' +
            '— Упражнения конкретные: что делать, как долго, как именно\n' +
            '— Учитывай профиль: для СБ — больше безопасности и опоры, для ТФ — результаты и цифры, для УБ — смыслы и системность, для ЧВ — отношения и эмоции\n' +
            '— Каждое упражнение: 1-15 минут, выполнимо в обычный день\n\n' +
            'Верни только JSON:\n' +
            '{"weeks":[{"theme":"...","exercises":[{"day":1,"task":"...","dur":"...","inst":"..."},...7...]},...3...]}';

        try {
            var r = await fetch(_scApi() + '/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: _scUid(), platform: 'web', prompt: prompt, max_tokens: 4000 })
            });
            var d = await r.json();
            if (d.success && d.content) {
                var clean = d.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                var parsed = window._scTryParseJSON(clean);
                if (!parsed) return null;
                var dayNum = 0;
                parsed.weeks.forEach(function (w) {
                    w.exercises.forEach(function (ex) { dayNum++; ex.day = dayNum; });
                });
                return parsed;
            }
        } catch (e) { console.error('Plan generation error:', e); }
        return null;
    };

    console.log('✅ skill_choice v2.5 patch применён (мгновенный план + JSON repair, max_tokens 4000)');
})();
