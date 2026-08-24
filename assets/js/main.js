/* Mediciones Clínicas — interacciones comunes */
(function () {
  'use strict';

  /* ---- Tema claro / oscuro ---- */
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('mc-theme'); } catch (e) {}
  if (stored) {
    root.setAttribute('data-theme', stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }

  function syncThemeButton() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var btn = document.getElementById('themeBtn');
    if (btn) {
      btn.textContent = dark ? '☀' : '☾';
      btn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncThemeButton();

    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('mc-theme', next); } catch (e) {}
        syncThemeButton();
      });
    }

    /* ---- Menú responsivo ---- */
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
      });
      navLinks.addEventListener('click', function (ev) {
        if (ev.target.tagName === 'A') { navLinks.classList.remove('open'); }
      });
    }

    /* ---- Desplegable de capítulos ---- */
    var drop = document.querySelector('.nav-drop');
    var dropBtn = drop && drop.querySelector('.nav-drop-btn');
    if (drop && dropBtn) {
      var setDrop = function (open) {
        drop.classList.toggle('open', open);
        dropBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      dropBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        setDrop(!drop.classList.contains('open'));
      });
      document.addEventListener('click', function (ev) {
        if (!drop.contains(ev.target)) { setDrop(false); }
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' || ev.key === 'Esc') { setDrop(false); }
      });
    }

    /* ---- Botón "volver arriba" y barra de progreso ---- */
    var toTop = document.getElementById('toTop');
    var progress = document.getElementById('progress');
    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (toTop) { toTop.classList.toggle('show', y > 500); }
      if (progress) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---- Índice activo según la sección visible ---- */
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
    if (tocLinks.length) {
      var targets = tocLinks
        .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
        .filter(Boolean);

      var spy = function () {
        var pos = (window.scrollY || document.documentElement.scrollTop) + 120;
        var current = targets[0];
        targets.forEach(function (t) { if (t.offsetTop <= pos) { current = t; } });
        tocLinks.forEach(function (a) {
          a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id);
        });
      };
      window.addEventListener('scroll', spy, { passive: true });
      spy();
    }
  });
})();
