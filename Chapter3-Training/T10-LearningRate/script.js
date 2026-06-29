(function () {
  'use strict';

  var guide = window.T10_GUIDE;
  var scenes = guide.scenes;
  var helpers = guide.helpers;
  var lrCfg = guide.lr;
  var mlpCfg = guide.mlp;
  var valleyCfg = guide.valley;
  var previewCards = guide.previewCards;

  var state = {
    scene: 0,
    maxScene: 0,
    previewClicks: {},
    s1Done: false,
    s2Lr: lrCfg.defaults.scene1,
    s2W: 2.4,
    s2LrDrags: 0,
    s2StepCount: 0,
    s2EverStepped: false,
    smallTrail: [],
    smallLosses: [],
    s3Done: false,
    goodTrail: [],
    goodLosses: [],
    s4Done: false,
    bigTrail: [],
    bigLosses: [],
    s5Done: false,
    hugeTrail: [],
    hugeLosses: [],
    s6Done: false,
    s7Theta: mlpCfg.init.slice(),
    s7Lr: lrCfg.defaults.mlpDefault,
    s7LossHistory: [helpers.mlpLoss(mlpCfg.init.slice())],
    s7StepCount: 0,
    s7LrTries: {},
    s7BurstActive: false,
    s7BurstToken: 0,
    s7BurstDone: false,
    s7Done: false,
    autoSceneRuns: {},
    feedback: {}
  };

  var defaultFeedback = [
    'Open all preview cards, then move to the learning-rate scene.',
    'Drag the eta slider a few times and take one step to compare step size.',
    'Use a tiny eta and watch how slowly the path moves toward the valley floor.',
    'Use a well-sized eta and compare the faster, smoother descent.',
    'Use a larger eta and notice the oscillation around the optimum.',
    'Use an oversized eta and watch the loss diverge.',
    'Try at least 3 eta values, then run the 20-step burst in the MLP demo.'
  ];

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var scenePager = document.getElementById('scenePager');
  var sceneBuilders = null;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') node.className = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else if (key === 'html') node.innerHTML = attrs[key];
        else if (key === 'style') node.setAttribute('style', attrs[key]);
        else if (key === 'disabled' || key === 'type' || key === 'href' || key === 'role' || key === 'aria-label' || key === 'aria-current' || key.indexOf('data-') === 0) node.setAttribute(key, attrs[key]);
        else node[key] = attrs[key];
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (child) node.appendChild(child);
      });
    }
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        node.setAttribute(key, attrs[key]);
      });
    }
    return node;
  }

  function setTracking(node, id, clickName, props) {
    node.setAttribute('data-tr-id', id);
    if (clickName) node.setAttribute('data-tr-click', clickName);
    if (props) node.setAttribute('data-tr-props', JSON.stringify(props));
    return node;
  }

  function feedbackFor(idx) {
    return state.feedback[idx] || { text: defaultFeedback[idx], tone: '' };
  }

  function setFeedback(idx, text, tone) {
    state.feedback[idx] = { text: text, tone: tone || '' };
    var bar = document.querySelector('[data-feedback-for="' + idx + '"]');
    if (!bar) return;
    bar.textContent = text;
    bar.className = 't10-feedback' + (tone ? ' tone-' + tone : '');
  }

  function reduceMotionPreferred() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function clampValleyW(w) {
    return Math.max(-3.2, Math.min(3.2, w));
  }

  function cancelAutoSceneRun(idx) {
    if (idx >= 2 && idx <= 5) {
      state.autoSceneRuns[idx] = (state.autoSceneRuns[idx] || 0) + 1;
    }
  }

  function triedMlpLrCount() {
    return Object.keys(state.s7LrTries).length;
  }

  function sceneReady(idx) {
    if (idx === 0) return state.s1Done;
    if (idx === 1) return state.s2EverStepped && state.s2LrDrags >= 3 && state.s2StepCount >= 1;
    if (idx === 2) return state.s3Done;
    if (idx === 3) return state.s4Done;
    if (idx === 4) return state.s5Done;
    if (idx === 5) return state.s6Done;
    if (idx === 6) return state.s7Done;
    return false;
  }

  function canEnter(idx) {
    if (idx === 0) return true;
    return sceneReady(idx - 1) || idx <= state.maxScene;
  }

  function sceneStatusLabel(idx) {
    if (!canEnter(idx)) return 'locked';
    if (sceneReady(idx)) return 'done';
    if (state.scene === idx) return 'current';
    return 'unlocked';
  }

  function goToScene(idx) {
    if (!canEnter(idx)) return;
    var target = '#/scene/' + (idx + 1);
    if (location.hash !== target) location.hash = target;
    else showScene(idx);
  }

  function showScene(idx, options) {
    options = options || {};
    if (!sceneBuilders) return;
    if (!canEnter(idx)) idx = Math.min(state.maxScene, sceneBuilders.length - 1);
    if (state.scene !== idx) {
      cancelAutoSceneRun(state.scene);
      if (state.scene === 6) state.s7BurstToken += 1;
      state.s7BurstActive = false;
    }
    state.scene = idx;
    state.maxScene = Math.max(state.maxScene, idx);
    sceneStack.innerHTML = '';
    sceneStack.appendChild(sceneBuilders[idx]());
    renderProgress();
    renderPager();
    if (!options.skipScroll) {
      window.scrollTo({ top: 0, behavior: reduceMotionPreferred() ? 'auto' : 'smooth' });
    }
  }

  function sceneFromHash() {
    var match = (location.hash || '').match(/#\/scene\/(\d+)/);
    if (!match) return 0;
    var idx = parseInt(match[1], 10) - 1;
    if (isNaN(idx)) return 0;
    return Math.max(0, Math.min(scenes.length - 1, idx));
  }

  function renderProgress() {
    progressNav.innerHTML = '';
    scenes.forEach(function (scene, idx) {
      var btn = el('a', { href: '#/scene/' + (idx + 1), text: (idx + 1) + ' | ' + scene.pill });
      btn.setAttribute('aria-label', 'Scene ' + (idx + 1) + ': ' + scene.pill + ' (' + sceneStatusLabel(idx) + ')');
      btn.classList.toggle('is-active', state.scene === idx);
      btn.classList.toggle('is-done', sceneReady(idx));
      if (state.scene === idx) btn.setAttribute('aria-current', 'step');
      if (!canEnter(idx)) {
        btn.classList.add('is-locked');
        btn.setAttribute('aria-disabled', 'true');
      }
      setTracking(btn, 't10_progress_step_' + (idx + 1), 'progress_jump', { scene: idx + 1 });
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        goToScene(idx);
      });
      progressNav.appendChild(btn);
    });
  }

  function renderPager() {
    if (!scenePager) return;
    scenePager.innerHTML = '';
    var idx = state.scene;
    var prevIdx = idx - 1;
    var nextIdx = idx + 1;

    var prevBtn = el('button', { class: 't10-pager-btn ghost', type: 'button', text: 'Prev' });
    if (prevIdx < 0) prevBtn.setAttribute('disabled', 'disabled');
    else prevBtn.addEventListener('click', function () { goToScene(prevIdx); });
    setTracking(prevBtn, 't10_pager_prev', 'pager_prev', { scene: idx + 1 });

    var counter = el('span', {
      class: 't10-pager-counter',
      text: (idx + 1) + ' / ' + scenes.length + ' | ' + scenes[idx].pill
    });

    var nextBtn = el('button', { class: 't10-pager-btn primary', type: 'button', text: 'Next' });
    if (nextIdx >= scenes.length) nextBtn.setAttribute('disabled', 'disabled');
    else if (!canEnter(nextIdx)) {
      nextBtn.setAttribute('disabled', 'disabled');
      nextBtn.title = 'Finish this scene first';
    } else nextBtn.addEventListener('click', function () { goToScene(nextIdx); });
    setTracking(nextBtn, 't10_pager_next', 'pager_next', { scene: idx + 1 });

    scenePager.appendChild(prevBtn);
    scenePager.appendChild(counter);
    scenePager.appendChild(nextBtn);
  }

  function sceneHead(idx) {
    var scene = scenes[idx];
    var head = el('div', { class: 't10-scene-head' });
    var left = el('div', null, [
      el('span', { class: 'pill', text: scene.pill }),
      el('h2', { text: scene.title }),
      el('p', { class: 't10-goal', text: scene.goal }),
      el('p', { class: 't10-concept', text: scene.concept })
    ]);
    var tasks = el('ul', { class: 't10-tasks' });
    scene.tasks.forEach(function (task) {
      tasks.appendChild(el('li', { text: task }));
    });
    left.appendChild(tasks);
    head.appendChild(left);
    head.appendChild(el('div', null, [el('div', { class: 'tag', text: scene.tag })]));
    return head;
  }

  function feedbackBar(idx) {
    var fb = feedbackFor(idx);
    return el('div', {
      class: 't10-feedback' + (fb.tone ? ' tone-' + fb.tone : ''),
      text: fb.text,
      'data-feedback-for': idx
    });
  }

  function makeValleySvg() {
    var W = 640;
    var H = 280;
    var mL = 44;
    var mR = 24;
    var mT = 18;
    var mB = 36;
    var iw = W - mL - mR;
    var ih = H - mT - mB;
    var wMin = valleyCfg.wMin;
    var wMax = valleyCfg.wMax;
    var lossMax = valleyCfg.lossMax;

    function xOf(w) { return mL + (w - wMin) / (wMax - wMin) * iw; }
    function yOf(loss) { return mT + (1 - Math.min(loss, lossMax) / lossMax) * ih; }

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });
    var defs = svg('defs');

    function marker(id, color) {
      var mk = svg('marker', {
        id: id,
        viewBox: '0 0 12 12',
        refX: '9',
        refY: '6',
        markerWidth: '8',
        markerHeight: '8',
        orient: 'auto-start-reverse'
      });
      mk.appendChild(svg('path', { d: 'M0,0 L12,6 L0,12 Z', fill: color }));
      return mk;
    }

    defs.appendChild(marker('t10-arrow-grad-head', '#7c3aed'));
    defs.appendChild(marker('t10-arrow-update-head', '#16a34a'));
    root.appendChild(defs);

    root.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + (mT + ih) + ' L' + (mL + iw) + ',' + (mT + ih) }));
    root.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + mT + ' L' + mL + ',' + (mT + ih) }));

    [-3, -2, -1, 0, 1, 2, 3].forEach(function (tick) {
      var x = xOf(tick);
      root.appendChild(svg('line', { class: 't10-tick', x1: x, x2: x, y1: mT + ih, y2: mT + ih + 4 }));
      var text = svg('text', { class: 't10-text', x: x, y: mT + ih + 16, 'text-anchor': 'middle' });
      text.textContent = String(tick);
      root.appendChild(text);
    });

    var xLabel = svg('text', { class: 't10-text bold', x: mL + iw, y: mT + ih + 30, 'text-anchor': 'end' });
    xLabel.textContent = 'w';
    root.appendChild(xLabel);

    var yLabel = svg('text', { class: 't10-text bold', x: mL + 4, y: mT - 4, 'text-anchor': 'start' });
    yLabel.textContent = 'Loss';
    root.appendChild(yLabel);

    var path = '';
    var samples = 80;
    for (var i = 0; i <= samples; i++) {
      var w = wMin + (wMax - wMin) * i / samples;
      path += (i === 0 ? 'M' : 'L') + xOf(w).toFixed(2) + ',' + yOf(helpers.loss(w)).toFixed(2) + ' ';
    }
    root.appendChild(svg('path', { class: 't10-valley-curve', d: path }));

    root.appendChild(svg('circle', {
      class: 't10-target-ring',
      cx: xOf(valleyCfg.wStar),
      cy: yOf(0),
      r: 9
    }));
    var star = svg('text', { class: 't10-text', x: xOf(valleyCfg.wStar), y: yOf(0) + 24, 'text-anchor': 'middle' });
    star.textContent = 'w* = 0';
    root.appendChild(star);

    return { root: root, xOf: xOf, yOf: yOf };
  }

  function makeLossChart(opts) {
    opts = opts || {};
    var W = 540;
    var H = 220;
    var mL = 44;
    var mR = 18;
    var mT = 16;
    var mB = 30;
    var iw = W - mL - mR;
    var ih = H - mT - mB;
    var maxSteps = opts.maxSteps || 30;
    var lossMax = opts.lossMax || valleyCfg.lossMax;

    function xOf(step) { return mL + (step / Math.max(1, maxSteps - 1)) * iw; }
    function yOf(loss) {
      var value = Math.min(loss, lossMax * 1.2);
      return mT + (1 - Math.min(1, value / lossMax)) * ih;
    }

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });
    root.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + (mT + ih) + ' L' + (mL + iw) + ',' + (mT + ih) }));
    root.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + mT + ' L' + mL + ',' + (mT + ih) }));

    var xLabel = svg('text', { class: 't10-text bold', x: mL + iw, y: mT + ih + 22, 'text-anchor': 'end' });
    xLabel.textContent = 'step';
    root.appendChild(xLabel);
    var yLabel = svg('text', { class: 't10-text bold', x: mL + 4, y: mT - 4, 'text-anchor': 'start' });
    yLabel.textContent = 'Loss';
    root.appendChild(yLabel);

    [0.25, 0.5, 0.75].forEach(function (frac) {
      var y = mT + frac * ih;
      root.appendChild(svg('line', { class: 't10-tick', x1: mL, x2: mL + iw, y1: y, y2: y, 'stroke-dasharray': '3 5' }));
    });

    return { root: root, xOf: xOf, yOf: yOf };
  }

  function drawLossLine(chart, losses, klass) {
    if (!losses.length) return null;
    var path = '';
    losses.forEach(function (value, idx) {
      path += (idx === 0 ? 'M' : 'L') + chart.xOf(idx).toFixed(2) + ',' + chart.yOf(value).toFixed(2) + ' ';
    });
    return svg('path', { class: 't10-chart-line' + (klass ? ' ' + klass : ''), d: path });
  }

  function buildScene0() {
    var wrap = el('section', { class: 't10-scene', 'data-scene-index': 0 });
    wrap.appendChild(sceneHead(0));

    var cards = el('div', { class: 't10-preview-cards' });
    previewCards.forEach(function (cardData) {
      var card = el('button', {
        class: 't10-preview-card ' + cardData.zone,
        type: 'button',
        'data-key': cardData.key
      });
      card.appendChild(el('div', { class: 'ph', text: cardData.emoji }));
      card.appendChild(el('div', { class: 'pt', text: cardData.title }));
      card.appendChild(el('div', { class: 'pc', text: cardData.copy }));
      if (state.previewClicks[cardData.key]) card.classList.add('is-active');
      setTracking(card, 't10_scene0_preview_' + cardData.key, 'preview_click', { key: cardData.key });
      card.addEventListener('click', function () {
        state.previewClicks[cardData.key] = true;
        card.classList.add('is-active');
        refreshFormula();
        if (Object.keys(state.previewClicks).length >= previewCards.length) {
          nextBtn.removeAttribute('disabled');
          setFeedback(0, 'All three preview paths are now unlocked. Eta is the step-size knob.', 'good');
          renderProgress();
          renderPager();
        } else {
          setFeedback(0, 'Keep comparing the other cards: tiny eta is slow, huge eta can overshoot.', 'grad');
        }
      });
      cards.appendChild(card);
    });
    wrap.appendChild(cards);

    var panel = el('div', { class: 't10-panel' });
    panel.appendChild(el('h3', { text: 'Parameter update rule' }));
    var formula = el('div', { class: 't10-formula' });
    panel.appendChild(formula);

    function refreshFormula() {
      var complete = Object.keys(state.previewClicks).length >= previewCards.length;
      if (complete) {
        formula.innerHTML = '<span class="var">w</span><sub>new</sub> = <span class="var">w</span><sub>old</sub> - <span class="lr">eta</span> * <span class="grad">dL/dw</span>';
      } else {
        formula.innerHTML = '<span class="var">w</span><sub>new</sub> = <span class="var">w</span><sub>old</sub> - <span class="blank">?</span> * <span class="grad">dL/dw</span>';
      }
    }

    refreshFormula();
    panel.appendChild(el('p', {
      class: 't10-concept',
      text: 'Gradient chooses direction. Learning rate chooses how far the update moves.'
    }));

    var actions = el('div', { class: 't10-actions-row' });
    var nextBtn = setTracking(el('button', {
      class: 't10-action primary',
      type: 'button',
      text: 'Start eta hunt',
      disabled: 'disabled'
    }), 't10_scene0_next', 'scene_next');
    if (state.s1Done || Object.keys(state.previewClicks).length >= previewCards.length) {
      nextBtn.removeAttribute('disabled');
    }
    nextBtn.addEventListener('click', function () {
      state.s1Done = true;
      renderProgress();
      renderPager();
      goToScene(1);
    });
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);
    wrap.appendChild(feedbackBar(0));

    return wrap;
  }

  function buildScene1() {
    var wrap = el('section', { class: 't10-scene', 'data-scene-index': 1 });
    wrap.appendChild(sceneHead(1));

    var valleyBox = el('div', { class: 't10-valley' });
    var valley = makeValleySvg();
    valleyBox.appendChild(valley.root);
    wrap.appendChild(valleyBox);

    var ball = svg('circle', {
      class: 't10-ball',
      cx: valley.xOf(state.s2W),
      cy: valley.yOf(helpers.loss(state.s2W)),
      r: 9
    });
    var gradArrow = svg('line', { class: 't10-arrow-grad', x1: 0, y1: 0, x2: 0, y2: 0, opacity: 0 });
    var updateArrow = svg('line', { class: 't10-arrow-update', x1: 0, y1: 0, x2: 0, y2: 0, opacity: 0 });
    valley.root.appendChild(ball);
    valley.root.appendChild(gradArrow);
    valley.root.appendChild(updateArrow);

    var panel = el('div', { class: 't10-panel' });
    panel.appendChild(el('h3', { text: 'Learning-rate controller' }));

    var control = el('div', { class: 't10-lr-control' });
    var head = el('div', { class: 'head' });
    head.appendChild(el('div', { class: 'name', text: 'eta' }));
    var lrValue = el('div', { class: 't10-lr-value', text: state.s2Lr.toFixed(3) });
    head.appendChild(lrValue);
    control.appendChild(head);

    var slider = el('input', {
      type: 'range',
      class: 't10-lr-range',
      min: '0',
      max: String(lrCfg.grid.length - 1),
      step: '1',
      value: String(Math.max(0, lrCfg.grid.indexOf(state.s2Lr)))
    });
    control.appendChild(slider);

    var marks = el('div', { class: 't10-lr-marks' });
    ['0.001', '0.1', '0.6', '1.6'].forEach(function (mark) {
      marks.appendChild(el('span', { text: mark }));
    });
    control.appendChild(marks);

    var region = el('div', { class: 't10-lr-region' });
    control.appendChild(region);

    var preview = el('div', { class: 't10-step-preview' });
    var previewFill = el('div', { class: 't10-step-preview-fill', style: 'width: 12%' });
    preview.appendChild(previewFill);
    control.appendChild(preview);
    panel.appendChild(control);

    var card = el('div', { class: 't10-step-card' });
    function statCell(label, value, klass) {
      card.appendChild(el('div', { class: 'k', text: label }));
      card.appendChild(el('div', { class: 'v ' + (klass || ''), text: value }));
    }
    statCell('w current', state.s2W.toFixed(3));
    statCell('grad g', helpers.grad(state.s2W).toFixed(3), 'grad');
    statCell('eta * g', (state.s2Lr * helpers.grad(state.s2W)).toFixed(3), 'lr');
    statCell('Loss', helpers.loss(state.s2W).toFixed(3), 'loss');
    panel.appendChild(card);

    var actions = el('div', { class: 't10-actions-row' });
    var stepBtn = setTracking(el('button', { class: 't10-action primary', type: 'button', text: 'Step once' }), 't10_scene1_step', 'one_step');
    var resetBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'Reset ball' }), 't10_scene1_reset', 'reset_ball');
    var nextBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'Try tiny eta', disabled: 'disabled' }), 't10_scene1_next', 'scene_next');
    actions.appendChild(stepBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);
    wrap.appendChild(feedbackBar(1));

    function updateCard() {
      var cells = card.querySelectorAll('.v');
      cells[0].textContent = state.s2W.toFixed(3);
      cells[1].textContent = helpers.grad(state.s2W).toFixed(3);
      cells[2].textContent = (state.s2Lr * helpers.grad(state.s2W)).toFixed(3);
      cells[3].textContent = helpers.loss(state.s2W).toFixed(3);
    }

    function updateLrUi() {
      var zone = helpers.lrZone(state.s2Lr);
      region.textContent = zone.label;
      region.className = 't10-lr-region zone-' + zone.key;
      lrValue.textContent = state.s2Lr.toFixed(3);
      previewFill.style.width = Math.min(100, Math.max(6, (state.s2Lr / lrCfg.max) * 100)).toFixed(0) + '%';
    }

    function updateNextState() {
      if (state.s2LrDrags >= 3 && state.s2StepCount >= 1) {
        nextBtn.removeAttribute('disabled');
        renderProgress();
        renderPager();
      } else {
        nextBtn.setAttribute('disabled', 'disabled');
      }
    }

    function showArrows(fromW, toW, faded) {
      var g = helpers.grad(fromW);
      var x0 = valley.xOf(fromW);
      var y0 = valley.yOf(helpers.loss(fromW));
      var xG = valley.xOf(fromW + Math.sign(g) * Math.min(0.9, Math.abs(g) * 0.6));
      var xU = valley.xOf(toW);
      gradArrow.setAttribute('x1', x0);
      gradArrow.setAttribute('y1', y0 - 16);
      gradArrow.setAttribute('x2', xG);
      gradArrow.setAttribute('y2', y0 - 16);
      gradArrow.setAttribute('opacity', faded ? '0.25' : '1');
      updateArrow.setAttribute('x1', x0);
      updateArrow.setAttribute('y1', y0 + 18);
      updateArrow.setAttribute('x2', xU);
      updateArrow.setAttribute('y2', y0 + 18);
      updateArrow.setAttribute('opacity', faded ? '0.25' : '1');
    }

    slider.addEventListener('input', function () {
      var idx = parseInt(slider.value, 10);
      var nextLr = lrCfg.grid[idx];
      if (nextLr === state.s2Lr) return;
      state.s2Lr = nextLr;
      state.s2LrDrags += 1;
      updateLrUi();
      updateCard();
      if (state.s2EverStepped) showArrows(state.s2W, helpers.gdStep(state.s2W, state.s2Lr).to, true);
      updateNextState();
      setFeedback(1, 'Current eta = ' + state.s2Lr.toFixed(3) + ' (' + helpers.lrZone(state.s2Lr).label + '). Take one step to compare.', helpers.lrZone(state.s2Lr).tone);
    });

    stepBtn.addEventListener('click', function () {
      var step = helpers.gdStep(state.s2W, state.s2Lr);
      showArrows(state.s2W, step.to, false);
      state.s2W = step.to;
      state.s2StepCount += 1;
      state.s2EverStepped = true;
      ball.setAttribute('cx', valley.xOf(state.s2W));
      ball.setAttribute('cy', valley.yOf(helpers.loss(state.s2W)));
      updateCard();
      updateNextState();
      window.setTimeout(function () {
        gradArrow.setAttribute('opacity', '0.25');
        updateArrow.setAttribute('opacity', '0.25');
      }, 700);
      setFeedback(1, 'Eta times gradient = ' + step.step.toFixed(3) + '. Gradient gives direction, eta sets distance.', 'update');
      renderProgress();
      renderPager();
    });

    resetBtn.addEventListener('click', function () {
      state.s2W = 2.4;
      ball.setAttribute('cx', valley.xOf(state.s2W));
      ball.setAttribute('cy', valley.yOf(helpers.loss(state.s2W)));
      gradArrow.setAttribute('opacity', '0');
      updateArrow.setAttribute('opacity', '0');
      updateCard();
      updateNextState();
      setFeedback(1, 'Ball reset to w = 2.4. Try another eta value.', 'grad');
    });

    nextBtn.addEventListener('click', function () { goToScene(2); });

    updateLrUi();
    updateCard();
    updateNextState();
    if (state.s2EverStepped) showArrows(state.s2W, helpers.gdStep(state.s2W, state.s2Lr).to, true);

    return wrap;
  }

  function buildAutoScene(opts) {
    var idx = opts.sceneIndex;
    var lr = opts.lr;
    var steps = opts.steps;
    var trailField = opts.trailField;
    var lossField = opts.lossField;
    var doneField = opts.doneField;
    var startW = opts.startW != null ? opts.startW : 2.4;
    var trailClass = opts.trailClass || '';
    var lineClass = opts.lineClass || '';
    var btnLabel = opts.btnLabel;
    var nextLabel = opts.nextLabel;
    var warn = !!opts.warn;
    var warnText = opts.warnText || '';
    var feedbackDone = opts.feedbackDone;
    var feedbackTone = opts.feedbackTone || 'good';
    var ghosts = opts.ghosts || [];
    var runDelay = warn ? 320 : 180;

    var wrap = el('section', { class: 't10-scene', 'data-scene-index': idx });
    wrap.appendChild(sceneHead(idx));

    var valleyBox = el('div', { class: 't10-valley' });
    var valley = makeValleySvg();
    valleyBox.appendChild(valley.root);
    wrap.appendChild(valleyBox);

    var ghostLayer = svg('g', { class: 't10-trail ghost' });
    valley.root.appendChild(ghostLayer);
    ghosts.forEach(function (ghost) {
      ghost.trail.forEach(function (w) {
        ghostLayer.appendChild(svg('circle', {
          cx: valley.xOf(clampValleyW(w)),
          cy: valley.yOf(helpers.loss(clampValleyW(w))),
          r: 3.5
        }));
      });
    });

    var trailLayer = svg('g', { class: 't10-trail' + (trailClass ? ' ' + trailClass : '') });
    valley.root.appendChild(trailLayer);

    var ball = svg('circle', {
      class: 't10-ball',
      cx: valley.xOf(startW),
      cy: valley.yOf(helpers.loss(startW)),
      r: 9
    });
    valley.root.appendChild(ball);

    var panel = el('div', { class: 't10-panel' });
    panel.appendChild(el('h3', { text: 'Locked eta = ' + lr.toFixed(3) }));
    panel.appendChild(el('div', {
      class: 't10-formula',
      html: '<span class="lr">eta</span> = ' + lr.toFixed(3) + ' | run <span class="var">' + steps + '</span> steps' + (ghosts.length ? '<br><span class="blank">gray path = previous comparison</span>' : '')
    }));
    var counter = el('div', { class: 't10-formula', text: 'Steps 0 / ' + steps });
    panel.appendChild(counter);

    var actions = el('div', { class: 't10-actions-row' });
    var runBtn = setTracking(el('button', { class: 't10-action ' + (warn ? 'warn' : 'primary'), type: 'button', text: btnLabel }), 't10_scene' + idx + '_run', 'auto_run', { lr: lr });
    var resetBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'Reset' }), 't10_scene' + idx + '_reset', 'reset_run');
    var nextBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: nextLabel, disabled: 'disabled' }), 't10_scene' + idx + '_next', 'scene_next');
    actions.appendChild(runBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    var chartBox = el('div', { class: 't10-chart' });
    var chart = makeLossChart({ maxSteps: Math.max(steps, 30), lossMax: warn ? valleyCfg.lossMax * 1.2 : valleyCfg.lossMax });
    chartBox.appendChild(chart.root);
    var legend = el('div', { class: 't10-chart-legend' });
    ghosts.forEach(function (ghost) {
      legend.appendChild(el('span', { html: '<span class="sw" style="background:' + ghost.color + '"></span>' + ghost.label }));
    });
    legend.appendChild(el('span', { html: '<span class="sw" style="background:' + (warn ? '#dc2626' : '#2563eb') + '"></span>current eta = ' + lr.toFixed(3) }));
    chartBox.appendChild(legend);
    wrap.appendChild(chartBox);

    var warnBar = null;
    if (warnText) {
      warnBar = el('div', { class: 't10-warn-bar', text: warnText });
      wrap.appendChild(warnBar);
    }

    wrap.appendChild(feedbackBar(idx));

    function redrawChart(losses) {
      while (chart.root.childNodes.length > 8) chart.root.removeChild(chart.root.lastChild);
      ghosts.forEach(function (ghost) {
        var line = drawLossLine(chart, ghost.losses, 'ghost');
        if (!line) return;
        line.setAttribute('stroke', ghost.color);
        line.setAttribute('stroke-dasharray', '4 4');
        line.setAttribute('opacity', '0.7');
        chart.root.appendChild(line);
      });
      var currentLine = drawLossLine(chart, losses, lineClass);
      if (currentLine) chart.root.appendChild(currentLine);
      if (losses.length) {
        var last = losses[losses.length - 1];
        chart.root.appendChild(svg('circle', {
          class: 't10-chart-dot' + (warn ? ' warn' : ''),
          cx: chart.xOf(losses.length - 1),
          cy: chart.yOf(last),
          r: 4
        }));
      }
    }

    function ensureState() {
      if (!state[trailField].length) state[trailField] = [startW];
      if (!state[lossField].length) state[lossField] = [helpers.loss(startW)];
    }

    function completedSteps() {
      return Math.max(0, state[trailField].length - 1);
    }

    function redrawTrail() {
      while (trailLayer.firstChild) trailLayer.removeChild(trailLayer.firstChild);
      state[trailField].slice(1).forEach(function (w) {
        trailLayer.appendChild(svg('circle', {
          cx: valley.xOf(clampValleyW(w)),
          cy: valley.yOf(helpers.loss(clampValleyW(w))),
          r: 3.5
        }));
      });
    }

    function syncScene(updateChrome) {
      ensureState();
      redrawTrail();
      var currentW = state[trailField][state[trailField].length - 1];
      var clamped = clampValleyW(currentW);
      ball.setAttribute('cx', valley.xOf(clamped));
      ball.setAttribute('cy', valley.yOf(helpers.loss(clamped)));
      counter.textContent = 'Steps ' + completedSteps() + ' / ' + steps;
      redrawChart(state[lossField]);
      if (state[doneField]) {
        runBtn.setAttribute('disabled', 'disabled');
        nextBtn.removeAttribute('disabled');
        if (warnBar && warn) warnBar.classList.add('is-on');
      } else {
        runBtn.removeAttribute('disabled');
        nextBtn.setAttribute('disabled', 'disabled');
        if (warnBar) warnBar.classList.remove('is-on');
      }
      if (updateChrome) {
        renderProgress();
        renderPager();
      }
    }

    function reset(updateChrome) {
      cancelAutoSceneRun(idx);
      state[doneField] = false;
      state[trailField] = [startW];
      state[lossField] = [helpers.loss(startW)];
      syncScene(updateChrome !== false);
    }

    function run() {
      reset(false);
      runBtn.setAttribute('disabled', 'disabled');
      var runToken = (state.autoSceneRuns[idx] || 0) + 1;
      state.autoSceneRuns[idx] = runToken;
      function tick() {
        if (state.autoSceneRuns[idx] !== runToken) return;
        if (completedSteps() >= steps) {
          state[doneField] = true;
          syncScene(true);
          setFeedback(idx, feedbackDone, feedbackTone);
          return;
        }
        var from = state[trailField][state[trailField].length - 1];
        var step = helpers.gdStep(from, lr);
        state[trailField].push(step.to);
        state[lossField].push(Math.min(helpers.loss(step.to), valleyCfg.lossMax * 1.2));
        syncScene(false);
        window.setTimeout(tick, warn && completedSteps() > 1 ? runDelay : 180);
      }
      tick();
    }

    syncScene(false);
    runBtn.addEventListener('click', run);
    resetBtn.addEventListener('click', function () { reset(true); });
    nextBtn.addEventListener('click', function () { goToScene(idx + 1); });

    return wrap;
  }

  function buildScene2() {
    return buildAutoScene({
      sceneIndex: 2,
      lr: lrCfg.defaults.smallScene,
      steps: 30,
      trailField: 'smallTrail',
      lossField: 'smallLosses',
      doneField: 's3Done',
      btnLabel: 'Run tiny eta x30',
      nextLabel: 'Try a better eta',
      feedbackDone: 'Loss is going down, but the path is still far from the valley floor after 30 steps.',
      feedbackTone: 'warn'
    });
  }

  function buildScene3() {
    return buildAutoScene({
      sceneIndex: 3,
      lr: lrCfg.defaults.goodScene,
      steps: 15,
      trailField: 'goodTrail',
      lossField: 'goodLosses',
      doneField: 's4Done',
      btnLabel: 'Run good eta x15',
      nextLabel: 'See a larger eta',
      ghosts: [
        { trail: state.smallTrail, losses: state.smallLosses, label: 'small eta = 0.005', color: '#94a3b8' }
      ],
      feedbackDone: 'The path reaches the valley floor much faster with a better-sized eta.',
      feedbackTone: 'good'
    });
  }

  function buildScene4() {
    return buildAutoScene({
      sceneIndex: 4,
      lr: lrCfg.defaults.bigScene,
      steps: 10,
      trailField: 'bigTrail',
      lossField: 'bigLosses',
      doneField: 's5Done',
      btnLabel: 'Run larger eta x10',
      nextLabel: 'Push eta too far',
      ghosts: [
        { trail: state.goodTrail, losses: state.goodLosses, label: 'good eta = 0.1', color: '#2563eb' }
      ],
      feedbackDone: 'The path overshoots and oscillates. Direction is still useful, but the step is too large.',
      feedbackTone: 'warn'
    });
  }

  function buildScene5() {
    return buildAutoScene({
      sceneIndex: 5,
      lr: lrCfg.defaults.hugeScene,
      steps: 5,
      trailField: 'hugeTrail',
      lossField: 'hugeLosses',
      doneField: 's6Done',
      btnLabel: 'Run huge eta x5',
      nextLabel: 'Open MLP demo',
      trailClass: 'warn',
      lineClass: 'warn',
      ghosts: [
        { trail: state.bigTrail, losses: state.bigLosses, label: 'large eta = 0.6', color: '#f97316' }
      ],
      warn: true,
      warnText: 'Divergence: the parameter is being pushed farther away and the loss climbs instead.',
      feedbackDone: 'This is divergence. The update is so large that every step moves farther away.',
      feedbackTone: 'loss'
    });
  }

  function buildScene6() {
    var wrap = el('section', { class: 't10-scene', 'data-scene-index': 6 });
    wrap.appendChild(sceneHead(6));

    var pane = el('div', { class: 't10-mlp-pane' });

    var fitWrap = el('div');
    var W = 600;
    var H = 260;
    var mL = 38;
    var mR = 18;
    var mT = 20;
    var mB = 36;
    var iw = W - mL - mR;
    var ih = H - mT - mB;
    var xMin = mlpCfg.xMin;
    var xMax = mlpCfg.xMax;
    var yMin = -2.4;
    var yMax = 2.4;

    function xOf(x) { return mL + (x - xMin) / (xMax - xMin) * iw; }
    function yOf(y) { return mT + (1 - (y - yMin) / (yMax - yMin)) * ih; }

    var fit = svg('svg', { class: 'fit', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });
    fit.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + (mT + ih) + ' L' + (mL + iw) + ',' + (mT + ih) }));
    fit.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + mT + ' L' + mL + ',' + (mT + ih) }));
    var xLab = svg('text', { class: 't10-text bold', x: mL + iw, y: mT + ih + 24, 'text-anchor': 'end' });
    xLab.textContent = 'x';
    fit.appendChild(xLab);
    var yLab = svg('text', { class: 't10-text bold', x: mL + 4, y: mT - 4, 'text-anchor': 'start' });
    yLab.textContent = 'y';
    fit.appendChild(yLab);
    mlpCfg.xs.forEach(function (x, idx) {
      fit.appendChild(svg('circle', { class: 't10-mlp-scatter', cx: xOf(x), cy: yOf(mlpCfg.ys[idx]), r: 3.5 }));
    });
    var fitLine = svg('path', { class: 't10-mlp-line', d: '' });
    fit.appendChild(fitLine);
    fitWrap.appendChild(fit);
    pane.appendChild(fitWrap);

    var side = el('div', { class: 't10-mlp-side' });

    var lrCtl = el('div', { class: 't10-lr-control' });
    var lrHead = el('div', { class: 'head' });
    lrHead.appendChild(el('div', { class: 'name', text: 'MLP eta' }));
    var lrValue = el('div', { class: 't10-lr-value', text: state.s7Lr.toFixed(3) });
    lrHead.appendChild(lrValue);
    lrCtl.appendChild(lrHead);

    var lrButtons = el('div', { class: 't10-actions-row' });
    var lrOptionButtons = [];
    mlpCfg.lrOptions.forEach(function (lr) {
      var btn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'eta = ' + lr.toFixed(3) }), 't10_scene7_lr_' + String(lr).replace('.', ''), 'mlp_lr_pick', { lr: lr });
      btn.addEventListener('click', function () {
        state.s7Lr = lr;
        state.s7LrTries[lr] = true;
        var zone = helpers.lrZone(lr);
        setFeedback(6, 'Switched to eta = ' + lr.toFixed(3) + ' (' + zone.label + '). Try one step or the 20-step burst.', zone.tone);
        syncMlpUi(true);
      });
      lrOptionButtons.push({ lr: lr, button: btn });
      lrButtons.appendChild(btn);
    });
    lrCtl.appendChild(lrButtons);
    side.appendChild(lrCtl);

    var statusCard = el('div', { class: 't10-mlp-status' });
    var statusGrid = el('div', { class: 't10-status-grid' });

    function statusCell(label) {
      var item = el('div', { class: 't10-status-item' });
      item.appendChild(el('div', { class: 'label', text: label }));
      var value = el('div', { class: 'value', text: '--' });
      item.appendChild(value);
      statusGrid.appendChild(item);
      return value;
    }

    var triedValue = statusCell('LR tried');
    var burstValue = statusCell('Burst x20');
    var zoneValue = statusCell('Current zone');
    var readyValue = statusCell('Unlock next');
    statusCard.appendChild(statusGrid);
    side.appendChild(statusCard);

    var lossBox = el('div', { class: 't10-mlp-loss' });
    var LW = 360;
    var LH = 160;
    var lmL = 36;
    var lmR = 12;
    var lmT = 14;
    var lmB = 26;
    var liw = LW - lmL - lmR;
    var lih = LH - lmT - lmB;
    var lossSvg = svg('svg', { viewBox: '0 0 ' + LW + ' ' + LH, preserveAspectRatio: 'xMidYMid meet' });
    lossSvg.appendChild(svg('path', { class: 't10-axis', d: 'M' + lmL + ',' + (lmT + lih) + ' L' + (lmL + liw) + ',' + (lmT + lih) }));
    lossSvg.appendChild(svg('path', { class: 't10-axis', d: 'M' + lmL + ',' + lmT + ' L' + lmL + ',' + (lmT + lih) }));
    var lossLine = svg('path', { class: 't10-chart-line', d: '' });
    lossSvg.appendChild(lossLine);
    var stepLabel = svg('text', { class: 't10-text bold', x: lmL + liw, y: lmT + lih + 18, 'text-anchor': 'end' });
    stepLabel.textContent = 'step';
    lossSvg.appendChild(stepLabel);
    var lossLabel = svg('text', { class: 't10-text bold', x: lmL + 4, y: lmT - 2, 'text-anchor': 'start' });
    lossLabel.textContent = 'Loss';
    lossSvg.appendChild(lossLabel);
    lossBox.appendChild(lossSvg);
    side.appendChild(lossBox);

    var counter = el('div', { class: 't10-mlp-counter', text: 'step #0 | Loss = ' + state.s7LossHistory[0].toFixed(4) });
    side.appendChild(counter);

    var actions = el('div', { class: 't10-actions-row' });
    var oneBtn = setTracking(el('button', { class: 't10-action primary', type: 'button', text: 'One step' }), 't10_scene7_one', 'mlp_one_step');
    var burstBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'Burst x20' }), 't10_scene7_burst', 'mlp_burst');
    var resetBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'Reset theta' }), 't10_scene7_reset', 'mlp_reset');
    actions.appendChild(oneBtn);
    actions.appendChild(burstBtn);
    actions.appendChild(resetBtn);
    side.appendChild(actions);

    var endActions = el('div', { class: 't10-actions-row' });
    var nextBtn = setTracking(el('button', { class: 't10-action success', type: 'button', text: 'Finish T10', disabled: 'disabled' }), 't10_scene7_next', 'scene_done');
    endActions.appendChild(nextBtn);
    side.appendChild(endActions);

    pane.appendChild(side);
    wrap.appendChild(pane);
    wrap.appendChild(feedbackBar(6));

    function drawFit() {
      var path = '';
      var diverging = false;
      var samples = 80;
      for (var i = 0; i <= samples; i++) {
        var x = xMin + (xMax - xMin) * i / samples;
        var y = helpers.mlpPredict(state.s7Theta, x);
        if (!isFinite(y) || Math.abs(y) > 8) {
          diverging = true;
          y = Math.max(-2.4, Math.min(2.4, y || 0));
        }
        path += (i === 0 ? 'M' : 'L') + xOf(x).toFixed(2) + ',' + yOf(Math.max(-2.4, Math.min(2.4, y))).toFixed(2) + ' ';
      }
      fitLine.setAttribute('d', path);
      fitLine.classList.toggle('warn', diverging);
    }

    function drawLoss() {
      var history = state.s7LossHistory;
      var maxStep = Math.max(20, history.length - 1);
      var maxLoss = 1;
      history.forEach(function (value) {
        if (isFinite(value) && value > maxLoss) maxLoss = value;
      });
      var path = '';
      history.forEach(function (value, idx) {
        var lx = lmL + (idx / Math.max(1, maxStep)) * liw;
        var ly = lmT + (1 - Math.min(1, value / maxLoss)) * lih;
        path += (idx === 0 ? 'M' : 'L') + lx.toFixed(2) + ',' + ly.toFixed(2) + ' ';
      });
      lossLine.setAttribute('d', path);
      lossLine.classList.toggle('warn', helpers.lrZone(state.s7Lr).key === 'huge');
    }

    function updateLrButtons() {
      lrValue.textContent = state.s7Lr.toFixed(3);
      lrOptionButtons.forEach(function (entry) {
        var isActive = entry.lr === state.s7Lr;
        var isTried = !!state.s7LrTries[entry.lr];
        entry.button.classList.toggle('is-active', isActive);
        entry.button.classList.toggle('is-tried', isTried);
        entry.button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function updateStatusCard() {
      var zone = helpers.lrZone(state.s7Lr);
      var tries = triedMlpLrCount();
      triedValue.textContent = tries + ' / 3';
      triedValue.className = 'value' + (tries >= 3 ? ' is-ready' : '');
      burstValue.textContent = state.s7BurstDone ? 'done' : (state.s7BurstActive ? 'running' : 'pending');
      burstValue.className = 'value' + (state.s7BurstDone ? ' is-ready' : '');
      zoneValue.textContent = zone.label;
      zoneValue.className = 'value tone-' + zone.tone;
      readyValue.textContent = state.s7Done ? 'ready' : 'keep exploring';
      readyValue.className = 'value' + (state.s7Done ? ' is-ready' : '');
    }

    function updateNextBtn(updateChrome) {
      state.s7Done = triedMlpLrCount() >= 3 && state.s7BurstDone;
      if (state.s7Done) nextBtn.removeAttribute('disabled');
      else nextBtn.setAttribute('disabled', 'disabled');
      if (updateChrome) {
        renderProgress();
        renderPager();
      }
    }

    function syncMlpUi(updateChrome) {
      counter.textContent = 'step #' + state.s7StepCount + ' | Loss = ' + state.s7LossHistory[state.s7LossHistory.length - 1].toFixed(4);
      drawFit();
      drawLoss();
      updateLrButtons();
      updateNextBtn(updateChrome);
      updateStatusCard();
      if (state.s7BurstActive) {
        oneBtn.setAttribute('disabled', 'disabled');
        burstBtn.setAttribute('disabled', 'disabled');
      } else {
        oneBtn.removeAttribute('disabled');
        burstBtn.removeAttribute('disabled');
      }
    }

    function oneStep() {
      state.s7Theta = helpers.mlpStep(state.s7Theta, state.s7Lr);
      state.s7StepCount += 1;
      var loss = helpers.mlpLoss(state.s7Theta);
      state.s7LossHistory.push(loss);
      state.s7LrTries[state.s7Lr] = true;
      setFeedback(6, 'Step taken: eta = ' + state.s7Lr.toFixed(3) + ', Loss = ' + loss.toFixed(4) + '.', helpers.lrZone(state.s7Lr).tone);
      syncMlpUi(true);
    }

    function burst() {
      state.s7BurstToken += 1;
      var runToken = state.s7BurstToken;
      state.s7BurstActive = true;
      syncMlpUi(false);
      var count = 0;
      function tick() {
        if (state.s7BurstToken !== runToken) return;
        if (count >= 20) {
          state.s7BurstActive = false;
          state.s7BurstDone = true;
          syncMlpUi(true);
          var loss = state.s7LossHistory[state.s7LossHistory.length - 1];
          setFeedback(6, '20-step burst done. Loss = ' + loss.toFixed(4) + '. Try at least 3 eta values.', helpers.lrZone(state.s7Lr).tone);
          return;
        }
        oneStep();
        count += 1;
        window.setTimeout(tick, 90);
      }
      tick();
    }

    function reset() {
      state.s7BurstToken += 1;
      state.s7BurstActive = false;
      state.s7Theta = mlpCfg.init.slice();
      state.s7StepCount = 0;
      state.s7LossHistory = [helpers.mlpLoss(state.s7Theta)];
      syncMlpUi(true);
      setFeedback(6, 'Theta reset. Try another eta.', 'grad');
    }

    oneBtn.addEventListener('click', oneStep);
    burstBtn.addEventListener('click', burst);
    resetBtn.addEventListener('click', reset);
    nextBtn.addEventListener('click', function () {
      setFeedback(6, 'T10 complete: gradient gives direction, eta sets step size.', 'good');
      renderProgress();
      renderPager();
    });

    syncMlpUi(false);
    return wrap;
  }

  function render() {
    sceneBuilders = [buildScene0, buildScene1, buildScene2, buildScene3, buildScene4, buildScene5, buildScene6];
    window.addEventListener('hashchange', function () {
      showScene(sceneFromHash());
    });
    showScene(sceneFromHash());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
}());
