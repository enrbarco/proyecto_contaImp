/* CONTAIMP · versión moderna — menú, enlace activo, barra que se oculta al bajar,
   aparición al hacer scroll y formulario. JS puro, sin dependencias. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var cleanup = [];
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanup.push(function () { target.removeEventListener(type, handler, options); });
  }

  /* Menú móvil */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('toggle');
  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  listen(toggle, 'click', function () { setOpen(!document.body.classList.contains('nav-open')); });
  listen(document, 'keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  $$('.nav__links a').forEach(function (a) { listen(a, 'click', function () { setOpen(false); }); });

  /* Barra: se oculta al bajar, reaparece al subir */
  var last = window.pageYOffset, ticking = false;
  listen(window, 'scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      var open = document.body.classList.contains('nav-open');
      nav.classList.toggle('is-hidden', y > last && y > 240 && !open);
      last = y;
      ticking = false;
    });
  }, { passive: true });

  /* Enlace activo */
  var links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    var secs = links.map(function (a) { return document.getElementById(a.hash.slice(1)); });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.hash === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (s) { if (s) spy.observe(s); });
    cleanup.push(function () { spy.disconnect(); });

    /* Aparición suave */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
    cleanup.push(function () { io.disconnect(); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* Formulario */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = form.querySelector('.form-status');
    listen(form, 'submit', function (e) {
      e.preventDefault();
      // TODO: enviar con fetch() a un servicio de correo (Formspree, backend propio...).
      status.textContent = 'Formulario de ejemplo: falta conectar el envío de correo.';
    });
  }

  window.__contaimpLandingCleanup = function () {
    cleanup.splice(0).forEach(function (dispose) { dispose(); });
    document.body.classList.remove('nav-open');
    root.classList.remove('js');
    delete window.__contaimpLandingCleanup;
  };
})();
