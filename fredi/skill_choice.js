// ============================================
// skill_choice.js — v2.4 — Боевой режим + Кэш базового плана + Персонализация
// ============================================

function _scInjectStyles() {
    if (document.getElementById('sc-v2-styles')) return;
    const s = document.createElement('style');
    s.id = 'sc-v2-styles';
    s.textContent = `
        .sc-skill-card { background: rgba(224,224,224,0.04); border: 1px solid rgba(224,224,224,0.1); border-radius: 16px; padding: 14px; margin-bottom: 8px; cursor: pointer; transition: background 0.18s, border-color 0.18s, transform 0.12s; display: flex; align-items: center; gap: 12px; touch-action: manipulation; }
        .sc-skill-card:hover  { background: rgba(224,224,224,0.09); border-color: rgba(224,224,224,0.22); }
        .sc-skill-card:active { transform: scale(0.98); }
        .sc-skill-card.active { background: rgba(224,224,224,0.15); border-color: rgba(224,224,224,0.38); }
        .sc-skill-body  { flex: 1; min-width: 0; }
        .sc-skill-name  { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px; display: flex; align-items: center; gap: 6px; }
        .sc-skill-new   { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; background: rgba(255,107,53,0.15); color: #FF8B5C; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }
        .sc-skill-sub   { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
        .sc-skill-arrow { font-size: 16px; color: var(--text-secondary); flex-shrink: 0; opacity: 0.5; }
        .sc-skill-card:hover .sc-skill-arrow { opacity: 1; color: var(--chrome,#3A86FF); }
        .sc-skill-score { font-size: 11px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0; background: rgba(224,224,224,0.08); border: 1px solid rgba(224,224,224,0.14); border-radius: 20px; padding: 3px 9px; }
        .sc-skill-bar-wrap { height: 3px; background: rgba(224,224,224,0.1); border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .sc-skill-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--silver-brushed), var(--chrome)); }

        .sc-input { width: 100%; background: rgba(224,224,224,0.07); border: 1px solid rgba(224,224,224,0.18); border-radius: 14px; padding: 12px 14px; color: var(--text-primary); font-family: inherit; font-size: 14px; outline: none; box-sizing: border-box; -webkit-appearance: none; }
        .sc-input:focus { border-color: rgba(224,224,224,0.35); }
        .sc-input::placeholder { color: var(--text-secondary); }

        .sc-btn { padding: 11px 20px; border-radius: 30px; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; transition: background 0.2s, transform 0.15s; min-height: 42px; touch-action: manipulation; outline: none; }
        .sc-btn:active { transform: scale(0.97); }
        .sc-btn-primary { background: linear-gradient(135deg, rgba(224,224,224,0.2), rgba(192,192,192,0.1)); border: 1px solid rgba(224,224,224,0.3); color: var(--text-primary); width: 100%; border-radius: 40px; padding: 13px; }
        .sc-btn-primary:hover { background: linear-gradient(135deg, rgba(224,224,224,0.28), rgba(192,192,192,0.16)); }
        .sc-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
        .sc-btn-ghost { background: rgba(224,224,224,0.05); border: 1px solid rgba(224,224,224,0.14); color: var(--text-secondary); }
        .sc-btn-ghost:hover { background: rgba(224,224,224,0.1); color: var(--text-primary); }
        .sc-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .sc-btn-combat {
            background: linear-gradient(135deg, #FF6B35, #FF8B5C);
            border: none; color: white; width: 100%;
            border-radius: 40px; padding: 14px; font-weight: 600; font-size: 14px;
            box-shadow: 0 4px 16px rgba(255,107,53,0.25);
        }
        .sc-btn-combat:hover { background: linear-gradient(135deg, #FF8B5C, #FF6B35); box-shadow: 0 6px 20px rgba(255,107,53,0.35); transform: translateY(-1px); }

        .sc-section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 10px; margin-top: 18px; }
        .sc-custom-block { background: rgba(224,224,224,0.03); border: 1px solid rgba(224,224,224,0.1); border-radius: 16px; padding: 14px; margin-top: 8px; }
        .sc-custom-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }

        /* ОПИСАНИЕ */
        .sc-detail-hero { background: linear-gradient(135deg, rgba(58,134,255,0.10), rgba(99,102,241,0.04)); border: 1px solid rgba(58,134,255,0.25); border-radius: 20px; padding: 22px 22px 20px; margin-bottom: 16px; }
        .sc-detail-cat { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--chrome,#3A86FF); margin-bottom: 10px; }
        .sc-detail-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; line-height: 1.25; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .sc-detail-tag-new { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; background: rgba(255,107,53,0.18); color: #FF8B5C; padding: 3px 8px; border-radius: 8px; text-transform: uppercase; }
        .sc-detail-short { font-size: 13px; color: var(--text-secondary); line-height: 1.55; margin-bottom: 0; }

        .sc-detail-section { background: rgba(224,224,224,0.04); border: 1px solid rgba(224,224,224,0.1); border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .sc-detail-h { font-size: 12px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 10px; }
        .sc-detail-p { font-size: 13px; color: var(--text-primary); line-height: 1.6; margin: 0; }

        .sc-detail-outcomes { list-style: none; padding: 0; margin: 0; }
        .sc-detail-outcomes li { font-size: 13px; color: var(--text-primary); line-height: 1.55; padding: 8px 0 8px 22px; position: relative; border-bottom: 1px solid rgba(224,224,224,0.06); }
        .sc-detail-outcomes li:last-child { border-bottom: none; }
        .sc-detail-outcomes li::before { content: '✓'; position: absolute; left: 0; top: 8px; color: #5EE0A8; font-weight: 700; font-size: 13px; }

        .sc-week-preview { display: grid; grid-template-columns: 1fr; gap: 8px; }
        .sc-week-preview-row { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; background: rgba(224,224,224,0.04); border-radius: 12px; border-left: 3px solid rgba(58,134,255,0.4); }
        .sc-week-preview-num { font-size: 11px; font-weight: 700; color: var(--chrome,#3A86FF); min-width: 60px; letter-spacing: 0.4px; }
        .sc-week-preview-text { font-size: 12.5px; color: var(--text-primary); line-height: 1.45; flex: 1; }

        .sc-detail-format { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
        .sc-detail-format-item { background: rgba(224,224,224,0.04); border: 1px solid rgba(224,224,224,0.1); border-radius: 12px; padding: 10px; text-align: center; }
        .sc-detail-format-icon { font-size: 18px; margin-bottom: 4px; }
        .sc-detail-format-text { font-size: 10px; color: var(--text-secondary); line-height: 1.3; }
        .sc-detail-format-text strong { color: var(--text-primary); display: block; font-size: 11px; }

        /* ПЛАН */
        .sc-plan-header { background: linear-gradient(135deg, rgba(224,224,224,0.08), rgba(192,192,192,0.02)); border: 1px solid rgba(224,224,224,0.18); border-radius: 18px; padding: 16px 18px; margin-bottom: 14px; }
        .sc-plan-skill { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .sc-plan-streak { font-size: 11px; font-weight: 600; background: rgba(255,107,53,0.15); color: #FF8B5C; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.2px; }
        .sc-plan-meta  { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
        .sc-plan-progress { height: 4px; background: rgba(224,224,224,0.1); border-radius: 2px; margin-top: 10px; overflow: hidden; }
        .sc-plan-progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--silver-brushed), var(--chrome)); transition: width 0.4s; }
        .sc-plan-channel { font-size: 11px; color: var(--text-secondary); margin-top: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .sc-plan-channel strong { color: var(--text-primary); font-weight: 600; }
        .sc-plan-channel a { color: var(--chrome); text-decoration: none; cursor: pointer; }
        .sc-plan-channel a:hover { text-decoration: underline; }

        /* БОЕВОЙ РЕЖИМ — карточка */
        .sc-combat-card {
            background: linear-gradient(135deg, rgba(255,107,53,0.10), rgba(255,139,92,0.04));
            border: 1px solid rgba(255,107,53,0.30);
            border-radius: 18px;
            padding: 18px;
            margin-bottom: 14px;
        }
        .sc-combat-card.on {
            background: linear-gradient(135deg, rgba(61,220,151,0.10), rgba(61,220,151,0.03));
            border-color: rgba(61,220,151,0.4);
        }
        .sc-combat-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
        .sc-combat-status { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 8px; letter-spacing: 0.4px; text-transform: uppercase; }
        .sc-combat-status.off { background: rgba(255,107,53,0.18); color: #FF8B5C; }
        .sc-combat-status.on  { background: rgba(61,220,151,0.18); color: #5EE0A8; }
        .sc-combat-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.55; margin: 0 0 14px; }
        .sc-combat-touchpoints { display: grid; grid-template-columns: repeat(2,1fr); gap: 6px; margin-bottom: 12px; }
        .sc-combat-tp { font-size: 11px; color: var(--text-primary); display: flex; align-items: center; gap: 6px; padding: 6px 0; }
        .sc-combat-tp-time { font-weight: 700; color: var(--chrome,#3A86FF); font-size: 10px; min-width: 36px; }
        @media (max-width: 480px) { .sc-combat-touchpoints { grid-template-columns: 1fr; } }

        /* Персонализация — карточка */
        .sc-personalize-card {
            background: rgba(58,134,255,0.06);
            border: 1px solid rgba(58,134,255,0.25);
            border-radius: 16px;
            padding: 14px 16px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .sc-personalize-card-body { flex: 1; min-width: 0; }
        .sc-personalize-card-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 3px; }
        .sc-personalize-card-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
        .sc-personalize-btn {
            flex-shrink: 0;
            padding: 9px 16px;
            border-radius: 24px;
            background: rgba(58,134,255,0.15);
            border: 1px solid rgba(58,134,255,0.4);
            color: var(--chrome,#3A86FF);
            font-size: 12px; font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.18s;
        }
        .sc-personalize-btn:hover { background: rgba(58,134,255,0.25); }

        .sc-week { margin-bottom: 20px; }
        .sc-week-label { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px; }
        .sc-week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .sc-day { aspect-ratio: 1; border-radius: 8px; background: rgba(224,224,224,0.05); border: 1px solid rgba(224,224,224,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; transition: background 0.15s; touch-action: manipulation; min-height: 38px; }
        .sc-day:hover   { background: rgba(224,224,224,0.1); }
        .sc-day.current { border-color: rgba(224,224,224,0.4); background: rgba(224,224,224,0.14); }
        .sc-day.done    { background: rgba(224,224,224,0.12); border-color: rgba(224,224,224,0.25); }
        .sc-day-num     { font-size: 10px; font-weight: 700; color: var(--text-secondary); }
        .sc-day-dot     { width: 5px; height: 5px; border-radius: 50%; background: rgba(224,224,224,0.15); }
        .sc-day.done .sc-day-dot, .sc-day.current .sc-day-dot { background: var(--chrome); }

        .sc-today-card { background: rgba(224,224,224,0.04); border: 1px solid rgba(224,224,224,0.12); border-radius: 16px; padding: 16px; margin-bottom: 14px; }
        .sc-today-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .sc-today-num { width: 28px; height: 28px; border-radius: 50%; background: rgba(224,224,224,0.12); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--chrome); flex-shrink: 0; }
        .sc-today-task { font-size: 14px; font-weight: 600; color: var(--text-primary); flex: 1; line-height: 1.4; }
        .sc-today-dur  { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
        .sc-today-inst { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }

        .sc-generating { text-align: center; padding: 40px 20px; }
        .sc-generating-icon { font-size: 48px; display: block; margin-bottom: 14px; animation: sc-pulse 1.5s ease-in-out infinite; }
        @keyframes sc-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        .sc-generating-text { font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
        .sc-generating-sub  { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

        .sc-tip { background: rgba(224,224,224,0.03); border: 1px solid rgba(224,224,224,0.08); border-radius: 14px; padding: 12px 14px; font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-top: 14px; }
        .sc-tip strong { color: var(--chrome); }

        /* КАНАЛЫ */
        .sc-channel-intro { background: linear-gradient(135deg, rgba(224,224,224,0.08), rgba(192,192,192,0.02)); border: 1px solid rgba(224,224,224,0.18); border-radius: 18px; padding: 16px 18px; margin-bottom: 18px; }
        .sc-channel-intro-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
        .sc-channel-intro-text  { font-size: 12px; color: var(--text-secondary); line-height: 1.55; }
        .sc-channel-card { background: rgba(224,224,224,0.04); border: 1px solid rgba(224,224,224,0.12); border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.18s, border-color 0.18s, transform 0.12s; touch-action: manipulation; }
        .sc-channel-card:hover  { background: rgba(224,224,224,0.09); border-color: rgba(224,224,224,0.24); }
        .sc-channel-card:active { transform: scale(0.985); }
        .sc-channel-card.active { background: rgba(58,134,255,0.10); border-color: rgba(58,134,255,0.45); }
        .sc-channel-icon { font-size: 26px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: rgba(224,224,224,0.06); flex-shrink: 0; }
        .sc-channel-body { flex: 1; min-width: 0; }
        .sc-channel-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sc-channel-tag-recommended { font-size: 9px; font-weight: 700; letter-spacing: 0.4px; background: rgba(61,220,151,0.18); color: #5EE0A8; padding: 2px 7px; border-radius: 8px; text-transform: uppercase; }
        .sc-channel-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
        .sc-channel-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(224,224,224,0.3); flex-shrink: 0; position: relative; transition: border-color 0.18s; }
        .sc-channel-card.active .sc-channel-radio { border-color: var(--chrome,#3A86FF); }
        .sc-channel-card.active .sc-channel-radio::after { content: ''; position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; border-radius: 50%; background: var(--chrome,#3A86FF); }

        .sc-time-block { background: rgba(224,224,224,0.03); border: 1px solid rgba(224,224,224,0.1); border-radius: 16px; padding: 14px; margin-top: 16px; }
        .sc-time-label { font-size: 12px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
        .sc-time-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .sc-time-btn { padding: 9px 8px; background: rgba(224,224,224,0.05); border: 1px solid rgba(224,224,224,0.12); border-radius: 10px; color: var(--text-secondary); font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.15s, border-color 0.15s; font-family: inherit; }
        .sc-time-btn:hover { background: rgba(224,224,224,0.1); }
        .sc-time-btn.active { background: rgba(58,134,255,0.12); border-color: rgba(58,134,255,0.4); color: var(--text-primary); font-weight: 600; }

        @media (max-width: 480px) {
            .sc-skill-name { font-size: 13px; }
            .sc-today-task { font-size: 13px; }
            .sc-time-grid  { grid-template-columns: repeat(3, 1fr); }
            .sc-detail-title { font-size: 19px; }
        }
    `;
    document.head.appendChild(s);
}

