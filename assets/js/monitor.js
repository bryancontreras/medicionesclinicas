/* Mediciones Clínicas — monitor de signos vitales
   Entradas deseada, interferente y modificadora sobre un ECG y un pletismograma
   sintéticos (secciones 1.6 y 1.7). */
(function () {
  'use strict';

  var root = document.getElementById('panelMonitor');
  if (!root) { return; }

  /* ---------------- estado ---------------- */
  var S = { d: true, i: false, m: false, hr: 72 };

  /* ---------------- utilidades ---------------- */
  var TAU = Math.PI * 2;
  function gauss(x, mu, s) { return Math.exp(-Math.pow(x - mu, 2) / (2 * s * s)); }
  function hash(n) { var v = Math.sin(n * 127.1) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; }
  function vnoise(t, seed) {              // ruido de valor suavizado
    var x = t * seed, i = Math.floor(x), f = x - i;
    var a = hash(i + seed * 13), b = hash(i + 1 + seed * 13);
    var u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  }
  /* El % de JavaScript conserva el signo del dividendo: con tiempos negativos
     devolvería una fase negativa y el latido se perdería. */
  function mod(a, n) { return ((a % n) + n) % n; }

  /* ---------------- señales ---------------- */
  function ecgDeseada(t) {
    var T = 60 / S.hr;
    var s = Math.min(1.2, Math.max(0.6, T / 0.8333));
    var p = mod(t, T);
    return 0.12 * gauss(p, 0.145 * s, 0.024 * s)    // P
         - 0.09 * gauss(p, 0.228 * s, 0.009 * s)    // Q
         + 1.00 * gauss(p, 0.252 * s, 0.011 * s)    // R
         - 0.24 * gauss(p, 0.280 * s, 0.012 * s)    // S
         + 0.26 * gauss(p, 0.405 * s, 0.044 * s);   // T
  }
  function plethDeseada(t) {
    var T = 60 / S.hr;
    var p = mod(t, T) / T;
    return 1.00 * gauss(p, 0.17, 0.075)   // pico sistólico
         + 0.40 * gauss(p, 0.39, 0.055)   // muesca dícrota
         + 0.16 * gauss(p, 0.60, 0.120)
         - 0.16;
  }
  function ecgInterferente(t) {
    var linea  = 0.155 * Math.sin(TAU * 60 * t);   // red eléctrica
    var emg    = 0.045 * vnoise(t, 220);           // músculo
    var deriva = 0.30 * Math.sin(TAU * 0.26 * t);  // respiración y cable
    return linea + emg + deriva;
  }
  function plethInterferente(t) {
    var rafaga = Math.max(0, vnoise(t, 0.9));      // movimiento del dedo
    var mov    = rafaga * (0.55 * vnoise(t, 5.5) + 0.30 * vnoise(t, 17));
    var luz    = 0.07 * Math.sin(TAU * 120 * t);   // lámpara fluorescente
    return mov + luz;
  }
  function ganancia(t) { return 0.52 + 0.13 * Math.sin(TAU * 0.075 * t); }    // deriva térmica
  function offsetMod(t) { return -0.11 - 0.05 * Math.sin(TAU * 0.031 * t); }  // corrimiento de cero

  function ecgTotal(t) {
    var G = S.m ? ganancia(t) : 1;
    var O = S.m ? offsetMod(t) : 0;
    return G * ((S.d ? ecgDeseada(t) : 0) + (S.i ? ecgInterferente(t) : 0)) + O;
  }
  function plethTotal(t) {
    var G = S.m ? 0.34 + 0.06 * Math.sin(TAU * 0.06 * t) : 1;
    var O = S.m ? 0.16 : 0;
    return G * ((S.d ? plethDeseada(t) : 0) + (S.i ? plethInterferente(t) : 0)) + O;
  }

  /* ---------------- motor de trazo (barrido tipo monitor) ---------------- */
  var SUB = 7;            // submuestras por pixel: deja ver los 60 Hz
  var traces = [];

  function addTrace(id, cfg) {
    var canvas = document.getElementById(id);
    if (!canvas) { return; }
    var tr = { canvas: canvas, ctx: canvas.getContext('2d'), x: 0, py: null,
               speed: 110, lw: 1.7, mid: 0.5, amp: 0.32, glow: false };
    Object.keys(cfg).forEach(function (k) { tr[k] = cfg[k]; });
    traces.push(tr);
    sizeTrace(tr);
  }
  function sizeTrace(tr) {
    var dpr = window.devicePixelRatio || 1;
    var r = tr.canvas.getBoundingClientRect();
    tr.w = Math.max(1, r.width);
    tr.h = Math.max(1, r.height);
    tr.canvas.width = Math.round(tr.w * dpr);
    tr.canvas.height = Math.round(tr.h * dpr);
    tr.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tr.ctx.clearRect(0, 0, tr.w, tr.h);
    tr.x = 0;
    tr.py = null;
  }
  function toY(tr, v) {
    var y = tr.h * tr.mid - v * tr.h * tr.amp;
    return Math.min(tr.h - 1.5, Math.max(1.5, y));
  }
  function step(tr, t0, dt) {
    var ctx = tr.ctx, adv = tr.speed * dt;
    if (adv <= 0) { return; }
    var n = Math.max(2, Math.ceil(adv * SUB));
    var x0 = tr.x;
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (tr.glow) { ctx.shadowBlur = 7; ctx.shadowColor = tr.color; } else { ctx.shadowBlur = 0; }
    ctx.beginPath();
    var wrapped = false, first = true;
    for (var k = 1; k <= n; k++) {
      var f = k / n;
      var x = x0 + adv * f;
      var jump = false;
      if (x >= tr.w) { x -= tr.w; if (!wrapped) { wrapped = true; jump = true; } }
      var y = toY(tr, tr.fn(t0 + dt * f));
      if (first || jump || tr.py === null) {
        ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); first = false;
      } else {
        ctx.lineTo(x, y);
      }
      tr.py = y;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    tr.x = (x0 + adv) % tr.w;
    var ew = Math.max(9, adv + 7), ex = tr.x + 2.5;
    ctx.clearRect(ex, 0, ew, tr.h);
    if (ex + ew > tr.w) { ctx.clearRect(0, 0, ex + ew - tr.w, tr.h); }
  }

  addTrace('monEcg',   { color: '#3dff9e', fn: ecgTotal,   mid: 0.62, amp: 0.42, glow: true });
  addTrace('monPleth', { color: '#4fd8ff', fn: plethTotal, mid: 0.60, amp: 0.34, glow: true });
  addTrace('monScopeD', { color: '#3dff9e', speed: 70, lw: 1.3, mid: 0.62, amp: 0.34, fn: ecgDeseada });
  addTrace('monScopeI', { color: '#ffb020', speed: 70, lw: 1.1, mid: 0.50, amp: 0.60,
                          fn: function (t) { return ecgInterferente(t) * 0.9; } });
  addTrace('monScopeM', { color: '#c58bff', speed: 70, lw: 1.4, mid: 0.72, amp: 0.62, fn: ganancia });

  /* ---------------- bucle de animación ----------------
     Solo corre con la pestaña del monitor visible: evita dibujar sobre
     lienzos de tamaño cero y no consume CPU en las otras pestañas. */
  var simT = 0, last = 0, rafId = null;

  function visible() {
    return root.classList.contains('active') && document.visibilityState === 'visible';
  }
  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.06) { dt = 0.06; }
    if (dt < 0) { dt = 0; }
    simT += dt;
    for (var i = 0; i < traces.length; i++) { step(traces[i], simT - dt, dt); }
    rafId = requestAnimationFrame(frame);
  }
  /* Dibuja de golpe la pantalla anterior al instante actual, para que al abrir
     la pestaña el monitor aparezca ya trazando en lugar de tardar un barrido
     completo en llenarse. Cada trazo cubre su propia ventana y termina en simT,
     así todos quedan alineados en el tiempo. */
  function prime(tr) {
    var dt = 1 / 240;
    var span = tr.w / tr.speed;
    for (var t = simT - span; t < simT; t += dt) { step(tr, t, dt); }
  }
  function start() {
    if (rafId !== null) { return; }
    traces.forEach(function (tr) { sizeTrace(tr); prime(tr); });
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    if (rafId === null) { return; }
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  function sync() { if (visible()) { start(); } else { stop(); } }

  /* ---------------- lecturas numéricas ---------------- */
  var vHr = document.getElementById('monVHr');
  var vSpo2 = document.getElementById('monVSpo2');
  var vPi = document.getElementById('monVPi');
  var statusEl = document.getElementById('monStatus');
  var clockEl = document.getElementById('monClock');

  function setVal(el, txt, cls) {
    el.textContent = txt;
    el.className = 'mon-read-value' + (cls ? ' ' + cls : '');
  }
  function updateNumbers() {
    if (!S.d) {
      setVal(vHr, '--', 'is-flat');
      setVal(vSpo2, '--', 'is-flat');
      setVal(vPi, '--', 'is-flat');
      return;
    }
    // FC: la interferente provoca errores erráticos por falsos QRS
    var hr = S.hr, hrCls = '';
    if (S.i && Math.random() < 0.45) {
      hr = Math.round(S.hr * (1.4 + Math.random() * 0.6));
      hrCls = 'is-bad';
    }
    setVal(vHr, String(hr), hrCls);

    // SpO2: la modificadora produce un sesgo sistemático
    var sp = 98, spCls = '';
    if (S.m) { sp = 91 + Math.round(Math.sin(simT * 0.4)); spCls = 'is-bad'; }
    if (S.i) { sp = Math.random() < 0.35 ? 0 : sp + Math.round((Math.random() - 0.5) * 8); spCls = 'is-bad'; }
    setVal(vSpo2, sp === 0 ? '- -' : String(Math.min(100, Math.max(70, sp))), spCls);

    // Índice de perfusión
    var pi = 4.2;
    if (S.m) { pi = 0.4; }
    if (S.i) { pi = Math.max(0.2, pi + (Math.random() - 0.5) * 3); }
    setVal(vPi, pi.toFixed(1), (S.m || S.i) ? 'is-bad' : '');
  }
  function updateStatus() {
    var chips = [];
    if (!S.d) { chips.push(['is-alarm', 'sin señal · revisar sensor']); }
    else if (!S.i && !S.m) { chips.push(['is-ok', 'señal limpia · lectura confiable']); }
    if (S.i) { chips.push(['is-warn', 'artefacto 60 Hz + movimiento']); }
    if (S.m) { chips.push(['is-warn', 'ganancia fuera de calibración']); }
    if (S.m && !S.i) { chips.push(['is-alarm', 'trazo limpio, valor sesgado']); }
    statusEl.innerHTML = chips.map(function (c) {
      return '<span class="mon-chip ' + c[0] + '">' + c[1] + '</span>';
    }).join('');
  }

  setInterval(function () { if (visible()) { updateNumbers(); } }, 700);
  setInterval(function () {
    if (visible()) { clockEl.textContent = new Date().toTimeString().slice(0, 8); }
  }, 1000);

  /* ---------------- diagrama de bloques ---------------- */
  function toggle(id, cls, on) {
    var el = document.getElementById(id);
    if (el) { el.classList.toggle(cls, on); }
  }
  function updateChain() {
    toggle('monGSensor', 'mon-dim', !S.d);
    toggle('monWA', 'mon-dim', !S.d);
    toggle('monWA', 'is-live', S.d);
    toggle('monWA', 'mon-flow', S.d);
    toggle('monWB', 'is-live', S.d || S.i);
    toggle('monWB', 'mon-dim', !S.d && !S.i);
    toggle('monWC', 'is-live', S.d || S.i);
    toggle('monWC', 'mon-dim', !S.d && !S.i);
    toggle('monWIn', 'mon-dim', !S.i);
    toggle('monWIn', 'mon-flow', S.i);
    toggle('monWMod', 'mon-dim', !S.m);
    toggle('monWMod', 'mon-flow', S.m);
    document.getElementById('monTIn').style.opacity = S.i ? 1 : 0.28;
    document.getElementById('monTMod').style.opacity = S.m ? 1 : 0.28;
    document.getElementById('monGAmp').style.filter = S.m ? 'drop-shadow(0 0 8px #c58bff)' : 'none';
    document.getElementById('monGSum').style.filter = S.i ? 'drop-shadow(0 0 8px #ffb020)' : 'none';
  }

  /* ---------------- interruptores ---------------- */
  function bind(id, key) {
    var input = document.getElementById(id);
    var card = input.closest('.mon-sw');
    function apply() {
      S[key] = input.checked;
      card.dataset.on = input.checked ? '1' : '0';
      updateNumbers();
      updateStatus();
      updateChain();
    }
    input.addEventListener('change', apply);
    apply();
  }
  bind('monSwD', 'd');
  bind('monSwI', 'i');
  bind('monSwM', 'm');

  var hrIn = document.getElementById('monHr');
  var hrOut = document.getElementById('monHrOut');
  hrIn.addEventListener('input', function () {
    S.hr = +hrIn.value;
    hrOut.textContent = S.hr + ' lpm';
    updateNumbers();
  });

  /* ---------------- ciclo de vida ---------------- */
  document.addEventListener('mc:simtab', sync);
  document.addEventListener('visibilitychange', sync);

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (visible()) { traces.forEach(sizeTrace); } }, 120);
  });

  sync();
})();
