/* Mediciones Clínicas — simuladores de ruido/filtros y calibración/estadística */
(function () {
  'use strict';

  var FONT = '"Segoe UI", system-ui, -apple-system, Arial, sans-serif';

  /* ---- Cambio de pestañas ---- */
  window.mcSwitchSimTab = function (name) {
    var panels = { noise: 'panelNoise', calib: 'panelCalib', monitor: 'panelMonitor' };
    var buttons = { noise: 'tabBtnNoise', calib: 'tabBtnCalib', monitor: 'tabBtnMonitor' };
    Object.keys(panels).forEach(function (key) {
      var panel = document.getElementById(panels[key]);
      var btn = document.getElementById(buttons[key]);
      if (panel) { panel.classList.toggle('active', key === name); }
      if (btn) { btn.classList.toggle('active', key === name); }
    });
    if (name === 'calib') { drawCalibChart(); }
    if (name === 'noise') { drawNoiseChart(); }
    /* El monitor vive en su propio módulo: se entera del cambio por este evento. */
    document.dispatchEvent(new CustomEvent('mc:simtab', { detail: { tab: name } }));
  };

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v && v.trim() ? v.trim() : fallback;
  }

  function fitCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: rect.width, height: rect.height };
  }

  /* ---- Motor de gráficas ----
     cfg = { xMin, xMax, yMin, yMax, xTicks, yTicks, xFmt, yFmt,
             xLabel, yLabel, series: [{ data: [{x, y}], color, width, dash }] }
     Las series se recortan al área de trazado: una señal que excede el rango
     del eje desaparece por el borde en lugar de desbordar la tarjeta. */
  function drawChart(canvas, cfg) {
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, w = fit.width, h = fit.height;
    ctx.clearRect(0, 0, w, h);

    var textColor = cssVar('--text-mute', '#6b7a90');
    var gridColor = cssVar('--border', '#d9e1ec');

    var pad = { l: 54, r: 14, t: 14, b: 42 };
    var plotW = w - pad.l - pad.r;
    var plotH = h - pad.t - pad.b;
    if (plotW <= 10 || plotH <= 10) { return; }

    function xPix(x) { return pad.l + ((x - cfg.xMin) / (cfg.xMax - cfg.xMin)) * plotW; }
    function yPix(y) { return pad.t + (1 - (y - cfg.yMin) / (cfg.yMax - cfg.yMin)) * plotH; }

    ctx.font = '11px ' + FONT;
    ctx.lineWidth = 1;

    /* Rejilla horizontal y rótulos del eje Y */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    cfg.yTicks.forEach(function (v) {
      var y = Math.round(yPix(v)) + 0.5;
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + plotW, y);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.fillText(cfg.yFmt ? cfg.yFmt(v) : String(v), pad.l - 8, y);
    });

    /* Rejilla vertical y rótulos del eje X */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    cfg.xTicks.forEach(function (v) {
      var x = Math.round(xPix(v)) + 0.5;
      ctx.strokeStyle = gridColor;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + plotH);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.fillText(cfg.xFmt ? cfg.xFmt(v) : String(v), x, pad.t + plotH + 7);
    });

    /* Ejes */
    ctx.strokeStyle = textColor;
    ctx.beginPath();
    ctx.moveTo(Math.round(pad.l) + 0.5, pad.t);
    ctx.lineTo(Math.round(pad.l) + 0.5, Math.round(pad.t + plotH) + 0.5);
    ctx.lineTo(pad.l + plotW, Math.round(pad.t + plotH) + 0.5);
    ctx.stroke();

    /* Títulos de los ejes */
    ctx.fillStyle = textColor;
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(cfg.xLabel, pad.l + plotW / 2, h - 2);
    ctx.save();
    ctx.translate(11, pad.t + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText(cfg.yLabel, 0, 0);
    ctx.restore();

    /* Series, recortadas al área de trazado */
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, plotW, plotH);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    cfg.series.forEach(function (s) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      s.data.forEach(function (p, i) {
        var px = xPix(p.x), py = yPix(p.y);
        if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  /* ---- Panel 1: simulador de ruido y filtros (1.6 y 1.7) ---- */
  function genECG(t) {
    var cycle = t % 0.8;
    var ecg = 0;
    if (cycle > 0.1 && cycle < 0.15) { ecg = 0.15 * Math.sin((cycle - 0.1) * Math.PI / 0.05); }
    else if (cycle >= 0.2 && cycle < 0.22) { ecg = -0.2; }
    else if (cycle >= 0.22 && cycle < 0.26) { ecg = 1.8; }
    else if (cycle >= 0.26 && cycle < 0.28) { ecg = -0.5; }
    else if (cycle > 0.4 && cycle < 0.55) { ecg = 0.35 * Math.sin((cycle - 0.4) * Math.PI / 0.15); }
    return ecg;
  }

  function drawNoiseChart() {
    var canvas = document.getElementById('noiseCanvas');
    if (!canvas) { return; }

    var hasNoise = document.getElementById('simNoiseCheck').checked;
    var zeroDrift = parseFloat(document.getElementById('simZeroDrift').value);
    var sensDrift = parseFloat(document.getElementById('simSensDrift').value);
    document.getElementById('valZeroDrift').textContent = zeroDrift.toFixed(1) + ' mV';
    document.getElementById('valSensDrift').textContent = sensDrift.toFixed(1) + '×';

    var compTwisted = document.getElementById('compTwisted').checked;
    var compFilter = document.getElementById('compFilter').checked;
    var compFeedback = document.getElementById('compFeedback').checked;

    var steps = 150;
    var raw = [];
    var comp = [];
    var saturated = false;
    for (var i = 0; i < steps; i++) {
      var t = i * 0.01;
      var ecg = genECG(t);
      var noise = hasNoise ? 0.6 * Math.sin(2 * Math.PI * 60 * t) : 0;
      var alteredVal = (ecg * sensDrift) + zeroDrift + noise;
      raw.push({ x: t, y: alteredVal });

      var effNoise = compTwisted ? 0 : noise;
      var effGain = compFeedback ? 1.0 : sensDrift;
      var effOffset = compFilter ? 0 : zeroDrift;
      var compensatedVal = (ecg * effGain) + effOffset + effNoise;
      comp.push({ x: t, y: compensatedVal });

      if (alteredVal > 4 || alteredVal < -3 || compensatedVal > 4 || compensatedVal < -3) {
        saturated = true;
      }
    }

    drawChart(canvas, {
      xMin: 0, xMax: 1.49,
      yMin: -3, yMax: 4,
      xTicks: [0, 0.25, 0.5, 0.75, 1.0, 1.25],
      yTicks: [-3, -2, -1, 0, 1, 2, 3, 4],
      xFmt: function (v) { return v.toFixed(2); },
      yFmt: function (v) { return String(v); },
      xLabel: 'Tiempo (s)',
      yLabel: 'Voltaje (mV)',
      series: [
        { data: raw, color: '#e5484d', width: 1.4 },
        { data: comp, color: '#0e8f86', width: 2 }
      ]
    });

    var warn = document.getElementById('simSaturado');
    if (warn) { warn.style.display = saturated ? 'block' : 'none'; }
  }

  /* ---- Panel 2: curva de calibración (1.9) ---- */
  function drawCalibChart() {
    var canvas = document.getElementById('calibCanvas');
    if (!canvas) { return; }

    var xVals = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    function serie(fn) {
      return xVals.map(function (x) { return { x: x, y: fn(x) }; });
    }

    drawChart(canvas, {
      xMin: 0, xMax: 100,
      yMin: 0, yMax: 300,
      xTicks: [0, 20, 40, 60, 80, 100],
      yTicks: [0, 50, 100, 150, 200, 250, 300],
      xLabel: 'Entrada deseada (xd)',
      yLabel: 'Salida del instrumento (y)',
      series: [
        { data: serie(function (x) { return 2 * x + 5; }), color: '#0e8f86', width: 2.5 },
        { data: serie(function (x) { return 2 * x + 20; }), color: '#b4610d', width: 1.6, dash: [5, 4] },
        { data: serie(function (x) { return 2.8 * x + 5; }), color: '#e5484d', width: 1.6, dash: [3, 3] }
      ]
    });
  }

  /* ---- Calculadora de estadística descriptiva ---- */
  window.mcCalcStats = function () {
    var raw = document.getElementById('statsInput').value;
    var arr = raw.split(',').map(function (n) { return parseFloat(n.trim()); }).filter(function (n) { return !isNaN(n); });
    var out = document.getElementById('statsOutput');
    if (arr.length === 0) { out.innerHTML = ''; return; }

    var n = arr.length;
    var mean = arr.reduce(function (a, b) { return a + b; }, 0) / n;
    var variance = arr.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / (n - 1 || 1);
    var sd = Math.sqrt(variance);
    var sem = sd / Math.sqrt(n);
    var cv = (sd / mean) * 100;
    var gm = Math.pow(arr.reduce(function (a, b) { return a * b; }, 1), 1 / n);

    out.innerHTML =
      '<div class="calc-result"><strong>Media (x̄)</strong><span class="num">' + mean.toFixed(2) + '</span></div>' +
      '<div class="calc-result"><strong>Muestra (n)</strong><span class="num">' + n + '</span></div>' +
      '<div class="calc-result"><strong>Desv. estándar (s)</strong><span class="num">' + sd.toFixed(2) + '</span></div>' +
      '<div class="calc-result"><strong>Error estándar (SEM)</strong><span class="num">' + sem.toFixed(2) + '</span></div>' +
      '<div class="calc-result"><strong>Coef. de variación</strong><span class="num">' + cv.toFixed(1) + '%</span></div>' +
      '<div class="calc-result"><strong>Media geométrica</strong><span class="num">' + gm.toFixed(2) + '</span></div>';
  };

  /* ---- Calculadora de matriz diagnóstica ---- */
  window.mcCalcDiagnostic = function () {
    var tp = parseFloat(document.getElementById('diagTp').value) || 0;
    var fp = parseFloat(document.getElementById('diagFp').value) || 0;
    var fn = parseFloat(document.getElementById('diagFn').value) || 0;
    var tn = parseFloat(document.getElementById('diagTn').value) || 0;
    var total = tp + fp + fn + tn;
    var out = document.getElementById('diagOutput');
    if (total === 0) { out.innerHTML = ''; return; }

    var sensitivity = (tp / (tp + fn || 1)) * 100;
    var specificity = (tn / (tn + fp || 1)) * 100;
    var prevalence = ((tp + fn) / total) * 100;
    var ppv = (tp / (tp + fp || 1)) * 100;

    out.innerHTML =
      '<div class="calc-result"><strong>Sensibilidad</strong><span class="num">' + sensitivity.toFixed(1) + '%</span></div>' +
      '<div class="calc-result"><strong>Especificidad</strong><span class="num">' + specificity.toFixed(1) + '%</span></div>' +
      '<div class="calc-result"><strong>Prevalencia</strong><span class="num">' + prevalence.toFixed(1) + '%</span></div>' +
      '<div class="calc-result"><strong>Val. predictivo pos. (PPV)</strong><span class="num">' + ppv.toFixed(1) + '%</span></div>';
  };

  /* ---- Inicialización ---- */
  document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('noiseCanvas')) { return; }

    ['simNoiseCheck', 'compTwisted', 'compFilter', 'compFeedback'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', drawNoiseChart);
    });
    ['simZeroDrift', 'simSensDrift'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', drawNoiseChart);
    });

    mcCalcStats();
    mcCalcDiagnostic();
    drawNoiseChart();

    function redraw() {
      drawNoiseChart();
      if (document.getElementById('panelCalib').classList.contains('active')) { drawCalibChart(); }
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(redraw, 120);
    });

    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () { setTimeout(redraw, 10); });
    }
  });
})();