// ============================================
// НАВЫКИ
// ============================================
const SC_SKILLS = {
    personal: [
        { id:'confidence', name:'Уверенность в себе', desc:'Действовать без одобрения извне, верить в свои силы',
          longDesc:'Уверенность — это не отсутствие сомнений, а способность действовать вопреки им. Это навык доверия собственному опыту и решениям, даже когда вокруг неопределённость или давление со стороны.',
          outcomes:['Замечаете моменты сомнения раньше, чем они становятся параличом','Действуете из своих ценностей, а не из страха оценки','Меньше нуждаетесь в подтверждении со стороны','Спокойнее реагируете на критику и отказы'],
          weekThemes:['Замечание сомнений и автомыслей','Действие через сомнения','Опора без внешнего подтверждения'] },
        { id:'discipline', name:'Дисциплина', desc:'Выполнять намеченное независимо от настроения',
          longDesc:'Дисциплина — это умение делать то, что решил, даже когда не хочется. Не сила воли, а система: правильные триггеры, ритуалы и среда, в которой нужное действие становится естественным.',
          outcomes:['Чёткая утренняя и вечерняя рутина','Выполнение запланированного без внутреннего торга','Меньше времени на «надо собраться»','Понимание, что вас сбивает, и как это устранить'],
          weekThemes:['Триггеры и контекст','Микро-действия каждый день','Автономная привычка'] },
        { id:'boundaries', name:'Личные границы', desc:'Говорить «нет» без чувства вины',
          longDesc:'Личные границы — это умение ясно обозначать, что для вас приемлемо, а что нет. Без агрессии и без вины. Граница — это не стена, а ориентир для других.',
          outcomes:['Говорите «нет» без оправданий','Распознаёте манипулятивные просьбы и давление','Меньше выгораете в отношениях и на работе','Сохраняете отношения даже при чётких отказах'],
          weekThemes:['Распознавание границы','Озвучивание без вины','Удержание под давлением'] },
        { id:'emotions', name:'Эмоциональный интеллект', desc:'Распознавать и управлять своими эмоциями',
          longDesc:'Эмоциональный интеллект — навык распознавать свои эмоции в момент возникновения и направлять их, а не реагировать автоматически. Базовый уровень саморегуляции.',
          outcomes:['Различаете 30+ оттенков эмоций — а не только «плохо/нормально»','Замечаете эмоцию до того, как она возьмёт верх','Понимаете, какая мысль её вызвала','Управляете реакцией, а не реактивностью'],
          weekThemes:['Маркирование состояний','Различение оттенков','Регуляция в моменте'] },
        { id:'communication', name:'Коммуникация', desc:'Ясно и честно выражать мысли и чувства',
          longDesc:'Коммуникация — навык доносить мысли так, чтобы вас поняли, и слышать собеседника так, чтобы он чувствовал себя услышанным. База любых отношений.',
          outcomes:['Чёткие просьбы вместо намёков','Перифразирование без раздражения собеседника','Конструктивные конфликты вместо разрушительных','Уверенность в сложных разговорах'],
          weekThemes:['Чёткая просьба','Активное слушание','Сложные разговоры'] },
        { id:'resilience', name:'Стрессоустойчивость', desc:'Восстанавливаться после трудностей',
          longDesc:'Стрессоустойчивость — не отсутствие реакции на стресс, а скорость возвращения в баланс. Расширение «окна толерантности», в котором вы остаётесь функциональны.',
          outcomes:['Окно толерантности шире — меньше срывов','Быстрое восстановление после плохих новостей','Меньше соматических симптомов от напряжения','Спокойный сон даже после трудного дня'],
          weekThemes:['Окно толерантности','Техники возврата','Ежедневная гигиена'] },
        { id:'focus', name:'Фокус и концентрация', desc:'Удерживать внимание на важном',
          longDesc:'Фокус — навык удерживать внимание на одной задаче 25–90 минут без отвлечений. Базовый ресурс продуктивности и качественного мышления.',
          outcomes:['Глубокая работа без переключений на телефон','Помодоро становится привычкой, а не насилием','Меньше «прокрутки в голове» во время задач','Качество результата выше при меньшем времени'],
          weekThemes:['Удлинение интервала фокуса','Защита от отвлечений','Глубокая работа'] },
        { id:'growth', name:'Установка на рост', desc:'Воспринимать трудности как возможности',
          longDesc:'Установка на рост (mindset Кэрол Двек) — восприятие способностей как развиваемых, а не врождённых. Ошибка → информация, а не приговор.',
          outcomes:['Воспринимаете трудности как возможности учиться','Меньше избегаете задач, в которых неуверены','Спокойнее реагируете на критику и провалы','Настойчивость без выгорания'],
          weekThemes:['Замечание фиксированных мыслей','Переформулировка','Новая база отношения к ошибкам'] }
    ],
    professional: [
        { id:'planning', name:'Планирование', desc:'Ставить цели и разбивать на конкретные шаги',
          longDesc:'Планирование — навык переводить большие цели в конкретные действия. Без этого «хочу» остаётся «хочу». Метод следующего физического действия + GTD.',
          outcomes:['Большие проекты разбиты на физические действия','Понятно, что делать в первый час каждого дня','Меньше «не знаю, с чего начать»','Реалистичная оценка сроков'],
          weekThemes:['Декомпозиция целей','Следующее физическое действие','Реалистичные сроки'] },
        { id:'decision', name:'Принятие решений', desc:'Действовать при неполной информации',
          longDesc:'Принятие решений — навык действовать при неполной информации, не парализуясь поиском «идеального варианта». Различение важных и неважных решений.',
          outcomes:['Быстрые решения по неважному (без лишнего анализа)','Глубокий анализ только важных решений','Меньше «перевзвешивания» уже принятых','Готовность нести ответственность за выбор'],
          weekThemes:['Различение важности','Скорость + анализ','Решения без перевзвешивания'] },
        { id:'delegation', name:'Делегирование', desc:'Передавать задачи и доверять другим',
          longDesc:'Делегирование — навык передачи задачи и доверия результату. Не «приказ-исполнение», а партнёрство с правильной обратной связью.',
          outcomes:['Передаёте задачи целиком, а не «посоветуйся со мной»','Не вмешиваетесь в процесс, если результат идёт','Команда растёт быстрее','У вас освобождается время на стратегию'],
          weekThemes:['Постановка задачи','Доверие процессу','Развитие команды через задачи'] },
        { id:'leadership', name:'Лидерство', desc:'Вести за собой и вдохновлять людей',
          longDesc:'Лидерство — навык вести за собой через ясность смысла и внутреннюю опору. Не должность и не харизма — система поведения, которой можно научиться.',
          outcomes:['Команда понимает, куда движется и зачем','Берёте ответственность в моменты неопределённости','Конструктивная обратная связь в обе стороны','Доверие коллектива растёт без усилий'],
          weekThemes:['Ясность смысла и направления','Внутренняя опора','Доверие коллектива'] },
        { id:'timemanage', name:'Управление временем', desc:'Расставлять приоритеты и не прокрастинировать',
          longDesc:'Управление временем — навык расставлять приоритеты и не прокрастинировать. Не «успеть всё», а «успеть важное». Принцип Парето + защита фокусного времени.',
          outcomes:['Понимание, какие 20% задач дают 80% результата','Меньше прокрастинации на сложных задачах','Регулярные перерывы без чувства вины','Завершение дня без хвостов'],
          weekThemes:['Принцип Парето','Защита фокусного времени','Завершение дня'] },
        { id:'feedback', name:'Обратная связь', desc:'Давать и принимать критику конструктивно',
          longDesc:'Обратная связь — навык давать и принимать критику так, чтобы она вела к росту, а не к обиде. Сильно недооценённый, но определяющий навык в команде.',
          outcomes:['Даёте конкретную, не личностную обратную связь','Принимаете критику без защитной реакции','Просите фидбек регулярно, а не от случая к случаю','Меньше скрытых обид и недопониманий в команде'],
          weekThemes:['Конкретность критики','Принятие без защиты','Регулярные циклы фидбека'] },
        { id:'networking', name:'Нетворкинг', desc:'Строить и поддерживать профессиональные связи',
          longDesc:'Нетворкинг — навык строить и поддерживать профессиональные связи без манипуляций и социальной фальши. Принцип «дай раньше, чем попросишь».',
          outcomes:['Регулярные касания с ключевыми контактами','Полезное знакомство в неделю — норма, не подвиг','Готовый круг для запросов и рекомендаций','Меньше тревоги при обращении за помощью'],
          weekThemes:['Карта контактов','Регулярные касания','Правило «дай раньше»'] },
        { id:'creativity', name:'Креативность', desc:'Находить нестандартные решения',
          longDesc:'Креативность — навык находить нестандартные решения через комбинаторику и латеральное мышление. Тренируется, как мышца. Это не про «вдохновение».',
          outcomes:['3–5 свежих идей в день из обычных ситуаций','Привычка задавать «а что если» в разговорах','Меньше шаблонных решений','Готовность пробовать без страха ошибки'],
          weekThemes:['Латеральные ходы','Комбинаторика','Привычка вопроса «что если»'] }
    ],
    influence: [
        { id:'speech_influence', name:'Речевое воздействие', desc:'Гипнотические языковые паттерны, метафоры, риторические структуры', isNew:true,
          longDesc:'Речевое воздействие — арсенал из эриксоновского гипноза, НЛП и риторики. Метафоры, языковые паттерны, структура убеждения. Тот же навык, что у лучших спикеров и переговорщиков.',
          outcomes:['Речь, которая удерживает внимание','Метафоры под конкретные ситуации','Гипнотические языковые паттерны в обычной речи','Понимание, как речью манипулируют — для защиты'],
          weekThemes:['Базовые языковые паттерны','Метафоры под задачу','Гипнотические структуры в речи'] },
        { id:'emotion_partner', name:'Управление эмоциями собеседника', desc:'Возвращать собеседника из реактивного состояния в ресурсное', isNew:true,
          longDesc:'Не манипуляция — навык конструктивного диалога: возвращать собеседника из реактивного состояния в ресурсное, не подменяя его выбор. Нужен врачу, переговорщику, родителю, руководителю.',
          outcomes:['Калибровка состояния партнёра по микро-сигналам','Деэскалация острых конфликтов в первые 30 секунд','Возврат собеседника к диалогу из «защиты»','Параллельно — распознавание манипуляций как защитный навык'],
          weekThemes:['Калибровка по микро-сигналам','Деэскалация','Возврат к диалогу'] },
        { id:'emotion_group', name:'Управление эмоциями группы', desc:'Эмоциональное заражение, работа с настроением команды или зала', isNew:true,
          longDesc:'Эмоциональное заражение в коллективах — мощный механизм. Можно использовать для создания продуктивной атмосферы или для понимания, как массовое настроение формируется.',
          outcomes:['Понимание динамики группы по 3–5 наблюдаемым признакам','Влияние на настроение команды через свою позицию','Работа с залом и публичными выступлениями','Распознавание токсичных групповых паттернов'],
          weekThemes:['Динамика группы','Влияние через позицию','Работа с залом'] },
        { id:'media_influence', name:'Информационное воздействие через СМИ', desc:'Как новостные циклы формируют гормональный фон у больших групп — для PR, маркетинга, критического мышления', isNew:true,
          longDesc:'Как новостные циклы формируют гормональный фон у больших групп. Понимать механизм — для критического мышления; применять этично — для PR, маркетинга, политической коммуникации.',
          outcomes:['Чтение новостной повестки на трёх уровнях смысла','Защита от информационной перегрузки и тревоги','Применение принципов в этичном PR и маркетинге','Распознавание целенаправленного манипулятивного контента'],
          weekThemes:['Чтение повестки на 3 уровнях','Защита от перегрузки','Этичное применение'] }
    ]
};

