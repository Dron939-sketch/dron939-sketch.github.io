// tracker.js — Fredi analytics (lightweight, fire-and-forget)
//
// Покрывает:
//   session_start / session_end (active-only время, без заэкранного простоя)
//   screen_view, feature_opened / feature_closed (с duration_sec)
//   message_sent, ai_response_received, ai_response_error  (через apiCall + fetch)
//   api_error / api_network_error                          (на сетевом уровне)
//   tab_hidden / tab_visible, theme_switch, error, promise_unhandled
//
// Публичный API: window.FrediTracker.track(event, data)
(function(){
    if(window._trackerLoaded) return;
    window._trackerLoaded=true;

    // Ботофильтр. Краулеры исполняют JS и пишут события наравне с людьми:
    // в выгрузке 15.08 — Baiduspider, YandexBot, Google-Safety. Они раздувают
    // DAU и users, а их session_end засоряет средние длительности.
    // Публичный API оставляем заглушкой, чтобы вызовы из модулей не падали.
    // «bot» — только как отдельное слово: телефоны CUBOT — живые люди.
    var _ua=navigator.userAgent||'';
    if(!/cubot/i.test(_ua) && /bot\b|spider|crawl|headless|lighthouse|slurp|google-safety|preview|fetch\b/i.test(_ua)){
        var _noop=function(){};
        window.FrediTracker={ track:_noop, openFeature:_noop, closeFeature:_noop,
            activeSec:function(){ return 0; }, markInternal:_noop,
            isInternal:function(){ return true; } };
        console.log('tracker.js: бот-UA, трекинг выключен');
        return;
    }

    var API=function(){return window.API_BASE_URL||window.CONFIG?.API_BASE_URL||'https://ffred-ddd989.amvera.io';};
    var UID=function(){return window.USER_ID||window.CONFIG?.USER_ID;};

    // Сессия переживает переход между страницами сайта.
    //
    // Раньше session_id рождался на каждую загрузку, а из блога в приложение
    // человек приходит по обычной ссылке — и один заход писался двумя
    // сессиями, первая длиной в секунду. В выгрузке это видно прямо:
    // 78 session_start против 51 session_end, а средняя длительность
    // занижена секундными огрызками. Теперь id сессии лежит в хранилище
    // и продолжается, пока разрыв между страницами меньше SESSION_GAP_MS.
    var SESSION_GAP_MS=30*60*1000;
    var _sidNew=true;
    var SID=(function(){
        var now=Date.now();
        try{
            var prev=sessionStorage.getItem('fredi_sid')||localStorage.getItem('fredi_sid');
            var seen=parseInt(localStorage.getItem('fredi_sid_seen')||'0',10);
            if(prev && seen && (now-seen)<SESSION_GAP_MS){ _sidNew=false; return prev; }
        }catch(e){}
        return now+'_'+Math.random().toString(36).substr(2,6);
    })();
    function _touchSession(){
        try{
            sessionStorage.setItem('fredi_sid',SID);
            localStorage.setItem('fredi_sid',SID);
            localStorage.setItem('fredi_sid_seen',String(Date.now()));
        }catch(e){}
    }
    _touchSession();
    if(_sidNew){ try{ localStorage.removeItem('fredi_sid_active_ms'); }catch(e){} }

    // Начало сессии, а не начало загрузки страницы.
    // Активное время (_activeMs) копится через все страницы одной сессии, а
    // wall_sec считался от START текущей загрузки — и в аналитике выходило
    // session_end с wall_sec=72 при duration_sec=2250: два разных секундомера
    // под одной крышей. Теперь оба считают одну и ту же сессию, и wall
    // никогда не меньше активного.
    var SESSION_START=(function(){
        try{
            if(!_sidNew){
                var t=parseInt(localStorage.getItem('fredi_sid_started')||'0',10);
                if(t) return t;
            }
        }catch(e){}
        var now=Date.now();
        try{ localStorage.setItem('fredi_sid_started',String(now)); }catch(e){}
        return now;
    })();

    // Пока личность не подтверждена сервером, события копятся в очереди:
    // отправленные под временным Date.now()-идентификатором, они плодят
    // несуществующих «уникальных пользователей». Ждём не дольше потолка —
    // аналитика не повод терять события совсем.
    var _idReady=!window.USER_ID_PROVISIONAL;
    var _idDeadline=Date.now()+8000;
    if(!_idReady){
        var _release=function(){ _idReady=true; _flush(); };
        window.addEventListener('fredi:identity',_release,{once:true});
        if(window.identityReady) window.identityReady().then(_release, _release);
        else setTimeout(_release,3000);
    }

    var _screen='';
    var _queue=[];
    var _sending=false;

    // --- active-time accounting (visibility API) ---
    // Активное время продолжается вместе с сессией: человек, ушедший из
    // блога в приложение, приносит с собой уже накопленные минуты. Иначе
    // session_end каждой страницы нёс бы только её кусок, и средняя
    // длительность сессии выходила бы короче реальной.
    var _activeMs=(function(){
        if(_sidNew) return 0;
        try{ return parseInt(localStorage.getItem('fredi_sid_active_ms')||'0',10)||0; }catch(e){ return 0; }
    })();
    var _lastActiveAt=Date.now();
    var _isVisible=!document.hidden;

    function _tickActive(){
        if(_isVisible){
            var now=Date.now();
            _activeMs += now - _lastActiveAt;
            _lastActiveAt = now;
            try{ localStorage.setItem('fredi_sid_active_ms',String(_activeMs)); }catch(e){}
        }
    }

    // Текущая «открытая» фича для feature_opened/closed.
    var _currentFeature=null;
    var _featureOpenedAt=0;
    // Снапшот _activeMs на момент открытия фичи — нужен чтобы
    // duration_sec считался по АКТИВНОМУ времени, а не wall-clock.
    // Раньше: юзер закрывает вкладку с открытой фичей, через 16 часов
    // переоткрывает страницу, феча закрывается → duration_sec = 59000.
    // Это ломает все средние длительности (tales avg=29666s в дашборде).
    var _featureOpenedActiveMs=0;

    // ---- user attrs ----
    var _isPremium=null;
    function _detectDevice(){
        var ua=(navigator.userAgent||'').toLowerCase();
        if(/ipad|tablet/.test(ua) || (window.innerWidth>=768 && window.innerWidth<=1024 && 'ontouchstart' in window)) return 'tablet';
        if(/mobile|iphone|android|phone/.test(ua) || (window.innerWidth<768 && 'ontouchstart' in window)) return 'mobile';
        return 'desktop';
    }
    function _isPwa(){
        try{ return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator && window.navigator.standalone === true); }catch(e){ return false; }
    }
    function _connType(){ try{ return (navigator.connection && navigator.connection.effectiveType) || ''; }catch(e){ return ''; } }
    function _getAttrs(){
        var a={
            is_authed: !!(window.IS_AUTHENTICATED || window.CURRENT_USER_EMAIL),
            device: _detectDevice(),
            pwa: _isPwa(),
            lang: (navigator.language||'').slice(0,20),
            connection: _connType(),
            theme: (document.documentElement.getAttribute('data-theme')||'dark'),
            plan: (_isPremium === true ? 'premium' : 'free'),
        };
        if(_isPremium !== null) a.is_premium = !!_isPremium;
        return a;
    }
    async function _refreshPremium(){
        var uid=UID();
        if(!uid) return;
        try{
            var r=await _origFetch.call(window, API()+'/api/meter/status/'+uid, {credentials:'omit'});
            if(!r.ok) return;
            var d=await r.json();
            _isPremium=!!d.is_premium;
        }catch(e){}
    }

    // ---- error dedupe ----
    // По аналитике polling-эндпоинты (/api/notifications, /api/profile/access/inbox)
    // генерят повторяющиеся api_network_error/api_error при каждом тике сети,
    // создавая шум (43 ошибки/неделя при том, что причина — одна и та же).
    // Троттлим повторы по ключу endpoint+method+status: один раз в 5 минут.
    var _errKeyLastAt = Object.create(null);
    var _errKeySuppressed = Object.create(null); // сколько повторов съел троттлинг
    var _ERR_DEDUPE_MS = 5 * 60 * 1000;
    var _DEDUPED_EVENTS = { api_network_error: 1, api_error: 1, api_aborted: 1 };
    function _shouldDedupeError(event, data) {
        if (!_DEDUPED_EVENTS[event]) return false;
        if (!data) return false;
        var key = event + '|' + (data.endpoint || '') + '|' + (data.method || '') + '|' + (data.status || '');
        var now = Date.now();
        var last = _errKeyLastAt[key] || 0;
        if (now - last < _ERR_DEDUPE_MS) {
            _errKeySuppressed[key] = (_errKeySuppressed[key] || 0) + 1;
            return true;
        }
        _errKeyLastAt[key] = now;
        // объём не теряем: следующая пропущенная запись несёт число съеденных повторов
        if (_errKeySuppressed[key]) { data.suppressed_repeats = _errKeySuppressed[key]; _errKeySuppressed[key] = 0; }
        return false;
    }

    // Внутренние аккаунты (автор/тест) не должны попадать в продуктовую
    // аналитику: один залогиненный автор с 44-минутной сессией искажает
    // средние длительности и DAU на выборке в 40 юзеров. Помечается либо
    // localStorage-флагом (FrediTracker.markInternal() из консоли), либо
    // известным uid.
    var _INTERNAL_UIDS={'1778699723437':1};
    var _internalCache=null;
    function _isInternal(){
        if(_internalCache!==null) return _internalCache;
        var res=false;
        try{
            if(localStorage.getItem('fredi_internal')==='1') res=true;
            else if(_INTERNAL_UIDS[String(UID()||'')]) res=true;
        }catch(e){}
        _internalCache=res;
        return res;
    }

    // ---- game_open: один вход в игру — одно событие ----
    // Игры зовут track('game_open') в конце отрисовки домашнего экрана,
    // а на него возвращаются после каждого уровня кнопкой «К карте пути».
    // Поэтому один заход в игру писал по три-четыре «открытия», и в топе
    // событий game_open означал не входы, а перерисовки.
    //
    // Первый вход за сессию остаётся game_open, возвраты на карту идут
    // как game_returned. Заодно проставляем источник: в игру ведут
    // прямые ссылки из лекций (/fredi/?m=vsluh), и отличить их от клика
    // внутри приложения по событию раньше было нельзя.
    var _gamesSeen={};
    var _deepLinkGame=(function(){
        try { return new URLSearchParams(location.search).get('m')||''; }
        catch(e){ var m=(location.search||'').match(/[?&]m=([^&]+)/);
                  return m?decodeURIComponent(m[1]):''; }
    })();
    function _markGameOpen(event,data){
        if(event!=='game_open') return event;
        var d=data||{};
        var slug=d.game||d.feature||'';
        if(!slug) return event;
        if(_gamesSeen[slug]){
            d.reopen_no=_gamesSeen[slug];
            _gamesSeen[slug]++;
            return 'game_returned';
        }
        _gamesSeen[slug]=1;
        d.source=(slug===_deepLinkGame)?'deeplink':'app';
        return event;
    }

    function track(event,data){
        if (_isInternal()) return;
        if (_shouldDedupeError(event, data)) return;
        event=_markGameOpen(event,data);
        // Единая точка для внешних слушателей (напр. отложенный onboarding в
        // login.js ждёт первого «действия ценности»). Дешёвый CustomEvent,
        // ловит и внутренние (feature_opened/message_sent), и внешние события.
        // data тоже наружу: стена оплаты по ней узнаёт, чем человек был
        // занят перед тем, как упереться в лимит, и говорит про это, а не
        // показывает витрину из двенадцати функций. Старые слушатели
        // читают только detail.event — им прибавка не мешает.
        try { window.dispatchEvent(new CustomEvent('fredi:track', { detail: { event: event, data: data || {} } })); } catch (e) {}
        var payload={
            user_id:UID(),
            session_id:SID,
            event:event,
            data:data||{},
            attrs:_getAttrs(),
            screen:_screen,
            ts:new Date().toISOString()
        };
        _queue.push(payload);
        // Сессия жива, пока в неё пишут: сдвигаем отметку, иначе получасовое
        // окно отсчитывалось бы от загрузки страницы, а не от последнего
        // действия, и длинный разговор рвался бы на две сессии.
        _touchSession();
        _flush();
    }

    // Сохраняем оригинальный fetch ДО любых патчей (до meter.js),
    // чтобы аналитика могла слать события, не попадая сама в meter-проверки.
    var _origFetch=window.fetch.bind(window);

    function _flush(){
        if(_sending||!_queue.length) return;
        // Личность ещё не подтверждена — придерживаем очередь, но не дольше
        // потолка: иначе при мёртвой сети события пропали бы совсем.
        if(!_idReady){
            if(Date.now()<_idDeadline){ setTimeout(_flush,400); return; }
            _idReady=true;
        }
        _sending=true;
        var batch=_queue.splice(0,10);
        // user_id проставляем в момент отправки, а не постановки в очередь:
        // к этой секунде сервер уже сказал, кто это на самом деле, и события
        // начала визита не уезжают под временным идентификатором.
        var uidNow=UID();
        for(var i=0;i<batch.length;i++){ batch[i].user_id=uidNow; }
        // sendBeacon шлёт куки (credentials = include), а у бэка нет
        // Access-Control-Allow-Credentials → preflight падает на CORS.
        // Уходим на fetch с credentials:'omit' и keepalive:true (даёт то же
        // поведение «дотащить даже при закрытии вкладки», но без куки).
        try{
            _origFetch(API()+'/api/analytics/events',{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({events:batch}),
                keepalive:true,
                credentials:'omit',
                mode:'cors'
            }).catch(function(){});
        }catch(e){}
        _sending=false;
        if(_queue.length) setTimeout(_flush,1000);
    }

    // ---- feature lifecycle ----
    // duration_sec — это АКТИВНОЕ время (фокус вкладки), а не wall-clock.
    // wall_sec шлём в дополнение для отладки / сравнения.
    // Capped до 2 часов на случай если активный счётчик где-то заглючит.
    function _featureDuration(){
        _tickActive(); // дотикать до текущего момента
        var activeSec = Math.max(0, Math.round((_activeMs - _featureOpenedActiveMs)/1000));
        return Math.min(activeSec, 7200);
    }

    function _openFeature(name){
        if(!name) return;
        if(_currentFeature && _currentFeature === name) return;
        if(_currentFeature){
            var wall=Math.round((Date.now()-_featureOpenedAt)/1000);
            track('feature_closed',{feature:_currentFeature,duration_sec:_featureDuration(),wall_sec:wall});
        }
        _currentFeature=name;
        _featureOpenedAt=Date.now();
        _tickActive();
        _featureOpenedActiveMs=_activeMs;
        track('feature_opened',{feature:name});
    }
    function _closeCurrentFeature(reason){
        if(!_currentFeature) return;
        var wall=Math.round((Date.now()-_featureOpenedAt)/1000);
        track('feature_closed',{feature:_currentFeature,duration_sec:_featureDuration(),wall_sec:wall,reason:reason||''});
        _currentFeature=null;
    }

    // Auto-track: screen views (navigation)
    function _hookNav(){
        var list=document.getElementById('chatsList');
        var footer=document.querySelector('.chats-footer');
        function onClick(e){
            var item=e.target.closest('.chat-item[data-chat]');
            if(!item) return;
            var chat=item.dataset.chat;
            _screen=chat;
            track('screen_view',{screen:chat});
            _openFeature(chat);
        }
        if(list) list.addEventListener('click',onClick);
        if(footer) footer.addEventListener('click',onClick);
    }

    // ---- список AI-эндпоинтов ----
    var AI_RE=/\/api\/(?:chat|voice\/process|ai\/generate|deep-analysis|hypno\/support|psychologist-thoughts\/generate|dreams\/(?:interpret|clarify)|reality\/(?:check|parse\/[^/]+)|brand\/transformation|mirrors\/(?:complete|[^/]+\/complete)|morning\/send-now)(?:\/|$|\?)/;

    function _shortEndpoint(urlStr){
        try{ var u=new URL(urlStr,window.location.origin); return u.pathname.slice(0,80); }
        catch(e){ return (urlStr||'').split('?')[0].slice(0,80); }
    }
    function _extractResponseText(data) {
        // AI-эндпоинты возвращают ответ в разных полях — /api/chat → response,
        // /api/ai/generate → generated/answer, /api/deep-analysis → analysis/text
        // и т.п. Берём первое непустое строковое значение.
        if (!data || typeof data !== 'object') return '';
        var keys = ['response','text','message','generated','answer','result',
                    'analysis','content','reply','output','content_text'];
        for (var i = 0; i < keys.length; i++) {
            var v = data[keys[i]];
            if (typeof v === 'string' && v.length) return v;
        }
        // fallback: посмотрим в data.data если есть nested object
        if (data.data && typeof data.data === 'object') {
            for (var j = 0; j < keys.length; j++) {
                var vv = data.data[keys[j]];
                if (typeof vv === 'string' && vv.length) return vv;
            }
        }
        return '';
    }
    function _safeParseBody(body){
        if(!body) return null;
        if(typeof body !== 'string') return null;
        try{ return JSON.parse(body); }catch(e){ return null; }
    }

    // ---- AI busy indicator ----
    // Показываем глобальный «Фреди думает…» во время AI-запросов. Текст
    // меняется, если ответа нет 10+ или 20+ секунд — юзер понимает, что
    // система жива и не висит.
    var _aiBusyCount=0, _aiBusyEl=null, _aiBusyT1=null, _aiBusyT2=null;
    function _showAiBusy(){
        _aiBusyCount++;
        if(_aiBusyCount>1) return;
        if(!_aiBusyEl){
            var st=document.createElement('style');
            st.textContent='@keyframes fbspin{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.5);opacity:1}}';
            document.head.appendChild(st);
            _aiBusyEl=document.createElement('div');
            _aiBusyEl.id='fredi-ai-busy';
            _aiBusyEl.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 18px;border-radius:22px;font:13px/1.2 -apple-system,Segoe UI,Roboto,sans-serif;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,0.4);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);pointer-events:none;transition:opacity 0.2s';
            _aiBusyEl.innerHTML='<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#a78bfa;animation:fbspin 1s infinite ease-in-out"></span><span id="fredi-ai-busy-text">Фреди думает…</span>';
            document.body.appendChild(_aiBusyEl);
        }
        var t=document.getElementById('fredi-ai-busy-text');
        if(t) t.textContent='Фреди думает…';
        _aiBusyEl.style.display='flex';
        _aiBusyEl.style.opacity='1';
        if(_aiBusyT1) clearTimeout(_aiBusyT1);
        if(_aiBusyT2) clearTimeout(_aiBusyT2);
        _aiBusyT1=setTimeout(function(){
            var x=document.getElementById('fredi-ai-busy-text');
            if(x) x.textContent='Думает долго — подожди чуть-чуть';
        },10000);
        _aiBusyT2=setTimeout(function(){
            var y=document.getElementById('fredi-ai-busy-text');
            if(y) y.textContent='⚠ Связь медленная, ещё момент';
        },25000);
    }
    function _hideAiBusy(){
        _aiBusyCount=Math.max(0,_aiBusyCount-1);
        if(_aiBusyCount>0) return;
        if(_aiBusyT1){clearTimeout(_aiBusyT1);_aiBusyT1=null;}
        if(_aiBusyT2){clearTimeout(_aiBusyT2);_aiBusyT2=null;}
        if(_aiBusyEl) _aiBusyEl.style.display='none';
    }

    // ---- fetch hook ----
    function _hookFetch(){
        if(window._trackerFetchPatched) return;
        window._trackerFetchPatched=true;
        var _wrapped=window.fetch;
        window.fetch=async function(url,options){
            var urlStr=typeof url==='string'?url:(url && url.url)||'';
            var method=(options && options.method)||'GET';
            var started=Date.now();
            var isAi = AI_RE.test(urlStr);
            // если apiCall уже эмитил message_sent — fetch не дублирует
            var alreadyTracked = !!(options && options._fa_tracked);

            if(isAi && method==='POST' && !alreadyTracked){
                try{
                    var body=_safeParseBody(options && options.body);
                    track('message_sent',{
                        endpoint:_shortEndpoint(urlStr),
                        text_length:(body && ((body.message||body.text||body.query||'')+'')).length||0,
                        mode:body && (body.mode||body.context_mode||''),
                        via:'fetch'
                    });
                }catch(e){}
                _showAiBusy();
            }

            // Ретрай с бэкоффом для идемпотентных GET: холодный старт спящего
            // контейнера и моргания мобильной сети обычно проходят со 2-й попытки.
            // api_network_error пишем ТОЛЬКО когда исчерпаны все попытки — счётчик
            // отражает реальные недоступности, а не разовые обрывы. Не-GET (POST
            // /api/ai/generate и пр.) не ретраятся — они не идемпотентны.
            var canRetry = (method==='GET');
            var maxTries = canRetry ? 3 : 1;
            var backoffs = [400, 1200];
            try{
                for(var attempt=0; ; attempt++){
                    var opt = options;
                    // на повторах убираем уже сработавший таймаут-signal (иначе мгновенный abort)
                    if(attempt>0 && options && options.signal){ opt=Object.assign({},options); delete opt.signal; }
                    try{
                        var response=await _wrapped(url,opt);
                        var latency=Date.now()-started;

                        // Потоковые ответы не трогаем. cloned.json() ждёт
                        // ВЕСЬ body целиком — и только потом мы отдаём
                        // response вызывающему коду. На /api/chat/stream это
                        // ровно то, ради чего стрим и делался: первая дельта
                        // приходит через секунду, а показать её удалось бы
                        // только через двадцать, когда допишется последняя.
                        // Разобрать NDJSON как JSON всё равно не выйдет —
                        // await заканчивается исключением, то есть ожидание
                        // было чистой потерей. То же касается
                        // /api/voice/process_stream — он тоже NDJSON.
                        // Такие ответы трекает сам вызывающий код.
                        var _ct = '';
                        try{ _ct = response.headers.get('content-type') || ''; }catch(e){}
                        var _isJson = _ct.indexOf('application/json') >= 0;

                        if(isAi && response.ok && !alreadyTracked && _isJson){
                            try{
                                var cloned=response.clone();
                                var data=await cloned.json();
                                var respText=_extractResponseText(data);
                                track('ai_response_received',{
                                    endpoint:_shortEndpoint(urlStr),
                                    text_length:respText.length,
                                    latency_ms:latency,
                                    success:!!(data && data.success !== false),
                                    via:'fetch'
                                });
                            }catch(e){}
                        }

                        if(urlStr.indexOf('/api/')>=0 && response.status >= 400 && response.status !== 402){
                            track('api_error',{endpoint:_shortEndpoint(urlStr),status:response.status,method:method});
                        }
                        return response;
                    }catch(netErr){
                        if(attempt < maxTries-1){
                            // тихий повтор — промежуточный сбой не логируем
                            await new Promise(function(res){ setTimeout(res, backoffs[attempt] + Math.floor(Math.random()*150)); });
                            continue;
                        }
                        if(urlStr.indexOf('/api/')>=0 && !alreadyTracked){
                            // alreadyTracked: AI-вызов через apiCall — тот сам пишет ai_response_error,
                            // здесь молчим, иначе один сбой считается дважды.
                            var isAbort = !!(netErr && (netErr.name==='AbortError' || /abort/i.test(String(netErr.message||''))));
                            // AbortError — это таймаут-сигнал или отменённый пользователем запрос,
                            // а не недоступность сети: считаем отдельным событием.
                            track(isAbort?'api_aborted':'api_network_error',{endpoint:_shortEndpoint(urlStr),method:method,error:((netErr && netErr.message)||'').slice(0,100),retries:attempt});
                        }
                        throw netErr;
                    }
                }
            }finally{
                if(isAi && method==='POST' && !alreadyTracked) _hideAiBusy();
            }
        };
    }

    // ---- apiCall hook (app.js grow its own httpClient) ----
    // app.js грузится ПОСЛЕ tracker → ждём появления window.apiCall и патчим.
    function _hookApiCall(){
        if(window._trackerApiCallPatched) return true;
        if(typeof window.apiCall !== 'function') return false;
        window._trackerApiCallPatched=true;
        var _origApiCall=window.apiCall;
        window.apiCall=async function(endpoint, options){
            options = options || {};
            var urlStr=endpoint||'';
            var method=(options && options.method)||'GET';
            var started=Date.now();
            var isAi = AI_RE.test(urlStr);
            // маркер для fetch-хука, чтобы не дублировал
            if(isAi && typeof options==='object'){ options._fa_tracked = 1; }

            if(isAi && method==='POST'){
                try{
                    var body=_safeParseBody(options.body);
                    track('message_sent',{
                        endpoint:_shortEndpoint(urlStr),
                        text_length:(body && ((body.message||body.text||body.query||'')+'')).length||0,
                        mode:body && (body.mode||body.context_mode||''),
                        via:'apiCall'
                    });
                }catch(e){}
                _showAiBusy();
            }
            try{
                var data=await _origApiCall(endpoint, options);
                var latency=Date.now()-started;
                if(isAi){
                    var respText=_extractResponseText(data);
                    track('ai_response_received',{
                        endpoint:_shortEndpoint(urlStr),
                        text_length:respText.length,
                        latency_ms:latency,
                        success:!!(data && data.success !== false),
                        via:'apiCall'
                    });
                }
                return data;
            }catch(err){
                if(isAi){
                    track('ai_response_error',{
                        endpoint:_shortEndpoint(urlStr),
                        error:((err && err.message)||'').slice(0,100),
                        kind:(err && (err.name==='AbortError' || /abort/i.test(String(err.message||''))))?'abort_or_timeout':'network_or_server',
                        latency_ms:Date.now()-started
                    });
                }
                throw err;
            }finally{
                if(isAi && method==='POST') _hideAiBusy();
            }
        };
        console.log('tracker: apiCall patched');
        return true;
    }

    // JS runtime errors
    //
    // Раньше отсюда уходило только имя файла без пути — и в аналитике
    // нельзя было отличить нашу поломку от скрипта, который влило в
    // страницу расширение браузера. Такие чужие ошибки приходят с пустым
    // filename и строкой 1:1, попадали в тот же счётчик js_error и
    // раздували его. Теперь чужое пишется отдельным событием, а к своему
    // прикладывается стек — иначе «SyntaxError в строке 1» не чинится.
    function _errOrigin(fn) {
        if (!fn) return '';
        try { return new URL(fn, location.href).origin; } catch (e) { return ''; }
    }
    window.addEventListener('error',function(e){
        var fn = e.filename || '';
        var own = !!fn && _errOrigin(fn) === location.origin;
        var stack = '';
        try { stack = (e.error && e.error.stack || '').split('\n').slice(0,3).join(' | '); } catch (x) {}
        track(own ? 'js_error' : 'js_error_external', {
            message: (e.message || '').slice(0, 300),
            file: fn ? fn.replace(location.origin, '') : '(нет файла)',
            line: e.lineno, col: e.colno,
            stack: stack.slice(0, 300)
        });
    });
    window.addEventListener('unhandledrejection',function(e){
        var msg='';
        try{ msg = (e.reason && (e.reason.message || String(e.reason))) || ''; }catch(x){}
        track('promise_unhandled',{message:msg.slice(0,200)});
    });

    // session_start — только для действительно новой сессии. Перезагрузка
    // страницы и переход из блога в приложение продолжают начатую: раньше
    // каждая такая навигация писала лишний старт и секундную сессию.
    if(_sidNew){
        track('session_start',{referrer:document.referrer||'',screen_w:screen.width,screen_h:screen.height,theme:document.documentElement.getAttribute('data-theme')||'dark',ua:navigator.userAgent.substr(0,100)});
    }else{
        track('page_view',{referrer:document.referrer||'',path:(location.pathname||'')});
    }

    // session_end с active-time (а не wall time). Cap 2 часа — sanity.
    // На iOS + Safari beforeunload не всегда срабатывает, поэтому дублируем
    // отправку через pagehide и visibilitychange='hidden' (idempotent — флаг).
    var _sessionEnded=false;
    // Активное время на момент последнего отправленного session_end.
    // Человек, который уходит со вкладки и возвращается, снимает флаг
    // _sessionEnded (см. visibilitychange ниже) — и следующий уход шлёт
    // ещё один session_end. Это осознанно: иначе время, набранное после
    // возврата, потерялось бы. Но если после возврата он ничего не
    // делал, второй session_end несёт ровно те же цифры и только
    // портит статистику. Такой шлём один раз.
    var _lastEndActiveSec=-1;
    function _emitSessionEnd(){
        if(_sessionEnded) return;
        _sessionEnded=true;
        _closeCurrentFeature('unload');
        _tickActive();
        // Обе цифры — про сессию целиком: wall от её начала, active — сумма
        // времени с открытой вкладкой. Потолок один и тот же, иначе
        // подрезанное активное могло превысить неподрезанное wall.
        var wallSec=Math.min(Math.round((Date.now()-SESSION_START)/1000), 7200);
        var activeSec=Math.min(Math.round(_activeMs/1000), 7200);
        if(activeSec>wallSec) activeSec=wallSec;
        if(activeSec===_lastEndActiveSec) return;
        _lastEndActiveSec=activeSec;
        track('session_end',{duration_sec:activeSec, wall_sec:wallSec, last_screen:_screen});
        _flush();
    }
    window.addEventListener('beforeunload', _emitSessionEnd);
    window.addEventListener('pagehide',     _emitSessionEnd);

    // visibility
    document.addEventListener('visibilitychange',function(){
        if(document.hidden){
            _tickActive();
            _isVisible=false;
            track('tab_hidden',{active_sec_so_far:Math.round(_activeMs/1000)});
            // На мобильных скрытие вкладки часто предшествует закрытию без
            // pagehide — страхуемся, но не помечаем сессию завершённой,
            // чтобы при возврате юзера продолжать учитывать активное время.
            _flush();
        }else{
            _isVisible=true;
            _lastActiveAt=Date.now();
            _sessionEnded=false;   // вернулся — сессия снова активна
            track('tab_visible',{active_sec_so_far:Math.round(_activeMs/1000)});
        }
    });

    // theme switch
    var _origThemeSet=window.FrediTheme?.set;
    if(_origThemeSet){
        window.FrediTheme.set=function(theme){
            track('theme_switch',{theme:theme});
            return _origThemeSet(theme);
        };
    }

    // Init hooks
    _hookFetch();
    if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',_hookNav);
    }else{
        _hookNav();
    }
    // apiCall появляется после загрузки app.js — пробуем в несколько заходов
    if(!_hookApiCall()){
        setTimeout(_hookApiCall, 500);
        setTimeout(_hookApiCall, 2000);
        setTimeout(_hookApiCall, 5000);
    }

    setTimeout(_refreshPremium, 1500);
    setInterval(_refreshPremium, 300000);

    // Public API
    window.FrediTracker={
        track:track,
        openFeature:_openFeature,
        closeFeature:_closeCurrentFeature,
        activeSec:function(){ _tickActive(); return Math.round(_activeMs/1000); },
        // Пометить это устройство как внутреннее (автор/тест): события
        // перестанут уходить в продуктовую аналитику. Вызвать 1 раз из консоли.
        markInternal:function(){ try{ localStorage.setItem('fredi_internal','1'); }catch(e){} _internalCache=true; },
        isInternal:_isInternal
    };
    console.log('tracker.js v3 loaded');
})();
