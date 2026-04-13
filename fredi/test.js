// ============================================
// ПОЛНЫЙ ТЕСТ ИЗ 5 ЭТАПОВ
// Версия 5.1 - С ПОГОДОЙ В КОНТЕКСТЕ
// ============================================

const TEST_API_BASE_URL = 'https://fredi-backend-flz2.onrender.com';

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

    // ============================================
    // ЭТАПЫ
    // ============================================
    stages: [
        {
            id: 'perception', number: 1,
            name: 'КОНФИГУРАЦИЯ ВОСПРИЯТИЯ',
            shortDesc: 'Линза, через которую вы смотрите на мир',
            detailedDesc: `🔍 ЧТО МЫ ИССЛЕДУЕМ:\n\n• Куда направлено ваше внимание — вовне или внутрь\n• Какая тревога доминирует — страх отвержения или страх потери контроля\n\n📊 Вопросов: 8\n⏱ Время: ~3 минуты\n\n💡 Совет: Отвечайте честно — это поможет мне лучше понять вас.`,
            questions: [
                { id: 'p1', text: 'Когда вы сталкиваетесь с новой ситуацией, вы скорее:', answers: [
                    { text: 'Сосредотачиваетесь на внешних фактах и деталях', score: { EXTERNAL: 2 } },
                    { text: 'Полагаетесь на свои чувства и интуицию', score: { INTERNAL: 2 } }
                ]},
                { id: 'p2', text: 'Вы больше беспокоитесь о том, что:', answers: [
                    { text: 'Вас неправильно поймут или отвергнут', score: { EXTERNAL: 2 } },
                    { text: 'Потеряете контроль над ситуацией', score: { INTERNAL: 2 } }
                ]},
                { id: 'p3', text: 'В конфликте вы склонны:', answers: [
                    { text: 'Ориентироваться на чужое мнение', score: { EXTERNAL: 2 } },
                    { text: 'Следовать своим принципам', score: { INTERNAL: 2 } }
                ]},
                { id: 'p4', text: 'Вас больше привлекает:', answers: [
                    { text: 'Материальные результаты (деньги, статус, комфорт)', score: { MATERIAL: 2 } },
                    { text: 'Символические значения (смысл, идеалы, развитие)', score: { SYMBOLIC: 2 } }
                ]},
                { id: 'p5', text: 'При принятии решения вы в первую очередь думаете о:', answers: [
                    { text: 'Практических последствиях', score: { MATERIAL: 2 } },
                    { text: 'Глубинном смысле выбора', score: { SYMBOLIC: 2 } }
                ]},
                { id: 'p6', text: 'Для вас важнее:', answers: [
                    { text: 'Иметь материальную безопасность', score: { MATERIAL: 2 } },
                    { text: 'Ощущение внутреннего спокойствия и целостности', score: { SYMBOLIC: 2 } }
                ]},
                { id: 'p7', text: 'Когда вы думаете о себе, вы видите себя как:', answers: [
                    { text: 'Человека, привязанного к конкретным обстоятельствам', score: { EXTERNAL: 2 } },
                    { text: 'Личность с уникальным внутренним миром', score: { INTERNAL: 2 } }
                ]},
                { id: 'p8', text: 'В жизни вы стремитесь к:', answers: [
                    { text: 'Гармонии с окружающим миром', score: { EXTERNAL: 2 } },
                    { text: 'Гармонии с самим собой', score: { INTERNAL: 2 } }
                ]}
            ]
        },
        {
            id: 'thinking', number: 2,
            name: 'ЛОГИКИ МЫШЛЕНИЯ',
            shortDesc: 'Как вы анализируете информацию',
            detailedDesc: `🧠 ЧТО МЫ ИССЛЕДУЕМ:\n\nУровень 1-3: Конкретные логики\n• Логика бизнес-результатов\n• Логика чувств и отношений  \n• Логика информации\n\nУровень 4-6: Комбинированные логики\n• Синтез разных подходов\n\nУровень 7-9: Абстрактные логики\n• Философия и принципы\n\n📊 Вопросов: 9\n⏱ Время: ~4 минуты`,
            questions: [
                { id: 't1', text: 'При решении проблемы вы обычно:', answers: [
                    { text: 'Ищете практический результат', score: { "1": 1 } },
                    { text: 'Анализируете эмоциональные аспекты', score: { "2": 1 } },
                    { text: 'Собираете информацию', score: { "3": 1 } }
                ]},
                { id: 't2', text: 'Вы предпочитаете работать с:', answers: [
                    { text: 'Цифрами и фактами', score: { "3": 1 } },
                    { text: 'Идеями и концепциями', score: { "6": 1 } },
                    { text: 'Людьми и отношениями', score: { "2": 1 } }
                ]},
                { id: 't3', text: 'Лучше всего вы мотивированы:', answers: [
                    { text: 'Внешними вознаграждениями', score: { "1": 1 } },
                    { text: 'Внутренним интересом к процессу', score: { "7": 1 } },
                    { text: 'Ощущением помощи другим', score: { "2": 1 } }
                ]},
                { id: 't4', text: 'Когда изучаете новую область, вы:', answers: [
                    { text: 'Начинаете с практики', score: { "1": 1 } },
                    { text: 'Начинаете с теории', score: { "9": 1 } },
                    { text: 'Смешиваете оба подхода', score: { "5": 1 } }
                ]},
                { id: 't5', text: 'Вам сложнее всего:', answers: [
                    { text: 'Абстрактное мышление', score: { "1": 1 } },
                    { text: 'Практическая реализация', score: { "9": 1 } },
                    { text: 'Работа с эмоциями', score: { "3": 1 } }
                ]},
                { id: 't6', text: 'При конфликте вы склонны:', answers: [
                    { text: 'Ищете выгоду для всех', score: { "1": 1 } },
                    { text: 'Пытаетесь понять мотивы', score: { "2": 1 } },
                    { text: 'Анализируете справедливость', score: { "8": 1 } }
                ]},
                { id: 't7', text: 'Вас вдохновляют:', answers: [
                    { text: 'Успех и достижения', score: { "1": 1 } },
                    { text: 'Красота и творчество', score: { "7": 1 } },
                    { text: 'Справедливость и порядок', score: { "8": 1 } }
                ]},
                { id: 't8', text: 'Вы цените в людях:', answers: [
                    { text: 'Компетентность', score: { "3": 1 } },
                    { text: 'Сострадание', score: { "2": 1 } },
                    { text: 'Интегральность (целостность взглядов)', score: { "9": 1 } }
                ]},
                { id: 't9', text: 'При планировании вы:', answers: [
                    { text: 'Фокусируетесь на немедленных результатах', score: { "1": 1 } },
                    { text: 'Думаете о долгосрочном развитии', score: { "7": 1 } },
                    { text: 'Балансируете краткосрочное и долгосрочное', score: { "5": 1 } }
                ]}
            ]
        },
        {
            id: 'dilts', number: 3,
            name: 'НЕЙРОЛОГИЧЕСКИЕ УРОВНИ',
            shortDesc: 'На каком уровне вы действуете',
            detailedDesc: `🎯 ЧТО МЫ ИССЛЕДУЕМ:\n\n5 уровней мышления и действия:\n\n1️⃣ ОКРУЖЕНИЕ - факты, люди, события\n2️⃣ ПОВЕДЕНИЕ - действия и привычки\n3️⃣ СПОСОБНОСТИ - навыки и возможности\n4️⃣ УБЕЖДЕНИЯ - ценности и принципы\n5️⃣ ИДЕНТИЧНОСТЬ - кто вы на самом деле\n\n📊 Вопросов: 5\n⏱ Время: ~2 минуты`,
            questions: [
                { id: 'd1', text: 'Когда вы решаете проблему, вы обычно:', answers: [
                    { text: 'Изменяете окружение', score: { ENVIRONMENT: 1 } },
                    { text: 'Меняете свое поведение', score: { BEHAVIOR: 1 } },
                    { text: 'Развиваете новые способности', score: { CAPABILITIES: 1 } },
                    { text: 'Переосмысляете свои убеждения', score: { VALUES: 1 } },
                    { text: 'Переопределяете свою идентичность', score: { IDENTITY: 1 } }
                ]},
                { id: 'd2', text: 'Для вас самое важное в жизни — это:', answers: [
                    { text: 'Иметь благоприятное окружение', score: { ENVIRONMENT: 1 } },
                    { text: 'Совершать правильные действия', score: { BEHAVIOR: 1 } },
                    { text: 'Развивать свой потенциал', score: { CAPABILITIES: 1 } },
                    { text: 'Следовать своим ценностям', score: { VALUES: 1 } },
                    { text: 'Быть верным себе', score: { IDENTITY: 1 } }
                ]},
                { id: 'd3', text: 'Когда вы терпите неудачу, вы вините:', answers: [
                    { text: 'Обстоятельства', score: { ENVIRONMENT: 1 } },
                    { text: 'Свои ошибки в действиях', score: { BEHAVIOR: 1 } },
                    { text: 'Недостаток умений', score: { CAPABILITIES: 1 } },
                    { text: 'Неправильные убеждения', score: { VALUES: 1 } },
                    { text: 'Свою сущность', score: { IDENTITY: 1 } }
                ]},
                { id: 'd4', text: 'Вас мотивирует:', answers: [
                    { text: 'Комфортная обстановка', score: { ENVIRONMENT: 1 } },
                    { text: 'Возможность действовать', score: { BEHAVIOR: 1 } },
                    { text: 'Возможность учиться', score: { CAPABILITIES: 1 } },
                    { text: 'Следование принципам', score: { VALUES: 1 } },
                    { text: 'Жизнь в согласии с собой', score: { IDENTITY: 1 } }
                ]},
                { id: 'd5', text: 'Вы видите себя прежде всего как:', answers: [
                    { text: 'Продукт обстоятельств', score: { ENVIRONMENT: 1 } },
                    { text: 'Человека действия', score: { BEHAVIOR: 1 } },
                    { text: 'Человека способностей', score: { CAPABILITIES: 1 } },
                    { text: 'Человека принципов', score: { VALUES: 1 } },
                    { text: 'Уникальную личность', score: { IDENTITY: 1 } }
                ]}
            ]
        },
        {
            id: 'strategy', number: 4,
            name: 'СТРАТЕГИИ ПОВЕДЕНИЯ',
            shortDesc: 'Как вы достигаете целей',
            detailedDesc: `📈 ЧТО МЫ ИССЛЕДУЕМ:\n\nКогда вы хотите что-то получить:\n\n🎯 Что вы представляете (цель)\n🔍 На что обращаете внимание\n⚙️ Какие действия предпринимаете\n🔄 Как оцениваете результаты\n\n4 типа стратегий:\n\n• СБ - Стратегия Быстрого результата\n• ТФ - Тактика Фокуса на процесс\n• УБ - Устойчивое Благополучие\n• ЧВ - Чувствительная Вовлеченность\n\n📊 Вопросов: 4\n⏱ Время: ~2 минуты`,
            questions: [
                { id: 's1', text: 'Когда вы хотите достичь цели, вы:', answers: [
                    { text: 'Быстро переходите к действиям', score: { СБ: 1 } },
                    { text: 'Сначала выстраиваете систему подготовки', score: { ТФ: 1 } },
                    { text: 'Ищете долгосрочное решение', score: { УБ: 1 } },
                    { text: 'Прислушиваетесь к своим чувствам', score: { ЧВ: 1 } }
                ]},
                { id: 's2', text: 'Ваша сила в том, что вы:', answers: [
                    { text: 'Быстро принимаете решения', score: { СБ: 1 } },
                    { text: 'Тщательно готовитесь', score: { ТФ: 1 } },
                    { text: 'Проходите испытания насквозь', score: { УБ: 1 } },
                    { text: 'Глубоко погружаетесь в процесс', score: { ЧВ: 1 } }
                ]},
                { id: 's3', text: 'При неудаче вы:', answers: [
                    { text: 'Сразу ищете новый путь', score: { СБ: 1 } },
                    { text: 'Анализируете, что пошло не так', score: { ТФ: 1 } },
                    { text: 'Учитесь на ошибке', score: { УБ: 1 } },
                    { text: 'Отрабатываете эмоции', score: { ЧВ: 1 } }
                ]},
                { id: 's4', text: 'Вам легче всего:', answers: [
                    { text: 'Начать новое', score: { СБ: 1 } },
                    { text: 'Организовать процесс', score: { ТФ: 1 } },
                    { text: 'Завершить начатое', score: { УБ: 1 } },
                    { text: 'Наслаждаться途中 (процессом)', score: { ЧВ: 1 } }
                ]}
            ]
        },
        {
            id: 'deep', number: 5,
            name: 'ГЛУБИННЫЕ МОТИВЫ',
            shortDesc: 'Что на самом деле вас движет',
            detailedDesc: `💎 ФИНАЛЬНЫЙ ЭТАП:\n\nЭто самый глубокий уровень анализа — мы посмотрим на ваши истинные мотивы и скрытые паттерны.\n\n🤔 Открытые вопросы\n📝 Много текста\n⏱ Время: ~5-7 минут\n\n💡 Совет: Здесь нет "правильных" ответов. Будьте максимально честны.`,
            isOpen: true,
            questions: [
                { id: 'dp1', text: 'Вспомните ситуацию, когда вы чувствовали себя по-настоящему счастливым. Что вас в ней радовало?', openAnswer: true },
                { id: 'dp2', text: 'Какую роль вы обычно берете в новой группе или команде?', openAnswer: true },
                { id: 'dp3', text: 'Что вас больше всего раздражает или расстраивает в других людях?', openAnswer: true },
                { id: 'dp4', text: 'Какой момент из вашего прошлого до сих пор влияет на ваши решения?', openAnswer: true },
                { id: 'dp5', text: 'Что вы хотите для себя в следующие 5 лет?', openAnswer: true }
            ]
        }
    ],

    // ============================================
    // МЕТОДЫ
    // ============================================

    initDatabase: function() {
        if (!window.testDatabase) {
            window.testDatabase = {
                answers: [],
                stage1Results: null,
                stage2Results: null,
                stage3Results: null,
                stage4Results: null,
                stage5Results: null
            };
        }
    },

    generateUserId: function() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    async getWeather(city) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current=weather_code,temperature&timezone=auto`);
            const data = await response.json();
            return {
                code: data.current.weather_code,
                temp: data.current.temperature
            };
        } catch (e) {
            return { code: 0, temp: null };
        }
    },

    // Получаем город из IP
    async getCity() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return data.city || 'Unknown';
        } catch (e) {
            return 'Unknown';
        }
    },

    startTest: function() {
        this.initDatabase();
        this.userId = this.generateUserId();
        this.currentStage = 0;
        this.currentQuestionIndex = 0;
        this.answers = [];
        this.showIntro = true;
        this.render();
    },

    showStageIntro: function(stageIndex) {
        this.showIntro = true;
        this.currentStage = stageIndex;
        this.currentQuestionIndex = 0;
        this.render();
    },

    nextQuestion: function() {
        const currentStage = this.stages[this.currentStage];
        if (this.currentQuestionIndex < currentStage.questions.length - 1) {
            this.currentQuestionIndex++;
            this.render();
        } else {
            this.completeStage();
        }
    },

    previousQuestion: function() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.render();
        }
    },

    selectAnswer: function(questionId, answerIndex) {
        const currentStage = this.stages[this.currentStage];
        const question = currentStage.questions.find(q => q.id === questionId);
        if (!question) return;

        // Очищаем старые ответы на этот вопрос
        this.answers = this.answers.filter(a => a.questionId !== questionId);

        // Добавляем новый ответ
        this.answers.push({
            stageId: currentStage.id,
            questionId: questionId,
            answerIndex: answerIndex,
            selectedText: question.answers[answerIndex].text,
            score: question.answers[answerIndex].score
        });

        this.render();
    },

    selectOpenAnswer: function(questionId, text) {
        this.answers = this.answers.filter(a => a.questionId !== questionId);
        this.answers.push({
            stageId: this.stages[this.currentStage].id,
            questionId: questionId,
            answerText: text,
            isOpen: true
        });
    },

    completeStage: function() {
        const stageId = this.stages[this.currentStage].id;
        
        // Сохраняем результаты этапа
        const stageAnswers = this.answers.filter(a => a.stageId === stageId);
        
        if (stageId === 'perception') {
            this.perceptionType = this.analyzePerception(stageAnswers);
        } else if (stageId === 'thinking') {
            this.thinkingLevel = this.analyzeThinking(stageAnswers);
        } else if (stageId === 'dilts') {
            this.diltsCounts = this.analyzeDilts(stageAnswers);
        } else if (stageId === 'strategy') {
            // Анализируем стратегии
            for (const answer of stageAnswers) {
                const questionId = answer.questionId;
                const score = answer.score;
                for (const key in score) {
                    this.strategyLevels[key].push(answer.questionId);
                }
            }
        }

        // Переходим к следующему этапу
        if (this.currentStage < this.stages.length - 1) {
            this.currentStage++;
            this.currentQuestionIndex = 0;
            this.showIntro = true;
            this.render();
        } else {
            // Все этапы пройдены
            this.generateFinalProfile();
        }
    },

    analyzePerception: function(answers) {
        let scores = { EXTERNAL: 0, INTERNAL: 0, SYMBOLIC: 0, MATERIAL: 0 };
        for (const answer of answers) {
            for (const key in answer.score) {
                scores[key] += answer.score[key];
            }
        }
        
        // Определяем тип восприятия
        let type = 'BALANCED';
        let maxKey = null, maxVal = 0;
        for (const key in scores) {
            if (scores[key] > maxVal) {
                maxVal = scores[key];
                maxKey = key;
            }
        }
        
        this.perceptionScores = scores;
        return maxKey;
    },

    analyzeThinking: function(answers) {
        let scores = { "1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0 };
        for (const answer of answers) {
            for (const key in answer.score) {
                scores[key] += answer.score[key];
            }
        }
        this.thinkingScores = scores;
        
        // Находим самый высокий уровень
        let maxKey = null, maxVal = 0;
        for (const key in scores) {
            if (scores[key] > maxVal) {
                maxVal = scores[key];
                maxKey = key;
            }
        }
        return parseInt(maxKey);
    },

    analyzeDilts: function(answers) {
        let counts = { "ENVIRONMENT":0,"BEHAVIOR":0,"CAPABILITIES":0,"VALUES":0,"IDENTITY":0 };
        for (const answer of answers) {
            for (const key in answer.score) {
                counts[key] += answer.score[key];
            }
        }
        return counts;
    },

    generateFinalProfile: async function() {
        // Собираем контекст
        const contextData = {
            userId: this.userId,
            perception: this.perceptionType,
            perceptionScores: this.perceptionScores,
            thinking: this.thinkingLevel,
            thinkingScores: this.thinkingScores,
            dilts: this.diltsCounts,
            strategies: this.strategyLevels,
            deepAnswers: this.deepAnswers,
            context: this.context
        };

        // Отправляем на бекенд для обработки
        try {
            const response = await fetch(`${TEST_API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contextData)
            });

            const result = await response.json();
            this.aiGeneratedProfile = result.profile;
            this.psychologistThought = result.thought;
            
            // Сохраняем в базу
            window.testDatabase.stage5Results = {
                profile: this.aiGeneratedProfile,
                thought: this.psychologistThought
            };

        } catch (error) {
            console.error('Error generating profile:', error);
            this.aiGeneratedProfile = this.generateLocalProfile();
        }

        this.context.isComplete = true;
        this.render();
    },

    generateLocalProfile: function() {
        // Резервная локальная генерация профиля
        return {
            summary: 'Анализ завершен. Ваш профиль готов.',
            insights: []
        };
    },

    // Обработка открытых ответов 5 этапа
    processStage5: async function() {
        const stage5Answers = this.answers.filter(a => a.stageId === 'deep');
        this.deepAnswers = stage5Answers.map(a => ({
            questionId: a.questionId,
            answer: a.answerText
        }));

        // Отправляем на анализ и переходим к финальному профилю
        await this.generateFinalProfile();
    },

    // Дополнительная обработка для глубокого анализа (если нужны уточнения)
    clarifyProfile: async function() {
        // Если профиль полагает, что нужны уточнения...
        if (this.aiGeneratedProfile && this.aiGeneratedProfile.needsClarification) {
            this.clarifyingQuestions = this.aiGeneratedProfile.clarifyingQuestions || [];
            this.clarifyingCurrent = 0;
            this.render();
        }
    },

    submitClarification: function(answer) {
        this.clarifyingAnswers.push(answer);
        this.clarifyingCurrent++;
        
        if (this.clarifyingCurrent >= this.clarifyingQuestions.length) {
            // Уточнения завершены
            this.showFinalResults();
        } else {
            this.render();
        }
    },

    showFinalResults: function() {
        // Показываем финальные результаты
        this.render();
    },

    // Рендер интерфейса
    render: function() {
        const container = document.getElementById('test-container');
        if (!container) return;

        let html = '';

        // Если показываем интро этапа
        if (this.showIntro) {
            const stage = this.stages[this.currentStage];
            html = this.renderStageIntro(stage);
        }
        // Если выполняется этап
        else if (this.currentStage < this.stages.length - 1) {
            const stage = this.stages[this.currentStage];
            const question = stage.questions[this.currentQuestionIndex];
            html = this.renderQuestion(stage, question, this.currentQuestionIndex, stage.questions.length);
        }
        // Последний этап - открытые вопросы
        else if (this.currentStage === this.stages.length - 1 && !this.context.isComplete) {
            const stage = this.stages[this.currentStage];
            const question = stage.questions[this.currentQuestionIndex];
            html = this.renderOpenQuestion(stage, question, this.currentQuestionIndex, stage.questions.length);
        }
        // Уточняющие вопросы (если нужны)
        else if (this.clarifyingCurrent < this.clarifyingQuestions.length) {
            html = this.renderClarifyingQuestion();
        }
        // Финальный результат
        else {
            html = this.renderFinalResults();
        }

        container.innerHTML = html;
        this.attachEventListeners();
    },

    renderStageIntro: function(stage) {
        const progressPercent = (this.currentStage / this.stages.length) * 100;
        
        return `
            <div class="stage-intro">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
                <div class="stage-header">
                    <h2>${stage.number}. ${stage.name}</h2>
                    <p class="stage-description">${stage.shortDesc}</p>
                </div>
                <div class="stage-details">
                    ${stage.detailedDesc.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
                <button class="btn-primary" onclick="Test.startStage(${this.currentStage})">
                    Начать этап
                </button>
            </div>
        `;
    },

    renderQuestion: function(stage, question, index, total) {
        const answerHtml = question.answers.map((answer, i) => `
            <div class="answer-option">
                <input type="radio" name="answer" value="${i}" id="answer_${i}" 
                       ${this.answers.find(a => a.questionId === question.id && a.answerIndex === i) ? 'checked' : ''}>
                <label for="answer_${i}">${answer.text}</label>
            </div>
        `).join('');

        const progressPercent = ((index + 1) / total) * 100;
        
        return `
            <div class="question-container">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
                <div class="question-header">
                    <h3>${stage.name}</h3>
                    <span class="question-counter">Вопрос ${index + 1} из ${total}</span>
                </div>
                <div class="question-text">
                    <p>${question.text}</p>
                </div>
                <div class="answers">
                    ${answerHtml}
                </div>
                <div class="navigation-buttons">
                    ${index > 0 ? `<button class="btn-secondary" onclick="Test.previousQuestion()">← Назад</button>` : ''}
                    <button class="btn-primary" onclick="Test.nextQuestion()">
                        ${index === total - 1 ? 'Завершить' : 'Далее →'}
                    </button>
                </div>
            </div>
        `;
    },

    renderOpenQuestion: function(stage, question, index, total) {
        const answer = this.answers.find(a => a.questionId === question.id);
        const progressPercent = ((index + 1) / total) * 100;
        
        return `
            <div class="question-container">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
                <div class="question-header">
                    <h3>${stage.name}</h3>
                    <span class="question-counter">Вопрос ${index + 1} из ${total}</span>
                </div>
                <div class="question-text">
                    <p>${question.text}</p>
                </div>
                <div class="open-answer">
                    <textarea id="open_answer" placeholder="Напишите ваш ответ...">${answer ? answer.answerText : ''}</textarea>
                </div>
                <div class="navigation-buttons">
                    ${index > 0 ? `<button class="btn-secondary" onclick="Test.previousQuestion()">← Назад</button>` : ''}
                    <button class="btn-primary" onclick="Test.nextOpenQuestion()">
                        ${index === total - 1 ? 'Завершить' : 'Далее →'}
                    </button>
                </div>
            </div>
        `;
    },

    nextOpenQuestion: function() {
        const currentStage = this.stages[this.currentStage];
        const question = currentStage.questions[this.currentQuestionIndex];
        const textarea = document.getElementById('open_answer');
        const answer = textarea.value;

        this.selectOpenAnswer(question.id, answer);

        if (this.currentQuestionIndex < currentStage.questions.length - 1) {
            this.currentQuestionIndex++;
            this.render();
        } else {
            this.processStage5();
        }
    },

    startStage: function(stageIndex) {
        this.showIntro = false;
        this.currentStage = stageIndex;
        this.currentQuestionIndex = 0;
        this.render();
    },

    renderClarifyingQuestion: function() {
        const question = this.clarifyingQuestions[this.clarifyingCurrent];
        
        return `
            <div class="clarifying-container">
                <div class="clarifying-header">
                    <h3>Уточнение</h3>
                    <span>Вопрос ${this.clarifyingCurrent + 1} из ${this.clarifyingQuestions.length}</span>
                </div>
                <p class="clarifying-question">${question}</p>
                <textarea id="clarifying_answer" placeholder="Ваш ответ..."></textarea>
                <button class="btn-primary" onclick="Test.submitClarificationAnswer()">
                    ${this.clarifyingCurrent === this.clarifyingQuestions.length - 1 ? 'Завершить' : 'Далее'}
                </button>
            </div>
        `;
    },

    submitClarificationAnswer: function() {
        const textarea = document.getElementById('clarifying_answer');
        const answer = textarea.value;
        this.submitClarification(answer);
    },

    renderFinalResults: function() {
        let resultsHtml = `
            <div class="final-results">
                <div class="results-header">
                    <h2>Ваш психологический профиль</h2>
                </div>
                
                <div class="results-section">
                    <h3>Восприятие</h3>
                    <p><strong>Тип:</strong> ${this.perceptionType}</p>
                    <div class="scores-list">
                        ${Object.entries(this.perceptionScores).map(([key, val]) => 
                            `<div class="score-item"><span>${key}:</span> <span>${val}</span></div>`
                        ).join('')}
                    </div>
                </div>

                <div class="results-section">
                    <h3>Логика мышления</h3>
                    <p><strong>Уровень:</strong> ${this.thinkingLevel}</p>
                    <div class="scores-list">
                        ${Object.entries(this.thinkingScores).map(([key, val]) => 
                            `<div class="score-item"><span>Уровень ${key}:</span> <span>${val}</span></div>`
                        ).join('')}
                    </div>
                </div>

                <div class="results-section">
                    <h3>Нейрологические уровни</h3>
                    <div class="scores-list">
                        ${Object.entries(this.diltsCounts).map(([key, val]) => 
                            `<div class="score-item"><span>${key}:</span> <span>${val}</span></div>`
                        ).join('')}
                    </div>
                </div>

                <div class="results-section">
                    <h3>Стратегии действия</h3>
                    <div class="scores-list">
                        ${Object.entries(this.strategyLevels).map(([key, val]) => 
                            `<div class="score-item"><span>${key}:</span> <span>${val.length}</span></div>`
                        ).join('')}
                    </div>
                </div>
        `;

        if (this.aiGeneratedProfile) {
            resultsHtml += `
                <div class="results-section ai-profile">
                    <h3>ИИ Анализ</h3>
                    <div class="profile-content">
                        ${this.aiGeneratedProfile.summary || ''}
                    </div>
                </div>
            `;
        }

        if (this.psychologistThought) {
            resultsHtml += `
                <div class="results-section psychologist">
                    <h3>Размышление психолога</h3>
                    <div class="thought-content">
                        ${this.psychologistThought}
                    </div>
                </div>
            `;
        }

        resultsHtml += `
                <div class="results-actions">
                    <button class="btn-primary" onclick="Test.downloadResults()">Скачать профиль</button>
                    <button class="btn-secondary" onclick="Test.shareResults()">Поделиться</button>
                    <button class="btn-secondary" onclick="Test.startTest()">Пройти тест заново</button>
                </div>
            </div>
        `;

        return resultsHtml;
    },

    downloadResults: function() {
        const results = {
            userId: this.userId,
            timestamp: new Date().toISOString(),
            perception: {
                type: this.perceptionType,
                scores: this.perceptionScores
            },
            thinking: {
                level: this.thinkingLevel,
                scores: this.thinkingScores
            },
            dilts: this.diltsCounts,
            strategies: this.strategyLevels,
            aiProfile: this.aiGeneratedProfile,
            psychologistThought: this.psychologistThought
        };

        const jsonString = JSON.stringify(results, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `psycho-profile-${this.userId}.json`;
        link.click();
        URL.revokeObjectURL(url);
    },

    shareResults: function() {
        const resultsUrl = `${window.location.origin}?profile=${this.userId}`;
        if (navigator.share) {
            navigator.share({
                title: 'Мой психологический профиль',
                text: 'Я прошел тест и получил интересный психологический профиль!',
                url: resultsUrl
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = resultsUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Ссылка скопирована в буфер обмена');
        }
    },

    attachEventListeners: function() {
        const answers = document.querySelectorAll('input[name="answer"]');
        answers.forEach((answer, index) => {
            answer.addEventListener('change', (e) => {
                const currentStage = this.stages[this.currentStage];
                const question = currentStage.questions[this.currentQuestionIndex];
                this.selectAnswer(question.id, parseInt(e.target.value));
            });
        });
    }

};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем контекст (город, погода)
    (async function() {
        Test.context.city = await Test.getCity();
        Test.context.weather = await Test.getWeather(Test.context.city);
        Test.startTest();
    })();
});

// Загрузка дополнительного модуля для приветствия
(function() {
    if (window.Greeting) {
        console.log('✅ Модуль приветствия загружен');
        // Можно использовать функции из модуля Greeting
        // Greeting.showGreeting();
    } else {
        console.log('⚠️ Модуль приветствия не найден');
    }

    // Логируем версию
    console.log('✅ Модуль теста загружен (версия 5.2 - патчи влиты)');
})();

console.log('✅ Модуль теста загружен (версия 5.2 - патчи влиты)');