function _scFindSkill(id) {
    if (!id) return null;
    for (const cat of Object.values(SC_SKILLS)) {
        const sk = cat.find(s => s.id === id);
        if (sk) return sk;
    }
    return null;
}

function _scWeekThemes(skill) {
    if (skill && Array.isArray(skill.weekThemes) && skill.weekThemes.length === 3) return skill.weekThemes;
    return ['Знакомство и калибровка','Активная тренировка','Закрепление и интеграция'];
}

const SC_CHANNELS = [
    { id:'telegram', icon:'📱', name:'Telegram', desc:'Все форматы — текст, голос, аудио-практики, видео-фрагменты', recommended:true,
      buildLink: (uid) => `https://t.me/Nanotech_varik_bot?start=${uid || ''}` },
    { id:'max',      icon:'🤖', name:'MAX',      desc:'Российский мессенджер от ВК. Те же форматы, что в Telegram.',
      buildLink: (uid) => `https://max.ru/id502238728185_bot?start=${uid || ''}` },
    { id:'web',      icon:'🌐', name:'Веб-уведомления', desc:'Push в браузере, если Фреди открыт в фоне. Для офисной работы.' },
    { id:'email',    icon:'📧', name:'Email-дайджест',  desc:'Утренний email с заданием и ссылкой на материалы.' }
];

