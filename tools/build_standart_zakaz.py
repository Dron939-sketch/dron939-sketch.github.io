#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Свой заказ пакета «Стандартный»: страницы оформления и «спасибо».

    python3 tools/build_standart_zakaz.py

Решение владельца 20.10.2026: «по „Стандартному“ не вести на Ozon, сделаем
страницу оформления заказа на нашем сайте, будем брать оплату сразу и
отправлять СДЭКом до ближайшего ПВЗ — так мы узнаем всё, что нам надо».
Ozon не говорит, кто купил после перехода с сайта; свой заказ показывает
всю воронку и даёт почту покупателя.

Страницы собираются из /komplekt/ (тот же заказ мимо Ozon с сентября):
шапка, стили, Метрика и подвал берутся оттуда, своё — только середина.
Оплата — POST /api/shop/checkout с product=standart (Frederick,
order_routes.py, PRODUCTS). Адрес новый нарочно: бэкенд без каталога
ответит 404, а не возьмёт 19 999 ₽ за комплект.

Цена 5 900 ₽ с НДС 22 %, без доставки; доставку покупатель платит в пункте выдачи по
тарифу СДЭК (решение владельца). Состав пакета — со страницы
/razgovornyj-gipnoz/standart/, обещать больше нельзя.

Страницы служебные: noindex, canonical на /razgovornyj-gipnoz/standart/,
в sitemap не добавлять.
"""
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "komplekt", "index.html")
SRC_THX = os.path.join(ROOT, "komplekt", "spasibo", "index.html")
OUT = os.path.join(ROOT, "razgovornyj-gipnoz", "standart", "zakaz", "index.html")
OUT_THX = os.path.join(ROOT, "razgovornyj-gipnoz", "standart", "spasibo", "index.html")
LANDING = "https://meysternlp.ru/razgovornyj-gipnoz/standart/"
PRICE = 5900

TITLE = "Оформить заказ: пакет «Стандартный» — 5 900 ₽ | Андрей Мейстер"
DESC = ("Пакет «Стандартный» курса «Разговорный гипноз»: книга «Матчасть», 38 видео, блокнот "
        "с заданиями, колода «Маркетолог» и разбор с автором. 5 900 ₽, доставка СДЭК до пункта выдачи.")


# Праздничный слой (23.10.2026, владелец: «страницу нужно сделать более
# праздничной»). Поверх светлой темы /komplekt/: тёмный фон с мягким
# свечением, перелив на заголовке и цене, блик на кнопке оплаты.
# Ленту «подарок», эмодзи и искры убрали 23.10: фокус-группа (5 из 5
# пришли с рекламы) читала их как маркетплейс и пыль на экране. Тот же тёмный мир, что на странице пакета, —
# фокус-группа принимала светлый заказ за чужой сайт. Анимации гасятся
# при prefers-reduced-motion.
FEST_CSS = """<style>
:root{--accent:#5B9BFF;--surface:rgba(19,25,38,.82);--border:rgba(91,155,255,.24);--muted:#A9B4C7;--faint:#7E8AA0}
body{color:#E9EEF6;background:#070A12;background-image:radial-gradient(900px 520px at 12% -8%,rgba(58,134,255,.28),transparent 62%),radial-gradient(760px 460px at 100% 6%,rgba(0,168,232,.18),transparent 60%),radial-gradient(820px 560px at 50% 108%,rgba(139,92,246,.16),transparent 62%);background-attachment:fixed}
main,.wrap{position:relative;z-index:1}
.crumbs,.crumbs a{color:var(--faint)}
.hero h1,.zk-hero h1{background:linear-gradient(180deg,#fff 0,#cfe0ff 55%,#7fb0ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.zk-badge{display:inline-block;margin-bottom:12px;padding:6px 14px;border-radius:30px;font-size:.85rem;font-weight:600;color:#cfe0ff;background:rgba(58,134,255,.12);border:1px solid rgba(91,155,255,.35)}
.pricetag b{font-size:2.4rem;background:linear-gradient(135deg,#fff,#9cc3ff 60%,#5B9BFF);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 30px rgba(91,155,255,.25)}
.zk-hero .shot{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(91,155,255,.35),rgba(14,20,32,.2) 62%),#0E1420;border:1px solid var(--border);box-shadow:0 0 0 1px rgba(255,255,255,.03),0 24px 60px rgba(30,80,200,.25)}
.zk-hero .shot img{border-radius:14px;max-width:320px;box-shadow:0 18px 40px rgba(0,0,0,.5),0 0 60px rgba(91,155,255,.25)}
.zk-hero .go,.btn-buy{position:relative;overflow:hidden;background:linear-gradient(135deg,#00A8E8,#3A86FF);box-shadow:0 8px 26px rgba(58,134,255,.45);transition:transform .15s,box-shadow .15s}
.zk-hero .go:hover,.btn-buy:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 32px rgba(58,134,255,.6)}
.zk-hero .go::after,.btn-buy::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);animation:zk-shine 3.2s ease-in-out infinite}
@keyframes zk-shine{0%,60%{left:-60%}100%{left:130%}}
.item,.form{background:var(--surface);border:1px solid var(--border);box-shadow:0 10px 30px rgba(0,0,0,.25)}
.form{box-shadow:0 0 0 1px rgba(91,155,255,.12),0 20px 60px rgba(30,80,200,.18)}
.item .kind{color:#8fb6ff}
.zk-inside,.zk-inside figcaption{background:var(--surface);color:var(--muted)}
.zk-inside{border:1px solid var(--border)}
.field input,.field textarea{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.12)}
.field input:focus,.field textarea:focus{border-color:#5B9BFF;box-shadow:0 0 0 3px rgba(91,155,255,.18)}
.h2{color:#fff}.h3{color:#E9EEF6}
.agree input{accent-color:#3A86FF;width:18px;height:18px}
.field input::placeholder,.field textarea::placeholder{color:rgba(233,238,246,.28)}
@media(max-width:720px){.zk-hero .go{display:block;text-align:center}}
@media(prefers-reduced-motion:reduce){.zk-hero .go::after,.btn-buy::after{animation:none}}
</style>"""

# Конфетти на «спасибо» — только когда сервер подтвердил оплату.
FEST_JS = """<script>
function zkConfetti(){try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var c=document.createElement('canvas'),x=c.getContext('2d'),W,H,P=[],t=0,C=['#5B9BFF','#00A8E8','#ffd27a','#ffb347','#ffffff','#a78bfa'];
c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999';document.body.appendChild(c);
function rs(){W=c.width=innerWidth;H=c.height=innerHeight}rs();addEventListener('resize',rs);
for(var i=0;i<160;i++)P.push({x:W/2+(Math.random()-.5)*W*.3,y:H*.3,vx:(Math.random()-.5)*12,vy:-Math.random()*12-4,s:4+Math.random()*5,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:C[i%C.length]});
(function f(){t++;x.clearRect(0,0,W,H);P.forEach(function(p){p.vy+=.28;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});
if(t<240)requestAnimationFrame(f);else c.remove()})()}catch(e){}}
</script>"""

BODY = """<style>
.zk-hero{display:grid;grid-template-columns:1.25fr 1fr;gap:28px;align-items:center}
.zk-hero .shot{background:radial-gradient(circle at 50% 40%,#2B3A55,#0E1420);border-radius:22px;padding:22px;display:flex;align-items:center;justify-content:center}
.zk-hero .shot img{width:100%;max-width:340px;height:auto;display:block;filter:drop-shadow(0 18px 30px rgba(0,0,0,.45))}
.zk-hero .go{display:inline-block;margin-top:18px;padding:13px 26px;border-radius:14px;background:linear-gradient(135deg,#3b82ff,#6366f1);color:#fff;font-weight:600}
.zk-hero .go:hover{text-decoration:none;opacity:.92}
@media(max-width:720px){.zk-hero{grid-template-columns:1fr}.zk-hero .shot{order:-1;padding:16px}.zk-hero .shot img{max-width:240px}}
.zk-inside{margin:0 0 22px;border-radius:18px;overflow:hidden;background:#fff}
.zk-inside img{display:block;width:100%;height:auto}
.zk-inside figcaption{padding:10px 16px 14px;font-size:.92rem;color:#5b6475;background:#fff}
.zk-proof{display:flex;flex-wrap:wrap;gap:10px 22px;margin:14px 0 0;font-size:.92rem;color:var(--muted)}
.zk-proof b{color:inherit}
</style>
<div class="wrap">
  <div class="crumbs"><a href="/">Главная</a> / <a href="/razgovornyj-gipnoz/standart/">Разговорный гипноз</a> / <span>Оформление заказа</span></div>
  <div class="hero zk-hero">
    <div>
      <span class="zk-badge">Последний шаг — и пакет едет к вам</span>
      <h1>Пакет «Стандартный»</h1>
      <p>Всё, что нужно, чтобы приёмы разговорного гипноза перестали быть текстом и начали срабатывать в разговоре: механизм, образец, задания, проверка на живом человеке и разбор ваших ошибок.</p>
      <div class="pricetag"><b>5 900 ₽</b><span>с НДС · оплата картой через ЮKassa · доставку СДЭК вы оплачиваете при получении</span></div>
      <div class="zk-proof"><span><b>4,9</b> и 320 отзывов на Ozon</span><span>СДЭК до пункта выдачи</span><span>доступ к видео на 12 месяцев</span><span>ответ автора в течение суток</span></div>
      <a class="go" href="#orderForm">Оформить заказ ↓</a>
    </div>
    <div class="shot"><img src="/treningi/komplekt-standart.webp" alt="Пакет «Стандартный» в раскрытой папке: блокнот, схемы, коробка «Доступ» и книга «Матчасть»" width="1100" height="1100"></div>
  </div>

  <div class="h2">Оформление и доставка</div>
  <p class="t">Заполните форму и оплатите картой — данные для отправки придут менеджеру сразу после оплаты. Посылка едет СДЭК до пункта выдачи, который вы укажете. Доставку вы оплачиваете при получении, по тарифу СДЭК для вашего города. Трек-номер придёт на почту.</p>

  <div class="form" id="orderForm">
    <div class="h3" style="margin-top:0">Куда отправлять</div>
    <p class="t" style="font-size:.95rem">Пакет приходит в пункт выдачи СДЭК. Найдите ближайший на <a href="https://www.cdek.ru/ru/offices" target="_blank" rel="noopener">карте пунктов</a> и впишите его адрес целиком.</p>
    <div class="field">
      <label for="fFio">Фамилия, имя и отчество</label>
      <input id="fFio" type="text" autocomplete="name" maxlength="200" placeholder="Иванов Иван Иванович">
      <div class="hint">Так, как в паспорте — по этим данным СДЭК выдаёт посылку.</div>
    </div>
    <div class="row">
      <div class="field">
        <label for="fPhone">Телефон</label>
        <input id="fPhone" type="tel" autocomplete="tel" maxlength="32" placeholder="+7 900 000-00-00">
      </div>
      <div class="field">
        <label for="fEmail">Почта</label>
        <input id="fEmail" type="email" autocomplete="email" maxlength="254" placeholder="you@mail.ru">
        <div class="hint">Придут чек и трек-номер.</div>
      </div>
    </div>
    <div class="field">
      <label for="fCity">Город</label>
      <input id="fCity" type="text" autocomplete="address-level2" maxlength="200" placeholder="Ростов-на-Дону">
    </div>
    <div class="field">
      <label for="fPvz">Адрес пункта выдачи СДЭК</label>
      <textarea id="fPvz" rows="2" maxlength="500" placeholder="ул. Большая Садовая, 15, ПВЗ СДЭК"></textarea>
    </div>
    <div class="field">
      <label for="fComment">Комментарий (не обязательно)</label>
      <textarea id="fComment" rows="2" maxlength="1000" placeholder="Например: удобно забрать после 19:00"></textarea>
    </div>
    <div class="hp" aria-hidden="true"><label>Не заполняйте<input id="fWebsite" type="text" tabindex="-1" autocomplete="off"></label></div>
    <label class="agree"><input id="fAgree" type="checkbox">
      <span>Соглашаюсь с <a href="/oferta/" target="_blank" rel="noopener">офертой</a> и <a href="/politika-konfidencialnosti/" target="_blank" rel="noopener">политикой конфиденциальности</a>. Данные нужны для доставки и чека.</span>
    </label>
    <p class="t" style="font-size:.88rem;color:var(--muted);margin:10px 0 12px">Сейчас вы платите 5 900 ₽ — это вся стоимость пакета. Доставку СДЭК оплачиваете при получении. Вернуть можно в течение семи дней после получения, если товар не был в употреблении. Продаёт и отправляет пакет менеджер Андрея Мейстера — ИП Медведев Андрей Юрьевич, ИНН 502238728185: от его имени придёт чек на почту, реквизиты — в <a href="/oferta/">оферте</a>.</p>
    <button class="btn-buy" id="fSubmit" type="button">Оплатить 5 900 ₽</button>
    <p class="t" style="font-size:.82rem;color:var(--faint);margin:10px 0 0">Если включён VPN, выключите его на время оплаты — иначе страница банка может не открыться. Деньги в этом случае не спишутся.</p>
    <div class="err" id="fErr"></div>
  </div>

  <div class="h2">Что в коробке</div>
  <figure class="zk-inside">
    <img src="/razgovornyj-gipnoz/standart/zakaz/vnutri.webp" alt="Пакет «Стандартный» в раскрытой папке: блокнот «Практикум», печатные схемы, коробка «Доступ» и книга «Матчасть»" loading="lazy" width="1020" height="700">
    <figcaption>Так пакет выглядит, когда вы его открываете: слева — блокнот «Практикум», печатные схемы и коробка «Доступ», справа — книга «Матчасть». Приходит папка в чёрной коробке с надписью «Пакет „Стандарт“».</figcaption>
  </figure>
  <div class="items">
    <div class="item">
      <div class="kind">Механизм</div>
      <div class="name">Книга «Матчасть»</div>
      <div class="desc">274 страницы учебного материала курса и две печатные схемы-разворота: как устроены сознание, подсознание и защита.</div>
    </div>
    <div class="item">
      <div class="kind">Образец</div>
      <div class="name">38 видео</div>
      <div class="desc">Конкретные конструкции и алгоритмы — как приём звучит в разговоре. Доступ на 12 месяцев — по QR-коду на коробке «Доступ».</div>
    </div>
    <div class="item">
      <div class="kind">Отработка</div>
      <div class="name">Блокнот «Практикум»</div>
      <div class="desc">На пружине, с QR-кодами на видеоразборы упражнений: одно задание — один приём.</div>
    </div>
    <div class="item">
      <div class="kind">Проверка</div>
      <div class="name">Колода игры «Маркетолог»</div>
      <div class="desc">Один рассказывает историю по картам, второй слушает, третий по лицу слушателя определяет, поймали его или нет.</div>
    </div>
    <div class="item">
      <div class="kind">Разбор</div>
      <div class="name">Закрытый Telegram-канал с автором</div>
      <div class="desc">Личные ответы на вопросы и разбор ваших ситуаций — от Андрея Мейстера, в течение суток.</div>
    </div>
  </div>
  <p class="t">Подробно о том, как устроен курс и почему в нём пять частей, — на <a href="/razgovornyj-gipnoz/standart/">странице пакета</a>. Первое занятие курса <a href="/razgovornyj-gipnoz/urok-1/">открыто бесплатно</a>.</p>

  <div class="h2">Частые вопросы</div>
  <div class="h3">Сколько стоит доставка?</div>
  <p class="t">Столько, сколько берёт СДЭК до вашего пункта выдачи, — тариф зависит от города, его показывает сам СДЭК. Оплачиваете при получении посылки, в пункте выдачи.</p>
  <div class="h3">Как открыть видео после покупки?</div>
  <p class="t">В коробке — карточки с QR-кодами и доступом к видео на 12 месяцев. Наводите камеру телефона на код, открывается урок. Ничего скачивать не нужно.</p>
  <div class="h3">Как узнать адрес своего пункта выдачи?</div>
  <p class="t">Откройте карту пунктов СДЭК, найдите ближайший к дому или работе и скопируйте адрес в форму целиком, вместе с городом.</p>
  <div class="h3">Что делать, если ошибся в адресе?</div>
  <p class="t">Напишите на почту, с которой пришло подтверждение заказа, — пока посылка не отправлена, пункт выдачи меняется без проблем.</p>
  <div class="h3">Можно вернуть?</div>
  <p class="t">Да. При покупке через интернет вы вправе отказаться от товара до его получения и в течение семи дней после, если товар не был в употреблении и сохранён товарный вид. Условия — в оферте.</p>

  <a href="/razgovornyj-gipnoz/standart/" class="back">← К описанию пакета</a>
</div>

<script>
(function () {
  var btn = document.getElementById('fSubmit');
  var err = document.getElementById('fErr');
  var busy = false;
  var LABEL = 'Оплатить 5 900 \\u20BD';
  function val(id) { return (document.getElementById(id).value || '').trim(); }
  function fail(msg, focus) {
    err.textContent = msg;
    if (focus) { var el = document.getElementById(focus); if (el) el.focus(); }
    return false;
  }
  // Шаги воронки: открыл страницу заказа → нажал «Оплатить». Параметр визита —
  // для отчётов; цель standart_<шаг> — для Директа: на параметрах кампания
  // учиться не умеет, а с 20.10 «Купить на Ozon» у пакета нет.
  function step(name) { try { if (window.ym) { ym(108138656, 'params', { standart_zakaz: name }); ym(108138656, 'reachGoal', 'standart_' + name); } } catch (e) {} }
  step('open');
  btn.addEventListener('click', function () {
    if (busy) return;
    err.textContent = '';
    var fio = val('fFio'), phone = val('fPhone'), email = val('fEmail');
    var city = val('fCity'), pvz = val('fPvz');
    if (fio.split(/\\s+/).length < 2) return fail('Впишите фамилию, имя и отчество полностью.', 'fFio');
    if (phone.replace(/\\D/g, '').length < 10) return fail('Телефон нужен полностью, с кодом города или оператора.', 'fPhone');
    if (!/^[^@\\s]+@[^@\\s]+\\.[a-zA-Z]{2,}$/.test(email)) return fail('Проверьте адрес почты — на неё придёт чек.', 'fEmail');
    if (city.length < 2) return fail('Укажите город.', 'fCity');
    if (pvz.length < 8) return fail('Укажите адрес пункта выдачи СДЭК.', 'fPvz');
    if (!document.getElementById('fAgree').checked) return fail('Нужно согласие с офертой.', 'fAgree');
    busy = true; btn.disabled = true; btn.textContent = 'Готовим оплату…';
    step('pay_click');
    fetch('/api/shop/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: 'standart',
        fio: fio, phone: phone, email: email, city: city, pvz: pvz,
        comment: val('fComment'), website: val('fWebsite')
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (d) {
      if (d && d.success && d.manual) {
        // Платёж не создался, но заказ записан и владельцу ушли контакты
        // (Frederick, order_routes._payment_failed). Человеку — не «ошибка»,
        // а «заказ принят, свяжусь с вами».
        step('manual');
        var f = document.getElementById('orderForm');
        f.innerHTML = '';
        var h = document.createElement('div'); h.className = 'h3'; h.style.marginTop = '0';
        h.textContent = 'Заказ принят';
        var p1 = document.createElement('p'); p1.className = 't';
        p1.textContent = d.message || 'Оплата сейчас не открылась. Я свяжусь с вами по телефону или почте и помогу оплатить.';
        var p2 = document.createElement('p'); p2.className = 't';
        p2.textContent = 'Номер заказа: ' + (d.order_no || '') + '. Сохраните его на всякий случай.';
        f.appendChild(h); f.appendChild(p1); f.appendChild(p2);
        f.scrollIntoView({ block: 'center' });
        return;
      }
      if (d && d.success && d.confirmation_url) { window.location.href = d.confirmation_url; return; }
      busy = false; btn.disabled = false; btn.textContent = LABEL;
      fail((d && d.error) || 'Не получилось создать платёж. Попробуйте ещё раз или напишите нам.');
    }).catch(function () {
      busy = false; btn.disabled = false; btn.textContent = LABEL;
      fail('Оплата сейчас недоступна. Попробуйте через несколько минут или напишите нам — оформим вручную.');
    });
  });
})();
</script>"""


def head_from(src, title, desc, canonical_crumb):
    h = io.open(src, encoding="utf-8").read()
    head_end = h.index('<div class="wrap">')
    head = h[:head_end]
    head = re.sub(r"<title>.*?</title>", "<title>%s</title>" % title, head, count=1, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % desc, head, count=1)
    head = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex, follow">', head, count=1)
    head = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % LANDING, head, count=1)
    head = re.sub(r'<meta property="og:[^>]*>', "", head)
    # Разметку Product и крошки комплекта не переносим: страница служебная, noindex.
    head = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", head, flags=re.S)
    tail = h[h.index("</script>", h.index("fetch('/api/shop/")) + len("</script>"):]
    return head, tail


def main():
    head, tail = head_from(SRC, TITLE, DESC, LANDING)
    io.open(OUT, "w", encoding="utf-8").write(head + BODY + FEST_CSS + tail)
    th = io.open(SRC_THX, encoding="utf-8").read()
    th = re.sub(r"<title>.*?</title>", "<title>Оплата заказа — пакет «Стандартный» | Андрей Мейстер</title>", th, count=1, flags=re.S)
    th = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % LANDING, th, count=1)
    th = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="noindex, follow">', th, count=1)
    th = th.replace('<a href="/komplekt/">Комплект</a>', '<a href="/razgovornyj-gipnoz/standart/">Пакет «Стандартный»</a>')
    th = th.replace('<a href="/komplekt/" class="back">← К описанию комплекта</a>', '<a href="/razgovornyj-gipnoz/standart/" class="back">← К описанию пакета</a>')
    th = th.replace("Соберу посылку и отправлю СДЭК в указанный пункт выдачи — трек-номер придёт на вашу почту вместе с чеком.",
                    "Соберу посылку и отправлю СДЭК в указанный пункт выдачи — трек-номер придёт на вашу почту. Доставку оплачиваете при получении.")
    th = th.replace('<a href="/komplekt/">оформить заказ заново</a>', '<a href="/razgovornyj-gipnoz/standart/zakaz/">оформить заказ заново</a>')
    th = th.replace("if (d && d.paid) { paid(); return; }",
                    "if (d && d.paid) { paid(); zkConfetti(); try { if (window.ym) ym(108138656, 'params', { standart_zakaz: 'paid' }); ym(108138656, 'reachGoal', 'standart_paid', { order_price: 5900, currency: 'RUB' }); } catch (e) {} return; }")
    assert "komplekt" not in re.sub(r"<head>.*?</head>", "", th, flags=re.S), "в «спасибо» остались ссылки на комплект"
    assert th.count("</head>") == 1, "в «спасибо» не один </head>"
    th = th.replace("</head>", FEST_CSS + FEST_JS + "</head>")
    io.open(OUT_THX, "w", encoding="utf-8").write(th)
    print("записано:", os.path.relpath(OUT, ROOT), os.path.relpath(OUT_THX, ROOT))


if __name__ == "__main__":
    main()
