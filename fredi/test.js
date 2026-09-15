// ============================================
// ПОЛНЫЙ ТЕСТ ИЗ 5 ЭТАПОВ
// Версия 5.1 - С ПОГОДОЙ В КОНТЕКСТЕ
// ============================================

// Дубль событий теста в Метрику. FrediTracker пишет в свою таблицу, а вся
// остальная воронка — визиты, open_fredi, «написал сам», стены, оплаты —
// живёт в Метрике, и большой тест до сих пор выпадал из неё целиком.
// Цена вопроса видна в цифрах: группа «Большой тест личности» за 7 дней —
// 181 визит, 142 открытия Фреди и ноль по всем метрикам разговора. Ноль
// был не результатом, а слепым пятном: тест идёт кнопками, цель «написал
// сам» в нём не может сработать по устройству, а своей цели у теста нет.
function _testGoal(name) {
    if (typeof window.ym !== 'function') return;
    [108965607, 108138656].forEach(function (c) {
        try { window.ym(c, 'reachGoal', name); } catch (e) {}
    });
}

const TEST_API_BASE_URL = (window.CONFIG && window.CONFIG.API_BASE_URL) || window.API_BASE_URL || '';

const Test = {

    // ============================================
    // СОСТОЯНИЕ
    // ============================================
    currentStage: 0,
    currentQuestionIndex: 0,
    userId: null,
    answers: [],
    showIntro: true,

    context: {
        city: null, gender: null, age: null,
        weather: null, isComplete: false, name: null
    },

    perceptionScores: { EXTERNAL: 0, INTERNAL: 0, SYMBOLIC: 0, MATERIAL: 0 },
    perceptionType: null,
    thinkingLevel: null,
    thinkingScores: { "1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0 },
    strategyLevels: { "СБ":[],"ТФ":[],"УБ":[],"ЧВ":[] },
    behavioralLevels: { "СБ":[],"ТФ":[],"УБ":[],"ЧВ":[] },
    stage3Scores: [],
    diltsCounts: { "ENVIRONMENT":0,"BEHAVIOR":0,"CAPABILITIES":0,"VALUES":0,"IDENTITY":0 },
    deepAnswers: [],
    deepPatterns: null,
    profileData: null,

    clarificationIteration: 0,
    discrepancies: [],
    clarifyingAnswers: [],
    clarifyingQuestions: [],
    clarifyingCurrent: 0,

    aiGeneratedProfile: null,
    psychologistThought: null,

    // Кэш расширенных интерпретаций с бэка (грузится через
    // GET /api/test/interpretations при startTest).
    // Используется в getStage4Interpretation для уровней Дилтса.
    // При недоступности API — фронт работает на старых текстах (fallback).
    interpretations: null,

    // ============================================
    // ЭТАПЫ
    // ============================================
    stages: [
        {
            id: 'perception', number: 1,
            name: 'КОНФИГУРАЦИЯ ВОСПРИЯТИЯ',
            shortDesc: 'Линза, через которую вы смотрите на мир',
            detailedDesc: `🔍 ЧТО МЫ ИССЛЕДУЕМ:\n\n• Куда направлено ваше внимание — вовне или внутрь\n• Какая тревога доминирует — страх отвержения или страх потери контроля\n\n📊 Вопросов: 8\n⏱ Время: ~3 минуты\n\n💡 Совет: Отвечайте честно — это поможет мне лучше понять вас.`,
            extendedDesc: `🔬 **ПОЧЕМУ ЭТО ВАЖНО?**\n\nВосприятие — это базовая настройка вашей психики. Оно работает как фильтр:\n• **Внешнее внимание** — вы ориентируетесь на других, считываете настроение, ожидания\n• **Внутреннее внимание** — вы ориентируетесь на свои ощущения, чувства, интуицию\n\n**Доминирующая тревога** показывает, чего вы боитесь на глубинном уровне:\n• Страх отвержения — боитесь, что вас не примут, осудят, покинут\n• Страх потери контроля — боитесь хаоса, неопределённости, ошибок\n\n📊 **Вопросов:** 8\n⏱ **Время:** ~3 минуты\n\n💡 **Совет:** Отвечайте честно — это поможет мне лучше понять вас.`,
            total: 8
        },
        {
            id: 'thinking', number: 2,
            name: 'КОНФИГУРАЦИЯ МЫШЛЕНИЯ',
            shortDesc: 'Как вы обрабатываете информацию',
            detailedDesc: `🎯 САМОЕ ВАЖНОЕ:\n\nКонфигурация мышления — это траектория с чётким пунктом назначения: результат, к которому вы придёте. Если ничего не менять — вы попадёте именно туда.\n\n📊 Вопросов: 4-5\n⏱ Время: ~3-4 минуты\n\n💡 Совет: Отвечайте честно — это поможет мне лучше понять вас.`,
            extendedDesc: `🔬 **ПОЧЕМУ ЭТО ВАЖНО?**\n\nМышление определяет, какие решения вы принимаете и к каким результатам приходите.\n\n**Уровни мышления (от 1 до 9):**\n• **Уровни 1-3:** Конкретное мышление — вы видите отдельные ситуации\n• **Уровни 4-6:** Системное мышление — вы замечаете закономерности\n• **Уровни 7-9:** Стратегическое мышление — вы видите общие законы и прогнозируете\n\n📊 **Вопросов:** зависит от вашего типа восприятия (4-5)\n⏱ **Время:** ~3-4 минуты\n\n💡 **Совет:** Отвечайте честно — это поможет мне лучше понять вас.`,
            total: null
        },
        {
            id: 'behavior', number: 3,
            name: 'КОНФИГУРАЦИЯ ПОВЕДЕНИЯ',
            shortDesc: 'Ваши автоматические реакции',
            detailedDesc: `🔍 ЗДЕСЬ МЫ ИССЛЕДУЕМ:\n\n• Ваши автоматические реакции\n• Как вы действуете в разных ситуациях\n• Какие стратегии поведения закреплены\n\n📊 Вопросов: 8\n⏱ Время: ~3 минуты\n\n💡 Совет: Отвечайте честно — это поможет мне лучше понять вас.`,
            extendedDesc: `🔬 **ПОЧЕМУ ЭТО ВАЖНО?**\n\nПоведение — это то, что видят другие люди. Это ваши автоматические реакции на разные ситуации.\n\n**Что мы измеряем:**\n\n**СБ (Реакция на давление):** от замирания до активной защиты\n**ТФ (Отношение к деньгам):** от «как повезёт» до управления капиталом\n**УБ (Понимание мира):** от суеверий до научного анализа\n**ЧВ (Отношения с людьми):** от сильной привязанности до равного партнёрства\n\n📊 **Вопросов:** 8\n⏱ **Время:** ~3 минуты\n\n💡 **Совет:** Отвечайте честно — это поможет мне лучше понять вас.`,
            total: 8
        },
        {
            id: 'growth', number: 4,
            name: 'ТОЧКА РОСТА',
            shortDesc: 'Где находится рычаг изменений',
            detailedDesc: `⚡ ЧТО МЫ НАЙДЁМ:\n\nГде именно находится рычаг — место, где минимальное усилие даёт максимальные изменения.\n\n📊 Вопросов: 8\n⏱ Время: ~3 минуты\n\n💡 Совет: Отвечайте честно — это поможет мне лучше понять вас.`,
            extendedDesc: `🔬 **ПОЧЕМУ ЭТО ВАЖНО?**\n\nПо пирамиде Роберта Дилтса, изменения на разных уровнях дают разный эффект:\n\n1. **Окружение** — где и с кем вы находитесь (самый слабый рычаг)\n2. **Поведение** — что вы делаете\n3. **Способности** — что вы умеете\n4. **Ценности и убеждения** — что для вас важно\n5. **Идентичность** — кто вы (самый сильный рычаг)\n\n📊 **Вопросов:** 8\n⏱ **Время:** ~3 минуты\n\n💡 **Совет:** Отвечайте честно — это поможет мне лучше понять вас.`,
            total: 8
        },
        {
            id: 'deep', number: 5,
            name: 'ГЛУБИННЫЕ ПАТТЕРНЫ',
            shortDesc: 'Тип привязанности, защитные механизмы',
            detailedDesc: `🔍 ЗДЕСЬ МЫ ИССЛЕДУЕМ:\n\n• Какой у вас тип привязанности (из детства)\n• Какие защитные механизмы вы используете\n• Какие глубинные убеждения управляют вами\n• Чего вы боитесь на самом деле\n\n📊 Вопросов: 10\n⏱ Время: ~5 минут\n\n💡 Совет: Отвечайте честно — это поможет мне лучше понять вас.`,
            extendedDesc: `🔬 **ПОЧЕМУ ЭТО ВАЖНО?**\n\nГлубинные паттерны формируются в детстве и продолжают влиять на вас во взрослой жизни.\n\n**Тип привязанности:**\n• Надёжный — вы уверены в отношениях\n• Тревожный — боитесь, что вас бросят\n• Избегающий — держите дистанцию\n• Отстранённый — обесцениваете отношения\n\n**Защитные механизмы:**\n• Проекция, Рационализация, Отрицание, Регрессия\n\n**Глубинные убеждения:**\n• «Я недостаточно хорош», «Людям нельзя доверять», «Мир опасен», «Я должен быть идеальным»\n\n📊 **Вопросов:** 10\n⏱ **Время:** ~5 минут\n\n💡 **Совет:** Отвечайте честно — чем глубже вы готовы заглянуть, тем точнее будет результат.`,
            total: 10
        }
    ],

    // ============================================
    // УТОЧНЯЮЩИЕ ВОПРОСЫ
    // ============================================
    clarifyingQuestionsDB: {
        "СБ": [
            { level:1, text:"Ты сказал, что замираешь под давлением. Что происходит в этот момент?", options:{"1":"Пустота в голове, слова не идут","2":"Хочется убежать, спрятаться","3":"Внутри всё кипит, но не могу сказать","4":"Просто жду, когда всё закончится"} },
            { level:2, text:"Ты избегаешь конфликтов. А что было в последний раз?", options:{"1":"Просто ушёл, не стал спорить","2":"Согласился, хотя не хотел","3":"Промолчал, сделал вид, что всё нормально","4":"Нашёл предлог, чтобы уйти"} },
            { level:3, text:"Ты соглашаешься внешне, но внутри кипишь. Как часто это происходит?", options:{"1":"Постоянно, каждый день","2":"Часто, несколько раз в неделю","3":"Иногда, когда сильно давят","4":"Редко, стараюсь говорить прямо"} },
            { level:4, text:"Ты внешне спокоен в конфликтах. А что ты чувствуешь внутри?", options:{"1":"Пустоту и отстранённость","2":"Злость и раздражение","3":"Страх и тревогу","4":"Ничего особенного, просто жду"} },
            { level:5, text:"Ты пытаешься сгладить конфликт шуткой. Как люди реагируют?", options:{"1":"Смеются, напряжение уходит","2":"Не всегда понимают юмор","3":"Иногда обижаются","4":"Продолжают давить"} },
            { level:6, text:"Ты умеешь защищать себя. Что помогает тебе сохранять спокойствие?", options:{"1":"Понимание, что конфликт не про меня","2":"Чёткое знание своих границ","3":"Уверенность в своей правоте","4":"Дыхательные техники"} }
        ],
        "ТФ": [
            { level:1, text:"Ты зависишь от других в финансовых вопросах. Что мешает зарабатывать самому?", options:{"1":"Страх неудачи","2":"Не знаю, что умею","3":"Нет возможностей","4":"Лень и прокрастинация"} },
            { level:2, text:"С деньгами 'как повезёт' — это про удачу или про отсутствие плана?", options:{"1":"Про удачу — верю в случай","2":"Про отсутствие плана — не умею планировать","3":"Про лень — не хочу заморачиваться","4":"Про страх — боюсь ошибиться"} },
            { level:3, text:"Ты зарабатываешь трудом. Что тебя останавливает от увеличения дохода?", options:{"1":"Нет времени","2":"Нет энергии","3":"Не знаю, с чего начать","4":"Боюсь рисковать"} },
            { level:4, text:"Ты хорошо зарабатываешь. Куда уходят деньги?", options:{"1":"На жизнь и базовые нужды","2":"На развлечения и удовольствия","3":"Откладываю, но медленно","4":"Инвестирую в развитие"} },
            { level:5, text:"Ты создаёшь системы дохода. Что было самым сложным?", options:{"1":"Начать","2":"Найти команду","3":"Доверять другим","4":"Масштабировать"} },
            { level:6, text:"Ты управляешь капиталом. Что для тебя деньги сейчас?", options:{"1":"Инструмент свободы","2":"Ответственность перед другими","3":"Счёт в игре","4":"Ресурс для больших целей"} }
        ],
        "УБ": [
            { level:1, text:"Ты стараешься не думать о сложном. Что происходит, когда всё же думаешь?", options:{"1":"Тревога нарастает","2":"Голова идёт кругом","3":"Ничего не понимаю","4":"Становится ещё хуже"} },
            { level:2, text:"Ты веришь в знаки и судьбу. А бывало, что твои предсказания не сбывались?", options:{"1":"Да, часто","2":"Иногда","3":"Редко","4":"Всегда сбываются"} },
            { level:3, text:"Ты доверяешь экспертам. Что для тебя авторитет?", options:{"1":"Дипломы и регалии","2":"Опыт и практика","3":"Популярность и известность","4":"Своя интуиция"} },
            { level:4, text:"Ты ищешь заговоры. Что даёт тебе это чувство?", options:{"1":"Ощущение контроля","2":"Объяснение хаоса","3":"Оправдание бездействия","4":"Чувство превосходства"} },
            { level:5, text:"Ты анализируешь факты. Как проверяешь информацию?", options:{"1":"Сравниваю с другими источниками","2":"Проверяю на практике","3":"Спрашиваю у экспертов","4":"Доверяю своей логике"} },
            { level:6, text:"Ты видишь системы и циклы. Что делаешь с этим пониманием?", options:{"1":"Прогнозирую и готовлюсь заранее","2":"Объясняю другим, что происходит","3":"Ищу, где система дает сбой","4":"Просто спокойнее живу"} }
        ],
        "ЧВ": [
            { level:1, text:"Ты сильно привязываешься к людям. Что происходит, когда человек уходит?", options:{"1":"Мир рушится","2":"Долго переживаю","3":"Ищу замену сразу","4":"Закрываюсь от всех"} },
            { level:2, text:"Ты подстраиваешься под других. А помнишь, когда в последний раз делал то, что хотел именно ты?", options:{"1":"Недавно","2":"Давно","3":"Очень давно","4":"Не помню такого"} },
            { level:3, text:"Ты хочешь нравиться. Что для тебя важнее: быть собой или быть принятым?", options:{"1":"Быть принятым любой ценой","2":"Искать компромисс","3":"Быть собой, но мягко","4":"Быть собой, несмотря ни на что"} },
            { level:4, text:"Ты умеешь влиять на людей. Как ты это делаешь?", options:{"1":"Убеждением","2":"Примером","3":"Манипуляцией","4":"Поддержкой и помощью"} },
            { level:5, text:"Ты строишь равные отношения. Что для тебя важно в партнёре?", options:{"1":"Честность","2":"Взаимность","3":"Уважение","4":"Поддержка"} },
            { level:6, text:"Вокруг тебя складывается круг людей. Что их держит рядом?", options:{"1":"Со мной интересно","2":"Я даю им расти","3":"На меня можно опереться","4":"Общее дело и ценности"} }
        ]
    },

    discrepancyQuestions: {
        "people":    { text:"Ты сказал, что про людей не совсем точно. Расскажи подробнее:", options:{"1":"Я вообще не завишу от чужого мнения","2":"Завишу, но меньше, чем описано","3":"Мне всё равно, что думают другие","4":"Другое"} },
        "money":     { text:"С деньгами у тебя действительно проблемы? Какие именно?", options:{"1":"Не хватает на базовые нужды","2":"Не могу накопить","3":"Не знаю, как заработать больше","4":"Боюсь вкладывать и рисковать"} },
        "signs":     { text:"Про знаки и судьбу — ты считаешь, что анализируешь достаточно?", options:{"1":"Да, я всё анализирую","2":"Анализирую, но могу и знаки заметить","3":"Больше анализирую, чем верю в знаки","4":"Другое"} },
        "relations": { text:"В отношениях ты уверен в себе? Расскажи:", options:{"1":"Знаю, чего хочу, и добиваюсь","2":"Знаю, но боюсь проявлять","3":"Не знаю, чего хочу","4":"Мне всё равно"} }
    },

    // ============================================
    // ВОПРОСЫ ЭТАПА 1
    // ============================================
    perception_questions: [
        { id:'p0', text:'Когда принимаешь важное решение, опираешься на:', options:[
            { text:'👥 Мнение и опыт других', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:0,MATERIAL:0} },
            { text:'💭 Внутренние ощущения, интуицию', scores:{EXTERNAL:0,INTERNAL:2,SYMBOLIC:1,MATERIAL:0} },
            { text:'📊 Факты, цифры, данные', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'🤝 Советуюсь с близкими, но решаю сам', scores:{EXTERNAL:1,INTERNAL:1,SYMBOLIC:0,MATERIAL:0} }
        ]},
        { id:'p1', text:'Что вызывает тревогу?', options:[
            { text:'😟 Что не поймут, отвергнут', scores:{EXTERNAL:1,INTERNAL:0,SYMBOLIC:2,MATERIAL:0} },
            { text:'⚠️ Потеряю контроль над ситуацией', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:0,MATERIAL:2} },
            { text:'💰 Не будет денег, стабильности', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'🤔 Сделаю неправильный выбор', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:1,MATERIAL:0} }
        ]},
        { id:'p2', text:'В компании незнакомых людей ты:', options:[
            { text:'👀 Наблюдаю, изучаю правила', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:0,MATERIAL:0} },
            { text:'🎧 Прислушиваюсь к себе', scores:{EXTERNAL:0,INTERNAL:2,SYMBOLIC:1,MATERIAL:0} },
            { text:'🎯 Ищу чем заняться', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'💫 Стараюсь понравиться', scores:{EXTERNAL:1,INTERNAL:0,SYMBOLIC:0,MATERIAL:0} }
        ]},
        { id:'p3', text:'Что важнее в работе?', options:[
            { text:'🎯 Смысл, предназначение', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:2,MATERIAL:0} },
            { text:'📈 Конкретный результат', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'🏆 Признание, статус', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:1,MATERIAL:0} },
            { text:'🌱 Процесс, развитие', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:0,MATERIAL:0} }
        ]},
        { id:'p4', text:'Когда устал, восстанавливаешься:', options:[
            { text:'👥 Иду к людям за поддержкой', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:0,MATERIAL:0} },
            { text:'🏠 Уединяюсь с собой', scores:{EXTERNAL:0,INTERNAL:2,SYMBOLIC:1,MATERIAL:0} },
            { text:'📋 Занимаюсь делами, рутиной', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'📚 Ухожу в фильмы/книги', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:1,MATERIAL:0} }
        ]},
        { id:'p5', text:'Реакция на критику:', options:[
            { text:'😔 Обижаюсь, переживаю', scores:{EXTERNAL:1,INTERNAL:0,SYMBOLIC:2,MATERIAL:0} },
            { text:'🔍 Анализирую, исправляю', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:0,MATERIAL:1} },
            { text:'🛡️ Защищаюсь, объясняю', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:0,MATERIAL:0} },
            { text:'🤷 Обесцениваю критикующего', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:0,MATERIAL:0} }
        ]},
        { id:'p6', text:'Что замечаешь в новом помещении?', options:[
            { text:'👥 Людей, кто где находится', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:0,MATERIAL:0} },
            { text:'✨ Атмосферу, освещение', scores:{EXTERNAL:0,INTERNAL:1,SYMBOLIC:1,MATERIAL:0} },
            { text:'🏠 Предметы, структуру', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'💭 Свои ощущения', scores:{EXTERNAL:0,INTERNAL:2,SYMBOLIC:0,MATERIAL:0} }
        ]},
        { id:'p7', text:'Что для тебя успех?', options:[
            { text:'🏆 Признание, уважение других', scores:{EXTERNAL:2,INTERNAL:0,SYMBOLIC:1,MATERIAL:0} },
            { text:'😌 Внутренняя гармония', scores:{EXTERNAL:0,INTERNAL:2,SYMBOLIC:1,MATERIAL:0} },
            { text:'💰 Достижения, статус, блага', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:2} },
            { text:'🎯 Реализовать предназначение', scores:{EXTERNAL:0,INTERNAL:0,SYMBOLIC:2,MATERIAL:0} }
        ]}
    ],

    // ============================================
    // ВОПРОСЫ ЭТАПА 2
    // ============================================
    thinking_questions: {
        external: [
            { text:'Когда в группе возникает конфликт, вы скорее:', options:[
                {text:'🙈 Не замечаю, пока меня не втянут',level:1,measures:'ЧВ'},
                {text:'🔍 Замечаю только то, что касается меня',level:2,measures:'ЧВ'},
                {text:'👥 Вижу кто на чьей стороне',level:3,measures:'ЧВ'},
                {text:'📋 Понимаю явные причины',level:4,measures:'ЧВ'},
                {text:'🎯 Анализирую позиции и интересы',level:5,measures:'ЧВ'},
                {text:'🔗 Вижу систему отношений',level:6,measures:'ЧВ'},
                {text:'📜 Понимаю связь с историей группы',level:7,measures:'ЧВ'},
                {text:'🔮 Могу предсказать развитие',level:8,measures:'ЧВ'},
                {text:'🔄 Вижу повторяющиеся паттерны',level:9,measures:'ЧВ'}
            ]},
            { text:'Как вы понимаете, почему люди поступают так, а не иначе?', options:[
                {text:'🤷 Они просто такие',level:1,measures:'ЧВ'},
                {text:'🌍 Так сложились обстоятельства',level:2,measures:'ЧВ'},
                {text:'💭 У них явные мотивы',level:3,measures:'ЧВ'},
                {text:'📚 Анализирую их прошлый опыт',level:4,measures:'ЧВ'},
                {text:'💎 Понимаю их ценности',level:5,measures:'ЧВ'},
                {text:'🏠 Вижу связь с окружением',level:6,measures:'ЧВ'},
                {text:'🔮 Могу предсказать реакции',level:7,measures:'ЧВ'},
                {text:'🎭 Замечаю архетипы',level:8,measures:'ЧВ'},
                {text:'📜 Понимаю универсальные законы',level:9,measures:'ЧВ'}
            ]},
            { text:'Когда вас критикуют, ваша мысль:', options:[
                {text:'😤 Они ко мне придираются',level:1,measures:'СБ'},
                {text:'😞 Я что-то сделал не так',level:2,measures:'СБ'},
                {text:'🤔 В этот раз я ошибся',level:3,measures:'СБ'},
                {text:'🔄 У меня повторяется паттерн ошибок',level:4,measures:'СБ'},
                {text:'💭 Это связано с моими убеждениями',level:5,measures:'СБ'},
                {text:'🎭 Это часть моей роли',level:6,measures:'СБ'},
                {text:'📚 Это жизненный урок',level:7,measures:'СБ'},
                {text:'🌍 Универсальный паттерн',level:8,measures:'СБ'},
                {text:'📜 Законы развития',level:9,measures:'СБ'}
            ]},
            { text:'Как вы относитесь к деньгам?', options:[
                {text:'🌊 Приходят и уходят',level:1,measures:'ТФ'},
                {text:'🔍 Нужно искать возможности',level:2,measures:'ТФ'},
                {text:'💪 Результат действий',level:3,measures:'ТФ'},
                {text:'📊 Система, которую можно выстроить',level:4,measures:'ТФ'},
                {text:'⚡ Энергия и свобода',level:5,measures:'ТФ'},
                {text:'🎯 Инструмент для целей',level:6,measures:'ТФ'},
                {text:'📈 Часть экономики',level:7,measures:'ТФ'},
                {text:'💎 Отражение ценности',level:8,measures:'ТФ'},
                {text:'🔄 Универсальный эквивалент',level:9,measures:'ТФ'}
            ]},
            { text:'Когда происходит что-то непонятное:', options:[
                {text:'😴 Стараюсь не думать',level:1,measures:'УБ'},
                {text:'🔮 Ищу знаки',level:2,measures:'УБ'},
                {text:'📚 Обращаюсь к эксперту',level:3,measures:'УБ'},
                {text:'🔍 Ищу заговор',level:4,measures:'УБ'},
                {text:'📊 Анализирую факты',level:5,measures:'УБ'},
                {text:'🏛️ Смотрю в контексте системы',level:6,measures:'УБ'},
                {text:'📜 Ищу аналогии в истории',level:7,measures:'УБ'},
                {text:'🧠 Строю модели',level:8,measures:'УБ'},
                {text:'🔗 Ищу закономерности',level:9,measures:'УБ'}
            ]}
        ],
        internal: [
            { text:'Как ищешь смысл в происходящем?', options:[
                {text:'😴 Не ищу',level:1,measures:'УБ'},
                {text:'💭 Чувствую, есть или нет',level:2,measures:'УБ'},
                {text:'📚 Спрашиваю у знающих',level:3,measures:'УБ'},
                {text:'💖 Анализирую свои чувства',level:4,measures:'УБ'},
                {text:'🔍 Ищу глубинные причины',level:5,measures:'УБ'},
                {text:'💎 Вижу связи с ценностями',level:6,measures:'УБ'},
                {text:'📖 Понимаю жизненные уроки',level:7,measures:'УБ'},
                {text:'🎭 Вижу архетипические сюжеты',level:8,measures:'УБ'},
                {text:'🌌 Понимаю универсальные смыслы',level:9,measures:'УБ'}
            ]},
            { text:'Как выбираешь, чем заниматься?', options:[
                {text:'🍃 Как получится',level:1,measures:'ТФ'},
                {text:'😊 По настроению',level:2,measures:'ТФ'},
                {text:'👥 По совету',level:3,measures:'ТФ'},
                {text:'🔍 Анализирую интересы',level:4,measures:'ТФ'},
                {text:'🎯 Ищу призвание',level:5,measures:'ТФ'},
                {text:'💎 Связываю с ценностями',level:6,measures:'ТФ'},
                {text:'📜 Понимаю предназначение',level:7,measures:'ТФ'},
                {text:'🛤️ Вижу свой путь',level:8,measures:'ТФ'},
                {text:'🌟 Следую миссии',level:9,measures:'ТФ'}
            ]},
            { text:'В конфликте с близким по духу:', options:[
                {text:'😰 Теряюсь',level:1,measures:'СБ'},
                {text:'🚶 Ухожу',level:2,measures:'СБ'},
                {text:'👍 Соглашаюсь',level:3,measures:'СБ'},
                {text:'🔍 Анализирую',level:4,measures:'СБ'},
                {text:'🤝 Ищу компромисс',level:5,measures:'СБ'},
                {text:'💎 Понимаю его ценности',level:6,measures:'СБ'},
                {text:'📚 Вижу урок',level:7,measures:'СБ'},
                {text:'🎭 Понимаю архетип',level:8,measures:'СБ'},
                {text:'📜 Вижу закономерность',level:9,measures:'СБ'}
            ]},
            { text:'В отношениях с единомышленниками:', options:[
                {text:'🪢 Привязываюсь',level:1,measures:'ЧВ'},
                {text:'🔄 Подстраиваюсь',level:2,measures:'ЧВ'},
                {text:'✨ Показываю себя',level:3,measures:'ЧВ'},
                {text:'💭 Понимаю их',level:4,measures:'ЧВ'},
                {text:'🤝 Строю партнерство',level:5,measures:'ЧВ'},
                {text:'🏛️ Создаю сообщество',level:6,measures:'ЧВ'},
                {text:'💫 Вдохновляю',level:7,measures:'ЧВ'},
                {text:'🎭 Вижу архетипы',level:8,measures:'ЧВ'},
                {text:'📜 Понимаю законы',level:9,measures:'ЧВ'}
            ]},
            { text:'Близкий человек вдруг отдалился. Как понимаешь, что происходит?', options:[
                {text:'😢 Значит, я ему больше не нужен',level:1,measures:'ЧВ'},
                {text:'🤷 Настроение у него такое',level:2,measures:'ЧВ'},
                {text:'💬 Спрошу у общих знакомых',level:3,measures:'ЧВ'},
                {text:'🔍 Вспоминаю, что между нами было',level:4,measures:'ЧВ'},
                {text:'💭 Ставлю себя на его место',level:5,measures:'ЧВ'},
                {text:'🏠 Смотрю, что происходит в его жизни',level:6,measures:'ЧВ'},
                {text:'🔮 Понимаю, к чему это ведёт',level:7,measures:'ЧВ'},
                {text:'🔄 Узнаю знакомый цикл сближения-отдаления',level:8,measures:'ЧВ'},
                {text:'📜 Вижу закономерность, общую для близости',level:9,measures:'ЧВ'}
            ]}
        ]
    },

    // ============================================
    // ВОПРОСЫ ЭТАПА 3
    // ============================================
    behavior_questions: [
        { text:'Начальник кричит несправедливо. Реакция:', options:[
            {text:'😶 Теряюсь, слова не идут',level:1,strategy:'СБ'},
            {text:'🚶 Придумываю причину уйти',level:2,strategy:'СБ'},
            {text:'😤 Соглашаюсь внешне, внутри кипит',level:3,strategy:'СБ'},
            {text:'😌 Сохраняю спокойствие, молчу',level:4,strategy:'СБ'},
            {text:'😄 Пытаюсь перевести в шутку',level:5,strategy:'СБ'},
            {text:'🗣️ Спокойно говорю, что не согласен',level:6,strategy:'СБ'}
        ]},
        { text:'Срочно нужны деньги. Первое действие:', options:[
            {text:'🙏 Попрошу в долг',level:1,strategy:'ТФ'},
            {text:'💼 Найду разовую подработку',level:2,strategy:'ТФ'},
            {text:'🏪 Продам что-то из вещей',level:3,strategy:'ТФ'},
            {text:'🎨 Предложу свои услуги',level:4,strategy:'ТФ'},
            {text:'💰 Использую накопления',level:5,strategy:'ТФ'},
            {text:'📊 Создам системный доход',level:6,strategy:'ТФ'}
        ]},
        { text:'Экономический кризис. Твое объяснение:', options:[
            {text:'😴 Стараюсь не думать',level:1,strategy:'УБ'},
            {text:'🔮 Судьба, знак, карма',level:2,strategy:'УБ'},
            {text:'📚 Верю экспертам',level:3,strategy:'УБ'},
            {text:'🎭 Кто-то специально устроил',level:4,strategy:'УБ'},
            {text:'📊 Анализирую факты сам',level:5,strategy:'УБ'},
            {text:'🔄 Понимаю экономические циклы',level:6,strategy:'УБ'}
        ]},
        { text:'В новом коллективе в первые дни:', options:[
            {text:'🤝 Держусь с тем, кто принял',level:1,strategy:'ЧВ'},
            {text:'👀 Наблюдаю и копирую',level:2,strategy:'ЧВ'},
            {text:'✨ Стараюсь запомниться',level:3,strategy:'ЧВ'},
            {text:'🎯 Смотрю, кто на что влияет',level:4,strategy:'ЧВ'},
            {text:'🤝 Ищу общие интересы',level:5,strategy:'ЧВ'},
            {text:'🌱 Выстраиваю отношения постепенно',level:6,strategy:'ЧВ'}
        ]},
        { text:'Близкий снова раздражает. Ты:', options:[
            {text:'😔 Терплю, не знаю как начать',level:1,strategy:'СБ'},
            {text:'🚶 Незаметно дистанцируюсь',level:2,strategy:'СБ'},
            {text:'💬 Намекаю, прямо не говорю',level:3,strategy:'СБ'},
            {text:'🌋 Коплю и потом взрываюсь',level:4,strategy:'СБ'},
            {text:'🤔 Пытаюсь понять причину',level:5,strategy:'СБ'},
            {text:'🗣️ Говорю прямо о чувствах',level:6,strategy:'СБ'}
        ]},
        { text:'Возможность заработать, но нужно вложиться:', options:[
            {text:'🔍 Ищу вариант без вложений',level:1,strategy:'ТФ'},
            {text:'🎲 Пробую на минимуме',level:2,strategy:'ТФ'},
            {text:'🧮 Считаю, сколько заработаю',level:3,strategy:'ТФ'},
            {text:'📊 Оцениваю вложения и доход',level:4,strategy:'ТФ'},
            {text:'⚙️ Думаю, как встроить в процессы',level:5,strategy:'ТФ'},
            {text:'📈 Анализирую, как масштабировать',level:6,strategy:'ТФ'}
        ]},
        { text:'Коллега поступил странно, не понимаю зачем:', options:[
            {text:'😐 Не придаю значения',level:1,strategy:'УБ'},
            {text:'🤷 Он просто такой человек',level:2,strategy:'УБ'},
            {text:'📞 Спрашиваю у других',level:3,strategy:'УБ'},
            {text:'🎭 Он что-то замышляет',level:4,strategy:'УБ'},
            {text:'🔄 Ищу паттерн в поведении',level:5,strategy:'УБ'},
            {text:'🧠 Анализирую его мотивы',level:6,strategy:'УБ'}
        ]},
        { text:'Нужна помощь от того, с кем сложные отношения:', options:[
            {text:'😟 Не прошу, боюсь отказа',level:1,strategy:'ЧВ'},
            {text:'🎁 Сначала сделаю для него',level:2,strategy:'ЧВ'},
            {text:'🎭 Создам ситуацию, где сам предложит',level:3,strategy:'ЧВ'},
            {text:'💬 Объясню, почему мне важно',level:4,strategy:'ЧВ'},
            {text:'🤝 Говорю прямо, предлагаю обмен',level:5,strategy:'ЧВ'},
            {text:'🌱 Строю долгосрочные отношения',level:6,strategy:'ЧВ'}
        ]}
    ],

    // ============================================
    // ВОПРОСЫ ЭТАПА 4
    // ============================================
    growth_questions: [
        { text:'Если что-то не получается, причина в:', options:[
            {text:'🌍 Обстоятельствах, людях вокруг',dilts:'ENVIRONMENT'},
            {text:'🛠️ Моих действиях',dilts:'BEHAVIOR'},
            {text:'📚 Нехватке навыков, опыта',dilts:'CAPABILITIES'},
            {text:'💎 Моих убеждениях, ценностях',dilts:'VALUES'},
            {text:'🧠 Моей личности, характере',dilts:'IDENTITY'}
        ]},
        { text:'Самый ценный результат работы с психологом:', options:[
            {text:'🤝 Научиться взаимодействовать с людьми',dilts:'ENVIRONMENT'},
            {text:'🔄 Изменить привычки и реакции',dilts:'BEHAVIOR'},
            {text:'🎓 Развить новые навыки',dilts:'CAPABILITIES'},
            {text:'💎 Понять свои ценности',dilts:'VALUES'},
            {text:'🔍 Найти себя',dilts:'IDENTITY'}
        ]},
        { text:'Когда злишься на себя, чаще всего за что?', options:[
            {text:'🌍 Не смог повлиять на ситуацию',dilts:'ENVIRONMENT'},
            {text:'🛠️ Сделал не то, поступил неправильно',dilts:'BEHAVIOR'},
            {text:'📚 Не справился, не хватило умения',dilts:'CAPABILITIES'},
            {text:'💎 Предал свои принципы',dilts:'VALUES'},
            {text:'😞 Что я такой бестолковый',dilts:'IDENTITY'}
        ]},
        { text:'Что труднее всего в отношениях с близкими?', options:[
            {text:'🌍 Они меня не понимают',dilts:'ENVIRONMENT'},
            {text:'🔄 Мое собственное поведение',dilts:'BEHAVIOR'},
            {text:'📚 Не умею донести',dilts:'CAPABILITIES'},
            {text:'💎 У нас разные ценности',dilts:'VALUES'},
            {text:'😔 Теряю себя',dilts:'IDENTITY'}
        ]},
        { text:'Что останавливает от больших целей?', options:[
            {text:'🌍 Внешние обстоятельства',dilts:'ENVIRONMENT'},
            {text:'🔄 Не знаю с чего начать',dilts:'BEHAVIOR'},
            {text:'📚 Не хватает знаний, навыков',dilts:'CAPABILITIES'},
            {text:'💎 Не уверен, что важно для меня',dilts:'VALUES'},
            {text:'😔 Не верю, что способен',dilts:'IDENTITY'}
        ]},
        { text:'Как объясняешь свои успехи?', options:[
            {text:'🍀 Повезло, оказался в нужном месте',dilts:'ENVIRONMENT'},
            {text:'💪 Сделал правильно, приложил усилия',dilts:'BEHAVIOR'},
            {text:'🎯 Смог, справился',dilts:'CAPABILITIES'},
            {text:'💎 Был верен принципам',dilts:'VALUES'},
            {text:'🧠 Я такой человек',dilts:'IDENTITY'}
        ]},
        { text:'Что хочешь изменить в себе в первую очередь?', options:[
            {text:'🌍 Свою жизнь, окружение',dilts:'ENVIRONMENT'},
            {text:'🔄 Привычки, реакции',dilts:'BEHAVIOR'},
            {text:'📚 Способности, навыки',dilts:'CAPABILITIES'},
            {text:'💎 Ценности, убеждения',dilts:'VALUES'},
            {text:'🧠 Личность, характер',dilts:'IDENTITY'}
        ]},
        { text:'О чем чаще всего жалеешь?', options:[
            {text:'🌍 Что не сложились обстоятельства',dilts:'ENVIRONMENT'},
            {text:'🔄 О том, что сделал или не сделал',dilts:'BEHAVIOR'},
            {text:'📚 Что не умел, не знал',dilts:'CAPABILITIES'},
            {text:'💎 Что предал свои принципы',dilts:'VALUES'},
            {text:'😔 Что был не собой',dilts:'IDENTITY'}
        ]}
    ],

    // ============================================
    // ВОПРОСЫ ЭТАПА 5
    // ============================================
    deep_questions: [
        { text:'В детстве, когда расстраивался, родители:', options:[
            {text:'🤗 Утешали, обнимали',pattern:'secure',target:'attachment'},
            {text:'💪 Говорили "не плачь, будь сильным"',pattern:'avoidant',target:'attachment'},
            {text:'🎭 Реагировали по-разному',pattern:'anxious',target:'attachment'},
            {text:'🚶 Оставляли одного остыть',pattern:'dismissive',target:'attachment'}
        ]},
        { text:'Когда случается плохое, я обычно:', options:[
            {text:'🔍 Ищу виноватого',pattern:'projection',target:'defense'},
            {text:'🧠 Объясняю логически',pattern:'rationalization',target:'defense'},
            {text:'😴 Стараюсь не думать',pattern:'denial',target:'defense'},
            {text:'😤 Злюсь и раздражаюсь',pattern:'regression',target:'defense'}
        ]},
        { text:'В отношениях чаще всего боюсь, что:', options:[
            {text:'😢 Меня бросят',pattern:'abandonment',target:'fear'},
            {text:'🎮 Будут управлять мной',pattern:'control',target:'fear'},
            {text:'🙅 Не поймут',pattern:'misunderstanding',target:'fear'},
            {text:'😔 Не справлюсь',pattern:'inadequacy',target:'fear'}
        ]},
        { text:'Какое утверждение ближе всего?', options:[
            {text:'😞 Я недостаточно хорош',pattern:'not_good_enough',target:'belief'},
            {text:'🤔 Людям нельзя доверять',pattern:'no_trust',target:'belief'},
            {text:'🌍 Мир опасен',pattern:'world_dangerous',target:'belief'},
            {text:'⭐ Я должен быть идеальным',pattern:'perfectionism',target:'belief'}
        ]},
        { text:'Когда злюсь, я обычно:', options:[
            {text:'💥 Выплёскиваю на других',pattern:'externalize',target:'anger_style'},
            {text:'🤐 Подавляю и молчу',pattern:'suppress',target:'anger_style'},
            {text:'🏠 Ухожу в себя',pattern:'withdraw',target:'anger_style'},
            {text:'🔧 Ищу решение',pattern:'constructive',target:'anger_style'}
        ]},
        { text:'Мои друзья сказали бы, что я:', options:[
            {text:'😭 Слишком эмоциональный',pattern:'emotional',target:'social_role'},
            {text:'🧠 Слишком рациональный',pattern:'rational',target:'social_role'},
            {text:'🤝 Надёжный, но закрытый',pattern:'reliable_closed',target:'social_role'},
            {text:'🎉 Душа компании',pattern:'soul_company',target:'social_role'}
        ]},
        { text:'В стрессе я:', options:[
            {text:'😰 Суечусь и паникую',pattern:'panic',target:'stress_response'},
            {text:'😶 Замираю и тупею',pattern:'freeze',target:'stress_response'},
            {text:'🎯 Становлюсь сверхсобранным',pattern:'hyperfocus',target:'stress_response'},
            {text:'🤝 Ищу поддержку',pattern:'seek_support',target:'stress_response'}
        ]},
        { text:'Что для тебя самое важное в жизни?', options:[
            {text:'🛡️ Безопасность, стабильность',pattern:'security',target:'core_value'},
            {text:'🕊️ Свобода, независимость',pattern:'freedom',target:'core_value'},
            {text:'❤️ Любовь, близость',pattern:'love',target:'core_value'},
            {text:'🏆 Достижения, успех',pattern:'achievement',target:'core_value'}
        ]},
        { text:'Когда меня критикуют, я:', options:[
            {text:'😢 Обижаюсь и закрываюсь',pattern:'shutdown',target:'criticism_response'},
            {text:'⚔️ Атакую в ответ',pattern:'counterattack',target:'criticism_response'},
            {text:'🔍 Анализирую, правы ли они',pattern:'analyze',target:'criticism_response'},
            {text:'👍 Соглашаюсь, чтобы не спорить',pattern:'appease',target:'criticism_response'}
        ]},
        { text:'Моя главная внутренняя проблема:', options:[
            {text:'😔 Страх быть покинутым',pattern:'abandonment_fear',target:'core_issue'},
            {text:'😰 Страх неудачи',pattern:'failure_fear',target:'core_issue'},
            {text:'🎭 Страх быть собой',pattern:'authenticity_fear',target:'core_issue'},
            {text:'⚔️ Страх конфликтов',pattern:'conflict_fear',target:'core_issue'}
        ]}
    ],

    // ============================================
    // МОБИЛЬНАЯ ОПТИМИЗАЦИЯ
    // ============================================
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    optimizeMobileView() {
        if (!this.isMobile()) return;
        const container = document.getElementById('testChatContainer');
        if (!container) return;

        let vp = document.querySelector('meta[name="viewport"]');
        if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
        vp.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';

        Object.assign(document.body.style, { overflow:'hidden', position:'fixed', top:'0', left:'0', right:'0', bottom:'0' });

        const updateHeight = () => {
            const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            container.style.height = h + 'px';
            container.style.minHeight = h + 'px';
        };
        updateHeight();
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeight);
            window.visualViewport.addEventListener('scroll', updateHeight);
        }
        setTimeout(() => window.scrollTo(0, 1), 100);
        container.addEventListener('touchmove', (e) => {
            const msg = document.getElementById('testChatMessages');
            if (msg && msg.contains(e.target)) return;
            e.preventDefault();
        }, { passive: false });
    },

    // ============================================
    // РАСЧЁТЫ
    // ============================================
    // При ничьей по сумме очков решает число «сильных» (2-балльных)
    // выборов данной шкалы — раньше все ничьи молча падали в
    // INTERNAL/MATERIAL и завышали «Практико-ориентированный» тип.
    _strongPicks(scale) {
        return (this.answers||[]).filter(a=>a.stage==='perception'&&a.scores&&a.scores[scale]===2).length;
    },
    _pickSide(a, b, scoreA, scoreB) {
        if (scoreA !== scoreB) return scoreA > scoreB ? a : b;
        const sa = this._strongPicks(a), sb = this._strongPicks(b);
        if (sa !== sb) return sa > sb ? a : b;
        return a; // полная ничья: EXTERNAL / MATERIAL
    },
    determinePerceptionType() {
        const {EXTERNAL, INTERNAL, SYMBOLIC, MATERIAL} = this.perceptionScores;
        const attention = this._pickSide('EXTERNAL','INTERNAL',EXTERNAL,INTERNAL);
        const anxiety   = this._pickSide('MATERIAL','SYMBOLIC',MATERIAL,SYMBOLIC);
        if (attention==='EXTERNAL' && anxiety==='SYMBOLIC') return 'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ';
        if (attention==='EXTERNAL' && anxiety==='MATERIAL') return 'СТАТУСНО-ОРИЕНТИРОВАННЫЙ';
        if (attention==='INTERNAL' && anxiety==='SYMBOLIC') return 'СМЫСЛО-ОРИЕНТИРОВАННЫЙ';
        return 'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ';
    },

    calculateThinkingLevel() {
        // thinkingScores — гистограмма {уровень: сколько ответов}. Уровень
        // мышления = средний уровень выбранных ответов (1–9), округлённый.
        // Среднее (а не сумма) не зависит от размера банка (external 5
        // вопросов / internal 4), поэтому обе ветки меряются одной линейкой.
        let sum = 0, count = 0;
        for (const [lvl, n] of Object.entries(this.thinkingScores)) { sum += Number(lvl) * n; count += n; }
        if (!count) return 1;
        return Math.max(1, Math.min(9, Math.round(sum / count)));
    },

    getLevelGroup(l) { return l<=3?'1-3':l<=6?'4-6':'7-9'; },

    calculateFinalLevel() {
        const s2 = this.thinkingLevel;
        const s3 = this.stage3Scores.length ? this.stage3Scores.reduce((a,b)=>a+b,0)/this.stage3Scores.length : s2;
        return Math.round((s2+s3)/2);
    },

    determineDominantDilts() {
        let max=0, dominant='BEHAVIOR';
        for (const [k,v] of Object.entries(this.diltsCounts)) { if (v>max) {max=v; dominant=k;} }
        return dominant;
    },

    // 16 архетипов = 4 типа восприятия × 4 ведущих вектора. Раньше пользователь
    // получал «СБ-2_ТФ-1_УБ-3_ЧВ-6» — артикул, не портрет. Архетип даёт человеку
    // читаемую формулировку, под которой код профиля остаётся вторичной деталью.
    getArchetypeTitle(perceptionType, sbLevel, tfLevel, ubLevel, chvLevel) {
        const vectors = [
            ['СБ', sbLevel||0], ['ТФ', tfLevel||0],
            ['УБ', ubLevel||0], ['ЧВ', chvLevel||0]
        ];
        vectors.sort((a,b) => b[1] - a[1]);
        const dominant = vectors[0][0];
        const archetypes = {
            'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ': {
                'СБ': '🕊️ Чуткий миротворец',
                'ТФ': '🤝 Социальный коннектор',
                'УБ': '👁️ Эмпатичный наблюдатель',
                'ЧВ': '✨ Душа компании'
            },
            'СТАТУСНО-ОРИЕНТИРОВАННЫЙ': {
                'СБ': '🛡️ Защитник позиций',
                'ТФ': '🏆 Достигатор',
                'УБ': '♟️ Стратег репутации',
                'ЧВ': '👑 Лидер сообщества'
            },
            'СМЫСЛО-ОРИЕНТИРОВАННЫЙ': {
                'СБ': '🗿 Несгибаемый созерцатель',
                'ТФ': '🎯 Идейный предприниматель',
                'УБ': '🔭 Мыслитель-исследователь',
                'ЧВ': '🧭 Архетипический проводник'
            },
            'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ': {
                'СБ': '⚔️ Спокойный воин',
                'ТФ': '🏗️ Системный строитель',
                'УБ': '📊 Аналитик фактов',
                'ЧВ': '🧰 Прагматичный наставник'
            }
        };
        return archetypes[perceptionType]?.[dominant] || '🌀 Многогранный искатель';
    },

    calculateFinalProfile() {
        const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 3;
        const sb=avg(this.behavioralLevels['СБ']), tf=avg(this.behavioralLevels['ТФ']),
              ub=avg(this.behavioralLevels['УБ']), cv=avg(this.behavioralLevels['ЧВ']);
        const sbR=Math.round(sb), tfR=Math.round(tf), ubR=Math.round(ub), cvR=Math.round(cv);
        return {
            displayName: `СБ-${sbR}_ТФ-${tfR}_УБ-${ubR}_ЧВ-${cvR}`,
            archetype: this.getArchetypeTitle(this.perceptionType, sbR, tfR, ubR, cvR),
            perceptionType: this.perceptionType, thinkingLevel: this.thinkingLevel,
            sbLevel:sbR, tfLevel:tfR, ubLevel:ubR, chvLevel:cvR,
            dominantDilts: this.determineDominantDilts(), diltsCounts: this.diltsCounts
        };
    },

    // Веса паттернов этапа 5 → тип привязанности. Раньше тип определялся
    // ОДНИМ ретроспективным вопросом про детство; теперь прямой вопрос
    // остаётся главным (вес 3), а косвенные сигналы из остальных вопросов
    // (страхи, стиль гнева, реакция на критику и т.д.) добавляют по 1 —
    // согласованно с теорией привязанности.
    ATTACH_SIGNALS: {
        secure:{secure:3}, anxious:{anxious:3}, avoidant:{avoidant:3}, dismissive:{dismissive:3},
        abandonment:{anxious:1}, control:{avoidant:1},
        externalize:{anxious:1}, suppress:{avoidant:1}, withdraw:{dismissive:1}, constructive:{secure:1},
        emotional:{anxious:1}, rational:{dismissive:1}, reliable_closed:{avoidant:1}, soul_company:{secure:1},
        panic:{anxious:1}, seek_support:{secure:1},
        shutdown:{anxious:1}, appease:{anxious:1}, analyze:{secure:1},
        abandonment_fear:{anxious:1}
    },
    analyzeDeepPatterns() {
        const p = {secure:0,anxious:0,avoidant:0,dismissive:0};
        let direct = null; // ответ на прямой вопрос о привязанности — тай-брейк
        (this.deepAnswers||[]).forEach(a => {
            if (a.pattern && p[a.pattern]!==undefined && !direct) direct = a.pattern;
            const w = this.ATTACH_SIGNALS[a.pattern];
            if (w) for (const [k,v] of Object.entries(w)) p[k]+=v;
        });
        let max=-1, dominant=direct||'secure';
        for (const [k,v] of Object.entries(p)) {
            if (v>max || (v===max && k===direct)) { max=v; dominant=k; }
        }
        const map = {secure:'🤗 Надежный',anxious:'😥 Тревожный',avoidant:'🛡️ Избегающий',dismissive:'🏔️ Отстраненный'};
        return { attachment: map[dominant]||'🤗 Надежный', patterns: p, direct: direct };
    },

    // ============================================
    // ИНТЕРПРЕТАЦИИ
    // ============================================

    // Грузит расширенные интерпретации с бэка (для этапа 4 — распределение
    // Дилтса с what_means/lever/blind_spot). Параллельно с прохождением
    // теста, не блокирует UI. При ошибке тест продолжает работать на
    // встроенных fallback-текстах.
    async _loadInterpretations() {
        if (this.interpretations) return this.interpretations;
        try {
            const r = await fetch(TEST_API_BASE_URL + '/api/test/interpretations');
            if (r.ok) {
                this.interpretations = await r.json();
                return this.interpretations;
            }
        } catch (e) {
            console.warn('Failed to load interpretations:', e);
        }
        this.interpretations = {};
        return this.interpretations;
    },

    // Распределение по 5 уровням Дилтса в процентах — для визуализации
    // в showStage4Result. Сумма всегда ≈100%.
    getDiltsDistribution() {
        const total = Object.values(this.diltsCounts || {}).reduce((a, b) => a + b, 0) || 1;
        const r = {};
        for (const k of ['ENVIRONMENT', 'BEHAVIOR', 'CAPABILITIES', 'VALUES', 'IDENTITY']) {
            r[k] = Math.round(100 * (this.diltsCounts?.[k] || 0) / total);
        }
        return r;
    },

    // Реальная confidence для этапа 4 — из соответствия типа восприятия
    // (этап 1) и доминанты Дилтса (этап 4). Раньше в production confidence
    // не показывалась вообще; в test-modules была захардкожена 0.7.
    calculateStage4Confidence() {
        const dominant = this.determineDominantDilts();
        const expected = {
            'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ': ['ENVIRONMENT', 'BEHAVIOR'],
            'СТАТУСНО-ОРИЕНТИРОВАННЫЙ': ['BEHAVIOR', 'CAPABILITIES'],
            'СМЫСЛО-ОРИЕНТИРОВАННЫЙ': ['VALUES', 'IDENTITY'],
            'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ': ['BEHAVIOR', 'CAPABILITIES']
        };
        if (expected[this.perceptionType]?.includes(dominant)) return 0.85;
        if (expected[this.perceptionType]) return 0.55;
        return 0.6;
    },

    // НОВЫЙ метод — раньше для этапа 4 в production не было полной
    // интерпретации. Возвращает структуру с доминантой Дилтса,
    // распределением по 5 уровням, what_means/lever/blind_spot и
    // confidence. Опирается на JSON, загруженный _loadInterpretations.
    getStage4Interpretation() {
        const dominant = this.determineDominantDilts();
        const cfg = this.interpretations?.stage4?.dilts_levels?.[dominant];
        const distribution = this.getDiltsDistribution();
        const confidence = this.calculateStage4Confidence();
        if (cfg) {
            return {
                dominant: dominant,
                title: cfg.title,
                icon: cfg.icon,
                what_means: cfg.what_means,
                lever: cfg.lever,
                blind_spot: cfg.blind_spot,
                distribution: distribution,
                confidence: confidence
            };
        }
        // Fallback (JSON не загрузился) — раньше отдавали только title+distribution,
        // и стадия 4 показывала пустой результат при сбое /api/test/interpretations.
        // Теперь захардкорены what_means/lever/blind_spot для каждого из 5 уровней
        // Дилтса, чтобы итог был осмысленным даже без бэка.
        const fallbackLevels = {
            ENVIRONMENT: {
                title: 'Окружение', icon: '🌍',
                what_means: 'Вы объясняете происходящее внешними обстоятельствами: местом, людьми, временем. Изменения вы ищете снаружи — в смене работы, окружения, города.',
                lever: 'Меняйте контекст осознанно: один новый человек или среда в неделю. Это самый быстрый способ сдвинуть состояние.',
                blind_spot: 'Легко застрять в позиции «я ни при чём» — кажется, что причины всегда вовне, и поэтому сложно увидеть свою роль.'
            },
            BEHAVIOR: {
                title: 'Поведение', icon: '🎯',
                what_means: 'Вы фокусируетесь на действиях: что сделать, как поступить, какой следующий шаг. Привычки и регулярность — ваша опора.',
                lever: 'Маленькие конкретные шаги. Один новый ритуал на 21 день даст больше, чем месяц размышлений.',
                blind_spot: 'Можно «забегаться» — делать много, но не туда. Без сверки с ценностями действия превращаются в суету.'
            },
            CAPABILITIES: {
                title: 'Способности', icon: '🧠',
                what_means: 'Вы мыслите в категориях навыков и стратегий: «что я умею», «как этому научиться», «какой подход эффективнее».',
                lever: 'Прокачивайте мета-навыки (обучаемость, рефлексия, переговоры) — они тянут за собой всё остальное.',
                blind_spot: 'Бесконечная подготовка вместо действия. Можно учиться годами и так и не начать применять.'
            },
            VALUES: {
                title: 'Ценности', icon: '💎',
                what_means: 'Вы оцениваете решения через «важно/неважно», «моё/не моё». Внутренний компас сильнее внешних правил.',
                lever: 'Сформулируйте 3–5 своих ценностей письменно и сверяйтесь с ними при крупных решениях. Конфликт ценностей — главный источник усталости.',
                blind_spot: 'Жёсткость: то, что не совпадает с ценностями, отвергается без анализа. Можно упустить хорошее решение из-за «не моего» ярлыка.'
            },
            IDENTITY: {
                title: 'Идентичность', icon: '🧬',
                what_means: 'Вы мыслите в категориях «кто я». Изменения происходят через переосмысление себя, а не через действия.',
                lever: 'Работайте с самоопределением: «я — тот, кто…». Действия выстраиваются автоматически под новую идентичность.',
                blind_spot: 'Кризисы идентичности затягиваются. Когда «кто я» под вопросом, парализует поведение и решения на всех уровнях ниже.'
            }
        };
        const fb = fallbackLevels[dominant] || { title: dominant, icon: '🎯' };
        return {
            dominant: dominant,
            title: fb.title,
            icon: fb.icon,
            what_means: fb.what_means,
            lever: fb.lever,
            blind_spot: fb.blind_spot,
            distribution: distribution,
            confidence: confidence
        };
    },

    getStage1Interpretation() {
        const map = {
            'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ': `🔍 Что это значит:
Твоё внимание направлено на людей, отношения, социальные связи. Ты чувствителен к тому, как тебя воспринимают другие. Твоя глубинная тревога — быть отвергнутым, непонятым.

📌 Как это проявляется:
• Ты хорошо считываешь настроение и ожидания других
• Для тебя важно быть принятым в группе
• Критика воспринимается болезненно, особенно публичная

⚡ Сильная сторона: Эмпатия, социальный интеллект, умение строить связи.
⚠️ Слепая зона: Собственные потребности могут оставаться за кадром.`,

            'СТАТУСНО-ОРИЕНТИРОВАННЫЙ': `🔍 Что это значит:
Твоё внимание направлено на положение, статус, иерархию. Ты чувствителен к тому, кто есть кто в системе. Твоя глубинная тревога — потерять контроль, упустить возможности.

📌 Как это проявляется:
• Ты хорошо ориентируешься в иерархиях и структурах
• Для тебя важно твоё положение относительно других
• Неопределённость и хаос вызывают напряжение

⚡ Сильная сторона: Стратегическое мышление, ориентация на результат.
⚠️ Слепая зона: То, что нельзя измерить, может обесцениваться.`,

            'СМЫСЛО-ОРИЕНТИРОВАННЫЙ': `🔍 Что это значит:
Твоё внимание направлено на смыслы, ценности, идеи. Ты чувствителен к тому, насколько происходящее согласуется с твоим внутренним миром. Твоя глубинная тревога — жить бессмысленно.

📌 Как это проявляется:
• Для тебя важно «зачем» — смысл любого действия
• Ты ищешь глубину, подтекст, скрытые значения
• Поверхностность утомляет

⚡ Сильная сторона: Глубина мышления, способность к рефлексии.
⚠️ Слепая зона: Конкретика и детали могут казаться неважными.`,

            'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ': `🔍 Что это значит:
Твоё внимание направлено на ощущения, комфорт, практичность. Ты чувствителен к тому, как вещи работают. Твоя глубинная тревога — нестабильность, хаос.

📌 Как это проявляется:
• Ты ценишь конкретные, работающие решения
• Для тебя важны стабильность и порядок
• Новое воспринимаешь через «как применить на практике?»

⚡ Сильная сторона: Практичность, надёжность, умение создавать стабильность.
⚠️ Слепая зона: Абстрактные идеи могут казаться неважными.`
        };
        return map[this.perceptionType] || '';
    },

    getStage2Interpretation() {
        const g = this.getLevelGroup(this.thinkingLevel);
        const map = {
            'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ': {
                '1-3': `🔍 Как это проявляется:
В рамках твоего социально-ориентированного восприятия ты мыслишь конкретно и ситуативно. Ты хорошо ориентируешься в конкретных ситуациях общения, понимаешь явные причины и следствия.

📌 Точка роста:
Начни замечать повторяющиеся паттерны в отношениях, а не только отдельные ситуации.`,

                '4-6': `🔍 Как это проявляется:
В рамках твоего социально-ориентированного восприятия ты мыслишь системно. Ты видишь паттерны в отношениях, понимаешь роли и позиции людей в группе.

📌 Точка роста:
От анализа к предсказанию — научись видеть, как текущие паттерны приведут к будущим результатам.`,

                '7-9': `🔍 Как это проявляется:
В рамках твоего социально-ориентированного восприятия ты мыслишь универсальными категориями. Ты видишь законы человеческих отношений, понимаешь архетипические паттерны.

📌 Риск:
Теория может отрываться от практики — важно проверять модели в реальном общении.`
            },
            'СТАТУСНО-ОРИЕНТИРОВАННЫЙ': {
                '1-3': `🔍 Как это проявляется:
В рамках твоего статусно-ориентированного восприятия ты мыслишь конкретно и ситуативно. Ты хорошо ориентируешься в текущих статусах и положениях, но не видишь их динамики.

📌 Точка роста:
Начни замечать, как статусы меняются в зависимости от контекста и действий.`,

                '4-6': `🔍 Как это проявляется:
В рамках твоего статусно-ориентированного восприятия ты мыслишь системно. Ты видишь иерархии и понимаешь, как распределяется влияние.

📌 Точка роста:
От анализа к предсказанию — научись видеть, как текущая конфигурация приведёт к будущим изменениям.`,

                '7-9': `🔍 Как это проявляется:
В рамках твоего статусно-ориентированного восприятия ты мыслишь универсальными категориями. Ты видишь законы иерархий и понимаешь универсальные паттерны борьбы за влияние.

📌 Риск:
Теория может отрываться от практики — важно помнить, что за статусами стоят живые люди.`
            },
            'СМЫСЛО-ОРИЕНТИРОВАННЫЙ': {
                '1-3': `🔍 Как это проявляется:
В рамках твоего смысло-ориентированного восприятия ты мыслишь конкретно и ситуативно. Ты хорошо чувствуешь, есть ли в происходящем смысл лично для тебя.

📌 Точка роста:
Начни замечать, как твои личные смыслы связаны с ценностями других людей.`,

                '4-6': `🔍 Как это проявляется:
В рамках твоего смысло-ориентированного восприятия ты мыслишь системно. Ты видишь, как смыслы и ценности образуют системы.

📌 Точка роста:
От понимания ценностей к их реализации в конкретных действиях.`,

                '7-9': `🔍 Как это проявляется:
В рамках твоего смысло-ориентированного восприятия ты мыслишь универсальными категориями. Ты видишь архетипические сюжеты и законы, по которым разворачивается жизнь.

📌 Риск:
Теория может отрываться от практики — важно проверять высокие смыслы в конкретных действиях.`
            },
            'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ': {
                '1-3': `🔍 Как это проявляется:
В рамках твоего практико-ориентированного восприятия ты мыслишь конкретно и ситуативно. Ты хорошо решаешь текущие практические задачи.

📌 Точка роста:
Начни замечать, как отдельные задачи складываются в системы.`,

                '4-6': `🔍 Как это проявляется:
В рамках твоего практико-ориентированного восприятия ты мыслишь системно. Ты видишь, как процессы организованы в системы.

📌 Точка роста:
От оптимизации систем к пониманию законов, по которым они работают.`,

                '7-9': `🔍 Как это проявляется:
В рамках твоего практико-ориентированного восприятия ты мыслишь универсальными категориями. Ты понимаешь законы функционирования систем.

📌 Риск:
Теория может отрываться от практики — важно помнить, что за системами стоят люди и их потребности.`
            }
        };
        const pt = map[this.perceptionType] || map['СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ'];
        const fallback = pt[g] || pt['4-6'];

        // Если интерпретации с бэка загрузились — используем гранулярный
        // текст под точный уровень 1-9 (а не 3 группы), плюс добавляем
        // strength/weakness под уровень. Иначе — fallback на старый
        // продакшн-текст по группе.
        const levelKey = String(this.thinkingLevel);
        const granular = this.interpretations?.stage2?.by_type_and_level?.[this.perceptionType]?.[levelKey];
        const meta = this.interpretations?.stage2?.level_meta?.[levelKey];
        if (granular) {
            const strengthBlock = meta?.strength ? `\n\n💪 ${meta.strength}` : '';
            const weaknessBlock = meta?.weakness ? `\n⚠️ ${meta.weakness}` : '';
            return granular + strengthBlock + weaknessBlock;
        }
        return fallback;
    },

    getStage3Interpretation() {
        const l = this.calculateFinalLevel();

        // Если JSON загрузился — собираем расширенный текст с разбивкой
        // на 4 вектора (СБ/ТФ/УБ/ЧВ), каждый с уровнем 1-6 и собственной
        // интерпретацией. Финальный уровень — общий.
        const vec = this.interpretations?.stage3?.vectors;
        const summaryByLevel = this.interpretations?.stage3?.summary_by_final_level;
        if (vec && summaryByLevel) {
            const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 3;
            const sb = avg(this.behavioralLevels['СБ'] || []);
            const tf = avg(this.behavioralLevels['ТФ'] || []);
            const ub = avg(this.behavioralLevels['УБ'] || []);
            const chv = avg(this.behavioralLevels['ЧВ'] || []);

            const txt = (v, lvl) => v?.by_level?.[String(lvl)] || '';
            const blocks = [
                `${vec.sb.icon} ${vec.sb.name} (СБ): ${sb}/6\n${txt(vec.sb, sb)}`,
                `${vec.tf.icon} ${vec.tf.name} (ТФ): ${tf}/6\n${txt(vec.tf, tf)}`,
                `${vec.ub.icon} ${vec.ub.name} (УБ): ${ub}/6\n${txt(vec.ub, ub)}`,
                `${vec.chv.icon} ${vec.chv.name} (ЧВ): ${chv}/6\n${txt(vec.chv, chv)}`
            ];
            const summary = summaryByLevel[String(l)] || '';
            return `📊 Ваши векторы поведения:\n\n${blocks.join('\n\n')}\n\n📌 Финальный уровень: ${l}/9\n${summary}`;
        }

        // Fallback — старые тексты по 3 диапазонам.
        if (l <= 3) return `🔍 Как это проявляется:
Твоё поведение реактивно — ты отвечаешь на внешние стимулы, но редко инициируешь сам.

📌 В разных сферах:
• Под давлением — замираешь или уходишь
• В ресурсах — зависишь от других
• В понимании мира — ищешь простые объяснения
• В отношениях — привязываешься или подстраиваешься

⚡ Точка роста:
Начни замечать момент выбора — между стимулом и реакцией есть пауза.`;

        if (l <= 6) return `🔍 Как это проявляется:
Твоё поведение активно и осознанно — ты умеешь выбирать реакции и стратегии.

📌 В разных сферах:
• Под давлением — можешь защищаться или искать компромисс
• В ресурсах — зарабатываешь трудом, создаёшь резервы
• В понимании мира — анализируешь и проверяешь
• В отношениях — строишь партнёрства

⚡ Точка роста:
Системность — научись видеть, как отдельные реакции складываются в долгосрочные стратегии.`;

        return `🔍 Как это проявляется:
Твоё поведение стратегично и системно — ты выстраиваешь долгосрочные конструкции.

📌 В разных сферах:
• Под давлением — точно выбираешь, когда защищаться, а когда договариваться
• В ресурсах — управляешь системами и капиталом
• В понимании мира — строишь модели и теории
• В отношениях — создаёшь сети и сообщества

⚠️ Риск:
Системы могут отрываться от реальности — важно сохранять контакт с живыми людьми.`;
    },

    // ============================================
    // STAGE 5 — DEFENSE / DRIVER / SHADOW
    // ============================================
    // Эти три блока выводятся по перекрёстной логике из ответов
    // этапов 1-4. Они НЕ собираются отдельным набором вопросов —
    // это новый слой над уже существующими данными.

    deriveDefense() {
        // Защита определяется типом восприятия + общим паттерном поведения.
        // Это эвристика, не диагноз — но точная для большинства профилей.
        const t = this.perceptionType;
        const sb = (this.behavioralLevels?.['СБ'] || []);
        const sbAvg = sb.length ? sb.reduce((a,b)=>a+b,0)/sb.length : 3;
        if (t === 'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ' && sbAvg <= 3) return 'people_pleasing';
        if (t === 'СТАТУСНО-ОРИЕНТИРОВАННЫЙ') return 'control';
        if (t === 'СМЫСЛО-ОРИЕНТИРОВАННЫЙ') return 'rationalization';
        if (t === 'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ' && sbAvg >= 4) return 'control';
        if (sbAvg <= 2) return 'withdrawal';
        return 'rationalization';
    },

    deriveDriver() {
        // Драйвер = что включает человека. Из типа восприятия + Дилтс.
        const t = this.perceptionType;
        const dilts = this.determineDominantDilts();
        if (t === 'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ') return 'connection';
        if (t === 'СТАТУСНО-ОРИЕНТИРОВАННЫЙ' || t === 'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ') {
            if (dilts === 'IDENTITY' || dilts === 'VALUES') return 'autonomy';
            return 'achievement';
        }
        if (t === 'СМЫСЛО-ОРИЕНТИРОВАННЫЙ') return 'meaning';
        return 'achievement';
    },

    deriveShadow() {
        // Тень = оборотная сторона драйвера.
        const drv = this.deriveDriver();
        const map = {
            achievement: 'control',
            connection: 'merger',
            meaning: 'perfectionism',
            autonomy: 'isolation'
        };
        return map[drv] || 'control';
    },

    // ============================================
    // РЕКОМЕНДАЦИИ СКИЛЛОВ ФРЕДИ ПО ПРОФИЛЮ
    // ============================================
    // Простой rule-engine: правила набирают веса для каждого скилла,
    // top-3-5 по весу — финальная рекомендация. Универсальный навык
    // (russell) добавляется отдельно как мета-рекомендация.

    recommendSkills() {
        const scores = {};
        const add = (skill, weight) => { scores[skill] = (scores[skill] || 0) + weight; };

        const t = this.perceptionType;
        const tl = this.thinkingLevel || 5;
        const fl = this.calculateFinalLevel ? this.calculateFinalLevel() : 5;
        const dominant = this.determineDominantDilts();
        const attachment = (this.deepPatterns || {}).attachment || '🤗 Надежный';
        const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 3;
        const sb = avg(this.behavioralLevels?.['СБ'] || []);
        const tf = avg(this.behavioralLevels?.['ТФ'] || []);
        const ub = avg(this.behavioralLevels?.['УБ'] || []);
        const chv = avg(this.behavioralLevels?.['ЧВ'] || []);

        // Универсальный — почти всем
        add('russell', 4);

        // По типу восприятия
        if (t === 'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ') {
            add('active_listening', 3);
            add('boundaries', 2);
            add('emotion_partner', 2);
        } else if (t === 'СТАТУСНО-ОРИЕНТИРОВАННЫЙ') {
            add('negotiation_anchor', 3);
            add('storytelling', 2);
            add('calibration', 2);
        } else if (t === 'СМЫСЛО-ОРИЕНТИРОВАННЫЙ') {
            add('self_hearing', 3);
            add('reframing', 3);
        } else if (t === 'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ') {
            add('smd_thinking', 3);
            add('meta_learning', 2);
        }

        // По векторам поведения
        if (sb <= 3) { add('boundaries', 2); add('emotion_partner', 1); }
        if (chv <= 3) { add('active_listening', 2); add('boundaries', 1); }
        if (chv >= 5) { add('storytelling', 1); }
        if (ub <= 3) { add('smd_thinking', 1); add('meta_learning', 1); }

        // Когнитивно-действенный разрыв (высокое мышление, низкое поведение)
        if (tl >= 6 && fl <= 4) add('russell', 3);

        // По доминанте Дилтса
        if (dominant === 'BEHAVIOR') { add('russell', 1); }
        if (dominant === 'VALUES') { add('self_hearing', 2); add('reframing', 1); }
        if (dominant === 'IDENTITY') { add('russell', 1); add('self_hearing', 1); }

        // По типу привязанности
        if (attachment.includes('Тревожный')) { add('boundaries', 2); add('self_hearing', 1); }
        if (attachment.includes('Избегающий')) { add('active_listening', 1); add('emotion_partner', 1); }

        // Top-5 по весу
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        return sorted.slice(0, 5).map(e => e[0]);
    },

    // ============================================
    // КРОСС-ЭТАПНЫЕ ИНСАЙТЫ
    // ============================================
    // Каждый шаблон срабатывает по условию из ответов 1-4 этапов и
    // даёт интегрирующий текст. Возвращает топ-3 наиболее релевантных
    // (по приоритету: ранние в списке выше). Шаблоны и тексты —
    // в JSON cross_stage_insights.patterns. Логика триггеров — здесь.
    //
    // Назначение: показать пользователю, что тест видит ЕГО ПРОФИЛЬ
    // целиком, а не как набор изолированных результатов. Это и есть
    // переход от чек-листа к живому портрету.
    getCrossStageInsights() {
        const patterns = this.interpretations?.cross_stage_insights?.patterns;
        if (!patterns) return [];

        const tl = this.thinkingLevel || 5;
        const fl = this.calculateFinalLevel ? this.calculateFinalLevel() : 5;
        const t = this.perceptionType || '';
        const dominant = this.determineDominantDilts();
        const attachment = (this.deepPatterns || {}).attachment || '';
        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 3;
        const chvAvg = avg(this.behavioralLevels?.['ЧВ'] || []);
        const sbAvg = avg(this.behavioralLevels?.['СБ'] || []);

        // Распределение по 4 осям восприятия — нужно для balanced_profile
        const dist = Object.values(this.perceptionScores || {});
        const total = dist.reduce((a, b) => a + b, 0) || 1;
        const pcts = dist.map(v => 100 * v / total);
        const maxSpread = Math.max(...pcts) - Math.min(...pcts);

        // Триггеры — упорядочены по приоритету (более специфичные сначала)
        const triggers = {
            cognitive_action_gap: tl >= 6 && fl <= 4,
            harmonic_high: tl >= 6 && fl >= 6,
            anxious_low_chv: attachment.includes('Тревожный') && chvAvg <= 3,
            social_avoidant: t === 'СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ' && attachment.includes('Избегающий'),
            meaning_no_action: t === 'СМЫСЛО-ОРИЕНТИРОВАННЫЙ' && fl <= 3,
            status_low_emotion: t === 'СТАТУСНО-ОРИЕНТИРОВАННЫЙ' && chvAvg <= 3,
            behavior_dominant_low_action: dominant === 'BEHAVIOR' && fl <= 4,
            values_dominant_practical: dominant === 'VALUES' && t === 'ПРАКТИКО-ОРИЕНТИРОВАННЫЙ',
            high_meaning_high_attachment: t === 'СМЫСЛО-ОРИЕНТИРОВАННЫЙ' && attachment.includes('Надежный'),
            balanced_profile: maxSpread <= 15 && total > 4
        };

        const fired = [];
        for (const [key, fires] of Object.entries(triggers)) {
            if (fires && patterns[key]) {
                const text = patterns[key].text
                    .replace('{thinkingLevel}', tl)
                    .replace('{finalBehavioralLevel}', fl);
                fired.push({ key, title: patterns[key].title, text });
            }
        }
        // Топ-3 наиболее релевантных
        return fired.slice(0, 3);
    },

    // ============================================
    // ОТПРАВКА ОТЗЫВА ОБ ЭТАПЕ 4 (АНАЛИТИКА)
    // ============================================
    // Логирует выбор пользователя на «✅ ДА / ❓ ЕСТЬ СОМНЕНИЯ / 🔄 НЕТ»
    // на этапе 4. Через несколько недель данные показывают, какие
    // комбинации профиля чаще получают «не моё» — это карта слабых
    // формулировок интерпретации, материал для будущих правок JSON.
    async logTestFeedback(response) {
        if (!this.userId) return;
        try {
            await fetch(TEST_API_BASE_URL + '/api/test/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.userId,
                    stage: 4,
                    response: response,
                    profile: {
                        perceptionType: this.perceptionType,
                        thinkingLevel: this.thinkingLevel,
                        finalLevel: this.calculateFinalLevel ? this.calculateFinalLevel() : null,
                        dominantDilts: this.determineDominantDilts(),
                        confidence: this.calculateStage4Confidence ? this.calculateStage4Confidence() : null
                    },
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            // Аналитика — не блокирует UX
            console.warn('Failed to log test feedback:', e);
        }
    },

    getStage5Interpretation() {
        const d = (this.deepPatterns||{attachment:'🤗 Надежный'}).attachment;
        const map = {
            '🤗 Надежный': `🔗 Тип привязанности: Надёжный

🔍 Что это значит:
У тебя сформировалась здоровая база — ты доверяешь себе и другим. Умеешь быть близким, не теряя себя.

📌 Как это проявляется:
• Ты спокойно переносишь временное одиночество
• Не паникуешь, когда партнёр или друг недоступен
• Конфликты воспринимаешь как рабочий момент, а не катастрофу

⚡ Сильная сторона: Устойчивость, способность к глубоким и долгим связям.
⚠️ Слепая зона: Можешь не замечать, когда другим нужна особая поддержка.`,

            '😥 Тревожный': `🔗 Тип привязанности: Тревожный

🔍 Что это значит:
Ты глубоко нуждаешься в близости, но боишься её потерять. Это формирует гиперчувствительность к сигналам отвержения.

📌 Как это проявляется:
• Часто проверяешь, всё ли в порядке с отношениями
• Болезненно реагируешь на холодность или дистанцию
• Склонен додумывать негативные сценарии

⚡ Сильная сторона: Глубокая эмпатия, искренняя вовлечённость в отношения.
⚠️ Слепая зона: Тревога может отталкивать именно тех, кого хочется удержать.`,

            '🛡️ Избегающий': `🔗 Тип привязанности: Избегающий

🔍 Что это значит:
Ты ценишь независимость и держишь дистанцию. Близость ощущается как угроза автономии.

📌 Как это проявляется:
• Трудно просить о помощи или показывать уязвимость
• При сближении возникает импульс отступить
• Самостоятельность — высшая ценность

⚡ Сильная сторона: Надёжность, самодостаточность, умение держать голову холодной.
⚠️ Слепая зона: Люди рядом могут чувствовать себя ненужными.`,

            '🏔️ Отстраненный': `🔗 Тип привязанности: Отстранённый

🔍 Что это значит:
Ты обесцениваешь важность близких отношений — как защитный механизм от боли.

📌 Как это проявляется:
• Отношения воспринимаются как необязательные или обременительные
• Эмоциональные запросы других кажутся чрезмерными
• Предпочитаешь рациональное эмоциональному

⚡ Сильная сторона: Высокая функциональность, способность действовать без эмоционального хаоса.
⚠️ Слепая зона: Внутреннее одиночество, которое трудно признать даже себе.`
        };
        return map[d] || map['🤗 Надежный'];
    },

    // ============================================
    // ФОРМАТИРОВАНИЕ
    // ============================================
    cleanTextForDisplay(text) {
        if (!text) return text;
        return text
            .replace(/\*\*(.*?)\*\*/g,'$1').replace(/__(.*?)__/g,'$1')
            .replace(/\*(.*?)\*/g,'$1').replace(/_(.*?)_/g,'$1')
            .replace(/`(.*?)`/g,'$1').replace(/\[(.*?)\]\(.*?\)/g,'$1')
            .replace(/#{1,6}\s+/g,'').replace(/<[^>]+>/g,'')
            .replace(/\s+/g,' ').trim().replace(/\n\s*\n/g,'\n\n');
    },

    getClarifyingQuestions(discrepancies, currentLevels) {
        const questions = [];
        for (const vector of ['СБ','ТФ','УБ','ЧВ']) {
            if (!discrepancies.includes(vector)) continue;
            const lvl = Math.round(currentLevels[vector]||3);
            const vq = this.clarifyingQuestionsDB[vector]||[];
            const q = vq.find(q=>q.level===lvl) || vq.reduce((prev,curr)=>Math.abs(curr.level-lvl)<Math.abs(prev.level-lvl)?curr:prev, vq[0]);
            if (q) questions.push({type:'vector',vector,text:q.text,options:q.options});
        }
        for (const disc of discrepancies) {
            if (['people','money','signs','relations'].includes(disc) && this.discrepancyQuestions[disc]) {
                const dq = this.discrepancyQuestions[disc];
                questions.push({type:'discrepancy',target:disc,text:dq.text,options:dq.options});
            }
        }
        const seen = new Set();
        return questions.filter(q=>{ if(seen.has(q.text)) return false; seen.add(q.text); return true; }).slice(0,5);
    },

    // ============================================
    // USER ID
    // ============================================
    getUserId() {
        if (window.maxContext?.user_id && window.maxContext.user_id!=='null') return window.maxContext.user_id;
        const urlId = new URLSearchParams(window.location.search).get('user_id');
        if (urlId && urlId!=='null') return urlId;
        const stored = localStorage.getItem('fredi_user_id');
        if (stored && stored!=='null') return stored;
        return null;
    },

        getMirrorCode() {
        // 1. URL query (?ref=mirror_XXX)
        let ref = new URLSearchParams(window.location.search).get('ref');

        // 2. URL hash (#ref=mirror_XXX) — страховка для Telegram WebView, срезающего query
        if (!ref && window.location.hash) {
            try {
                const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
                ref = hashParams.get('ref');
            } catch (e) {}
        }

        if (ref && ref.startsWith('mirror_')) {
            const cleanCode = ref.replace(/^mirror_/, '');
            try { localStorage.setItem('fredi_mirror_ref', cleanCode); } catch (e) {}
            try { sessionStorage.setItem('fredi_mirror_ref', cleanCode); } catch (e) {}
            return cleanCode;
        }

        // 3. localStorage
        try {
            const stored = localStorage.getItem('fredi_mirror_ref');
            if (stored) return stored.replace(/^mirror_/, '');
        } catch (e) {}

        // 4. sessionStorage — fallback при приват-режиме / очищенном localStorage
        try {
            const ssStored = sessionStorage.getItem('fredi_mirror_ref');
            if (ssStored) return ssStored.replace(/^mirror_/, '');
        } catch (e) {}

        return null;
    },

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================
    init(userId) {
        this.userId = userId || this.getUserId();
        if (!this.userId || this.userId==='null') { console.warn('⚠️ userId не найден'); this.userId=null; }
        else localStorage.setItem('fredi_user_id', this.userId);
        this.reset();
        this.loadProgress();
        console.log('📝 Тест инициализирован, userId:', this.userId);
    },

    reset() {
        this.currentStage=0; this.currentQuestionIndex=0; this.answers=[];
        this.perceptionScores={EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:0};
        this.perceptionType=null; this.thinkingLevel=null;
        this.thinkingScores={"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0};
        this.strategyLevels={"СБ":[],"ТФ":[],"УБ":[],"ЧВ":[]};
        this.behavioralLevels={"СБ":[],"ТФ":[],"УБ":[],"ЧВ":[]};
        this.stage3Scores=[]; this.diltsCounts={ENVIRONMENT:0,BEHAVIOR:0,CAPABILITIES:0,VALUES:0,IDENTITY:0};
        this.deepAnswers=[]; this.deepPatterns=null; this.profileData=null;
        this.discrepancies=[]; this.clarifyingAnswers=[]; this.clarifyingQuestions=[]; this.clarifyingCurrent=0;
        this.aiGeneratedProfile=null; this.psychologistThought=null;
        // Новый заход — новое прохождение: событие снова можно писать,
        // рекомендации — снова запрашивать. Без сброса второго флага
        // человек, прошедший тест дважды за сессию, во второй раз
        // оставался без рекомендаций и без последней ступени воронки.
        this._testCompletedTracked=false; this._recsRequested=false;
        // Профиль прошлого прохождения, восстановленный showSavedResult:
        // без сброса новый тест дорисовал бы старые векторы.
        this._restoredProfile=null;
        this._testMeterDebt=0; this._testMeterTotal=0;
        this.context={city:null,gender:null,age:null,weather:null,isComplete:false,name:null};
    },

    loadProgress() {
        if (!this.userId) return;
        const saved = localStorage.getItem('test_'+this.userId);
        if (!saved) return;
        try {
            const d = JSON.parse(saved);
            Object.assign(this, {
                currentStage:d.currentStage||0, currentQuestionIndex:d.currentQuestionIndex||0,
                answers:d.answers||[], perceptionScores:d.perceptionScores||{EXTERNAL:0,INTERNAL:0,SYMBOLIC:0,MATERIAL:0},
                perceptionType:d.perceptionType||null, thinkingLevel:d.thinkingLevel||null,
                thinkingScores:d.thinkingScores||{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0},
                strategyLevels:d.strategyLevels||{"СБ":[],"ТФ":[],"УБ":[],"ЧВ":[]},
                behavioralLevels:d.behavioralLevels||{"СБ":[],"ТФ":[],"УБ":[],"ЧВ":[]},
                stage3Scores:d.stage3Scores||[], diltsCounts:d.diltsCounts||{ENVIRONMENT:0,BEHAVIOR:0,CAPABILITIES:0,VALUES:0,IDENTITY:0},
                deepAnswers:d.deepAnswers||[], deepPatterns:d.deepPatterns||null,
                profileData:d.profileData||null,
                context:d.context||{city:null,gender:null,age:null,weather:null,isComplete:false,name:null}
            });
            if (this.perceptionType) {
                const isExt = this.perceptionType.includes('СОЦИАЛЬНО')||this.perceptionType.includes('СТАТУСНО');
                this.stages[1].total = (isExt?this.thinking_questions.external:this.thinking_questions.internal).length;
            }
        } catch(e) { console.warn('❌ Ошибка загрузки прогресса:', e); }
    },

    saveProgress() {
        if (!this.userId) return;
        localStorage.setItem('test_'+this.userId, JSON.stringify({
            currentStage:this.currentStage, currentQuestionIndex:this.currentQuestionIndex,
            answers:this.answers, perceptionScores:this.perceptionScores, perceptionType:this.perceptionType,
            thinkingLevel:this.thinkingLevel, thinkingScores:this.thinkingScores,
            strategyLevels:this.strategyLevels, behavioralLevels:this.behavioralLevels,
            stage3Scores:this.stage3Scores, diltsCounts:this.diltsCounts,
            deepAnswers:this.deepAnswers, deepPatterns:this.deepPatterns,
            profileData:this.profileData, context:this.context, updatedAt:new Date().toISOString()
        }));
    },

    // ============================================
    // ЗАПУСК
    // ============================================
    start() {
        this.init();
        this.reset();
        this.saveProgress();
        this.showTestScreen();
        setTimeout(() => {
            if (this.context.isComplete) {
                this.addBotMessage('🧠 ФРЕДИ: ВИРТУАЛЬНЫЙ ПСИХОЛОГ\n\nПривет! Я помню тебя. Хочешь пройти тест заново?');
                this.addMessageWithButtons('', [
                    {text:'🚀 НАЧАТЬ ТЕСТ',callback:()=>this.startTest()},
                    {text:'🔄 ОБНОВИТЬ КОНТЕКСТ',callback:()=>this.startContextCollection()}
                ]);
            } else {
                this.showIntroScreen();
            }
        }, 100);
    },

    showTestScreen() {
        const container = document.getElementById('screenContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="test-chat-container" id="testChatContainer">
                <div class="test-chat-messages" id="testChatMessages">
                    <div class="test-chat-placeholder"></div>
                </div>
            </div>`;
        setTimeout(()=>this.optimizeMobileView(), 100);
        this.scrollToBottom();
    },

    /**
     * Открыть готовый разбор заново — чтобы дочитать.
     *
     * Человек тратит на тест пятнадцать минут, получает длинный разбор с
     * рекомендациями и закрывает вкладку, не дочитав. Вернуться было
     * некуда: экран жил только в памяти текущего прохождения, а кнопка
     * «🧠 К ПРОФИЛЮ» лежала внутри той же ленты, до которой уже не
     * добраться. Единственным выходом было пройти тест заново.
     *
     * Берём последний результат: сначала localStorage (мгновенно, работает
     * и без сети), потом сервер — он переживает чистку истории и открывается
     * с другого устройства.
     */
    async showSavedResult() {
        const uid = this.userId || (window.CONFIG && window.CONFIG.USER_ID);
        if (!uid) return false;
        this.userId = uid;

        let rec = null;
        try {
            const raw = localStorage.getItem('test_results_' + uid);
            if (raw) rec = JSON.parse(raw);
        } catch (e) { /* приватный режим — идём на сервер */ }

        if (!rec || !rec.profile) {
            try {
                const r = await fetch(TEST_API_BASE_URL + '/api/get-profile/' + uid);
                const d = await r.json();
                const pr = d && d.profile;
                const pd = pr && pr.profile_data;
                if (pd && pd.displayName) {
                    rec = {
                        profile: pd,
                        deepPatterns: pr.deep_patterns || {},
                        perceptionType: pr.perception_type,
                        thinkingLevel: pr.thinking_level,
                        aiProfile: pr.ai_generated_profile || ''
                    };
                }
            } catch (e) { console.warn('Профиль с сервера не пришёл:', e); }
        }
        if (!rec || !rec.profile) return false;

        this._restoredProfile = rec.profile;
        this.deepPatterns = rec.deepPatterns || this.deepPatterns;
        this.perceptionType = rec.perceptionType || this.perceptionType;
        this.thinkingLevel = rec.thinkingLevel || this.thinkingLevel;
        this.aiGeneratedProfile = rec.aiProfile || this.aiGeneratedProfile;
        // Рекомендации запрашиваются заново: _recsRequested мог остаться
        // взведённым с прошлого показа, и блок бы не появился.
        this._recsRequested = false;

        this.showTestScreen();
        await this.showFinalProfileButtons();
        return true;
    },

    // ============================================
    // ЭКРАНЫ ЗНАКОМСТВА
    // ============================================
    showIntroScreen() {
        var name = (this.context && this.context.name) || (window.CONFIG && window.CONFIG.USER_NAME !== 'друг' ? window.CONFIG.USER_NAME : '') || '';
        var greeting = name ? name + ', привет!' : 'Привет!';
        this.addBotMessage(greeting + '\n\n🧠 Я — Фреди, виртуальный психолог.\n🕒 Нам нужно познакомиться — я пока не экстрасенс.\n🧐 Пройдите небольшой тест, чтобы я понимал, с кем имею дело.\n\n📊 Всего 5 этапов:\n1. Восприятие — как вы фильтруете реальность\n2. Мышление — как мозг перерабатывает информацию\n3. Поведение — что делаете на автопилоте\n4. Точка роста — куда двигаться\n5. Глубинные паттерны — что сформировало вас\n\n⏱ 15 минут — и я буду знать о вас больше, чем вы думаете.\n🚀 Начнём?', true);
        this.addMessageWithButtons('', [
            {text:'🚀 НАЧАТЬ ЗНАКОМСТВО',callback:()=>this.startContextCollection()},
            {text:'🤨 А ТЫ ВООБЩЕ КТО ТАКОЙ?',callback:()=>this.showBotInfo()}
        ]);
    },

    showBotInfo() {
        this.addBotMessage('🎭 Ну, вопрос хороший. Давайте по существу.\n\nЯ — Фреди, AI-психолог. Мой мозг обучен на тысячах психологических моделей и реальных кейсов. 🧠\n\n🧐 Что я умею:\n\n• Вижу паттерны там, где вы видите просто день сурка\n• Нахожу систему в ваших "случайных" решениях\n• Понимаю, почему вы выбираете одних и тех же "не тех" людей\n• Я реально беспристрастен — у меня нет плохого настроения\n\n⏱ 15 минут — и я составлю ваш профиль.\n\n👌 Погнали?', true);
        this.addMessageWithButtons('', [{text:'🚀 НАЧАТЬ ЗНАКОМСТВО',callback:()=>this.startContextCollection()}]);
    },

    showTestBenefits() {
        this.addBotMessage(`🔍 ЧТО ВЫ УЗНАЕТЕ О СЕБЕ:\n\n🧠 Восприятие → Мышление → Поведение → Точка роста → Глубинные паттерны\n\n⚡ ПОСЛЕ ТЕСТА ВЫ ПОЛУЧИТЕ:\n\n✅ Полный психологический портрет\n✅ Глубинный анализ подсознательных паттернов\n✅ Индивидуальные рекомендации\n\n⏱ Всего 15 минут`, true);
        this.addMessageWithButtons('', [
            {text:'🚀 НАЧАТЬ ТЕСТ',callback:()=>this.startTest()},
            {text:'◀️ НАЗАД',callback:()=>this.showIntroScreen()}
        ]);
    },

    // ============================================
    // СБОР КОНТЕКСТА
    // ============================================
    startContextCollection() { this.showContextCollectionScreen(); },

    // Сбор контекста разбит на 3 последовательных вопроса в чат-стиле —
    // как остальные стадии теста. Раньше всё было одной формой-карточкой,
    // что выбивалось из общего флоу.
    showContextCollectionScreen() {
        this.addBotMessage('📝 ДАВАЙТЕ ПОЗНАКОМИМСЯ\n\nЯ задам четыре коротких вопроса — это займёт меньше минуты.', true);
        this.askContextCity();
    },

    askContextCity() {
        this.addInputMessage('🏙️ Из какого вы города?', {
            placeholder: 'Например: Москва',
            type: 'text',
            validate: v => v.length >= 2 ? null : 'Введите название города',
            onSubmit: v => {
                this.context.city = v;
                this.askContextGender();
            }
        });
    },

    askContextGender() {
        this.addMessageWithButtons('👤 Ваш пол?', [
            { text: 'Мужской', callback: () => this.handleGenderAnswer('male') },
            { text: 'Женский', callback: () => this.handleGenderAnswer('female') }
        ]);
    },

    handleGenderAnswer(value) {
        this.context.gender = value;
        this.askContextAge();
    },

    askContextAge() {
        this.addInputMessage('📅 Сколько вам лет?', {
            placeholder: 'Например: 28',
            type: 'number',
            validate: v => {
                const n = parseInt(v, 10);
                if (!n || isNaN(n)) return 'Введите число';
                if (n < 1 || n > 120) return 'Возраст должен быть от 1 до 120 лет';
                return null;
            },
            onSubmit: v => {
                this.context.age = parseInt(v, 10);
                this.saveProgress();
                this.askContextEmail();
            }
        });
    },

    // Почта спрашивается здесь же, в одном ряду с городом и возрастом
    // (решение владельца 15.09.2026), и спрашивается за дело: разбор
    // приходит письмом с PDF. Человек его не потеряет вместе с вкладкой,
    // а у нас появляется канал — единственный способ позвать вернувшегося.
    //
    // Пропуск оставлен намеренно. Обязательное поле здесь стоит дороже
    // почты: до результата ещё пятнадцать минут, и упереться в него на
    // четвёртом вопросе — значит не пройти тест вовсе.
    askContextEmail() {
        this.addInputMessage('📄 Куда прислать разбор в PDF?\n\nПришлю файл письмом — он останется у вас, даже если закроете вкладку. Можно пропустить: нажмите ✦ с пустым полем.', {
            placeholder: 'your@email.com',
            type: 'email',
            validate: v => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
                ? null : 'Проверьте адрес — похоже, в нём опечатка',
            onSubmit: v => {
                if (v) this.context.email = v;
                this.context.isComplete = true;
                this.saveProgress();
                this.addBotMessage(v
                    ? '⏳ Записал. Разбор пришлю на ' + v + ' — сохраняю данные и узнаю погоду...'
                    : '⏳ Хорошо, без письма. Сохраняю данные и узнаю погоду...', true);
                this.saveContextToServer().then(() => this.showContextSummary());
            }
        });
    },

    // Универсальный input-bubble для текстовых/числовых ответов в чат-стиле.
    // Используется для сбора контекста (город, возраст). Стилизация совпадает
    // с остальными message-bubble'ами; ответ добавляется как user-message.
    addInputMessage(prompt, opts) {
        this.addBotMessage(prompt, true);
        const c = document.getElementById('testChatMessages');
        if (!c) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'test-message test-message-bot';
        const bubble = document.createElement('div');
        bubble.className = 'test-message-bubble test-message-bubble-bot';
        bubble.style.cssText = 'background:rgba(224,224,224,0.05);';

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:8px;align-items:center;padding:4px;';

        const input = document.createElement('input');
        input.type = opts.type || 'text';
        input.placeholder = opts.placeholder || '';
        if (opts.type === 'number') { input.min = '1'; input.max = '120'; }
        input.style.cssText = 'flex:1;padding:10px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.2);color:inherit;font-size:15px;outline:none;';

        // Подтверждение — стрелка вверх, как в поле ввода на дашборде.
        // Ромбик ✦ не называет действия: он читается как украшение, и на
        // первом же вопросе человек ищет, куда нажать (замечание владельца
        // 15.09.2026). Стрелку в этом месте узнают все мессенджеры.
        const btn = document.createElement('button');
        btn.textContent = '↑';
        btn.className = 'test-context-submit test-context-submit--icon';
        btn.setAttribute('aria-label', 'Отправить');
        btn.setAttribute('title', 'Отправить');

        const submit = () => {
            const v = (input.value || '').trim();
            const err = opts.validate ? opts.validate(v) : null;
            if (err) {
                this.addBotMessage('❌ ' + err, true);
                setTimeout(() => input.focus(), 50);
                return;
            }
            input.disabled = true;
            btn.disabled = true;
            btn.style.opacity = '0.4';
            this.addUserMessage(v);
            opts.onSubmit(v);
        };
        btn.addEventListener('click', submit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

        wrap.appendChild(input);
        wrap.appendChild(btn);
        bubble.appendChild(wrap);
        msgDiv.appendChild(bubble);
        c.appendChild(msgDiv);
        setTimeout(() => input.focus(), 100);
        this.scrollToBottom();
    },

    async saveContextToServer() {
        if (!this.userId) return;
        try {
            await fetch(TEST_API_BASE_URL+'/api/save-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: parseInt(this.userId),
                    context: { name:this.context.name, city:this.context.city, gender:this.context.gender, age:this.context.age, email:this.context.email || null }
                })
            });
            // Ждём погоду ВНУТРИ этого метода
            const weather = await this.fetchWeatherFromServer();
            if (weather) {
                this.context.weather = weather;
                this.saveProgress();
            }
        } catch(error) {
            console.error('Ошибка сохранения контекста:', error);
        }
    },

    async fetchWeatherFromServer() {
        if (!this.userId || !this.context.city) return null;
        try {
            const response = await fetch(TEST_API_BASE_URL+'/api/weather/'+this.userId);
            const data = await response.json();
            if (data.success && data.weather) {
                return { temp:data.weather.temperature, description:data.weather.description, icon:data.weather.icon };
            }
            return null;
        } catch(error) {
            console.error('Ошибка получения погоды:', error);
            return null;
        }
    },

    // Погода гарантированно уже в this.context.weather к этому моменту
    showContextSummary() {
        const genderText = {male:'Мужчина',female:'Женщина'}[this.context.gender]||'не указан';
        const weatherLine = this.context.weather
            ? '\n\n🌡️ **Погода в '+this.context.city+':** '+this.context.weather.icon+' '+this.context.weather.description+', '+this.context.weather.temp+'°C'
            : '';

        this.addBotMessage(`✅ Отлично! Теперь я знаю о вас:\n\n📍 Город: ${this.context.city}\n👤 Пол: ${genderText}\n📅 Возраст: ${this.context.age} лет${weatherLine}\n\n🎯 Теперь я буду учитывать это в наших разговорах!\n\n🧠 Чтобы я мог помочь по-настоящему, нужно пройти тест (15 минут).\nОн определит ваш психологический профиль по 4 векторам и глубинным паттернам.\n\n👇 Начинаем?`, true);

        this.addMessageWithButtons('', [
            {text:'🚀 НАЧАТЬ ТЕСТ',callback:()=>this.startTest()},
            {text:'📖 ЧТО ДАЁТ ТЕСТ',callback:()=>this.showTestBenefits()}
        ]);
    },

    // ============================================
    // ЗАПУСК ТЕСТА
    // ============================================
    /**
     * Время теста расходует дневной лимит.
     *
     * Решение владельца 14.09.2026: пятнадцать минут прохождения и
     * ожидание генерации портрета — такая же работа сервиса, как
     * разговор, и должны считаться так же. Побочный и главный эффект:
     * человек доходит до разговора с Фреди уже с небольшим остатком, и
     * вопрос подписки встаёт в тот момент, когда ему есть что обсуждать.
     *
     * Считаем реально прошедшее время, а не «пятнадцать минут по факту
     * запуска»: кто бросил на третьем вопросе, платит тремя минутами.
     * Пока вкладка скрыта, счёт стоит — человек, отошедший от экрана,
     * сервис не занимает, и это та же логика, по которой обмен в чате
     * ограничен сверху двумя минутами.
     *
     * Запись идёт кусками по 60 секунд: ручка record-usage режет всё
     * вне диапазона 1..120 секунд.
     */
    // Потолок: сколько секунд теста вообще может уйти в дневной лимит.
    //
    // Дневной запас — 10 минут, тест идёт 15. Без потолка человек упрётся
    // в ноль ещё внутри теста и, нажав «Обсудить с Фреди», получит стену
    // вместо разговора — ни одного сообщения. А «продолжил сам» с 08.09
    // приоритетная цель всех кампаний Директа: обнулив её, мы потеряем
    // обратную связь по всей рекламе.
    //
    // Половина запаса оставляет человеку время на два-три настоящих
    // вопроса по своему портрету — и стена приходит на пике, когда ему
    // есть что обсуждать, а не вместо разговора.
    TEST_METER_CAP_SEC: 300,

    _startTestMeter() {
        if (this._testMeterTimer) return;
        this._testMeterLastTick = Date.now();
        this._testMeterDebt = 0;
        this._testMeterTotal = 0;
        this._testMeterTimer = setInterval(() => {
            const now = Date.now();
            const dt = Math.round((now - this._testMeterLastTick) / 1000);
            this._testMeterLastTick = now;
            // Вкладка была скрыта или спал таймер — не списываем.
            if (document.hidden || dt <= 0 || dt > 120) return;
            this._testMeterDebt += dt;
            while (this._testMeterDebt >= 60 && this._testMeterTotal < this.TEST_METER_CAP_SEC) {
                this._testMeterDebt -= 60;
                this._testMeterTotal += 60;
                this._meterTick(60);
            }
            // Потолок выбран — дальше просто не считаем, чтобы долг не рос.
            if (this._testMeterTotal >= this.TEST_METER_CAP_SEC) this._testMeterDebt = 0;
        }, 15000);
    },

    // Защита отрезка: включается на старте теста, снимается, когда
    // результат уже на экране. Счётчик в meter.js парный, поэтому свой
    // флаг обязателен — иначе повторный вызов уронил бы счётчик в минус
    // или, наоборот, оставил защиту навсегда.
    // Письмо с разбором. Адрес — тот, что человек назвал на знакомстве;
    // сервер при пустом теле возьмёт его из контекста или из аккаунта.
    // Один раз на прохождение: повторный вызов на перерисовке экрана
    // прислал бы человеку второе такое же письмо.
    _emailPdf() {
        if (this._pdfMailed || !this.userId) return;
        // Запрос уходит ВСЕГДА, даже когда почты в контексте нет: адрес
        // разрешает сервер — тело, потом контекст, потом аккаунт. Раньше
        // здесь стоял ранний выход, и всякий, кто проходил знакомство
        // до появления вопроса про почту (то есть все прежние
        // пользователи), не получал письма вообще — хотя почта лежала
        // у него в аккаунте. Нет адреса нигде — сервер честно ответит
        // no_email, и это ничего не стоит.
        var email = (this.context && this.context.email) || '';
        this._pdfMailed = true;
        try {
            fetch(TEST_API_BASE_URL + '/api/test/email-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: parseInt(this.userId), email: email || null }),
            }).then(function (r) { return r.json(); }).then(function (d) {
                try {
                    if (window.FrediTracker && window.FrediTracker.track)
                        window.FrediTracker.track('test_pdf_emailed', {
                            sent: !!(d && d.success), reason: (d && d.error) || '' });
                } catch (e) {}
                // Адреса нет нигде — спрашиваем здесь, и только здесь.
                // Раньше знакомство проходили один раз навсегда, и всякий,
                // кто прошёл его до появления вопроса про почту, письма
                // не получал и не мог получить.
                if (d && d.error === 'no_email') Test._askEmailForPdf();
            }).catch(function () {});
        } catch (e) {}
    },

    // Одна строка на экране результата вместо второго знакомства. Спрашиваем
    // ровно тогда, когда прислать некуда: у кого адрес есть в аккаунте или
    // в контексте, тот ничего не видит.
    _askEmailForPdf() {
        if (this._emailAsked) return;
        this._emailAsked = true;
        this.addInputMessage('📄 Прислать разбор на почту? Придёт файлом — останется у вас, даже если закроете вкладку.\n\nМожно пропустить: нажмите ↑ с пустым полем.', {
            placeholder: 'your@email.com',
            type: 'email',
            validate: v => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
                ? null : 'Проверьте адрес — похоже, в нём опечатка',
            onSubmit: v => {
                if (!v) return;
                this.context.email = v;
                this.saveProgress();
                fetch(TEST_API_BASE_URL + '/api/test/email-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: parseInt(this.userId), email: v }),
                }).then(function (r) { return r.json(); }).then(function (d) {
                    Test.addBotMessage(d && d.success
                        ? '📨 Отправил на ' + v + '. Если письма нет через пару минут — загляните в «Промоакции» и «Спам».'
                        : '📭 Письмо не ушло — почта сейчас недоступна. Разбор остаётся здесь, на экране.', true);
                }).catch(function () {
                    Test.addBotMessage('📭 Письмо не ушло — связь прервалась. Разбор остаётся здесь, на экране.', true);
                });
            }
        });
    },

    _meterProtect(on) {
        try {
            if (!window.FrediMeter || typeof window.FrediMeter.protect !== 'function') return;
            if (on && !this._meterProtected) { this._meterProtected = true; window.FrediMeter.protect(true); }
            else if (!on && this._meterProtected) { this._meterProtected = false; window.FrediMeter.protect(false); }
        } catch (e) {}
    },

    _meterTick(sec) {
        try {
            if (window.FrediMeter && typeof window.FrediMeter.recordUsageQuiet === 'function') {
                window.FrediMeter.recordUsageQuiet(sec);
            }
        } catch (e) {}
    },

    /**
     * Остановить счёт и дописать остаток.
     *
     * Остаток дописывается обязательно: без этого человек, прошедший
     * тест за 12 минут 40 секунд, платил бы двенадцатью — а на десятках
     * прохождений это уже заметная разница.
     */
    _stopTestMeter() {
        // Защиту снимаем здесь же: счёт останавливается ровно тогда, когда
        // тест закончен, — значит и отложенная стена может выходить.
        this._meterProtect(false);
        if (this._testMeterTimer) {
            clearInterval(this._testMeterTimer);
            this._testMeterTimer = null;
        }
        const room = this.TEST_METER_CAP_SEC - (this._testMeterTotal || 0);
        const tail = Math.min(Math.round(this._testMeterDebt || 0), Math.max(0, room));
        if (tail >= 1) {
            this._testMeterTotal = (this._testMeterTotal || 0) + tail;
            this._meterTick(Math.min(120, tail));
        }
        this._testMeterDebt = 0;
    },

    startTest() {
        this.currentStage=0; this.currentQuestionIndex=0;
        this.reset(); this.saveProgress();
        this.showTestScreen();
        this._startTestMeter();
        // Начатое доводится до конца (правило владельца 15.09.2026): тест
        // идёт пятнадцать минут и сам тратит минуты, поэтому лимит чаще
        // всего кончается ровно посреди него. Стена в этот момент отнимает
        // не разговор, а сорок отвеченных вопросов. Она не пропадает —
        // meter.js покажет её сразу после результата, в пиковый момент.
        this._meterProtect(true);
        // Инструментирование воронки теста. В дампе аналитики:
        // 7 screen_view test, 5 feature_open, средняя 21 сек —
        // люди открывают и сразу уходят. Нам нужно знать ГДЕ.
        try {
            if (window.FrediTracker?.track) {
                window.FrediTracker.track('test_start_clicked', {
                    has_userId: !!this.userId
                });
            }
            _testGoal('fredi_test_start');
        } catch {}
        // Параллельно подтягиваем расширенные интерпретации с бэка —
        // нужны для этапа 4 (Дилтс). До этапа 4 пользователь идёт
        // 4-5 минут, JSON успеет загрузиться задолго.
        this._loadInterpretations().catch(() => {});
        setTimeout(()=>this.sendStageIntro(), 500);
    },

    // ============================================
    // ОТРИСОВКА СООБЩЕНИЙ
    // ============================================
    addBotMessage(text, isHtml=true) {
        const c = document.getElementById('testChatMessages');
        if (!c) return;

        let processed = text;
        if (isHtml && typeof text==='string') {
            processed = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'test-message test-message-bot';

        const bubble = document.createElement('div');
        bubble.className = 'test-message-bubble test-message-bubble-bot';
        const textDiv = document.createElement('div');
        textDiv.className = 'test-message-text';
        if (isHtml) textDiv.innerHTML = processed.replace(/\n/g,'<br>');
        else textDiv.textContent = text;
        const timeDiv = document.createElement('div');
        timeDiv.className = 'test-message-time';
        timeDiv.textContent = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        bubble.appendChild(textDiv); bubble.appendChild(timeDiv);
        msgDiv.appendChild(bubble);
        c.appendChild(msgDiv);
        this._keepTailLast(c);
        this.scrollToBottom();
        return msgDiv;
    },

    addUserMessage(text) {
        const c = document.getElementById('testChatMessages');
        if (!c) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'test-message test-message-user';
        const bubble = document.createElement('div');
        bubble.className = 'test-message-bubble test-message-bubble-user';
        const textDiv = document.createElement('div');
        textDiv.className = 'test-message-text';
        textDiv.textContent = text;
        const timeDiv = document.createElement('div');
        timeDiv.className = 'test-message-time';
        timeDiv.textContent = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
        bubble.appendChild(textDiv); bubble.appendChild(timeDiv);
        msgDiv.appendChild(bubble); c.appendChild(msgDiv);
        this._keepTailLast(c);
        this.scrollToBottom();
        return msgDiv;
    },

    addQuestionMessage(text, options, callback, current, total) {
        const c = document.getElementById('testChatMessages');
        if (!c) return;

        // Прошлые вопросы гасим по-настоящему. До 14.09.2026 отключалась
        // только нажатая кнопка: её соседи по вопросу и варианты всех
        // предыдущих вопросов оставались кликабельными. Человек, пролистав
        // ленту вверх, мог нажать вариант вопроса, на который уже ответил,
        // и добавить себе лишний балл — тест считал бы его по ответам,
        // которых он не давал. Заодно это и есть главная причина, почему
        // непонятно, где сейчас находишься: на экране несколько живых
        // наборов кнопок сразу.
        this._lockPreviousOptions();

        const msgDiv = document.createElement('div');
        msgDiv.className = 'test-message test-message-bot';
        const bubble = document.createElement('div');
        bubble.className = 'test-message-bubble test-message-bubble-bot';
        const textDiv = document.createElement('div');
        textDiv.className = 'test-message-text';
        textDiv.innerHTML = text;
        const buttonsDiv = document.createElement('div');
        // test-options — колонка во всю ширину: варианты ответа читаются
        // сверху вниз и попадают под палец. Ряд из пилюль годится для
        // навигации («Назад», «Подробнее»), но не для выбора из пяти
        // строк по десять слов — они рвались по словам вразнобой.
        buttonsDiv.className = 'test-message-buttons test-options';
        options.forEach((opt, idx) => {
            const optText = typeof opt==='object' ? opt.text : opt;
            const btn = document.createElement('button');
            btn.className = 'test-message-button';
            btn.textContent = optText;
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                // Гасим всю группу, а выбранный помечаем — человек видит,
                // что именно он ответил, не листая ленту к своему пузырю.
                buttonsDiv.querySelectorAll('button').forEach(b => { b.disabled = true; });
                buttonsDiv.classList.add('test-options--answered');
                btn.classList.add('test-option--chosen');
                this.addUserMessage(optText);
                callback(idx, opt);
            });
            buttonsDiv.appendChild(btn);
        });
        bubble.appendChild(textDiv); bubble.appendChild(buttonsDiv);
        msgDiv.appendChild(bubble); c.appendChild(msgDiv);
        this._keepTailLast(c);
        this._renderProgress();
        this.scrollToBottom();
    },

    /** Погасить варианты всех предыдущих вопросов. */
    _lockPreviousOptions() {
        document.querySelectorAll('.test-options').forEach(g => {
            g.classList.add('test-options--answered');
            g.querySelectorAll('button').forEach(b => { b.disabled = true; });
        });
    },

    /**
     * Полоса прогресса поверх ленты.
     *
     * Тест идёт пятнадцать минут и состоит из пяти этапов, а единственным
     * указателем был «Вопрос 3/8» внутри пузыря — он уезжал вверх вместе с
     * лентой, и через минуту человек не знал ни где он, ни сколько
     * осталось. Процент в поле времени («📊 38%») стоял на месте, где во
     * всём приложении стоит время, и читался как ошибка.
     *
     * Считаем по вопросам всего теста, а не внутри этапа: человеку важно,
     * сколько осталось до конца, а не до конца текущего куска.
     */
    _renderProgress() {
        const host = document.getElementById('testChatContainer');
        if (!host) return;
        let bar = document.getElementById('testProgress');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'testProgress';
            bar.className = 'test-progress';
            bar.innerHTML = '<div class="test-progress-line"><i></i></div>'
                          + '<div class="test-progress-label"></div>';
            host.insertBefore(bar, host.firstChild);
        }
        const stages = this.stages || [];
        let done = 0, all = 0;
        stages.forEach((st, i) => {
            const t = st.total || 0;
            all += t;
            if (i < this.currentStage) done += t;
            else if (i === this.currentStage) done += Math.min(this.currentQuestionIndex, t);
        });
        const pct = all ? Math.round(done / all * 100) : 0;
        const cur = stages[this.currentStage];
        const fill = bar.querySelector('.test-progress-line i');
        if (fill) fill.style.width = pct + '%';
        const label = bar.querySelector('.test-progress-label');
        if (label && cur) {
            // Номер вопроса переехал сюда из пузыря: там он уезжал вверх
            // вместе с лентой и через минуту переставал что-либо значить.
            const qn = Math.min(this.currentQuestionIndex + 1, cur.total || 1);
            // Порядок важен: сначала то, что обязано быть видно всегда
            // (этап и вопрос), потом название этапа — его и обрежет, если
            // не хватит места. Процент не пишем: его показывает сама
            // полоса, а лишняя цифра в короткой строке съедает место.
            const name = (cur.name || '').toLowerCase();
            label.innerHTML = '<b>Этап ' + (cur.number || this.currentStage + 1) + '/' + stages.length
                + ' · вопрос ' + qn + '/' + (cur.total || '?') + '</b>'
                + (name ? ' <span>· ' + name.replace(/</g, '&lt;') + '</span>' : '');
        }
    },

    _removeProgress() {
        const bar = document.getElementById('testProgress');
        if (bar) bar.remove();
    },

    addMessageWithButtons(text, buttons) {
        const c = document.getElementById('testChatMessages');
        if (!c) return;
        this._lockPreviousOptions();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'test-message test-message-bot';
        const bubble = document.createElement('div');
        bubble.className = 'test-message-bubble test-message-bubble-bot';
        if (text) {
            const textDiv = document.createElement('div');
            textDiv.className = 'test-message-text';
            textDiv.innerHTML = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
            bubble.appendChild(textDiv);
        }
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'test-message-buttons';
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'test-message-button';
            button.textContent = btn.text;
            button.addEventListener('click', () => {
                if (button.disabled) return;
                // keepEnabled — для кнопок, открывающих закрываемые модалки
                // («Сохранить профиль»): закрыл модалку — кнопка жива и
                // даёт вторую попытку. Остальные одноразовые, как раньше.
                if (!btn.keepEnabled) { button.disabled=true; button.style.opacity='0.4'; }
                btn.callback();
            });
            buttonsDiv.appendChild(button);
        });
        const timeDiv = document.createElement('div');
        timeDiv.className='test-message-time'; timeDiv.textContent='только что';
        bubble.appendChild(buttonsDiv); bubble.appendChild(timeDiv);
        msgDiv.appendChild(bubble); c.appendChild(msgDiv);
        this._keepTailLast(c);
        this.scrollToBottom();
        return msgDiv;
    },

    scrollToBottom() {
        setTimeout(() => {
            const c = document.getElementById('testChatMessages');
            if (c) c.scrollTop = c.scrollHeight;
        }, 50);
    },

    /**
     * Поставить сообщение НАЧАЛОМ видимой области, а не концом.
     *
     * Лента теста всегда прокручивалась вниз — для вопроса с кнопками это
     * верно, там читать надо последнюю строку. Но портрет и разбор — это
     * несколько экранов текста, и человек оказывался в самом их конце:
     * видел хвост и не понимал, откуда начинать. Владелец сказал об этом
     * дважды, про финальный экран и про полный отчёт.
     *
     * Два захода: сразу и после кадра отрисовки — до него высота блока
     * ещё не посчитана, и браузер возвращает прокрутку обратно.
     */
    scrollMessageToTop(el) {
        if (!el) return;
        const go = () => {
            const c = document.getElementById('testChatMessages');
            if (!c) return true;
            // Считаем через прямоугольники, а не через offsetTop: offsetTop
            // отмеряется от ближайшего позиционированного предка, и это не
            // обязательно лента. В Safari на 320px из-за этого прыжок к
            // части 3 уезжал на 275 вместо 2041 — проверено.
            const cr = c.getBoundingClientRect();
            const er = el.getBoundingClientRect();
            c.scrollTop = Math.max(0, c.scrollTop + (er.top - cr.top) - 12);
            // Промеряем заново ПОСЛЕ прокрутки: раскладка нередко досчитывается
            // уже потом — дорисовался шрифт, пришла картинка, — и заголовок
            // уезжает. Двух попыток вслепую не хватало: в Chrome заголовок
            // части 3 замирал в 260 пикселях от верха вместо 12. Здесь мы
            // возвращаемся и поправляем, пока не сойдётся.
            return Math.abs(el.getBoundingClientRect().top
                            - c.getBoundingClientRect().top - 12) < 3;
        };
        let tries = 0;
        const tick = () => {
            if (go() || ++tries > 6) return;
            setTimeout(tick, 90);
        };
        setTimeout(tick, 60);
    },

    /**
     * Запас под лентой, чтобы последние части разбора доходили до верха.
     *
     * Под частью 3 остаются только кнопки и блок подписки — высоты не
     * хватает, прокрутка упирается в конец, и «перейти к части 3» приводило
     * не туда, куда обещало оглавление. Резервируем хвост один раз, когда
     * разбор собран целиком: делать это в момент прокрутки нельзя — Chrome
     * якорит прокрутку при росте содержимого, и попадание становится
     * случайным (проверено: промах 259px, потом 216px, потом 103px).
     *
     * Только на экране результата: во время теста лента прокручивается вниз,
     * и пустой хвост там был бы виден.
     */
    // Распорка обязана оставаться последней: после разбора в ленту ещё
    // добавляются сообщения («мысли психолога», возврат к профилю), и
    // оставленная на месте распорка разорвала бы ленту пустотой посередине.
    _keepTailLast(c) {
        const sp = c && c.querySelector('.test-tail-spacer');
        if (sp && sp !== c.lastElementChild) c.appendChild(sp);
    },

    _reserveTail() {
        const c = document.getElementById('testChatMessages');
        if (!c) return;
        let sp = c.querySelector('.test-tail-spacer');
        if (!sp) {
            sp = document.createElement('div');
            sp.className = 'test-tail-spacer';
            sp.setAttribute('aria-hidden', 'true');
            // Лента — колоночный флексбокс: у обычного потомка высота
            // сжимается до нуля, поэтому flex-basis фиксируем явно.
            sp.style.flex = '0 0 auto';
            c.appendChild(sp);
        }
        const h = Math.max(0, c.clientHeight - 160);
        sp.style.height = h + 'px';
        sp.style.minHeight = h + 'px';
    },

    // ============================================
    // ЛОГИКА ТЕСТА
    // ============================================
    getCurrentQuestions() {
        const stage = this.stages[this.currentStage];
        if (stage.id==='perception') return this.perception_questions;
        if (stage.id==='thinking') {
            const isExt = this.perceptionType==='СОЦИАЛЬНО-ОРИЕНТИРОВАННЫЙ'||this.perceptionType==='СТАТУСНО-ОРИЕНТИРОВАННЫЙ';
            return isExt ? this.thinking_questions.external : this.thinking_questions.internal;
        }
        if (stage.id==='behavior') return this.behavior_questions;
        if (stage.id==='growth')   return this.growth_questions;
        if (stage.id==='deep')     return this.deep_questions;
        return [];
    },

    sendStageIntro() {
        if (this.currentStage>=this.stages.length) { this.showFinalProfile(); return; }
        const stage = this.stages[this.currentStage];
        // Инструментирование: видно, на каком этапе intro показан и сколько
        // людей нажмут «НАЧАТЬ ЭТАП» (vs закроют). Этап 1 — самый важный
        // для анализа дроп-офф (по дампу — главная утечка).
        try {
            if (window.FrediTracker?.track) {
                window.FrediTracker.track('test_stage_intro_shown', {
                    stage: this.currentStage,
                    stage_id: stage.id
                });
            }
        } catch {}
        this.addBotMessage('🧠 '+stage.name+'\n\n'+stage.shortDesc+'\n\n'+stage.detailedDesc+'\n\n👇 НАЧИНАЕМ?', true);
        this.addMessageWithButtons('', [
            {text:'▶️ НАЧАТЬ ЭТАП',callback:()=>{
                try {
                    if (window.FrediTracker?.track) {
                        window.FrediTracker.track('test_stage_started', {
                            stage: this.currentStage,
                            stage_id: stage.id
                        });
                    }
                } catch {}
                this.sendNextQuestion();
            }},
            {text:'📖 ПОДРОБНЕЕ',callback:()=>this.showStageDetails(this.currentStage)}
        ]);
    },

    showStageDetails(idx) {
        const stage = this.stages[idx];
        this.addMessageWithButtons('🔬 **ЭТАП '+stage.number+': '+stage.name+' — ПОДРОБНО**\n\n'+(stage.extendedDesc||stage.detailedDesc)+'\n\n👇 **НАЧИНАЕМ?**', [
            {text:'▶️ НАЧАТЬ ЭТАП',callback:()=>{ this.currentStage=idx; this.currentQuestionIndex=0; this.sendStageIntro(); }},
            {text:'◀️ НАЗАД',callback:()=>this.goToPreviousStage()}
        ]);
    },

    goToPreviousStage() {
        if (this.currentStage>0) { this.currentStage--; this.sendStageIntro(); }
        else this.showIntroScreen();
    },

    sendNextQuestion() {
        this._renderProgress();
        if (this.currentStage>=this.stages.length) { this.showFinalProfile(); return; }
        const stage = this.stages[this.currentStage];
        const questions = this.getCurrentQuestions();
        if (this.currentQuestionIndex>=stage.total) { this.completeCurrentStage(); return; }
        const q = questions[this.currentQuestionIndex];
        this.addQuestionMessage(q.text, q.options, (idx,opt)=>this.handleAnswer(stage.id,q,idx,opt), this.currentQuestionIndex+1, stage.total);
    },

    handleAnswer(stageId, q, idx, opt) {
        // measures/target живут на выбранной ОПЦИИ (opt), не на вопросе.
        this.answers.push({ stage:stageId, questionIndex:this.currentQuestionIndex, question:q.text, answer:opt.text, option:idx, scores:opt.scores, level:opt.level, strategy:opt.strategy, dilts:opt.dilts, pattern:opt.pattern, target:opt.target||opt.measures });

        if (stageId==='perception' && opt.scores) { for (const [k,v] of Object.entries(opt.scores)) this.perceptionScores[k]+=v; }
        if (stageId==='thinking' && opt.level) { this.thinkingScores[opt.level]=(this.thinkingScores[opt.level]||0)+1; if(opt.measures&&this.strategyLevels[opt.measures]) this.strategyLevels[opt.measures].push(opt.level); }
        if (stageId==='behavior' && opt.level) { this.stage3Scores.push(opt.level); if(opt.strategy) this.behavioralLevels[opt.strategy].push(opt.level); }
        if (stageId==='growth' && opt.dilts) { this.diltsCounts[opt.dilts]=(this.diltsCounts[opt.dilts]||0)+1; }
        if (stageId==='deep') { this.deepAnswers.push({questionIndex:this.currentQuestionIndex,pattern:opt.pattern,target:opt.target}); }

        this.saveProgress();
        this.currentQuestionIndex++;
        setTimeout(()=>this.sendNextQuestion(), 800);
    },

    completeCurrentStage() {
        const stage = this.stages[this.currentStage];
        if (stage.id==='perception') {
            this.perceptionType = this.determinePerceptionType();
            const isExt = this.perceptionType.includes('СОЦИАЛЬНО')||this.perceptionType.includes('СТАТУСНО');
            this.stages[1].total = (isExt?this.thinking_questions.external:this.thinking_questions.internal).length;
            this.showStage1Result();
        } else if (stage.id==='thinking') {
            this.thinkingLevel = this.calculateThinkingLevel();
            this.showStage2Result();
        } else if (stage.id==='behavior') {
            this.showStage3Result();
        } else if (stage.id==='growth') {
            this.profileData = this.calculateFinalProfile();
            this.showStage4Result();
        } else if (stage.id==='deep') {
            this.deepPatterns = this.analyzeDeepPatterns();
            this.showStage5Result();
        }
    },

    showStage1Result() {
        const type = this.perceptionType;
        const text = `🧠 ЭТАП 1: КОНФИГУРАЦИЯ ВОСПРИЯТИЯ

Твой тип: ${type}

${this.getStage1Interpretation()}

⬇️ Переходим к этапу 2 — исследуем, как ты мыслишь внутри этой конфигурации.`;
        this.addMessageWithButtons(text, [
            {text:'▶️ К ЭТАПУ 2',callback:()=>this.goToNextStage()},
            {text:'◀️ НАЗАД',callback:()=>this.goToPreviousStage()}
        ]);
    },

    showStage2Result() {
        const g = this.getLevelGroup(this.thinkingLevel);
        const levelName = {'1-3':'Конкретно-ситуативный','4-6':'Системный','7-9':'Мета-системный'}[g]||'';
        const text = `🧠 ЭТАП 2: КОНФИГУРАЦИЯ МЫШЛЕНИЯ

Уровень: ${levelName} (${this.thinkingLevel}/9)

${this.getStage2Interpretation()}

⬇️ Переходим к этапу 3 — исследуем твоё поведение.`;
        this.addMessageWithButtons(text, [
            {text:'▶️ К ЭТАПУ 3',callback:()=>this.goToNextStage()},
            {text:'◀️ НАЗАД',callback:()=>this.goToPreviousStage()}
        ]);
    },

    showStage3Result() {
        const avg = arr => arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):3;
        const sb=avg(this.behavioralLevels['СБ']),tf=avg(this.behavioralLevels['ТФ']),ub=avg(this.behavioralLevels['УБ']),cv=avg(this.behavioralLevels['ЧВ']);
        const l = this.calculateFinalLevel();
        const levelName = l<=3?'Реактивный':l<=6?'Активный':'Стратегический';
        const text = `🧠 ЭТАП 3: КОНФИГУРАЦИЯ ПОВЕДЕНИЯ

Уровень: ${levelName} (${l}/9)

📊 Твои векторы:
• 🛡 СБ (реакция на угрозу): ${sb}/6
• 💰 ТФ (добыча ресурсов): ${tf}/6
• 🔍 УБ (понимание мира): ${ub}/6
• 🤝 ЧВ (отношения): ${cv}/6

${this.getStage3Interpretation()}

⬇️ Переходим к завершающему этапу.`;
        this.addMessageWithButtons(text, [
            {text:'▶️ К ЭТАПУ 4',callback:()=>this.goToNextStage()},
            {text:'◀️ НАЗАД',callback:()=>this.goToPreviousStage()}
        ]);
    },

    showStage4Result() {
        const p = this.calculateFinalProfile();
        // Шкала /6 — синхронно с финальным экраном (см. showFinalProfileButtons).
        const sbD = {1:'Под давлением замираете',2:'Избегаете конфликтов',3:'Внешне соглашаетесь',4:'Внешне спокойны',5:'Умеете защищать',6:'Защищаете и используете силу',7:'Видите давление как жизненный урок',8:'Распознаёте универсальные паттерны',9:'Опираетесь на законы развития'}[p.sbLevel]||'—';
        const tfD = {1:'Деньги как повезёт',2:'Ищете возможности',3:'Зарабатываете трудом',4:'Хорошо зарабатываете',5:'Создаёте системы дохода',6:'Управляете капиталом',7:'Видите деньги как часть экономики',8:'Деньги — отражение ценности',9:'Деньги — универсальный эквивалент'}[p.tfLevel]||'—';
        const ubD = {1:'Не думаете о сложном',2:'Верите в знаки',3:'Доверяете экспертам',4:'Ищете заговоры',5:'Анализируете факты',6:'Строите теории',7:'Ищете аналогии в истории',8:'Строите модели мира',9:'Видите закономерности'}[p.ubLevel]||'—';
        const cvD = {1:'Сильно привязываетесь',2:'Подстраиваетесь',3:'Хотите нравиться',4:'Умеете влиять',5:'Строите равные отношения',6:'Создаёте сообщества',7:'Понимаете историю группы',8:'Видите архетипы отношений',9:'Понимаете универсальные законы'}[p.chvLevel]||'—';

        // Расширенная интерпретация этапа 4 (раньше отсутствовала).
        // Использует JSON-интерпретации с бэка, fallback — короткий tip.
        const interp = this.getStage4Interpretation();
        const dist = interp.distribution || {};
        const bar = (pct) => '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
        const star = (key) => interp.dominant === key ? ' ⭐' : '';
        const distBlock = '📊 РАСПРЕДЕЛЕНИЕ ПО УРОВНЯМ ДИЛТСА:\n'
            + '🌍 Окружение     ' + bar(dist.ENVIRONMENT||0) + ' ' + (dist.ENVIRONMENT||0) + '%' + star('ENVIRONMENT') + '\n'
            + '🛠️ Поведение    ' + bar(dist.BEHAVIOR||0) + ' ' + (dist.BEHAVIOR||0) + '%' + star('BEHAVIOR') + '\n'
            + '📚 Способности   ' + bar(dist.CAPABILITIES||0) + ' ' + (dist.CAPABILITIES||0) + '%' + star('CAPABILITIES') + '\n'
            + '💎 Ценности      ' + bar(dist.VALUES||0) + ' ' + (dist.VALUES||0) + '%' + star('VALUES') + '\n'
            + '🧠 Идентичность  ' + bar(dist.IDENTITY||0) + ' ' + (dist.IDENTITY||0) + '%' + star('IDENTITY');

        // Если JSON загрузился — показываем what_means/lever/blind_spot.
        // Если нет — однострочный tip как раньше.
        let interpBlock;
        if (interp.what_means && interp.lever) {
            interpBlock = '🎯 Ваша точка роста: ' + (interp.title || '').toUpperCase() + '\n\n'
                + 'Что это значит:\n' + interp.what_means + '\n\n'
                + '🚀 Ваш природный рычаг:\n' + interp.lever
                + (interp.blind_spot ? '\n\n⚠️ Слепая зона:\n' + interp.blind_spot : '');
        } else {
            const fallbackTip = {ENVIRONMENT:'Посмотрите вокруг — может, дело в обстоятельствах?',BEHAVIOR:'Попробуйте делать хоть что-то по-другому.',CAPABILITIES:'Развивайте новые навыки.',VALUES:'Поймите, что для вас действительно важно.',IDENTITY:'Ответьте себе на вопрос «кто я?»'}[p.dominantDilts]||'Начните с малого.';
            interpBlock = '🎯 Точка роста: ' + fallbackTip;
        }

        const conf = interp.confidence || 0.6;
        const confBar = '█'.repeat(Math.floor(conf * 10)) + '░'.repeat(10 - Math.floor(conf * 10));
        const confBlock = '📊 Уверенность портрета: ' + confBar + ' ' + Math.floor(conf * 100) + '%';

        const text = '🧠 ПРЕДВАРИТЕЛЬНЫЙ ПОРТРЕТ\n\n'
            + (p.archetype ? '✨ Архетип: ' + p.archetype + '\n\n' : '')
            + '📊 ТВОИ ВЕКТОРЫ:\n\n'
            + '• СБ ' + p.sbLevel + '/6: ' + sbD + '\n'
            + '• ТФ ' + p.tfLevel + '/6: ' + tfD + '\n'
            + '• УБ ' + p.ubLevel + '/6: ' + ubD + '\n'
            + '• ЧВ ' + p.chvLevel + '/6: ' + cvD + '\n\n'
            + distBlock + '\n\n'
            + interpBlock + '\n\n'
            + confBlock + '\n\n'
            + '👇 ЭТО ПОХОЖЕ НА ВАС?';

        this.addMessageWithButtons(text, [
            {text:'✅ ДА',callback:()=>this.profileConfirm()},
            {text:'❓ ЕСТЬ СОМНЕНИЯ',callback:()=>this.profileDoubt()},
            {text:'◀️ НАЗАД',callback:()=>this.goToPreviousStage()}
        ]);
    },

    profileConfirm() {
        // Логируем подтверждение портрета на этапе 4 — материал
        // для аналитики «какие профили попадают, какие нет».
        this.logTestFeedback('yes');
        this.addBotMessage('✅ Отлично! Тогда исследуем глубину...', true);
        setTimeout(()=>this.goToNextStage(), 1500);
    },

    profileDoubt() {
        this.logTestFeedback('doubt');
        this.addMessageWithButtons('🔍 ДАВАЙ УТОЧНИМ\n\nЧто именно вам не подходит?\n\n👇 Выберите и нажмите ДАЛЬШЕ', [
            {text:'🎭 Про людей',callback:()=>this.toggleDiscrepancy('people')},
            {text:'💰 Про деньги',callback:()=>this.toggleDiscrepancy('money')},
            {text:'🔍 Про знаки',callback:()=>this.toggleDiscrepancy('signs')},
            {text:'🤝 Про отношения',callback:()=>this.toggleDiscrepancy('relations')},
            {text:'🛡 Про давление',callback:()=>this.toggleDiscrepancy('sb')},
            {text:'➡️ ДАЛЬШЕ',callback:()=>this.clarifyNext()}
        ]);
    },

    toggleDiscrepancy(type) {
        if (this.discrepancies.includes(type)) this.discrepancies=this.discrepancies.filter(d=>d!==type);
        else this.discrepancies.push(type);
        this.saveProgress();
    },

    clarifyNext() {
        if (!this.discrepancies.length) { this.addBotMessage('⚠️ Выберите хотя бы одно расхождение!', true); return; }
        const lvls = {};
        for (const v of ['СБ','ТФ','УБ','ЧВ']) { const a=this.behavioralLevels[v]||[]; lvls[v]=a.length?a.reduce((a,b)=>a+b,0)/a.length:3; }
        const questions = this.getClarifyingQuestions(this.discrepancies, lvls);
        if (!questions.length) { this.addBotMessage('⚠️ Нет уточняющих вопросов', true); return; }
        this.clarifyingQuestions=questions; this.clarifyingCurrent=0;
        this.askClarifyingQuestion();
    },

    askClarifyingQuestion() {
        if (this.clarifyingCurrent>=this.clarifyingQuestions.length) {
            this.clarificationIteration++; this.saveProgress(); this.showStage4Result(); return;
        }
        const q = this.clarifyingQuestions[this.clarifyingCurrent];
        const options = Object.entries(q.options).map(([key,value])=>({
            text:value,
            callback:()=>{ this.clarifyingAnswers.push({question:q.text,answer:value,key,vector:q.vector,type:q.type}); this.clarifyingCurrent++; this.askClarifyingQuestion(); }
        }));
        options.push({text:'⏭ ПРОПУСТИТЬ',callback:()=>{ this.clarifyingCurrent++; this.askClarifyingQuestion(); }});
        this.addMessageWithButtons('🔍 УТОЧНЯЮЩИЙ ВОПРОС '+(this.clarifyingCurrent+1)+'/'+this.clarifyingQuestions.length+'\n\n'+q.text, options);
    },

    restartTest() { this.start(); },

    goToChat() {
        this.addBotMessage('👋 До свидания!\n\nБуду рад помочь, если решите вернуться.', true);
        setTimeout(()=>{ if(typeof renderDashboard==='function') renderDashboard(); else if(window.dashboard?.renderDashboard) window.dashboard.renderDashboard(); }, 2000);
    },

    showStage5Result() {
        // Базовая интерпретация (тип привязанности) — была раньше.
        let body = this.getStage5Interpretation();

        // Расширенные блоки defense/driver/shadow — выводятся только
        // если интерпретации с бэка загрузились. Иначе пропускаем тихо.
        const def = this.interpretations?.stage5?.defense?.patterns;
        const drv = this.interpretations?.stage5?.driver?.patterns;
        const shd = this.interpretations?.stage5?.shadow?.patterns;
        if (def && drv && shd) {
            const defKey = this.deriveDefense();
            const drvKey = this.deriveDriver();
            const shdKey = this.deriveShadow();
            const defBlock = def[defKey] ? `\n\n🌑 Базовая защита: ${def[defKey].label}\n${def[defKey].text}` : '';
            const drvBlock = drv[drvKey] ? `\n\n⚡ Ведущий драйвер: ${drv[drvKey].label}\n${drv[drvKey].text}` : '';
            const shdBlock = shd[shdKey] ? `\n\n🎭 Теневая сторона: ${shd[shdKey].label}\n${shd[shdKey].text}` : '';
            body = body + defBlock + drvBlock + shdBlock;
        }

        // Кросс-этапные инсайты — связывают данные нескольких этапов
        // в интегрирующий портрет. Показываются перед рекомендациями.
        let crossBlock = '';
        const insights = this.getCrossStageInsights();
        if (insights.length) {
            const lines = insights.map(i => `▸ <b>${i.title}</b>\n${i.text}`);
            crossBlock = `\n\n━━━━━━━━━━━━━━━━━\n🧬 ВАША КОНФИГУРАЦИЯ:\n\n${lines.join('\n\n')}`;
        }

        // Блок со списком навыков отсюда убран 14.09.2026. Он выводился
        // ДО портрета — то есть до того, как человек вообще узнал свой
        // профиль, — пятью строчками без объяснения, зачем ему это, а ниже
        // на том же экране шёл второй, серверный блок рекомендаций с
        // курсом и играми. Восемь позиций подряд из двух разных систем
        // читались как каталог, а не как совет. Рекомендация теперь одна и
        // стоит после интерпретации (renderTestRecommendations).

        const text = `🧠 ЭТАП 5: ГЛУБИННЫЕ ПАТТЕРНЫ\n\n${body}${crossBlock}\n\n✅ Тест завершён! Собираю воедино результаты 5 этапов...`;
        this.addBotMessage(text, true);
        this._showAILoader('Meyster AI составляет ваш психологический портрет', 'Анализ 5 этапов, подбор инсайтов и формирование рекомендаций. 20-40 секунд.');
        this.sendTestResultsToServer();
    },

    _showAILoader(title, subtitle) {
        try { Test._injectLoaderStyles(); } catch (e) {}
        let el = document.getElementById('test-ai-loader');
        if (el) {
            const t = el.querySelector('.test-ai-loader-title');
            const s = el.querySelector('.test-ai-loader-sub');
            if (t) t.textContent = '🧠 ' + (title || 'Meyster AI составляет ваш профиль');
            if (s) s.textContent = subtitle || 'Это может занять 20-40 секунд. Не закрывайте страницу.';
            el.style.display = 'flex';
            return;
        }
        el = document.createElement('div');
        el.id = 'test-ai-loader';
        el.className = 'test-ai-loader-overlay';
        el.innerHTML = `
            <div class="test-ai-loader-box">
                <div class="test-ai-loader-spinner"></div>
                <div class="test-ai-loader-title">🧠 ${(title || 'Meyster AI составляет ваш профиль').replace(/</g,'&lt;')}</div>
                <div class="test-ai-loader-sub">${(subtitle || 'Это может занять 20-40 секунд. Не закрывайте страницу.').replace(/</g,'&lt;')}</div>
                <div class="test-ai-loader-dots"><span></span><span></span><span></span></div>
            </div>
        `;
        document.body.appendChild(el);
    },

    _updateAILoader(title, subtitle) {
        const el = document.getElementById('test-ai-loader');
        if (!el) return;
        if (title) {
            const t = el.querySelector('.test-ai-loader-title');
            if (t) t.textContent = '🧠 ' + title;
        }
        if (subtitle) {
            const s = el.querySelector('.test-ai-loader-sub');
            if (s) s.textContent = subtitle;
        }
    },

    _hideAILoader() {
        const el = document.getElementById('test-ai-loader');
        if (el) el.remove();
    },

    _injectLoaderStyles() {
        if (document.getElementById('test-ai-loader-styles')) return;
        const style = document.createElement('style');
        style.id = 'test-ai-loader-styles';
        style.textContent = `
            @keyframes test-ai-spin { to { transform: rotate(360deg); } }
            @keyframes test-ai-dot { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
            .test-ai-loader-overlay {
                position: fixed; inset: 0; z-index: 99999;
                display: flex; align-items: center; justify-content: center;
                background: rgba(0,0,0,0.72);
                backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            }
            [data-theme="light"] .test-ai-loader-overlay { background: rgba(240,240,245,0.82); }
            .test-ai-loader-box {
                background: #1a1a1c; color: #fff;
                border: 1px solid rgba(127,127,127,0.2);
                border-radius: 20px; padding: 32px 28px;
                max-width: 360px; width: calc(100% - 40px);
                text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }
            [data-theme="light"] .test-ai-loader-box {
                background: #fff; color: #1c1c1e;
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            }
            .test-ai-loader-spinner {
                width: 64px; height: 64px; margin: 0 auto 20px;
                border: 5px solid rgba(127,127,127,0.18);
                border-top-color: #ff6b3b; border-radius: 50%;
                animation: test-ai-spin 0.9s linear infinite;
            }
            .test-ai-loader-title {
                font-size: 17px; font-weight: 700; margin-bottom: 8px;
            }
            .test-ai-loader-sub {
                font-size: 13px; opacity: 0.7; line-height: 1.5; margin-bottom: 16px;
            }
            .test-ai-loader-dots { display: flex; justify-content: center; gap: 6px; }
            .test-ai-loader-dots span {
                width: 8px; height: 8px; border-radius: 50%;
                background: #ff6b3b; display: inline-block;
                animation: test-ai-dot 1.2s ease-in-out infinite;
            }
            .test-ai-loader-dots span:nth-child(2) { animation-delay: 0.15s; }
            .test-ai-loader-dots span:nth-child(3) { animation-delay: 0.3s; }
        `;
        document.head.appendChild(style);
    },

    goToNextStage() { this.currentStage++; this.currentQuestionIndex=0; this.sendStageIntro(); },

    // ============================================
    // СЕРВЕР / ФИНАЛ
    // ============================================
    async sendTestResultsToServer() {
        if (!this.userId) { this.showFinalProfileButtons(); return; }
        const profile = this.calculateFinalProfile();
        const deep = this.deepPatterns||{attachment:'🤗 Надежный'};
        try {
            const r = await fetch(TEST_API_BASE_URL+'/api/save-test-results', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    user_id:parseInt(this.userId), context:this.context,
                    results:{ perception_type:this.perceptionType, thinking_level:this.thinkingLevel, behavioral_levels:this.behavioralLevels, dilts_counts:this.diltsCounts, deep_patterns:deep, profile_data:profile, all_answers:this.answers, test_completed:true, test_completed_at:new Date().toISOString() }
                })
            });
            let data; try { data=await r.json(); } catch { data={success:r.ok}; }
            if (!data.success) {
                await this._onSaveFailed(String(data && data.error || r.status));
                return;
            }
            this._saveFailed = false;
        } catch(error) {
            console.error('❌ Ошибка сети:', error);
            await this._onSaveFailed(String(error && error.message || error));
            return;
        }
        // Дальше — уже после успешного сохранения, и каждый шаг со своей
        // защитой. Раньше они стояли внутри того же try: любая осечка
        // AI-профиля или зеркала читалась как несохранённый результат, и
        // весь путь запускался заново. /api/mirrors/complete отвечает 402
        // приглашённому без подписки — то есть штатно и регулярно.
        try { await this.fetchAIGeneratedProfile(); }
        catch (e) { console.error('AI-профиль не собрался:', e); this.showFinalProfileButtons(); }
        try { await this.completeMirrorIfReferred(profile, deep); }
        catch (e) { console.warn('Зеркало не активировано:', e); }
    },

    // Несохранённый результат ломает главное, ради чего тест и проходят:
    // рекомендации Фреди берутся из профиля на сервере (arsenal.py), и без
    // него человек получает общий ответ, не понимая почему. Раньше сбой
    // сохранения проглатывался молча — показывались те же кнопки финала.
    // Теперь: одна повторная попытка через две секунды (лимит ручки — пять
    // запросов в минуту, сеть на телефоне отваливается и возвращается), а
    // если и она не прошла — человеку говорится прямо, с кнопкой «повторить».
    async _onSaveFailed(reason) {
        if (!this._saveRetried) {
            this._saveRetried = true;
            await new Promise(r => setTimeout(r, 2000));
            return this.sendTestResultsToServer();
        }
        this._saveFailed = true;
        console.warn('Профиль не сохранён:', reason);
        // В Метрику тоже: остальная воронка теста живёт там, и сравнивать
        // «сколько дошло до портрета» с «у скольких профиль не сохранился»
        // по двум разным системам нельзя.
        _testGoal('test_save_failed');
        try {
            if (window.FrediTracker?.track) {
                window.FrediTracker.track('test_save_failed', { reason: String(reason).slice(0, 120) });
            }
        } catch (e) {}
        this.showFinalProfileButtons();
    },

    async completeMirrorIfReferred(profile, deep) {
    const raw = this.getMirrorCode();
    if (!raw) return;

    // Единый канонический формат: всегда с префиксом 'mirror_'.
    // Бэкенд нормализует оба варианта (#78), но мы шлём канонический для чистоты.
    const canonicalCode = String(raw).startsWith('mirror_') ? String(raw) : `mirror_${raw}`;

    try {
        const vectors = {
            'СБ': profile.sbLevel || 3,
            'ТФ': profile.tfLevel || 3,
            'УБ': profile.ubLevel || 3,
            'ЧВ': profile.chvLevel || 3
        };

        const response = await fetch(TEST_API_BASE_URL + '/api/mirrors/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mirror_code: canonicalCode,
                friend_user_id: this.userId,
                friend_name: this.context?.name || localStorage.getItem('fredi_user_name') || 'Друг',
                friend_profile_code: profile?.displayName || null,
                friend_vectors: vectors,
                friend_deep_patterns: deep || {},
                friend_ai_profile: this.aiGeneratedProfile || '',
                friend_perception_type: this.perceptionType,
                friend_thinking_level: this.thinkingLevel
            })
        });
        
        const result = await response.json();
        console.log('🪞 Mirror complete response:', result);
        
        if (result.success && result.activated) {
            try { localStorage.removeItem('fredi_mirror_ref'); } catch (e) {}
            try { sessionStorage.removeItem('fredi_mirror_ref'); } catch (e) {}
            console.log('🪞 Зеркало активировано:', canonicalCode);
        } else {
            console.warn('🪞 Зеркало не активировано:', result);
        }
    } catch(e) {
        console.error('⚠️ Ошибка активации зеркала:', e);
    }
},

    async fetchAIGeneratedProfile() {
        if (!this.userId) { this.showFinalProfileButtons(); return; }

        if (this._aiProfileRetries === 0) {
            this.addBotMessage('🧠 Собираю ваш портрет — Meyster AI...\n\n⏳ Это займёт 15-30 секунд. Анализирую ответы всех 5 этапов...', true);
            this._showAILoader('Meyster AI составляет ваш психологический портрет', 'Анализ 5 этапов, подбор инсайтов и формирование рекомендаций. 20-40 секунд.');
        }

        try {
            const r = await fetch(TEST_API_BASE_URL+'/api/generated-profile/'+this.userId);
            const data = await r.json();
            if (data.success && data.ai_profile) {
                this.aiGeneratedProfile = data.ai_profile;
                this._aiProfileRetries = 0;
                this.showFinalProfileButtons();
                return;
            }
            if (data.status === 'generating' && this._aiProfileRetries < 15) {
                this._aiProfileRetries++;
                const dots = '.'.repeat(Math.min(this._aiProfileRetries, 5));
                const msgs = ['Анализирую ваши паттерны', 'Строю карту личности', 'Формирую инсайты', 'Почти готово'];
                const hint = msgs[Math.min(this._aiProfileRetries - 1, msgs.length - 1)];
                const allMsgs = document.querySelectorAll('.test-message-bot .test-message-text');
                const lastMsg = allMsgs[allMsgs.length - 1];
                if (lastMsg) lastMsg.innerHTML = `🧠 ${hint}${dots}<br><br>⏳ Осталось совсем немного...`;
                this._updateAILoader(hint + dots, 'Осталось совсем немного...');
                setTimeout(() => this.fetchAIGeneratedProfile(), 3000);
                return;
            }
        } catch(e) { console.error('Ошибка AI-профиля:', e); }
        this._aiProfileRetries = 0;
        this.showFinalProfileButtons();
    },

    async showFinalProfileButtons() {
        this._hideAILoader();
        this._stopTestMeter();
        // Разбор письмом — если человек оставил почту на знакомстве.
        // Не ждём ответа: письмо не должно задерживать экран результата.
        this._emailPdf();
        // Тест закончился — полосе прогресса здесь делать нечего.
        this._removeProgress();
        // _restoredProfile ставит showSavedResult(): после перезагрузки
        // страницы ответов в памяти нет, и calculateFinalProfile() выдал бы
        // всем одинаковые 3/3/3/3 из пустых массивов.
        const p = this._restoredProfile || this.calculateFinalProfile();
        const deep = this.deepPatterns||{attachment:'🤗 Надежный'};
        // Шкала векторов — 1..6, и это проверено по самим вопросам: уровень
        // попадает в behavioralLevels только у опций с полем strategy, а у
        // них level не выше 6. Ответы 7–9 помечены measures и уходят в
        // strategyLevels, к векторам отношения не имеющий.
        //
        // До 14.09.2026 здесь стояло /9 — при том, что этап 3 на том же
        // прохождении показывал те же числа как /6. Человек с максимальным
        // ЧВ видел «6/9» вместо «6/6», то есть сильную сторону ему
        // показывали как среднюю. Описания 7–9 ниже недостижимы и оставлены
        // только чтобы не падать на чужих данных.
        const sbD = {1:'Под давлением замираете',2:'Избегаете конфликтов',3:'Внешне соглашаетесь',4:'Внешне спокойны',5:'Умеете защищать',6:'Защищаете и используете силу',7:'Видите давление как жизненный урок',8:'Распознаёте универсальные паттерны',9:'Опираетесь на законы развития'}[p.sbLevel]||'—';
        const tfD = {1:'Деньги как повезёт',2:'Ищете возможности',3:'Зарабатываете трудом',4:'Хорошо зарабатываете',5:'Создаёте системы дохода',6:'Управляете капиталом',7:'Видите деньги как часть экономики',8:'Деньги — отражение ценности',9:'Деньги — универсальный эквивалент'}[p.tfLevel]||'—';
        const ubD = {1:'Не думаете о сложном',2:'Верите в знаки',3:'Доверяете экспертам',4:'Ищете заговоры',5:'Анализируете факты',6:'Строите теории',7:'Ищете аналогии в истории',8:'Строите модели мира',9:'Видите закономерности'}[p.ubLevel]||'—';
        const cvD = {1:'Сильно привязываетесь',2:'Подстраиваетесь',3:'Хотите нравиться',4:'Умеете влиять',5:'Строите равные отношения',6:'Создаёте сообщества',7:'Понимаете историю группы',8:'Видите архетипы отношений',9:'Понимаете универсальные законы'}[p.chvLevel]||'—';

        let text = `🧠 **ЧАСТЬ 1. ПОРТРЕТ И ВЕКТОРЫ**\n\n**Архетип:** ${p.archetype}\n**Код:** ${p.displayName}\n**Тип восприятия:** ${p.perceptionType}\n**Уровень мышления:** ${p.thinkingLevel}/9\n\n**📊 ВАШИ ВЕКТОРЫ:**\n\n**СБ ${p.sbLevel}/6:** ${sbD}\n**ТФ ${p.tfLevel}/6:** ${tfD}\n**УБ ${p.ubLevel}/6:** ${ubD}\n**ЧВ ${p.chvLevel}/6:** ${cvD}\n\n**🧠 Глубинный паттерн:** ${deep.attachment}`;

        // Инструментирование: финальная точка воронки. Различаем anon и authed —
        // именно здесь должна срабатывать первая регистрация для anon-юзеров.
        //
        // Ровно один раз на прохождение. Экран профиля рисуется не только
        // по окончании теста: сюда приходят кнопка «🧠 К ПРОФИЛЮ», возврат
        // после AI-профиля, который догрузился позже, и запасные ветки на
        // ошибку сети — и каждый такой заход писал ещё один test_completed.
        // Последняя ступень воронки от этого выглядела полнее, чем есть, и
        // конверсия в подписку считалась от завышенного числа. Флаг снимает
        // reset() — повторное прохождение теста событие пишет заново.
        const isAuthed = !!(window.FrediAuth && typeof window.FrediAuth.isAuthed === 'function' && window.FrediAuth.isAuthed());
        try {
            if (window.FrediTracker?.track && !this._testCompletedTracked) {
                this._testCompletedTracked = true;
                window.FrediTracker.track('test_completed', {
                    is_authed: isAuthed,
                    has_ai_profile: !!this.aiGeneratedProfile,
                    profile_code: p.displayName || null,
                    archetype: p.archetype || null
                });
                _testGoal('fredi_test_completed');
            }
        } catch {}

        // Оглавление ПЕРЕД частями.
        //
        // До 14.09.2026 результат теста был лентой без опознавательных
        // знаков: одно огромное сообщение (портрет + векторы + AI-текст),
        // под ним рекомендации, кнопки и блок про подписку. Человек не
        // понимал, сколько ещё читать, где кончается бесплатное и
        // начинается платное, и что из этого «полный отчёт», — а слово
        // «полный» в трёх местах означало разное. Владелец назвал это
        // хаосом, и это ровно оно.
        //
        // Теперь наверху карточка с четырьмя частями и ссылками на них.
        // Части регистрируются в _resultAnchors по мере появления, ссылки
        // резолвятся в момент клика: рекомендации приходят с сервера позже
        // оглавления.
        this._resultAnchors = {};
        const toc = this._renderResultToc(p);

        const profileMsg = this.addBotMessage(text, true);
        this._resultAnchors.portrait = profileMsg;

        // Интерпретация — отдельным сообщением, а не хвостом портрета.
        // В одном сообщении таблица векторов и пять абзацев связного текста
        // читались как одна стена, и до интерпретации, ради которой человек
        // и проходил тест, добирались не все.
        if (this.aiGeneratedProfile) {
            const meaningMsg = this.addBotMessage(
                '💡 **ЧАСТЬ 2. ЧТО ЭТО ЗНАЧИТ**\n\n'
                + this.aiGeneratedProfile.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'), true);
            this._resultAnchors.meaning = meaningMsg;
        }

        // Рекомендации ДО кнопок и до предложения подписки. Раньше запрос
        // уходил здесь же, но без ожидания — и ответ приземлялся в самом
        // низу, после «ЧТО ДАЛЬШЕ» и после блока про подписку. Человек
        // читал портрет, упирался в цену и уходил, а совет, ради которого
        // всё затевалось, появлялся у него за спиной.
        //
        // Ждём не дольше восьми секунд: кнопки должны появиться в любом
        // случае, даже если сервер молчит.
        await Promise.race([
            this.fetchTestRecommendations(),
            new Promise(r => setTimeout(r, 8000))
        ]);

        // Финал теста — единственная точка, где у анонима есть своя причина
        // назваться: он только что вложил полчаса и получил профиль, который
        // живёт лишь в localStorage этого браузера. Авто-модалка на входе
        // (login.js) регистраций не дала — по аналитике 40 из 40 юзеров
        // анонимы при 35 стартах стадий теста, — потому что просила аккаунт
        // ДО ценности. Здесь просим ПОСЛЕ, кнопкой, без принуждения.
        const nextButtons = [];
        // Результат не доехал до сервера — говорим об этом до кнопок, а не
        // делаем вид, что всё в порядке: без профиля на сервере Фреди
        // ответит общими словами, и человек решит, что тест бесполезен.
        if (this._saveFailed) {
            this.addBotMessage(
                '⚠️ Профиль посчитан, но сохранить его на сервере не удалось — ' +
                'похоже, связь. Это важно: без сохранённого профиля Фреди не увидит ' +
                'ваши векторы и ответит общими словами. Нажмите кнопку ниже, ' +
                'чтобы попробовать ещё раз.');
            nextButtons.push({
                text: '🔄 СОХРАНИТЬ РЕЗУЛЬТАТ ЕЩЁ РАЗ',
                keepEnabled: true,
                callback: () => {
                    this._saveRetried = false;
                    this._saveFailed = false;
                    this.addBotMessage('Пробую сохранить результат ещё раз…');
                    this.sendTestResultsToServer();
                }
            });
        }
        // Первая кнопка — разговор. 5 сентября большой тест давал 87 открытий
        // Фреди из 106 визитов, а первых сообщений с этого трафика — 4: финал
        // предлагал сохранить, выслать в MAX и уйти на главную, но не
        // поговорить о том, что человек только что узнал о себе. Кнопка
        // отправляет портрет первым сообщением через window.FrediAsk — тот же
        // механизм, что у ?ask= в адресе и у тестов PHQ-9/GAD-7.
        if (typeof window.FrediAsk === 'function') {
            const ask = this._profileAskText(p, deep, { sbD, tfD, ubD, cvD });
            nextButtons.push({
                text: '💬 ОБСУДИТЬ С ФРЕДИ',
                callback: () => {
                    try { if (window.FrediTracker?.track) window.FrediTracker.track('test_ask_chat', { profile_code: p.displayName || null }); } catch {}
                    _testGoal('test_ask_chat');
                    // Экран теста живёт в screenContainer; сначала возвращаем
                    // дашборд с полем ввода, потом отправляем — как goToDashboard.
                    this.goToDashboard();
                    // И сразу открываем окно разговора (решение владельца
                    // 15.09.2026). Раньше человека высаживало на главный
                    // экран, а ответ Фреди приходил куда-то вниз ленты: он
                    // только что прочитал про себя целый разбор и хотел
                    // говорить, а получал дашборд с плитками. Окно ждёт
                    // отрисовки дашборда — до неё переносить нечего.
                    setTimeout(function () {
                        try { if (window.FrediTalk) window.FrediTalk.open('bigtest'); } catch (e) {}
                    }, 90);
                    try { window.FrediAsk(ask, 'bigtest'); } catch (e) { console.warn('FrediAsk failed:', e); }
                }
            });
        }
        if (!isAuthed && window.FrediAuth && typeof window.FrediAuth.openRegister === 'function') {
            nextButtons.push({
                text: '💾 СОХРАНИТЬ ПРОФИЛЬ',
                keepEnabled: true,
                callback: () => {
                    try {
                        if (window.FrediTracker?.track) {
                            window.FrediTracker.track('test_save_profile_clicked', {});
                            _testGoal('test_save_profile_clicked');
                        }
                    } catch {}
                    window.FrediAuth.openRegister({
                        source: 'test_complete',
                        prefillName: (this.context && this.context.name) || ''
                    });
                }
            });
        }
        // Приглашение друга здесь убрано по решению владельца 14.09.2026:
        // на экране результата оно лишнее. Человек пришёл читать про себя,
        // а не звать знакомых, и кнопка растягивала и без того длинный
        // список действий. Сам механизм зеркал цел — shareTestWithFriend,
        // mirrorVariant и цели test_mirror_created_a/_b на месте, их можно
        // повесить в другую точку, где приглашение уместно.
        // «Полный отчёт в MAX» убран по решению владельца 14.09.2026: на
        // экране результата это лишний шаг в сторону. Отчёт уже скачивается
        // файлом кнопкой выше, а отправка в MAX требовала завести бота,
        // написать ему /start и вернуться — половина людей отваливалась на
        // середине. Механизм цел: sendPortraitToMax и ручка на бэкенде
        // остались, их можно повесить туда, где мессенджер уже привязан.
        // «Скачать этот разбор» и «Мысли психолога» убраны 15.09.2026
        // (решение владельца): экран результата и без них длинный, а
        // разбор теперь уходит письмом с PDF — скачивать руками незачем.
        // Мысли психолога при этом не теряются: их кладёт в тот же PDF
        // _build_test_pdf_for_user на бэкенде.
        //
        // downloadReport и showPsychologistThought остались в файле и
        // сейчас ниоткуда не вызываются. Удалять их не стали: печать
        // отчёта и текст мыслей понадобятся, когда решится, куда их
        // повесить, — а собирать это заново дороже, чем держать.
        nextButtons.push(
            { text: '🏠 НА ГЛАВНУЮ', callback: () => this.goToDashboard() }
        );
        const whatNext = isAuthed
            ? '👇 **ЧТО ДАЛЬШЕ?**'
            : '👇 **ЧТО ДАЛЬШЕ?**\n\nСейчас профиль сохранён только в этом браузере. Аккаунт (email + пин-код) привяжет его к вам — он переживёт чистку истории и откроется с любого устройства.';
        this.addMessageWithButtons(whatNext, nextButtons);

        // Что откроется с подпиской — прямо под портретом, с первым шагом
        // бесплатно (решение владельца 12.09.2026). Раньше через три
        // секунды всплывало общее «сохранить и продолжать» без предмета,
        // и его закрывали «позже».
        this.showPremiumTeaser(p);

        if (this.userId) {
            try {
                localStorage.setItem('test_results_'+this.userId, JSON.stringify({
                    profile: p, deepPatterns:deep, perceptionType:this.perceptionType,
                    thinkingLevel:this.thinkingLevel, context:this.context, aiProfile:this.aiGeneratedProfile
                }));
            } catch(e) { console.warn('Failed to save test results to localStorage:', e); }
        }

        // Последним действием, а не сразу после портрета: каждое следующее
        // сообщение — рекомендации, кнопки, блок подписки — тянет ленту
        // вниз, и ранняя прокрутка вверх тут же перебивалась. Человек
        // должен увидеть начало разбора, а не хвост списка кнопок.
        // Начало — оглавление: с него видно, из чего разбор состоит.
        this._reserveTail();
        this.scrollMessageToTop(toc || profileMsg);

        // Сколько осталось — говорим здесь, а не посреди теста. Человек
        // только что увидел портрет и хочет его обсудить; знать остаток
        // ему нужно именно сейчас. Модалку не показываем: она перекроет
        // портрет, ради которого он пятнадцать минут отвечал на вопросы.
        try {
            const m = window.FrediMeter;
            if (m && typeof m.checkCanSend === 'function' && typeof m.showWarningToast === 'function') {
                const st = await m.checkCanSend();
                if (st && !st.is_premium) m.showWarningToast(st);
            }
        } catch (e) {}
    },

    /**
     * Оглавление разбора — первым сообщением после теста.
     *
     * Две вещи, которых людям не хватало. Первая — понять объём: разбор
     * идёт четырьмя частями, а не бесконечной лентой. Вторая — понять,
     * где кончается бесплатное. Здесь это сказано словами: части 1–3 уже
     * перед вами, часть 4 — отдельный экран по подписке.
     *
     * Ссылки резолвятся в момент клика, а не при сборке: рекомендации
     * приходят с сервера на несколько секунд позже оглавления, и на
     * момент отрисовки их элемента ещё нет.
     */
    _renderResultToc(p) {
        const c = document.getElementById('testChatMessages');
        if (!c) return null;
        const premium = (window.IS_PREMIUM === true)
            || !!(window.FrediMeter && window.FrediMeter.lastCheck
                  && (window.FrediMeter.lastCheck.is_premium || window.FrediMeter.lastCheck.has_subscription));

        const items = [
            ['portrait', '1', 'Портрет и векторы', 'кто вы по результатам теста'],
            ['meaning',  '2', 'Что это значит',    'связный разбор вашего профиля'],
            ['steps',    '3', 'С чего начать',     'три шага под ваш результат'],
            ['deep',     '4', 'Глубинный разбор',  premium
                ? 'шесть разделов — открыть'
                : 'шесть разделов — по подписке']
        ];

        const msgDiv = document.createElement('div');
        msgDiv.className = 'test-message test-message-bot';
        const bubble = document.createElement('div');
        bubble.className = 'test-message-bubble test-message-bubble-bot';

        const head = document.createElement('div');
        head.className = 'test-message-text';
        head.innerHTML = '<strong>✅ ТЕСТ ПРОЙДЕН. ВАШ РАЗБОР ГОТОВ</strong><br><br>'
            + 'Части 1–3 ниже — они бесплатные и целиком ваши. '
            + 'Часть 4 — отдельный экран.<br>'
            + '<span style="opacity:.7;font-size:13px">Нажмите на часть, чтобы перейти к ней.</span>';
        bubble.appendChild(head);

        const list = document.createElement('div');
        list.className = 'test-toc';
        items.forEach(([key, num, title, note]) => {
            const row = document.createElement('button');
            row.className = 'test-toc-item';
            row.type = 'button';
            row.innerHTML = '<span class="test-toc-num">' + num + '</span>'
                + '<span class="test-toc-body"><b>' + title + '</b>'
                + '<span class="test-toc-note">' + note + '</span></span>'
                + '<span class="test-toc-go">' + (key === 'deep' ? (premium ? '→' : '🔒') : '↓') + '</span>';
            row.addEventListener('click', () => {
                try { if (window.FrediTracker?.track) window.FrediTracker.track('test_toc_click', { part: key }); } catch {}
                if (key === 'deep') {
                    this.goToDashboard();
                    if (typeof window.navigateTo === 'function') window.navigateTo('analysis');
                    else if (typeof window.openAnalysisScreen === 'function') window.openAnalysisScreen();
                    return;
                }
                const el = this._resultAnchors && this._resultAnchors[key];
                if (el) this.scrollMessageToTop(el);
                else if (window.showToast) window.showToast('Эта часть ещё собирается — секунду', 'info');
            });
            list.appendChild(row);
        });
        bubble.appendChild(list);
        msgDiv.appendChild(bubble);
        c.appendChild(msgDiv);
        this._injectTocStyles();
        return msgDiv;
    },

    _injectTocStyles() {
        if (document.getElementById('test-toc-styles')) return;
        const s = document.createElement('style');
        s.id = 'test-toc-styles';
        s.textContent = `
        .test-toc{margin-top:14px;display:flex;flex-direction:column;gap:8px}
        .test-toc-item{display:flex;align-items:center;gap:12px;width:100%;
            padding:11px 13px;border:1px solid rgba(224,224,224,0.18);border-radius:12px;
            background:rgba(224,224,224,0.05);color:inherit;font:inherit;text-align:left;
            cursor:pointer;transition:background .15s,border-color .15s}
        .test-toc-item:hover{background:rgba(59,130,255,0.10);border-color:rgba(59,130,255,0.45)}
        .test-toc-num{flex:0 0 26px;height:26px;border-radius:50%;display:flex;
            align-items:center;justify-content:center;font-size:13px;font-weight:700;
            background:rgba(59,130,255,0.18);color:#3b82ff}
        .test-toc-body{flex:1;display:flex;flex-direction:column;min-width:0}
        .test-toc-body b{font-size:14.5px;line-height:1.3}
        .test-toc-note{font-size:12.5px;opacity:.65;line-height:1.35;margin-top:2px}
        .test-toc-go{flex:0 0 auto;opacity:.6;font-size:15px}
        `;
        document.head.appendChild(s);
    },

    // Блок «что откроется с подпиской» после портрета. Первый шаг считается
    // на клиенте по самому низкому уровню профиля (analysis.js) — он
    // бесплатный и мгновенный. Подписчику вместо цены — кнопка в разбор.
    showPremiumTeaser(p) {
        const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const premium = (window.IS_PREMIUM === true)
            || !!(window.FrediMeter && window.FrediMeter.lastCheck
                  && (window.FrediMeter.lastCheck.is_premium || window.FrediMeter.lastCheck.has_subscription));
        const step = (typeof window.frediFirstStepFor === 'function')
            ? window.frediFirstStepFor(p && p.displayName)
            : 'Сегодня вспомните одну ситуацию, где промолчали, и запишите одним предложением, что хотели сказать.';
        let html = '✅ **ПЕРВЫЙ ШАГ НА СЕГОДНЯ — БЕСПЛАТНО**\n\n' + esc(step) + '\n\n'
            + (premium ? '🔓 **ГЛУБИННЫЙ РАЗБОР ГОТОВ К ОТКРЫТИЮ**' : '🔒 **ЧТО ОТКРОЕТСЯ С ПОДПИСКОЙ**') + '\n\n'
            + '• Глубинный разбор именно вашего профиля: портрет, системные петли, скрытые механизмы\n'
            + '• Точки роста, прогноз на полгода и персональные ключи на момент срыва\n'
            + '• Коуч и тренер без лимита (без подписки — три ответа)\n'
            + '• Голос, все тренажёры и память Фреди о каждом разговоре';
        try { if (window.FrediTracker?.track) window.FrediTracker.track('test_premium_teaser_shown', { premium: premium }); } catch {}
        this.addBotMessage(html, true);
        const btn = premium
            ? { text: '🔍 ОТКРЫТЬ ГЛУБИННЫЙ РАЗБОР', callback: () => {
                    try { if (window.FrediTracker?.track) window.FrediTracker.track('test_premium_teaser_clicked', { premium: true }); } catch {}
                    this.goToDashboard();
                    if (typeof window.navigateTo === 'function') window.navigateTo('analysis');
                    else if (typeof window.openAnalysisScreen === 'function') window.openAnalysisScreen();
                } }
            : { text: '✨ ОТКРЫТЬ ГЛУБИННЫЙ РАЗБОР — 3 ДНЯ 99 ₽', callback: () => {
                    try { if (window.FrediTracker?.track) window.FrediTracker.track('meter_subscribe_clicked', { source: 'bigtest_teaser' }); } catch {}
                    if (typeof window.openCheckout === 'function') window.openCheckout('bigtest_teaser');
                } };
        this.addMessageWithButtons('', [btn]);
    },

    // Текст первого сообщения по итогам теста: портрет от первого лица плюс
    // вопрос, на который Фреди может ответить сразу. AI-профиль режется до
    // 500 знаков — ASK_MAX в openers.js равен 600, дальше текст обрезается.
    _profileAskText(p, deep, d) {
        const strip = s => String(s || '').replace(/\*\*/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        let t = 'Фреди, я прошёл большой тест. Архетип: ' + strip(p.archetype) + ', код ' + strip(p.displayName)
            + ', тип восприятия ' + strip(p.perceptionType) + ', уровень мышления ' + p.thinkingLevel + '/9. '
            + 'Векторы: СБ ' + p.sbLevel + '/6 («' + d.sbD + '»), ТФ ' + p.tfLevel + '/6 («' + d.tfD + '»), '
            + 'УБ ' + p.ubLevel + '/6 («' + d.ubD + '»), ЧВ ' + p.chvLevel + '/6 («' + d.cvD + '»). '
            + 'Глубинный паттерн: ' + strip(deep.attachment) + '. ';
        const q = 'Что в этом портрете главное для меня сейчас и с чего начать?';
        const pre = 'Из AI-профиля: «', post = '…». ';
        const room = 600 - t.length - q.length - pre.length - post.length;
        if (this.aiGeneratedProfile && room > 80) {
            const ai = strip(this.aiGeneratedProfile);
            t += pre + ai.slice(0, room) + (ai.length > room ? post : '». ');
        }
        return t + q;
    },

    /**
     * Разбор одним документом — забрать с собой.
     *
     * Человек проходит тест один раз, а возвращаться к выводам будет
     * месяцами: там его векторы, объяснение и три конкретных шага со
     * ссылками. Держать это внутри веб-приложения — значит потерять при
     * первой же смене устройства.
     *
     * Печать, а не готовый файл. Библиотеки для PDF в браузере рисуют
     * текст картинкой: ссылки перестают нажиматься, кириллица требует
     * отдельного шрифта на сотни килобайт, а выделить текст нельзя.
     * Системный диалог печати даёт «Сохранить как PDF» на всех платформах,
     * сохраняет ссылки живыми и ничего не весит.
     */
    downloadReport(p, deep, d) {
        const esc = t => String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const site = location.origin;
        const abs = u => (String(u || '').startsWith('http') ? u : site + u);

        const recs = (this._lastRecommendations || []).map(it => `
            <div class="rec">
                <a href="${esc(abs(it.url))}">${esc(it.title)}</a>
                ${it.format ? `<div class="fmt">${esc(it.format)}</div>` : ''}
                ${it.reason ? `<div><b>Зачем вам:</b> ${esc(it.reason)}</div>` : ''}
                ${it.what ? `<div><b>Что даст:</b> ${esc(it.what)}</div>` : ''}
            </div>`).join('');

        // AI-портрет приходит с разметкой <b> из бэкенда — переносы строк
        // в нём значимы, поэтому <pre>-подобный блок, а не <p>.
        const ai = this.aiGeneratedProfile
            ? `<h2>Интерпретация</h2><div class="ai">${this.aiGeneratedProfile}</div>` : '';

        const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Психологический профиль — ${esc(p.displayName)}</title>
<style>
  body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px}
  h1{font-size:24px;margin:0 0 4px} h2{font-size:18px;margin:28px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .meta{color:#555;font-size:13px;margin-bottom:20px}
  table{border-collapse:collapse;width:100%} td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top}
  td.v{white-space:nowrap;font-weight:600;width:96px}
  .ai{white-space:pre-wrap}
  .rec{margin:0 0 16px;padding-left:12px;border-left:3px solid #3b82ff}
  .rec a{color:#1a4fd0;font-weight:600;text-decoration:none}
  .fmt{color:#666;font-size:13px;margin:2px 0 4px}
  .foot{margin-top:32px;color:#666;font-size:12px;border-top:1px solid #ddd;padding-top:10px}
  @media print{body{margin:0}}
</style></head><body>
<h1>Психологический профиль</h1>
<div class="meta">${esc(p.archetype)} · код ${esc(p.displayName)} · ${new Date().toLocaleDateString('ru-RU')}</div>
<table>
  <tr><td class="v">Восприятие</td><td>${esc(p.perceptionType)}</td></tr>
  <tr><td class="v">Мышление</td><td>${esc(p.thinkingLevel)}/9</td></tr>
  <tr><td class="v">СБ ${esc(p.sbLevel)}/6</td><td>${esc(d.sbD)}</td></tr>
  <tr><td class="v">ТФ ${esc(p.tfLevel)}/6</td><td>${esc(d.tfD)}</td></tr>
  <tr><td class="v">УБ ${esc(p.ubLevel)}/6</td><td>${esc(d.ubD)}</td></tr>
  <tr><td class="v">ЧВ ${esc(p.chvLevel)}/6</td><td>${esc(d.cvD)}</td></tr>
  <tr><td class="v">Привязанность</td><td>${esc(deep && deep.attachment)}</td></tr>
</table>
${ai}
${recs ? `<h2>С чего начать</h2>${recs}` : ''}
<div class="foot">Фреди — ИИ-психолог · <a href="${esc(site)}/fredi/">${esc(site)}/fredi/</a><br>
Это не медицинский диагноз. При тяжёлом состоянии нужен врач.</div>
</body></html>`;

        const w = window.open('', '_blank');
        if (!w) {
            if (window.showToast) window.showToast('Разрешите всплывающие окна, чтобы сохранить разбор', 'error');
            return;
        }
        w.document.write(html);
        w.document.close();
        // Печать после отрисовки: без задержки Safari печатает пустую страницу.
        setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 400);
        try {
            if (window.FrediTracker?.track) window.FrediTracker.track('test_report_downloaded', {});
            _testGoal('test_report_downloaded');
        } catch {}
    },

    async fetchTestRecommendations() {
        if (this._recsRequested || !this.userId) return;
        this._recsRequested = true;
        try {
            const r = await fetch(TEST_API_BASE_URL + '/api/test/recommendations/' + this.userId);
            const data = await r.json();
            if (data.success && Array.isArray(data.items) && data.items.length) {
                // Запоминаем: те же позиции уходят в выгрузку разбора.
                this._lastRecommendations = data.items;
                this.renderTestRecommendations(data.items);
            }
        } catch (e) { console.warn('recommendations failed:', e); }
    },

    renderTestRecommendations(items) {
        const esc = t => String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const icons = { course: '🎓', game: '🎮', trening: '🧑\u200d🏫' };
        // Курс и тренинг — отдельные страницы, открываем в новой вкладке,
        // чтобы не потерять экран результатов. Игра живёт в этом же
        // приложении (?m=...) — туда переходим в текущей вкладке.
        // Каждая позиция отвечает на три вопроса, а не на ноль: что это за
        // формат, почему именно вам и что вы получите. До 14.09.2026 была
        // одна строка причины, и «Курс „Тревога“» читался как ссылка без
        // объяснения, куда человек идёт и во что это ему обойдётся.
        let html = '🧭 **ЧАСТЬ 3. С ЧЕГО НАЧАТЬ**\n\nПо вашему профилю — три шага, по одному на ближайшие недели:\n';
        items.forEach(it => {
            const blank = it.type === 'game' ? '' : ' target="_blank" rel="noopener"';
            html += '\n' + (icons[it.type] || '👉')
                + ' <a href="' + esc(it.url) + '"' + blank
                + ' data-rec="' + esc(it.id) + '" data-rectype="' + esc(it.type) + '"'
                + ' style="color:#3b82ff;font-weight:600">' + esc(it.title) + '</a><br>';
            if (it.format) html += '<i style="opacity:.75">' + esc(it.format) + '</i><br>';
            if (it.reason) html += '<b>Зачем вам:</b> ' + esc(it.reason) + '<br>';
            if (it.what)   html += '<b>Что даст:</b> ' + esc(it.what) + '<br>';
            html += '\n';
        });
        const msg = this.addBotMessage(html, true);
        // Часть 3 приходит с сервера позже оглавления — регистрируем
        // якорь здесь, ссылка в оглавлении резолвится в момент клика.
        if (this._resultAnchors) this._resultAnchors.steps = msg;
        try {
            if (window.FrediTracker?.track) {
                _testGoal('test_recommendations_shown');
                window.FrediTracker.track('test_recommendations_shown', {
                    count: items.length,
                    ids: items.map(it => it.id).join(',')
                });
            }
        } catch {}
        if (msg) {
            msg.querySelectorAll('a[data-rec]').forEach(a => {
                a.addEventListener('click', () => {
                    try {
                        if (window.FrediTracker?.track) {
                            window.FrediTracker.track('test_recommendation_clicked', {
                                id: a.dataset.rec, type: a.dataset.rectype
                            });
                            _testGoal('test_recommendation_clicked');
                        }
                    } catch {}
                });
            });
        }
    },

    // A/B формулировки приглашения. А обещает разговор с Фреди, Б —
    // возможность увидеть интерпретацию друга. Гипотеза владельца: вторая
    // причина сильнее, потому что она про любопытство к близкому человеку,
    // а не про ещё один разговор с ИИ. Вариант закрепляется за браузером,
    // чтобы человек не видел разные тексты при повторных заходах.
    mirrorVariant() {
        try {
            var v = localStorage.getItem('fredi_mirror_ab');
            if (v !== 'a' && v !== 'b') {
                v = Math.random() < 0.5 ? 'a' : 'b';
                localStorage.setItem('fredi_mirror_ab', v);
            }
            return v;
        } catch (e) { return 'a'; }
    },

    // Зеркало: ссылка на тест для друга. Создаётся на бэке
    // (/api/mirrors/create), возвращает готовый адрес и текст приглашения.
    async shareTestWithFriend() {
        if (!this.userId) {
            this.addBotMessage('Чтобы отправить тест другу, нужен аккаунт — нажмите «Сохранить профиль».');
            return;
        }
        if (this._mirrorLink) { this._showMirrorLink(this._mirrorLink); return; }
        this.addBotMessage('Готовлю ссылку…');
        try {
            const r = await fetch(TEST_API_BASE_URL + '/api/mirrors/create', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: parseInt(this.userId), mirror_type: 'web' })
            });
            const data = await r.json();
            if (!data.success || !data.link) throw new Error(data.error || 'нет ссылки');
            this._mirrorLink = data.link;
            this._showMirrorLink(data.link);
            try {
                if (window.FrediTracker?.track) {
                    window.FrediTracker.track('test_mirror_created', { variant: this.mirrorVariant() });
                }
                _testGoal('test_mirror_created');
                _testGoal('test_mirror_created_' + this.mirrorVariant());
            } catch (e) {}
        } catch (e) {
            console.warn('Зеркало не создалось:', e);
            this.addBotMessage('Ссылку сейчас создать не удалось — попробуйте ещё раз через минуту.');
        }
    },

    _showMirrorLink(link) {
        const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        // Текст под вариант: А про разговор с Фреди, Б про разбор друга.
        const lead = this.mirrorVariant() === 'b'
            ? 'Он пройдёт тот же тест, и его разбор придёт вам — увидите, чем вы отличаетесь.'
            : 'Он пройдёт тот же тест, а потом это можно будет обсудить с Фреди вдвоём.';
        const msg = this.addBotMessage(
            '📨 <b>Ссылка для друга готова</b><br><br>'
            + lead + '<br><br>'
            + '<a href="' + esc(link) + '" target="_blank" rel="noopener" '
            + 'style="color:#3b82ff;font-weight:600;word-break:break-all">' + esc(link) + '</a>'
            + '<br><br><button type="button" id="mirrorCopyBtn" style="background:#3b82ff;color:#fff;'
            + 'border:none;border-radius:10px;padding:9px 18px;font-weight:600;cursor:pointer;'
            + 'font-family:inherit">Скопировать ссылку</button>', true);
        const btn = msg && msg.querySelector('#mirrorCopyBtn');
        if (btn) {
            btn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(link);
                    btn.textContent = 'Скопировано';
                } catch (e) {
                    btn.textContent = 'Выделите ссылку и скопируйте вручную';
                }
                try {
                    if (window.FrediTracker?.track) {
                        window.FrediTracker.track('test_mirror_copied', { variant: this.mirrorVariant() });
                    }
                    _testGoal('test_mirror_copied');
                } catch (e) {}
            });
        }
    },

    goToDashboard() {
        // Ушёл с экрана теста — счёт времени прекращаем: дальше он либо
        // разговаривает (там свой учёт), либо не пользуется ничем.
        this._stopTestMeter();
        const c = document.getElementById('screenContainer');
        if (c) c.innerHTML='';
        if (typeof renderDashboard==='function') renderDashboard();
        else if (window.dashboard?.renderDashboard) window.dashboard.renderDashboard();
    },

    async sendPortraitToMax() {
        // Тон — забота, не давление. Всегда показываем «можно отвязать в настройках».
        if (!this.userId) {
            this.addBotMessage('⚠ Нет user_id — обнови страницу и попробуй снова.', true);
            return;
        }
        try {
            if (window.FrediTracker?.track) {
                window.FrediTracker.track('test_completed_send_to_max_clicked', {});
            }
        } catch {}

        this.addBotMessage('📄 Собираю полный отчёт (профиль + AI-комментарий + мысли психолога)…', true);
        try {
            const r = await fetch(TEST_API_BASE_URL + '/api/test/send-to-max', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ user_id: this.userId })
            });
            const data = await r.json();
            if (!data.success && data.linked === undefined) {
                this.addBotMessage('⚠ Не получилось: ' + (data.error || 'попробуй позже'), true);
                return;
            }
            if (data.linked && data.sent) {
                this.addBotMessage(
                    '💛 Готово — полный отчёт уже в MAX.<br><br>' +
                    '<span style="font-size:12px;opacity:0.75">Я не буду писать без причины. Если захочешь напоминания — включишь их в настройках; отвязать MAX можно в любой момент.</span>',
                    true
                );
                return;
            }
            if (data.linked === false && data.deeplink) {
                this.addBotMessage(
                    '🤖 Сейчас откроется MAX-бот. Напиши там <b>/start</b> — и я пришлю полный отчёт ссылкой.<br><br>' +
                    '<span style="font-size:12px;opacity:0.75">Один шаг, чтобы не потерять отчёт. Без рассылок: только то, что попросишь сам.</span>',
                    true
                );
                // Дадим миллисекунду на отрисовку, потом откроем deeplink.
                setTimeout(() => {
                    try { window.open(data.deeplink, '_blank', 'noopener'); }
                    catch { window.location.href = data.deeplink; }
                }, 600);
                return;
            }
            this.addBotMessage('⚠ Что-то пошло не так — попробуй ещё раз.', true);
        } catch (e) {
            this.addBotMessage('⚠ Сеть подвисла: ' + (e.message || 'попробуй ещё раз'), true);
        }
    },

    async showPsychologistThought() {
        if (this.psychologistThought) {
            const t = this.psychologistThought.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
            this.addBotMessage('🧠 <strong>МЫСЛИ ПСИХОЛОГА</strong><br><br>'+t, true);
            this.addMessageWithButtons('', [{text:'🏠 НА ГЛАВНУЮ',callback:()=>this.goToDashboard()}]);
            return;
        }
        this.addBotMessage('🧠 Генерирую мысли психолога...', true);
        try {
            const r = await fetch(TEST_API_BASE_URL+'/api/psychologist-thought/'+this.userId);
            const data = await r.json();
            if (data.success && data.thought) {
                this.psychologistThought = data.thought;
                const t = data.thought.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
                this.addBotMessage('🧠 <strong>МЫСЛИ ПСИХОЛОГА</strong><br><br>'+t, true);
            } else {
                this.addBotMessage('🧠 Мысли психолога будут доступны через несколько секунд.', true);
            }
        } catch(e) {
            this.addBotMessage('🧠 Мысли психолога временно недоступны. Попробуйте позже.', true);
        }
        this.addMessageWithButtons('', [
            {text:'🧠 К ПРОФИЛЮ',callback:()=>this.showFinalProfileButtons()},
            {text:'🏠 НА ГЛАВНУЮ',callback:()=>this.goToDashboard()}
        ]);
    }
};

window.Test = Test;

// Автозапуск теста при ?ref=mirror_ (query или #ref=... в hash для Telegram WebView)
(function checkMirrorRef() {
    var ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref && window.location.hash) {
        try {
            var hp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            ref = hp.get('ref');
        } catch (e) {}
    }
    if (ref && ref.startsWith('mirror_')) {
        try { localStorage.setItem('fredi_mirror_ref', ref); } catch (e) {}
        try { sessionStorage.setItem('fredi_mirror_ref', ref); } catch (e) {}
        console.log('🪞 Mirror ref detected:', ref);
        function waitAndStart() {
            if (typeof startTest === 'function') {
                startTest();
            } else if (typeof window.startTest === 'function') {
                window.startTest();
            } else {
                var testItem = document.querySelector('[data-chat="test"]');
                if (testItem) testItem.click();
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { setTimeout(waitAndStart, 300); });
        } else {
            setTimeout(waitAndStart, 300);
        }
    }
})();

console.log('✅ Модуль теста загружен (версия 5.2 - патчи влиты)');