const SC_TIME_OPTIONS = ['07:00','08:00','09:00','10:00','12:00','18:00','20:00','21:00'];

// ============================================
// СОСТОЯНИЕ
// ============================================
if (!window._scState) window._scState = {
    view: 'select', skillId: null, skillName: null, skillDesc: null,
    plan: null, daysDone: [], startDate: null,
    channel: null, notifyTime: '09:00',
    isPersonalized: false,   // false = базовый план, true = AI-персональный под профиль
    active: false            // false = пассивный режим (план + 1 утреннее напоминание), true = боевой режим (4 точки касания/день)
};
const _sc = window._scState;

function _scToast(msg, t) { if (window.showToast) window.showToast(msg, t||'info'); }
function _scHome()  { if (typeof renderDashboard==='function') renderDashboard(); else if (window.renderDashboard) window.renderDashboard(); }
function _scApi()   { return window.CONFIG?.API_BASE_URL || window.API_BASE_URL || 'https://fredi-backend-flz2.onrender.com'; }
function _scUid()   { return window.CONFIG?.USER_ID || window.USER_ID; }
function _scName()  { return localStorage.getItem('fredi_user_name') || 'друг'; }

function _scSave() {
    try {
        const data = {
            skillId: _sc.skillId, skillName: _sc.skillName, skillDesc: _sc.skillDesc,
            plan: _sc.plan, daysDone: _sc.daysDone, startDate: _sc.startDate,
            channel: _sc.channel, notifyTime: _sc.notifyTime,
            isPersonalized: _sc.isPersonalized, active: _sc.active
        };
        localStorage.setItem('sc_plan_'+_scUid(), JSON.stringify(data));
        localStorage.setItem('trainer_skill_'+_scUid(), JSON.stringify({
            skillId: _sc.skillId, skillName: _sc.skillName, plan: _sc.plan,
            daysDone: _sc.daysDone, startDate: _sc.startDate,
            channel: _sc.channel, notifyTime: _sc.notifyTime,
            isPersonalized: _sc.isPersonalized, active: _sc.active
        }));
    } catch {}
}

function _scLoad() {
    try {
        const d = localStorage.getItem('sc_plan_'+_scUid());
        if (d) Object.assign(_sc, JSON.parse(d));
    } catch {}
}

async function _scLoadSettingsFromBackend() {
    if (!_scUid()) return;
    try {
        const r = await fetch(`${_scApi()}/api/notification-settings/${_scUid()}`);
        if (!r.ok) return;
        const d = await r.json();
        let changed = false;
        if (d.channel     && d.channel     !== _sc.channel)    { _sc.channel    = d.channel;     changed = true; }
        if (d.notify_time && d.notify_time !== _sc.notifyTime) { _sc.notifyTime = d.notify_time; changed = true; }
        if (typeof d.active === 'boolean' && d.active !== _sc.active) { _sc.active = d.active;   changed = true; }
        if (changed) {
            _scSave();
            if (_sc.view === 'plan' || _sc.view === 'channel') _scRender();
        }
    } catch {}
}

