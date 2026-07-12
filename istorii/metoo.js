/* ==========================================================================
   metoo.js — счётчик «И у меня так» для раздела «Истории».
   --------------------------------------------------------------------------
   MVP без бэкенда: у каждой истории есть базовое число (data-metoo-seed) —
   сколько человек уже узнали в ней себя. Когда посетитель нажимает кнопку,
   мы прибавляем +1 и запоминаем это в localStorage, чтобы при повторном
   заходе число не «прыгало» и кнопка оставалась нажатой.

   Разметка, которую обслуживает скрипт:
     <span class="metoo-count" data-metoo-id="slug" data-metoo-seed="128"></span>
     <button class="metoo-btn" data-metoo-id="slug" data-metoo-seed="128">…</button>

   localStorage в песочнице (about:blank, sandbox) умеет бросать SecurityError —
   поэтому все обращения к нему обёрнуты в try/catch и деградируют мягко.
   ========================================================================== */
(function () {
  var PREFIX = 'metoo:';

  function hasClicked(id) {
    try { return localStorage.getItem(PREFIX + id) === '1'; }
    catch (e) { return false; }
  }

  function remember(id) {
    try { localStorage.setItem(PREFIX + id, '1'); }
    catch (e) { /* приватный режим / песочница — просто не сохраняем */ }
  }

  function fmt(n) {
    // 1234 -> "1 234" (неразрывный пробел как разделитель тысяч)
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function countFor(id, seed) {
    return seed + (hasClicked(id) ? 1 : 0);
  }

  function renderCounts() {
    var nodes = document.querySelectorAll('.metoo-count');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var id = el.getAttribute('data-metoo-id');
      var seed = parseInt(el.getAttribute('data-metoo-seed'), 10) || 0;
      el.textContent = fmt(countFor(id, seed));
    }
  }

  function syncButtons() {
    var btns = document.querySelectorAll('.metoo-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var id = btn.getAttribute('data-metoo-id');
      if (hasClicked(id)) {
        btn.classList.add('done');
        btn.disabled = true;
        var lbl = btn.querySelector('.metoo-btn-label');
        if (lbl) lbl.textContent = 'И у вас так — спасибо, что откликнулись';
      }
    }
  }

  function bind() {
    var btns = document.querySelectorAll('.metoo-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var id = this.getAttribute('data-metoo-id');
        if (hasClicked(id)) return;
        remember(id);
        this.classList.add('done');
        this.disabled = true;
        var lbl = this.querySelector('.metoo-btn-label');
        if (lbl) lbl.textContent = 'И у вас так — спасибо, что откликнулись';
        renderCounts();
      });
    }
  }

  function init() {
    renderCounts();
    syncButtons();
    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
