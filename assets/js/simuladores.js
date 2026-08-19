/* Mediciones Clínicas — simuladores de ruido/filtros y calibración/estadística */
(function () {
  'use strict';

  /* ---- Cambio de pestañas ---- */
  window.mcSwitchSimTab = function (name) {
    var panels = { noise: 'panelNoise', calib: 'panelCalib' };
    var buttons = { noise: 'tabBtnNoise', calib: 'tabBtnCalib' };
    Object.keys(panels).forEach(function (key) {
      var panel = document.getElementById(panels[key]);
      var btn = document.getElementById(buttons[key]);
      if (panel) { panel.classList.toggle('active', key === name); }
      if (btn) { btn.classList.toggle('active', key === name); }
    });
    if (name === 'calib') { drawCalibChart(); }
    if (name === 'noise') { drawNoiseChart(); }
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

  function drawAxes(ctx, w, h, pad, xLabel, yLabel, textColor, gridColor) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, pad.l + (w - pad.l - pad.r) / 2, h - 6);
    ctx.save();
    ctx.translate(12, pad.t + (h - pad.t - pad.b) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  /* ---- Panel 1: Simulador de ruido y filtros ---- */
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
    for (var i = 0; i < steps; i++) {
      var t = i * 0.01;
      var ecg = genECG(t);
      var noise = hasNoise ? 0.6 * Math.sin(2 * Math.PI * 60 * t) : 0;
      raw.push((ecg * sensDrift) + zeroDrift + noise);

      var effNoise = compTwisted ? 0 : noise;
      var effGain = compFeedback ? 1.0 : sensDrift;
      var effOffset = compFilter ? 0 : zeroDrift;
      comp.push((ecg * effGain) + effOffset + effNoise);
    }

    var textColor = cssVar('--text-mute', '#6b7a90');
    var gridColor = cssVar('--border', '#d9e1ec');
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, w = fit.width, h = fit.height;
    ctx.clearRect(0, 0, w, h);

    var pad = { l: 40, r: 12, t: 12, b: 26 };
    var yMin = -3, yMax = 4;
    var plotW = w - pad.l - pad.r;
    var plotH = h - pad.t - pad.b;

    function xPix(i) { return pad.l + (i / (steps - 1)) * plotW; }
    function yPix(v) { return pad.t + (1 - (v - yMin) / (yMax - yMin)) * plotH; }

    drawAxes(ctx, w, h, pad, 'Tiempo (s)', 'Voltaje (mV)', textColor, gridColor);

    ctx.strokeStyle = gridColor;
    ctx.setLineDash([2, 3]);
    [0, 1, 2, 3, -1, -2].forEach(function (v) {
      var y = yPix(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    function drawLine(data, color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      data.forEach(function (v, i) {
        var x = xPix(i), y = yPix(v);
        if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
    }

    drawLine(raw, '#e5484d', 1.4);
    drawLine(comp, '#0e8f86', 2);
  }

  /* ---- Panel 2: Calibración ---- */
  function drawCalibChart() {
    var canvas = document.getElementById('calibCanvas');
    if (!canvas) { return; }

    var xVals = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    var ideal = xVals.map(function (x) { return 2 * x + 5; });
    var zeroDrift = xVals.map(function (x) { return 2 * x + 20; });
    var sensDrift = xVals.map(function (x) { return 2.8 * x + 5; });

    var textColor = cssVar('--text-mute', '#6b7a90');
    var gridColor = cssVar('--border', '#d9e1ec');
    var fit = fitCanvas(canvas);
    var ctx = fit.ctx, w = fit.width, h = fit.height;
    ctx.clearRect(0, 0, w, h);

    var pad = { l: 46, r: 16, t: 14, b: 30 };
    var yMin = 0, yMax = 300;
    var plotW = w - pad.l - pad.r;
    var plotH = h - pad.t - pad.b;

    function xPix(x) { return pad.l + (x / 100) * plotW; }
    function yPix(y) { return pad.t + (1 - (y - yMin) / (yMax - yMin)) * plotH; }

    drawAxes(ctx, w, h, pad, 'Entrada deseada (xd)', 'Salida del instrumento (y)', textColor, gridColor);

    ctx.strokeStyle = gridColor;
    ctx.setLineDash([2, 3]);
    [50, 100, 150, 200, 250].forEach(function (v) {
      var y = yPix(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    function drawSeries(data, color, width, dash) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      xVals.forEach(function (x, i) {
        var px = xPix(x), py = yPix(data[i]);
        if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawSeries(ideal, '#0e8f86', 2.5);
    drawSeries(zeroDrift, '#b4610d', 1.6, [5, 4]);
    drawSeries(sensDrift, '#e5484d', 1.6, [3, 3]);
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

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        drawNoiseChart();
        if (document.getElementById('panelCalib').classList.contains('active')) { drawCalibChart(); }
      }, 120);
    });

    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        setTimeout(function () {
          drawNoiseChart();
          if (document.getElementById('panelCalib').classList.contains('active')) { drawCalibChart(); }
        }, 10);
      });
    }
  });
})();