function _scCurrentDay() {
    if (!_sc.startDate) return 1;
    const diff = Math.floor((Date.now() - new Date(_sc.startDate)) / 86400000) + 1;
    return Math.min(21, Math.max(1, diff));
}

function _scStreak() {
    if (!_sc.daysDone || _sc.daysDone.length === 0) return 0;
    const sorted = [...new Set(_sc.daysDone)].sort((a,b) => a-b);
    let streak = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
        if (sorted[i] - sorted[i-1] === 1) streak++;
        else break;
    }
    return streak;
}

function _scStreakLabel(n) {
    if (n === 1) return '1 день подряд';
    if (n >= 2 && n <= 4) return `${n} дня подряд`;
    return `${n} дней подряд`;
}

function _scChannelMeta(id) { return SC_CHANNELS.find(c => c.id === id); }

function _scCategoryLabel(id) {
    if (SC_SKILLS.personal.some(s => s.id === id))     return '🧠 Личностный навык';
    if (SC_SKILLS.professional.some(s => s.id === id)) return '💼 Профессиональный навык';
    if (SC_SKILLS.influence.some(s => s.id === id))    return '🎙️ Влияние и коммуникация';
    return '✏️ Свой навык';
}

async function _scSaveChannelToBackend() {
    if (!_sc.channel || !_sc.skillId) return;
    try {
        await fetch(`${_scApi()}/api/notification-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id:     _scUid(),
                skill_id:    _sc.skillId,
                skill_name:  _sc.skillName,
                channel:     _sc.channel,
                notify_time: _sc.notifyTime,
                start_date:  _sc.startDate,
                active:      _sc.active,
                personalized: _sc.isPersonalized
            })
        });
    } catch (e) {
        console.warn('Notification settings: backend пока недоступен, сохранил локально', e);
    }
    if (_sc.channel === 'web' && window.PushManager_Fredi && _scUid()) {
        try { await window.PushManager_Fredi.request(_scUid()); } catch {}
    }
}

// Активация/деактивация боевого режима
async function _scSetActive(active) {
    _sc.active = !!active;
    _scSave();
    try {
        await fetch(`${_scApi()}/api/notification-settings/${_scUid()}/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: _sc.active, skill_id: _sc.skillId })
        });
    } catch (e) {
        console.warn('Activate endpoint: backend пока недоступен', e);
    }
}

async function _scGetProfile() {
    try {
        const r = await fetch(`${_scApi()}/api/get-profile/${_scUid()}`);
        const d = await r.json();
        const bl = d.profile?.behavioral_levels || {};
        const avg = x => Array.isArray(x) ? x[x.length-1] : (x||4);
        return {
            vectors: { СБ:avg(bl.СБ), ТФ:avg(bl.ТФ), УБ:avg(bl.УБ), ЧВ:avg(bl.ЧВ) },
            type:    d.profile?.perception_type || '',
            level:   d.profile?.thinking_level  || 5
        };
    } catch { return { vectors:{СБ:4,ТФ:4,УБ:4,ЧВ:4}, type:'', level:5 }; }
}

// ============================================
// БАЗОВЫЙ ПЛАН ИЗ КЭША БЭКЕНДА (новое)
// Возвращает план или null. Если null — фронт вызывает AI-генерацию.
// ============================================
async function _scLoadBasePlan(skillId) {
    if (!skillId || skillId === 'custom') return null;
    try {
        const r = await fetch(`${_scApi()}/api/base-plan/${encodeURIComponent(skillId)}`);
        if (!r.ok) return null;
        const d = await r.json();
        if (d && d.plan && d.plan.weeks) return d.plan;
    } catch {}
    return null;
}

// AI-генерация (как раньше — для персонализации или fallback)
async function _scGeneratePlan(skillName, skillDesc, profile) {
    const v = profile.vectors;
    const prompt = `Ты — Фреди, психолог-тренер. Создай персональный 21-дневный план развития навыка.

Пользователь: ${_scName()}
Навык: "${skillName}" — ${skillDesc}
Психологический профиль: СБ-${v.СБ} ТФ-${v.ТФ} УБ-${v.УБ} ЧВ-${v.ЧВ}
Уровень мышления: ${profile.level}/9

Требования:
— 21 упражнение (по одному на день), разбить на 3 недели
— Каждая неделя — своя тема (нарастающая сложность)
— Упражнения конкретные: что делать, как долго, как именно
— Учитывай профиль: для СБ — больше безопасности и опоры, для ТФ — результаты и цифры, для УБ — смыслы и системность, для ЧВ — отношения и эмоции
— Каждое упражнение: 1-15 минут, выполнимо в обычный день

Верни только JSON:
{"weeks":[{"theme":"...","exercises":[{"day":1,"task":"...","dur":"...","inst":"..."},...7...]},...3...]}`;

    try {
        const r = await fetch(`${_scApi()}/api/ai/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: _scUid(), platform: 'web', prompt, max_tokens: 2000 })
        });
        const d = await r.json();
        if (d.success && d.content) {
            const clean = d.content.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
            const parsed = JSON.parse(clean);
            let dayNum = 0;
            parsed.weeks.forEach(w => w.exercises.forEach(ex => { dayNum++; ex.day = dayNum; }));
            return parsed;
        }
    } catch(e) { console.error('Plan generation error:', e); }
    return null;
}

// ============================================
// РЕНДЕР
// ============================================
function _scRender() {
    _scInjectStyles();
    const c = document.getElementById('screenContainer');
    if (!c) return;

    let body = '';
    if (_sc.view === 'select')     body = _scRenderSelect();
    if (_sc.view === 'detail')     body = _scRenderDetail();
    if (_sc.view === 'generating') body = _scRenderGenerating();
    if (_sc.view === 'channel')    body = _scRenderChannel();
    if (_sc.view === 'plan')       body = _scRenderPlan();

    c.innerHTML = `
        <div class="full-content-page">
            <button class="back-btn" id="scBack">◀️ НАЗАД</button>
            <div class="content-header">
                <div class="content-emoji">🎯</div>
                <h1 class="content-title">Выбор навыка</h1>
                <p style="font-size:12px;color:var(--text-secondary);margin-top:4px">AI строит план под ваш профиль</p>
            </div>
            <div id="scBody">${body}</div>
        </div>`;

    document.getElementById('scBack').onclick = () => {
        if (_sc.view === 'plan')       { _sc.view = 'select'; _scRender(); return; }
        if (_sc.view === 'channel')    { _sc.view = 'plan';   _scRender(); return; }
        if (_sc.view === 'detail')     { _sc.view = 'select'; _scRender(); return; }
        if (_sc.view === 'generating') return;
        _scHome();
    };

    _scBindHandlers();
}

function _scRenderSelect() {
    let diagBlock = '';
    try {
        const sdRaw = localStorage.getItem('sd_result_'+_scUid());
        if (sdRaw) {
            const sd = JSON.parse(sdRaw);
            const sphere = sd.sphere || 'personal';
            const skills = SC_SKILLS[sphere] || SC_SKILLS.personal;
            const entries = Object.entries(sd.scores || {});
            if (entries.length > 0) {
                const sorted = entries.map(([qi, score]) => ({ qi: parseInt(qi), score }))
                    .sort((a,b) => a.score - b.score).slice(0, 3);
                const cards = sorted.map(({qi, score}) => {
                    const skill = skills[qi];
                    if (!skill) return '';
                    const pct = Math.round(score/4*100);
                    return `<div class="sc-skill-card" data-id="${skill.id}">
                        <div class="sc-skill-body">
                            <div class="sc-skill-name">${skill.name}</div>
                            <div class="sc-skill-sub">${skill.desc}</div>
                            <div class="sc-skill-bar-wrap"><div class="sc-skill-bar-fill" style="width:${pct}%"></div></div>
                        </div>
                        <div class="sc-skill-score">${score}/4</div>
                        <div class="sc-skill-arrow">›</div>
                    </div>`;
                }).filter(Boolean).join('');
                if (cards) diagBlock = `<div class="sc-section-label">📊 Из диагностики — слабые места</div>${cards}`;
            }
        }
    } catch {}

    const activePlan = _sc.plan ? `
        <div style="background:rgba(224,224,224,0.06);border:1px solid rgba(224,224,224,0.18);border-radius:14px;padding:12px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
                <div style="font-size:13px;font-weight:600;color:var(--chrome)">${_sc.skillName}</div>
                <div style="font-size:11px;color:var(--text-secondary)">День ${_scCurrentDay()} из 21 · выполнено ${_sc.daysDone.length}${_sc.active?' · 🚀 боевой режим':''}</div>
            </div>
            <button class="sc-btn sc-btn-ghost" id="scOpenPlan" style="flex-shrink:0">Открыть план →</button>
        </div>` : '';

    const renderSkillList = (arr) => arr.map(sk => `
        <div class="sc-skill-card" data-id="${sk.id}">
            <div class="sc-skill-body">
                <div class="sc-skill-name">${sk.name}${sk.isNew?'<span class="sc-skill-new">NEW</span>':''}</div>
                <div class="sc-skill-sub">${sk.desc}</div>
            </div>
            <div class="sc-skill-arrow">›</div>
        </div>`).join('');

    return `
        ${activePlan}
        ${diagBlock}
        <div class="sc-section-label" style="margin-top:${diagBlock?'18px':'0'}">🧠 Личностные навыки</div>
        ${renderSkillList(SC_SKILLS.personal)}
        <div class="sc-section-label">💼 Профессиональные навыки</div>
        ${renderSkillList(SC_SKILLS.professional)}
        <div class="sc-section-label">🎙️ Влияние и коммуникация</div>
        ${renderSkillList(SC_SKILLS.influence)}

        <div class="sc-custom-block">
            <div class="sc-custom-label">✏️ Или введите свой навык:</div>
            <input class="sc-input" id="scCustomInput" placeholder="Например: публичные выступления, управление гневом...">
            <button class="sc-btn sc-btn-primary" id="scStartCustomBtn" style="margin-top:10px">
                🤖 Создать AI-план для своего навыка
            </button>
        </div>

        <div class="sc-tip">
            💡 Базовый план — мгновенно. Можно персонализировать под свой профиль уже на следующем шаге. И активировать <strong>боевой режим</strong>, когда Фреди ведёт каждый день.
        </div>`;
}

function _scRenderDetail() {
    const sk = _scFindSkill(_sc.skillId);
    if (!sk) return '<p style="color:var(--text-secondary)">Навык не найден</p>';

    const cat = _scCategoryLabel(sk.id);
    const newTag = sk.isNew ? '<span class="sc-detail-tag-new">NEW</span>' : '';
    const outcomes = (sk.outcomes || []).map(o => `<li>${o}</li>`).join('');
    const themes = _scWeekThemes(sk);
    const weekRows = themes.map((t, i) => `
        <div class="sc-week-preview-row">
            <div class="sc-week-preview-num">НЕДЕЛЯ ${i+1}</div>
            <div class="sc-week-preview-text">${t}</div>
        </div>`).join('');

    return `
        <div class="sc-detail-hero">
            <div class="sc-detail-cat">${cat}</div>
            <div class="sc-detail-title">${sk.name}${newTag}</div>
            <p class="sc-detail-short">${sk.longDesc || sk.desc}</p>
        </div>

        <div class="sc-detail-section">
            <div class="sc-detail-h">🏆 Что вы получите за 21 день</div>
            <ul class="sc-detail-outcomes">${outcomes}</ul>
        </div>

        <div class="sc-detail-section">
            <div class="sc-detail-h">📅 Структура курса по неделям</div>
            <div class="sc-week-preview">${weekRows}</div>
            <p class="sc-detail-p" style="font-size:11px;color:var(--text-secondary);margin-top:10px">
                После открытия плана можно персонализировать его под ваш профиль и активировать боевой режим.
            </p>
        </div>

        <div class="sc-detail-section">
            <div class="sc-detail-h">📋 Формат тренировки</div>
            <div class="sc-detail-format">
                <div class="sc-detail-format-item"><div class="sc-detail-format-icon">📅</div><div class="sc-detail-format-text"><strong>21 день</strong>3 фазы по 7 дней</div></div>
                <div class="sc-detail-format-item"><div class="sc-detail-format-icon">⏱️</div><div class="sc-detail-format-text"><strong>10–15 мин</strong>в день</div></div>
                <div class="sc-detail-format-item"><div class="sc-detail-format-icon">📲</div><div class="sc-detail-format-text"><strong>Напоминания</strong>в Telegram/MAX</div></div>
            </div>
        </div>

        <button class="sc-btn sc-btn-primary" id="scShowPlan" style="margin-top:14px">
            📋 Показать план
        </button>
        <button class="sc-btn sc-btn-ghost" id="scBackToList" style="width:100%;margin-top:10px">
            ← К списку навыков
        </button>`;
}

function _scRenderGenerating() {
    return `
        <div class="sc-generating">
            <span class="sc-generating-icon">🤖</span>
            <div class="sc-generating-text">Фреди готовит план</div>
            <div class="sc-generating-sub">
                ${_sc.isPersonalized ? 'Персонализирую под ваш профиль...' : 'Подбираю план...'}<br>
                <strong>${_sc.skillName}</strong>
            </div>
        </div>`;
}

function _scRenderChannel() {
    const channels = SC_CHANNELS.map(ch => `
        <div class="sc-channel-card${_sc.channel===ch.id?' active':''}" data-channel="${ch.id}">
            <div class="sc-channel-icon">${ch.icon}</div>
            <div class="sc-channel-body">
                <div class="sc-channel-name">${ch.name}${ch.recommended?'<span class="sc-channel-tag-recommended">Рекомендуется</span>':''}</div>
                <div class="sc-channel-desc">${ch.desc}</div>
            </div>
            <div class="sc-channel-radio"></div>
        </div>`).join('');

    const timeButtons = SC_TIME_OPTIONS.map(t =>
        `<button class="sc-time-btn${_sc.notifyTime===t?' active':''}" data-time="${t}">${t}</button>`
    ).join('');

    const skipBtn = _sc.plan ? `
        <button class="sc-btn sc-btn-ghost" id="scSkipChannel" style="margin-top:10px;width:100%">Пропустить — без напоминаний</button>` : '';

    return `
        <div class="sc-channel-intro">
            <div class="sc-channel-intro-title">📲 Куда присылать ежедневные задания?</div>
            <div class="sc-channel-intro-text">
                Каждый день Фреди будет присылать короткое задание дня по навыку <strong>«${_sc.skillName}»</strong>: текст, аудио-практика, инструкция.
            </div>
        </div>
        <div class="sc-section-label">Канал связи</div>
        ${channels}
        <div class="sc-time-block">
            <div class="sc-time-label">⏰ Время утреннего сообщения</div>
            <div class="sc-time-grid">${timeButtons}</div>
        </div>
        <button class="sc-btn sc-btn-primary" id="scConfirmChannel" style="margin-top:16px">Сохранить и открыть план →</button>
        ${skipBtn}
        <div class="sc-tip">
            💡 При выборе Telegram или MAX — мы откроем бот, и он автоматически свяжет вашу веб-учётку с чатом по deeplink.
        </div>`;
}

function _scRenderPlan() {
    if (!_sc.plan) return '<p style="color:var(--text-secondary)">Ошибка загрузки плана</p>';

    const day     = _scCurrentDay();
    const done    = _sc.daysDone;
    const pct     = Math.round((done.length / 21) * 100);
    const chMeta  = _scChannelMeta(_sc.channel);
    const streak  = _scStreak();

    const calHtml = _sc.plan.weeks.map((week, wi) => {
        const daysHtml = week.exercises.map(ex => {
            const d = ex.day;
            const isDone    = done.includes(d);
            const isCurrent = d === day && !isDone;
            return `<div class="sc-day${isDone?' done':''}${isCurrent?' current':''}" data-day="${d}">
                <div class="sc-day-num">${d}</div><div class="sc-day-dot"></div>
            </div>`;
        }).join('');
        return `<div class="sc-week"><div class="sc-week-label">Неделя ${wi+1} · ${week.theme}</div><div class="sc-week-grid">${daysHtml}</div></div>`;
    }).join('');

    const curEx = _sc.plan.weeks.flatMap(w => w.exercises).find(e => e.day === day);
    const isDoneToday = done.includes(day);

    const todayHtml = curEx ? `
        <div class="sc-section-label">⚡ День ${day} — сегодня</div>
        <div class="sc-today-card">
            <div class="sc-today-header">
                <div class="sc-today-num">${day}</div>
                <div class="sc-today-task">${curEx.task}</div>
            </div>
            <div class="sc-today-dur">⏱ ${curEx.dur}</div>
            <div class="sc-today-inst">${curEx.inst}</div>
            ${!isDoneToday
                ? `<button class="sc-btn sc-btn-primary" id="scMarkDone">✅ Отметить выполнение</button>`
                : `<div style="font-size:12px;color:var(--text-secondary);text-align:center">✅ Выполнено сегодня — до завтра!</div>`}
        </div>` : '';

    const channelInfo = chMeta ? `
        <div class="sc-plan-channel">
            <span>${chMeta.icon}</span>
            <span>Уведомления в <strong>${chMeta.name}</strong> в <strong>${_sc.notifyTime}</strong></span>
            <a id="scChangeChannel">изменить</a>
        </div>` : `
        <div class="sc-plan-channel">
            <span>🔕</span>
            <span>Без напоминаний</span>
            <a id="scChangeChannel">подключить</a>
        </div>`;

    const streakBadge = streak >= 2 ? `<span class="sc-plan-streak">🔥 ${_scStreakLabel(streak)}</span>` : '';

    // Карточка персонализации (показывается, если план базовый)
    const personalizeCard = !_sc.isPersonalized && _sc.skillId !== 'custom' ? `
        <div class="sc-personalize-card">
            <div class="sc-personalize-card-body">
                <div class="sc-personalize-card-title">✨ Персонализировать под ваш профиль</div>
                <div class="sc-personalize-card-desc">AI пересоберёт план с учётом ваших векторов СБ/ТФ/УБ/ЧВ. ~25 секунд.</div>
            </div>
            <button class="sc-personalize-btn" id="scPersonalize">Сделать</button>
        </div>` : '';

    // Карточка боевого режима
    const combatCard = _sc.active ? `
        <div class="sc-combat-card on">
            <div class="sc-combat-title">🚀 Боевой режим <span class="sc-combat-status on">активен</span></div>
            <p class="sc-combat-desc">Фреди ведёт вас по программе с 4 точками касания в день и адаптирует план под ваши ответы.</p>
            <div class="sc-combat-touchpoints">
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">08:00</span>🌅 Задание дня</div>
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">13:00</span>🌤 Чек-ин «как идёт?»</div>
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">20:00</span>🌙 Рефлексия</div>
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">ВС</span>📊 Разбор недели</div>
            </div>
            <button class="sc-btn sc-btn-ghost" id="scDeactivateCombat" style="width:100%">Выключить боевой режим</button>
        </div>` : `
        <div class="sc-combat-card">
            <div class="sc-combat-title">🚀 Боевой режим <span class="sc-combat-status off">выключен</span></div>
            <p class="sc-combat-desc">Сейчас вы получаете один утренний месседж в день. <strong>Боевой режим</strong> превращает Фреди в активного тренера: 4 точки касания в день, адаптация плана по вашим ответам.</p>
            <div class="sc-combat-touchpoints">
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">08:00</span>🌅 Задание дня + теория + аудио</div>
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">13:00</span>🌤 «Получилось начать? Что заметили?»</div>
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">20:00</span>🌙 «Опиши ситуацию дня»</div>
                <div class="sc-combat-tp"><span class="sc-combat-tp-time">ВС</span>📊 AI-разбор недели + insights</div>
            </div>
            <button class="sc-btn-combat" id="scActivateCombat">🚀 Активировать боевой режим</button>
        </div>`;

    return `
        <div class="sc-plan-header">
            <div class="sc-plan-skill"><span>🎯 ${_sc.skillName}</span>${streakBadge}</div>
            <div class="sc-plan-meta">
                День ${day} из 21 · выполнено ${done.length} упражнений · прогресс ${pct}%${_sc.isPersonalized?' · персональный план':''}
            </div>
            <div class="sc-plan-progress"><div class="sc-plan-progress-fill" style="width:${pct}%"></div></div>
            ${channelInfo}
        </div>

        ${personalizeCard}
        ${combatCard}
        ${calHtml}
        ${todayHtml}

        <div class="sc-btn-row" style="margin-top:20px">
            <button class="sc-btn sc-btn-ghost" id="scResetBtn">🔄 Новый навык</button>
            <button class="sc-btn sc-btn-ghost" id="scGoTraining">⚡ Тренировка дня</button>
        </div>`;
}

// ============================================
// СЦЕНАРИИ
// ============================================
async function _scShowPlanScenario() {
    if (!_sc.skillId || !_sc.skillName) { _scToast('Выберите навык', 'error'); return; }

    _sc.view = 'generating';
    _scRender();

    let plan = await _scLoadBasePlan(_sc.skillId);
    let isPersonalized = false;

    if (!plan) {
        // Backend ещё не отдаёт базовый план — fallback на AI
        const profile = await _scGetProfile();
        plan = await _scGeneratePlan(_sc.skillName, _sc.skillDesc || '', profile);
        isPersonalized = true; // AI генерация всегда персональная
    }

    if (plan) {
        _sc.plan           = plan;
        _sc.daysDone       = [];
        _sc.startDate      = new Date().toISOString();
        _sc.isPersonalized = isPersonalized;
        if (!_sc.channel)    _sc.channel    = 'telegram';
        if (!_sc.notifyTime) _sc.notifyTime = '09:00';
        _scSave();
        _sc.view = 'channel';
    } else {
        _scToast('Не удалось загрузить план. Попробуйте позже.', 'error');
        _sc.view = 'detail';
    }
    _scRender();
}

async function _scPersonalizeScenario() {
    if (!_sc.skillId || !_sc.skillName) return;
    _sc.view = 'generating';
    _sc.isPersonalized = true; // отображается в _scRenderGenerating
    _scRender();

    const profile = await _scGetProfile();
    const plan    = await _scGeneratePlan(_sc.skillName, _sc.skillDesc || '', profile);

    if (plan) {
        _sc.plan = plan;
        _sc.isPersonalized = true;
        _scSave();
        _scToast('✨ План пересобран под ваш профиль!', 'success');
    } else {
        _sc.isPersonalized = false;
        _scToast('Не удалось пересобрать план.', 'error');
    }
    _sc.view = 'plan';
    _scRender();
}

function _scShowCombatConfirm() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `<div style="background:var(--carbon-fiber,#1a1a1a);border:1px solid rgba(255,107,53,0.3);border-radius:22px;padding:24px;max-width:380px;width:100%">
        <div style="font-size:18px;color:var(--text-primary);margin-bottom:8px;font-weight:700">🚀 Активировать боевой режим</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.55;margin-bottom:16px">
            Фреди станет активным тренером. Ежедневно вам будут приходить:
        </div>
        <div style="font-size:12px;color:var(--text-primary);line-height:1.7;margin-bottom:18px;padding-left:4px">
            <div>🌅 <strong>Утром:</strong> задание + теория + аудио-практика</div>
            <div>🌤 <strong>Днём:</strong> чек-ин «как идёт?»</div>
            <div>🌙 <strong>Вечером:</strong> рефлексия — опиши ситуацию</div>
            <div>📊 <strong>В воскресенье:</strong> AI-разбор недели</div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.55;margin-bottom:20px;padding:10px 12px;background:rgba(58,134,255,0.06);border-radius:10px;border-left:2px solid rgba(58,134,255,0.4)">
            AI адаптирует план под ваши ответы: если трудно — упрощает, если легко — усложняет. Можно выключить в любой момент.
        </div>
        <div style="display:flex;gap:10px">
            <button id="cbCancel" style="flex:1;padding:12px;border-radius:30px;background:rgba(224,224,224,0.07);border:1px solid rgba(224,224,224,0.15);color:var(--text-secondary);font-family:inherit;cursor:pointer;font-size:13px">Не сейчас</button>
            <button id="cbActivate" style="flex:1.4;padding:12px;border-radius:30px;background:linear-gradient(135deg,#FF6B35,#FF8B5C);border:none;color:white;font-family:inherit;font-weight:600;cursor:pointer;font-size:13px;box-shadow:0 4px 14px rgba(255,107,53,0.3)">🚀 Активировать</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cbCancel').onclick = () => overlay.remove();
    overlay.querySelector('#cbActivate').onclick = async () => {
        overlay.remove();
        await _scSetActive(true);
        _scToast('🚀 Боевой режим активирован! Первое задание придёт утром.', 'success');
        _scRender();
    };
}

// ============================================
// ОБРАБОТЧИКИ
// ============================================
function _scBindHandlers() {
    document.querySelectorAll('.sc-skill-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const sk = _scFindSkill(id);
            if (!sk) return;
            _sc.skillId = sk.id; _sc.skillName = sk.name; _sc.skillDesc = sk.desc;
            _sc.view = 'detail';
            _scRender();
        });
    });

    document.getElementById('scOpenPlan')?.addEventListener('click', () => { _sc.view = 'plan'; _scRender(); });

    document.getElementById('scStartCustomBtn')?.addEventListener('click', async () => {
        const custom = (document.getElementById('scCustomInput')?.value || '').trim();
        if (!custom) { _scToast('Введите свой навык', 'error'); return; }
        _sc.skillId = 'custom'; _sc.skillName = custom; _sc.skillDesc = 'персональный навык пользователя';
        await _scShowPlanScenario();
    });

    document.getElementById('scShowPlan')?.addEventListener('click', _scShowPlanScenario);
    document.getElementById('scBackToList')?.addEventListener('click', () => { _sc.view = 'select'; _scRender(); });

    document.querySelectorAll('.sc-channel-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.sc-channel-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            _sc.channel = card.dataset.channel;
        });
    });

    document.querySelectorAll('.sc-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sc-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _sc.notifyTime = btn.dataset.time;
        });
    });

    document.getElementById('scConfirmChannel')?.addEventListener('click', async () => {
        if (!_sc.channel) { _scToast('Выберите канал связи', 'error'); return; }
        _scSave();
        await _scSaveChannelToBackend();
        const meta = _scChannelMeta(_sc.channel);
        if (meta && typeof meta.buildLink === 'function') {
            const url = meta.buildLink(_scUid());
            try { window.open(url, '_blank', 'noopener'); } catch {}
            _scToast(`Откройте ${meta.name} и нажмите Start`, 'success');
        } else {
            _scToast('✅ Канал сохранён', 'success');
        }
        _sc.view = 'plan'; _scRender();
    });

    document.getElementById('scSkipChannel')?.addEventListener('click', () => {
        _sc.channel = null; _scSave(); _sc.view = 'plan'; _scRender();
    });

    document.getElementById('scChangeChannel')?.addEventListener('click', () => {
        _sc.view = 'channel'; _scRender();
    });

    // Персонализация
    document.getElementById('scPersonalize')?.addEventListener('click', _scPersonalizeScenario);

    // Боевой режим
    document.getElementById('scActivateCombat')?.addEventListener('click', _scShowCombatConfirm);
    document.getElementById('scDeactivateCombat')?.addEventListener('click', async () => {
        await _scSetActive(false);
        _scToast('Боевой режим выключен', 'info');
        _scRender();
    });

    document.getElementById('scMarkDone')?.addEventListener('click', () => {
        const day = _scCurrentDay();
        if (!_sc.daysDone.includes(day)) {
            _sc.daysDone.push(day);
            _scSave();
            if (day >= 21) _scToast('🏆 Навык сформирован! 21 день пройден.', 'success');
            else _scToast(`✅ День ${day} выполнен!`, 'success');
            _scRender();
        }
    });

    document.querySelectorAll('.sc-day').forEach(d => {
        d.addEventListener('click', () => {
            const n = parseInt(d.dataset.day);
            if (_sc.daysDone.includes(n)) _sc.daysDone = _sc.daysDone.filter(x=>x!==n);
            else _sc.daysDone.push(n);
            _scSave(); _scRender();
        });
    });

    document.getElementById('scResetBtn')?.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
        overlay.innerHTML = `<div style="background:var(--carbon-fiber,#1a1a1a);border:1px solid rgba(224,224,224,0.2);border-radius:22px;padding:24px;max-width:320px;width:100%">
            <div style="font-size:14px;color:var(--text-primary);margin-bottom:6px;font-weight:600">Начать новый навык?</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:20px">Текущий прогресс будет сброшен.</div>
            <div style="display:flex;gap:10px">
                <button id="cfNo"  style="flex:1;padding:11px;border-radius:30px;background:rgba(224,224,224,0.07);border:1px solid rgba(224,224,224,0.15);color:var(--text-secondary);font-family:inherit;cursor:pointer">Нет</button>
                <button id="cfYes" style="flex:1;padding:11px;border-radius:30px;background:rgba(224,224,224,0.18);border:1px solid rgba(224,224,224,0.3);color:var(--text-primary);font-family:inherit;font-weight:600;cursor:pointer">Да</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#cfNo').onclick  = () => overlay.remove();
        overlay.querySelector('#cfYes').onclick = async () => {
            overlay.remove();
            // Деактивируем боевой режим перед сбросом
            if (_sc.active) await _scSetActive(false);
            _sc.skillId = _sc.skillName = _sc.skillDesc = _sc.plan = _sc.startDate = null;
            _sc.daysDone = [];
            _sc.isPersonalized = false;
            _sc.view = 'select';
            _scSave(); _scRender();
        };
    });

    document.getElementById('scGoTraining')?.addEventListener('click', () => {
        if (typeof showDailyTrainingScreen === 'function') {
            showDailyTrainingScreen();
        } else {
            const s = document.createElement('script');
            s.src = 'daily_training.js';
            s.onload = () => { if (typeof showDailyTrainingScreen==='function') showDailyTrainingScreen(); };
            document.head.appendChild(s);
        }
    });
}

async function showSkillChoiceScreen() {
    _scLoad();
    _sc.view = 'select';
    _scRender();
    _scLoadSettingsFromBackend();
}

window.showSkillChoiceScreen = showSkillChoiceScreen;
console.log('✅ skill_choice.js v2.4 загружен (базовый план + персонализация + боевой режим)');
