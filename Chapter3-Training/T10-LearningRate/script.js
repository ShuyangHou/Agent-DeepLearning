(function () {
  'use strict';

  var guide = window.T10_GUIDE;
  var scenes = guide.scenes;
  var helpers = guide.helpers;
  var lrCfg = guide.lr;
  var mlpCfg = guide.mlp;
  var valleyCfg = guide.valley;
  var previewCards = guide.previewCards;
  var transitions = guide.transitions;

  // ---------- 全局状态 ----------
  var state = {
    scene: 0,
    maxScene: 0,
    // 画面 1
    previewClicks: {},          // key -> true
    s1Done: false,
    // 画面 2
    s2Lr: lrCfg.defaults.scene1,
    s2W: 2.4,
    s2LrDrags: 0,
    s2StepCount: 0,
    s2EverStepped: false,
    // 画面 3
    smallTrail: [],
    smallLosses: [],
    s3Done: false,
    // 画面 4
    goodTrail: [],
    goodLosses: [],
    s4Done: false,
    // 画面 5
    bigTrail: [],
    bigLosses: [],
    s5Done: false,
    // 画面 6
    hugeTrail: [],
    hugeLosses: [],
    s6Done: false,
    // 画面 7 (MLP)
    s7Theta: mlpCfg.init.slice(),
    s7Lr: lrCfg.defaults.mlpDefault,
    s7LossHistory: [helpers.mlpLoss(mlpCfg.init.slice())],
    s7StepCount: 0,
    s7LrTries: {},
    s7BurstDone: false,
    s7Done: false,
    feedback: {}
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var scenePager = document.getElementById('scenePager');

  var sceneBuilders = null; // populated in render()

  var defaultFeedback = [
    '先把三张预告卡片都点一遍，再点 开始寻找步长 η。',
    '拖动学习率滑杆至少 3 次，再点 走一步，亲手看一次梯度怎么变成步长。',
    '把学习率锁到 0.005，点 用小学习率训练 30 步，留下灰色轨迹做对比。',
    '换到 0.1，再点 用合适学习率训练 15 步，对比一下小学习率的轨迹。',
    '换到 0.6，看小球如何在谷底两侧来回震荡。',
    '换到 1.3，看 Loss 怎么一步比一步更糟。',
    '至少试 3 个学习率，再点 连训 20 步，看 Loss 怎么下降。'
  ];

  // ---------- DOM 工具 ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('data-') === 0 || k === 'role' || k === 'aria-label' || k === 'type' || k === 'disabled') node.setAttribute(k, attrs[k]);
        else if (k === 'style') node.setAttribute('style', attrs[k]);
        else node[k] = attrs[k];
      });
    }
    if (children) children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function svg(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function setTracking(node, id, eventName, props) {
    node.setAttribute('data-tr-id', id);
    if (eventName) node.setAttribute('data-tr-click', eventName);
    if (props) node.setAttribute('data-tr-props', JSON.stringify(props));
    return node;
  }

  function setFeedback(sceneIdx, message, tone) {
    state.feedback[sceneIdx] = { text: message, tone: tone || '' };
    var bar = document.querySelector('[data-feedback-for="' + sceneIdx + '"]');
    if (bar) {
      bar.textContent = message;
      bar.className = 't10-feedback' + (tone ? ' tone-' + tone : '');
    }
  }

  function feedbackFor(idx) {
    return state.feedback[idx] || { text: defaultFeedback[idx], tone: '' };
  }

  // ---------- 进入条件 ----------
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

  function goToScene(idx) {
    if (!canEnter(idx)) return;
    var target = '#/scene/' + (idx + 1);
    if (location.hash !== target) {
      location.hash = target;
    } else {
      showScene(idx);
    }
  }

  function showScene(idx) {
    if (!sceneBuilders) return;
    if (!canEnter(idx)) {
      idx = Math.min(state.maxScene, sceneBuilders.length - 1);
    }
    state.scene = idx;
    state.maxScene = Math.max(state.maxScene, idx);
    sceneStack.innerHTML = '';
    sceneStack.appendChild(sceneBuilders[idx]());
    renderProgress();
    renderPager();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sceneFromHash() {
    var m = (location.hash || '').match(/#\/scene\/(\d+)/);
    if (!m) return 0;
    var n = parseInt(m[1], 10);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(scenes.length - 1, n - 1));
  }

  // ---------- 进度条 ----------
  function renderProgress() {
    progressNav.innerHTML = '';
    scenes.forEach(function (sc, idx) {
      var btn = el('a', { href: '#/scene/' + (idx + 1), text: (idx + 1) + ' · ' + sc.pill });
      btn.classList.toggle('is-active', state.scene === idx);
      btn.classList.toggle('is-done', sceneReady(idx));
      if (!canEnter(idx)) {
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('is-locked');
      }
      setTracking(btn, 't10_progress_step_' + (idx + 1), 'progress_jump', { scene: idx + 1 });
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
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

    var prev = el('button', {
      class: 't10-pager-btn ghost',
      type: 'button',
      text: '\u2190 \u4e0a\u4e00\u8282'
    });
    if (prevIdx < 0) {
      prev.setAttribute('disabled', 'disabled');
    } else {
      prev.title = scenes[prevIdx] ? scenes[prevIdx].pill : '';
      prev.addEventListener('click', function () { goToScene(prevIdx); });
    }
    setTracking(prev, 't10_pager_prev', 'pager_prev', { scene: idx + 1 });

    var counter = el('span', {
      class: 't10-pager-counter',
      text: (idx + 1) + ' / ' + scenes.length + ' · ' + (scenes[idx] ? scenes[idx].pill : '')
    });

    var next = el('button', {
      class: 't10-pager-btn primary',
      type: 'button',
      text: '\u4e0b\u4e00\u8282 \u2192'
    });
    if (nextIdx >= scenes.length) {
      next.setAttribute('disabled', 'disabled');
    } else if (!canEnter(nextIdx)) {
      next.setAttribute('disabled', 'disabled');
      next.title = '\u5148\u5b8c\u6210\u5f53\u524d\u5c0f\u8282\u7684\u4e92\u52a8';
    } else {
      next.title = scenes[nextIdx] ? scenes[nextIdx].pill : '';
      next.addEventListener('click', function () { goToScene(nextIdx); });
    }
    setTracking(next, 't10_pager_next', 'pager_next', { scene: idx + 1 });

    scenePager.appendChild(prev);
    scenePager.appendChild(counter);
    scenePager.appendChild(next);
  }

  // ---------- 共享：场景头 + 反馈条 ----------
  function sceneHead(idx) {
    var s = scenes[idx];
    var head = el('div', { class: 't10-scene-head' });
    var left = el('div', null, [
      el('span', { class: 'pill', text: s.pill }),
      el('h2', { text: s.title }),
      el('p', { class: 't10-goal', text: s.goal }),
      el('p', { class: 't10-concept', text: s.concept })
    ]);
    var ul = el('ul', { class: 't10-tasks' });
    s.tasks.forEach(function (t) { ul.appendChild(el('li', { text: t })); });
    left.appendChild(ul);
    var tagWrap = el('div', null, [ el('div', { class: 'tag', text: s.tag }) ]);
    head.appendChild(left);
    head.appendChild(tagWrap);
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

  // ---------- 山谷 SVG 共享构造 ----------
  // 坐标系：x ∈ [wMin, wMax] -> [margin.left, W - margin.right]
  //         loss ∈ [0, lossMax] -> [H - margin.bottom, margin.top]
  function makeValleySvg(opts) {
    opts = opts || {};
    var W = 640, H = 280;
    var mL = 44, mR = 24, mT = 18, mB = 36;
    var iw = W - mL - mR, ih = H - mT - mB;
    var wMin = valleyCfg.wMin, wMax = valleyCfg.wMax, lossMax = valleyCfg.lossMax;

    function xOf(w) { return mL + (w - wMin) / (wMax - wMin) * iw; }
    function yOf(l) { return mT + (1 - Math.min(l, lossMax) / lossMax) * ih; }

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });

    // defs：箭头
    var defs = svg('defs');
    var mkHead = function (id, color) {
      var m = svg('marker', { id: id, viewBox: '0 0 12 12', refX: '9', refY: '6', markerWidth: '8', markerHeight: '8', orient: 'auto-start-reverse' });
      var p = svg('path', { d: 'M0,0 L12,6 L0,12 Z', fill: color });
      m.appendChild(p);
      return m;
    };
    defs.appendChild(mkHead('t10-arrow-grad-head', getComputedStyle(document.documentElement).getPropertyValue('--t10-grad') || '#7c3aed'));
    defs.appendChild(mkHead('t10-arrow-update-head', getComputedStyle(document.documentElement).getPropertyValue('--t10-update') || '#16a34a'));
    root.appendChild(defs);

    // 轴
    var axis = svg('path', { class: 't10-axis', d: 'M' + mL + ',' + (mT + ih) + ' L' + (mL + iw) + ',' + (mT + ih) });
    var axisY = svg('path', { class: 't10-axis', d: 'M' + mL + ',' + mT + ' L' + mL + ',' + (mT + ih) });
    root.appendChild(axis);
    root.appendChild(axisY);

    // 刻度
    [-3, -2, -1, 0, 1, 2, 3].forEach(function (tw) {
      var x = xOf(tw);
      root.appendChild(svg('line', { class: 't10-tick', x1: x, x2: x, y1: mT + ih, y2: mT + ih + 4 }));
      var t = svg('text', { class: 't10-text', x: x, y: mT + ih + 16, 'text-anchor': 'middle' });
      t.textContent = String(tw);
      root.appendChild(t);
    });
    var xLab = svg('text', { class: 't10-text bold', x: mL + iw, y: mT + ih + 30, 'text-anchor': 'end' });
    xLab.textContent = 'w';
    root.appendChild(xLab);
    var yLab = svg('text', { class: 't10-text bold', x: mL + 4, y: mT - 4, 'text-anchor': 'start' });
    yLab.textContent = 'Loss';
    root.appendChild(yLab);

    // 曲线
    var d = '';
    var SAMPLES = 80;
    for (var i = 0; i <= SAMPLES; i++) {
      var w = wMin + (wMax - wMin) * i / SAMPLES;
      var l = helpers.loss(w);
      d += (i === 0 ? 'M' : 'L') + xOf(w).toFixed(2) + ',' + yOf(l).toFixed(2) + ' ';
    }
    var curve = svg('path', { class: 't10-valley-curve', d: d });
    root.appendChild(curve);

    // 目标点
    var ring = svg('circle', { class: 't10-target-ring', cx: xOf(valleyCfg.wStar), cy: yOf(0), r: 9 });
    root.appendChild(ring);
    var tStar = svg('text', { class: 't10-text', x: xOf(valleyCfg.wStar), y: yOf(0) + 24, 'text-anchor': 'middle' });
    tStar.textContent = 'w* = 0';
    root.appendChild(tStar);

    return {
      root: root, xOf: xOf, yOf: yOf, W: W, H: H,
      margin: { left: mL, right: mR, top: mT, bottom: mB }, ih: ih, iw: iw
    };
  }

  // ---------- 共享：Loss 折线 ----------
  function makeLossChart(opts) {
    opts = opts || {};
    var W = 540, H = 220;
    var mL = 44, mR = 18, mT = 16, mB = 30;
    var iw = W - mL - mR, ih = H - mT - mB;
    var maxSteps = opts.maxSteps || 30;
    var lossMax = opts.lossMax || valleyCfg.lossMax;

    function xOf(step) { return mL + (step / Math.max(1, maxSteps - 1)) * iw; }
    function yOf(loss) {
      // 用对数+线性混合，让 0.001~lossMax 都能看清
      var v = Math.min(loss, lossMax * 1.2);
      var t = Math.min(1, Math.max(0, v / lossMax));
      return mT + (1 - t) * ih;
    }

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });

    var axisX = svg('path', { class: 't10-axis', d: 'M' + mL + ',' + (mT + ih) + ' L' + (mL + iw) + ',' + (mT + ih) });
    var axisY = svg('path', { class: 't10-axis', d: 'M' + mL + ',' + mT + ' L' + mL + ',' + (mT + ih) });
    root.appendChild(axisX);
    root.appendChild(axisY);

    var xLab = svg('text', { class: 't10-text bold', x: mL + iw, y: mT + ih + 22, 'text-anchor': 'end' });
    xLab.textContent = 'step';
    root.appendChild(xLab);
    var yLab = svg('text', { class: 't10-text bold', x: mL + 4, y: mT - 4, 'text-anchor': 'start' });
    yLab.textContent = 'Loss';
    root.appendChild(yLab);

    // 网格
    [0.25, 0.5, 0.75].forEach(function (frac) {
      var y = mT + frac * ih;
      root.appendChild(svg('line', { class: 't10-tick', x1: mL, x2: mL + iw, y1: y, y2: y, 'stroke-dasharray': '3 5' }));
    });

    return { root: root, xOf: xOf, yOf: yOf, mL: mL, mT: mT, iw: iw, ih: ih };
  }

  function drawLossLine(chart, losses, klass) {
    if (!losses || losses.length === 0) return null;
    var d = '';
    losses.forEach(function (l, i) {
      d += (i === 0 ? 'M' : 'L') + chart.xOf(i).toFixed(2) + ',' + chart.yOf(l).toFixed(2) + ' ';
    });
    return svg('path', { class: 't10-chart-line' + (klass ? ' ' + klass : ''), d: d });
  }

  // ---------- 场景 0：认识学习率 ----------
  function buildScene0() {
    var wrap = el('section', { class: 't10-scene', 'data-scene-index': 0 });
    wrap.appendChild(sceneHead(0));

    // 预告卡
    var cards = el('div', { class: 't10-preview-cards' });
    previewCards.forEach(function (c) {
      var card = el('button', {
        class: 't10-preview-card ' + c.zone,
        type: 'button',
        'data-key': c.key
      });
      card.appendChild(el('div', { class: 'ph', text: c.emoji }));
      card.appendChild(el('div', { class: 'pt', text: c.title }));
      card.appendChild(el('div', { class: 'pc', text: c.copy }));
      setTracking(card, 't10_scene0_preview_' + c.key, 'preview_click', { key: c.key });
      card.addEventListener('click', function () {
        card.classList.add('is-active');
        state.previewClicks[c.key] = true;
        refreshFormula();
        if (Object.keys(state.previewClicks).length >= previewCards.length) {
          nextBtn.removeAttribute('disabled');
          setFeedback(0, '三种走法都心里有数了。学习率 η 就是这一步的「步长旋钮」。', 'good');
        } else {
          setFeedback(0, '继续看看其他两张：步长太小会拖时间，太大会跨过头。', 'grad');
        }
      });
      cards.appendChild(card);
    });
    wrap.appendChild(cards);

    var panel = el('div', { class: 't10-panel' });
    panel.appendChild(el('h3', { text: '参数更新公式' }));
    var formula = el('div', { class: 't10-formula' });
    panel.appendChild(formula);

    function refreshFormula() {
      var hasAll = Object.keys(state.previewClicks).length >= previewCards.length;
      if (hasAll) {
        formula.innerHTML = '<span class="var">w</span><sub>新</sub> = <span class="var">w</span><sub>旧</sub> − <span class="lr">η</span> × <span class="grad">∂L/∂w</span>';
      } else {
        formula.innerHTML = '<span class="var">w</span><sub>新</sub> = <span class="var">w</span><sub>旧</sub> − <span class="blank">? (η)</span> × <span class="grad">∂L/∂w</span>';
      }
    }
    refreshFormula();

    panel.appendChild(el('p', {
      class: 't10-concept',
      text: '梯度 ∂L/∂w 只决定方向。决定每一步走多远的，是学习率 η。'
    }));

    var actions = el('div', { class: 't10-actions-row' });
    var nextBtn = setTracking(el('button', {
      class: 't10-action primary', type: 'button', text: '开始寻找步长 η →', disabled: 'disabled'
    }), 't10_scene0_next', 'scene_next');
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(0));

    nextBtn.addEventListener('click', function () {
      state.s1Done = true;
      renderProgress();
      goToScene(1);
    });

    return wrap;
  }

  // ---------- 场景 1：在山谷里走一步 ----------
  function buildScene1() {
    var wrap = el('section', { class: 't10-scene', 'data-scene-index': 1 });
    wrap.appendChild(sceneHead(1));

    var valleyBox = el('div', { class: 't10-valley' });
    var v = makeValleySvg();
    valleyBox.appendChild(v.root);
    wrap.appendChild(valleyBox);

    // 小球
    var ball = svg('circle', { class: 't10-ball', cx: v.xOf(state.s2W), cy: v.yOf(helpers.loss(state.s2W)), r: 9 });
    v.root.appendChild(ball);
    // 步长箭头
    var gradArrow = svg('line', { class: 't10-arrow-grad', x1: 0, y1: 0, x2: 0, y2: 0, opacity: 0 });
    var updArrow = svg('line', { class: 't10-arrow-update', x1: 0, y1: 0, x2: 0, y2: 0, opacity: 0 });
    v.root.appendChild(gradArrow);
    v.root.appendChild(updArrow);

    // 右侧控制
    var panel = el('div', { class: 't10-panel' });
    panel.appendChild(el('h3', { text: '学习率控制器' }));

    var lrCtl = el('div', { class: 't10-lr-control' });
    var lrHead = el('div', { class: 'head' });
    lrHead.appendChild(el('div', { class: 'name', text: '学习率 η' }));
    var lrValue = el('div', { class: 't10-lr-value', text: state.s2Lr.toFixed(3) });
    lrHead.appendChild(lrValue);
    lrCtl.appendChild(lrHead);

    var slider = el('input', {
      type: 'range', class: 't10-lr-range',
      min: '0', max: String(lrCfg.grid.length - 1), step: '1',
      value: String(lrCfg.grid.indexOf(state.s2Lr) >= 0 ? lrCfg.grid.indexOf(state.s2Lr) : 4)
    });
    setTracking(slider, 't10_scene1_lr', 'lr_change');
    lrCtl.appendChild(slider);

    var marks = el('div', { class: 't10-lr-marks' });
    marks.appendChild(el('span', { text: '0.001' }));
    marks.appendChild(el('span', { text: '0.1' }));
    marks.appendChild(el('span', { text: '0.6' }));
    marks.appendChild(el('span', { text: '1.6' }));
    lrCtl.appendChild(marks);

    var region = el('div', { class: 't10-lr-region' });
    lrCtl.appendChild(region);

    var preview = el('div', { class: 't10-step-preview' });
    var previewFill = el('div', { class: 't10-step-preview-fill', style: 'width: 20%' });
    preview.appendChild(previewFill);
    lrCtl.appendChild(preview);

    panel.appendChild(lrCtl);

    // 状态卡
    var card = el('div', { class: 't10-step-card' });
    function statCell(k, v, klass) {
      card.appendChild(el('div', { class: 'k', text: k }));
      card.appendChild(el('div', { class: 'v ' + (klass || ''), text: v }));
    }
    statCell('w 当前', state.s2W.toFixed(3));
    statCell('梯度 g', helpers.grad(state.s2W).toFixed(3), 'grad');
    statCell('η × g', (state.s2Lr * helpers.grad(state.s2W)).toFixed(3), 'lr');
    statCell('Loss', helpers.loss(state.s2W).toFixed(3), 'loss');
    panel.appendChild(card);

    var actions = el('div', { class: 't10-actions-row' });
    var stepBtn = setTracking(el('button', { class: 't10-action primary', type: 'button', text: '走一步' }), 't10_scene1_step', 'one_step');
    var resetBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: '把小球放回起点' }), 't10_scene1_reset', 'reset_ball');
    var nextBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: '试试很小的学习率 →', disabled: 'disabled' }), 't10_scene1_next', 'scene_next');
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
      region.textContent = '区域：' + zone.label;
      region.className = 't10-lr-region zone-' + zone.key;
      lrValue.textContent = state.s2Lr.toFixed(3);
      var pct = Math.min(100, Math.max(6, (state.s2Lr / lrCfg.max) * 100));
      previewFill.style.width = pct.toFixed(0) + '%';
    }

    function showArrows() {
      var g = helpers.grad(state.s2W);
      var step = state.s2Lr * g;
      var wNext = state.s2W - step;
      var x0 = v.xOf(state.s2W), y0 = v.yOf(helpers.loss(state.s2W));
      var xG = v.xOf(state.s2W + Math.sign(g) * Math.min(0.9, Math.abs(g) * 0.6));
      var xU = v.xOf(wNext);
      gradArrow.setAttribute('x1', x0); gradArrow.setAttribute('y1', y0 - 16);
      gradArrow.setAttribute('x2', xG); gradArrow.setAttribute('y2', y0 - 16);
      gradArrow.setAttribute('opacity', '1');
      updArrow.setAttribute('x1', x0); updArrow.setAttribute('y1', y0 + 18);
      updArrow.setAttribute('x2', xU); updArrow.setAttribute('y2', y0 + 18);
      updArrow.setAttribute('opacity', '1');
    }

    slider.addEventListener('input', function () {
      var idx = parseInt(slider.value, 10);
      var nv = lrCfg.grid[idx];
      if (nv !== state.s2Lr) {
        state.s2Lr = nv;
        state.s2LrDrags += 1;
        updateLrUi();
        updateCard();
        if (state.s2LrDrags >= 3 && state.s2StepCount >= 1) {
          nextBtn.removeAttribute('disabled');
        }
        setFeedback(1, '当前 η = ' + state.s2Lr.toFixed(3) + '，' + helpers.lrZone(state.s2Lr).label + '。点 走一步 试试。', helpers.lrZone(state.s2Lr).tone);
      }
    });

    stepBtn.addEventListener('click', function () {
      showArrows();
      var st = helpers.gdStep(state.s2W, state.s2Lr);
      state.s2W = st.to;
      state.s2StepCount += 1;
      state.s2EverStepped = true;
      ball.setAttribute('cx', v.xOf(state.s2W));
      ball.setAttribute('cy', v.yOf(helpers.loss(state.s2W)));
      updateCard();
      if (state.s2LrDrags >= 3 && state.s2StepCount >= 1) {
        nextBtn.removeAttribute('disabled');
      }
      setTimeout(function () {
        gradArrow.setAttribute('opacity', '0.25');
        updArrow.setAttribute('opacity', '0.25');
      }, 700);
      setFeedback(1, 'η × g = ' + st.step.toFixed(3) + '，方向由梯度决定，步长由 η 决定。', 'update');
      renderProgress();
    });

    resetBtn.addEventListener('click', function () {
      state.s2W = 2.4;
      ball.setAttribute('cx', v.xOf(state.s2W));
      ball.setAttribute('cy', v.yOf(helpers.loss(state.s2W)));
      gradArrow.setAttribute('opacity', '0');
      updArrow.setAttribute('opacity', '0');
      updateCard();
      setFeedback(1, '已经把小球放回 w = 2.4，再选一个 η 试试。', 'grad');
    });

    nextBtn.addEventListener('click', function () { goToScene(2); });

    updateLrUi();
    return wrap;
  }

  // ---------- 共享：四个 “autorun” 场景的工厂 ----------
  // tone: 'good' | 'warn' | 'loss'
  function buildAutoScene(opts) {
    var idx = opts.sceneIndex;
    var lr = opts.lr;
    var steps = opts.steps;
    var trailField = opts.trailField;       // state 里存放 trail 的字段名
    var lossField = opts.lossField;
    var doneField = opts.doneField;
    var startW = opts.startW != null ? opts.startW : 2.4;
    var trailClass = opts.trailClass || '';
    var lineClass = opts.lineClass || '';
    var btnLabel = opts.btnLabel;
    var nextLabel = opts.nextLabel;
    var warn = opts.warn;
    var feedbackDone = opts.feedbackDone;
    var ghosts = opts.ghosts || [];          // [{trail, losses, label, color}]
    var feedbackTone = opts.feedbackTone || 'good';

    var wrap = el('section', { class: 't10-scene', 'data-scene-index': idx });
    wrap.appendChild(sceneHead(idx));

    var valleyBox = el('div', { class: 't10-valley' });
    var v = makeValleySvg();
    valleyBox.appendChild(v.root);
    wrap.appendChild(valleyBox);

    // 先画 ghost 轨迹
    var ghostLayer = svg('g', { class: 't10-trail ghost' });
    v.root.appendChild(ghostLayer);
    ghosts.forEach(function (g) {
      g.trail.forEach(function (w, i) {
        ghostLayer.appendChild(svg('circle', { cx: v.xOf(w), cy: v.yOf(helpers.loss(w)), r: 3.5 }));
      });
    });

    var trailLayer = svg('g', { class: 't10-trail' + (trailClass ? ' ' + trailClass : '') });
    v.root.appendChild(trailLayer);

    var ball = svg('circle', { class: 't10-ball', cx: v.xOf(startW), cy: v.yOf(helpers.loss(startW)), r: 9 });
    v.root.appendChild(ball);

    var panel = el('div', { class: 't10-panel' });
    panel.appendChild(el('h3', { text: '锁定学习率 η = ' + lr.toFixed(3) }));
    panel.appendChild(el('div', {
      class: 't10-formula',
      html: '<span class="lr">η</span> = ' + lr.toFixed(3) +
            '   ·   连续走 <span class="var">' + steps + '</span> 步' +
            (ghosts.length ? '<br/><span class="blank">灰色：上一组学习率留下的轨迹</span>' : '')
    }));

    var counter = el('div', { class: 't10-formula', text: '已走 0 / ' + steps + ' 步' });
    panel.appendChild(counter);

    var actions = el('div', { class: 't10-actions-row' });
    var runBtn = setTracking(el('button', { class: 't10-action ' + (warn ? 'warn' : 'primary'), type: 'button', text: btnLabel }), 't10_scene' + idx + '_run', 'auto_run', { lr: lr });
    var resetBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: '重置' }), 't10_scene' + idx + '_reset', 'reset_run');
    var nextBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: nextLabel, disabled: 'disabled' }), 't10_scene' + idx + '_next', 'scene_next');
    actions.appendChild(runBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    // Loss 折线
    var chartBox = el('div', { class: 't10-chart' });
    var chart = makeLossChart({ maxSteps: Math.max(steps, 30), lossMax: warn ? valleyCfg.lossMax * 1.2 : valleyCfg.lossMax });
    chartBox.appendChild(chart.root);
    var legend = el('div', { class: 't10-chart-legend' });
    ghosts.forEach(function (g) {
      var li = el('span', { html: '<span class="sw" style="background:' + g.color + '"></span>' + g.label });
      legend.appendChild(li);
    });
    var liNow = el('span', { html: '<span class="sw" style="background:' + (warn ? '#dc2626' : '#2563eb') + '"></span>当前 η = ' + lr.toFixed(3) });
    legend.appendChild(liNow);
    chartBox.appendChild(legend);
    wrap.appendChild(chartBox);

    // 警告条（仅 huge）
    var warnBar = null;
    if (opts.warnText) {
      warnBar = el('div', { class: 't10-warn-bar', text: opts.warnText });
      wrap.appendChild(warnBar);
    }

    wrap.appendChild(feedbackBar(idx));

    function redrawChart(losses) {
      // 清空再画
      while (chart.root.childNodes.length > 8) chart.root.removeChild(chart.root.lastChild);
      ghosts.forEach(function (g) {
        var p = drawLossLine({ xOf: chart.xOf, yOf: chart.yOf }, g.losses, 'ghost');
        if (p) {
          p.setAttribute('stroke', g.color);
          p.setAttribute('stroke-dasharray', '4 4');
          p.setAttribute('opacity', '0.7');
          chart.root.appendChild(p);
        }
      });
      var line = drawLossLine({ xOf: chart.xOf, yOf: chart.yOf }, losses, lineClass);
      if (line) chart.root.appendChild(line);
      // 端点
      if (losses.length) {
        var last = losses[losses.length - 1];
        var dot = svg('circle', { class: 't10-chart-dot' + (warn ? ' warn' : ''), cx: chart.xOf(losses.length - 1), cy: chart.yOf(last), r: 4 });
        chart.root.appendChild(dot);
      }
    }

    function reset() {
      while (trailLayer.firstChild) trailLayer.removeChild(trailLayer.firstChild);
      state[trailField] = [startW];
      state[lossField] = [helpers.loss(startW)];
      ball.setAttribute('cx', v.xOf(startW));
      ball.setAttribute('cy', v.yOf(helpers.loss(startW)));
      counter.textContent = '已走 0 / ' + steps + ' 步';
      runBtn.removeAttribute('disabled');
      if (warnBar) warnBar.classList.remove('is-on');
      redrawChart(state[lossField]);
    }

    reset();

    function run() {
      runBtn.setAttribute('disabled', 'disabled');
      var w = state[trailField][0];
      var i = 0;
      function tick() {
        if (i >= steps) {
          state[doneField] = true;
          nextBtn.removeAttribute('disabled');
          if (warnBar && warn) warnBar.classList.add('is-on');
          setFeedback(idx, feedbackDone, feedbackTone);
          renderProgress();
          return;
        }
        var st = helpers.gdStep(w, lr);
        w = st.to;
        state[trailField].push(w);
        var lossNow = helpers.loss(w);
        state[lossField].push(Math.min(lossNow, valleyCfg.lossMax * 1.2));
        // 轨迹
        trailLayer.appendChild(svg('circle', { cx: v.xOf(Math.max(-3.2, Math.min(3.2, w))), cy: v.yOf(helpers.loss(Math.max(-3.2, Math.min(3.2, w)))), r: 3.5 }));
        ball.setAttribute('cx', v.xOf(Math.max(-3.2, Math.min(3.2, w))));
        ball.setAttribute('cy', v.yOf(helpers.loss(Math.max(-3.2, Math.min(3.2, w)))));
        i += 1;
        counter.textContent = '已走 ' + i + ' / ' + steps + ' 步';
        redrawChart(state[lossField]);
        setTimeout(tick, warn && i > 1 ? 320 : 180);
      }
      tick();
    }

    runBtn.addEventListener('click', run);
    resetBtn.addEventListener('click', reset);
    nextBtn.addEventListener('click', function () { goToScene(idx + 1); });

    return wrap;
  }

  // ---------- 场景 2：小学习率 ----------
  function buildScene2() {
    return buildAutoScene({
      sceneIndex: 2,
      lr: lrCfg.defaults.smallScene,
      steps: 30,
      trailField: 'smallTrail',
      lossField: 'smallLosses',
      doneField: 's3Done',
      btnLabel: '用小学习率训练 30 步',
      nextLabel: '切到合适学习率 →',
      feedbackDone: 'Loss 是在下降，但每步太小，30 步还远没到谷底。下一画面看看合适的学习率。',
      feedbackTone: 'warn'
    });
  }

  // ---------- 场景 3：合适学习率 ----------
  function buildScene3() {
    return buildAutoScene({
      sceneIndex: 3,
      lr: lrCfg.defaults.goodScene,
      steps: 15,
      trailField: 'goodTrail',
      lossField: 'goodLosses',
      doneField: 's4Done',
      btnLabel: '用合适学习率训练 15 步',
      nextLabel: '切到大学习率 →',
      ghosts: [
        { trail: state.smallTrail, losses: state.smallLosses, label: '小 η = 0.005', color: '#94a3b8' }
      ],
      feedbackDone: '15 步就稳稳逼近 w* = 0，Loss 比小学习率快很多。',
      feedbackTone: 'good'
    });
  }

  // ---------- 场景 4：大学习率 ----------
  function buildScene4() {
    return buildAutoScene({
      sceneIndex: 4,
      lr: lrCfg.defaults.bigScene,
      steps: 10,
      trailField: 'bigTrail',
      lossField: 'bigLosses',
      doneField: 's5Done',
      btnLabel: '用大学习率训练 10 步',
      nextLabel: '看极大学习率 →',
      ghosts: [
        { trail: state.goodTrail, losses: state.goodLosses, label: '合适 η = 0.1', color: '#2563eb' }
      ],
      feedbackDone: '小球在谷底两侧来回震荡，Loss 折线呈锯齿——大学习率开始不稳了。',
      feedbackTone: 'warn',
      warn: false
    });
  }

  // ---------- 场景 5：极大学习率发散 ----------
  function buildScene5() {
    return buildAutoScene({
      sceneIndex: 5,
      lr: lrCfg.defaults.hugeScene,
      steps: 5,
      trailField: 'hugeTrail',
      lossField: 'hugeLosses',
      doneField: 's6Done',
      btnLabel: '用极大学习率训练 5 步',
      nextLabel: '搬到 MLP 拟合 →',
      trailClass: 'warn',
      lineClass: 'warn',
      ghosts: [
        { trail: state.bigTrail, losses: state.bigLosses, label: '大 η = 0.6', color: '#f97316' }
      ],
      warn: true,
      warnText: '⚠ 训练发散：参数被推得越来越远，Loss 反而上升。',
      feedbackDone: '5 步就够了：参数飞出窗口，Loss 越来越大——这就是发散。',
      feedbackTone: 'loss'
    });
  }

  // ---------- 场景 6：MLP 拟合 ----------
  function buildScene6() {
    var wrap = el('section', { class: 't10-scene', 'data-scene-index': 6 });
    wrap.appendChild(sceneHead(6));

    var pane = el('div', { class: 't10-mlp-pane' });

    // 左：拟合曲线
    var fitWrap = el('div');
    var W = 600, H = 260, mL = 38, mR = 18, mT = 20, mB = 36;
    var iw = W - mL - mR, ih = H - mT - mB;
    var xMin = mlpCfg.xMin, xMax = mlpCfg.xMax, yMin = -2.4, yMax = 2.4;
    function xOf(x) { return mL + (x - xMin) / (xMax - xMin) * iw; }
    function yOf(y) { return mT + (1 - (y - yMin) / (yMax - yMin)) * ih; }

    var fit = svg('svg', { class: 'fit', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });
    fit.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + (mT + ih) + ' L' + (mL + iw) + ',' + (mT + ih) }));
    fit.appendChild(svg('path', { class: 't10-axis', d: 'M' + mL + ',' + mT + ' L' + mL + ',' + (mT + ih) }));
    var fLab = svg('text', { class: 't10-text bold', x: mL + iw, y: mT + ih + 24, 'text-anchor': 'end' });
    fLab.textContent = 'x';
    fit.appendChild(fLab);
    var fY = svg('text', { class: 't10-text bold', x: mL + 4, y: mT - 4, 'text-anchor': 'start' });
    fY.textContent = 'y';
    fit.appendChild(fY);
    // 散点
    mlpCfg.xs.forEach(function (x, i) {
      fit.appendChild(svg('circle', { class: 't10-mlp-scatter', cx: xOf(x), cy: yOf(mlpCfg.ys[i]), r: 3.5 }));
    });
    var line = svg('path', { class: 't10-mlp-line', d: '' });
    fit.appendChild(line);
    fitWrap.appendChild(fit);
    pane.appendChild(fitWrap);

    // 右：控制 + 损失
    var side = el('div', { class: 't10-mlp-side' });

    var lrCtl = el('div', { class: 't10-lr-control' });
    var lrHead = el('div', { class: 'head' });
    lrHead.appendChild(el('div', { class: 'name', text: 'MLP 学习率 η' }));
    var lrValue = el('div', { class: 't10-lr-value', text: state.s7Lr.toFixed(3) });
    lrHead.appendChild(lrValue);
    lrCtl.appendChild(lrHead);
    var lrButtons = el('div', { class: 't10-actions-row' });
    mlpCfg.lrOptions.forEach(function (lr) {
      var b = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: 'η = ' + lr.toFixed(3) }), 't10_scene7_lr_' + String(lr).replace('.', ''), 'mlp_lr_pick', { lr: lr });
      b.addEventListener('click', function () {
        state.s7Lr = lr;
        state.s7LrTries[lr] = true;
        lrValue.textContent = lr.toFixed(3);
        var zone = helpers.lrZone(lr);
        setFeedback(6, '已切到 η = ' + lr.toFixed(3) + '（' + zone.label + '）。点 单步训练 或 连训 20 步 试试。', zone.tone);
        updateNextBtn();
      });
      lrButtons.appendChild(b);
    });
    lrCtl.appendChild(lrButtons);
    side.appendChild(lrCtl);

    // 损失图
    var lossBox = el('div', { class: 't10-mlp-loss' });
    var LW = 360, LH = 160, lmL = 36, lmR = 12, lmT = 14, lmB = 26;
    var liw = LW - lmL - lmR, lih = LH - lmT - lmB;
    var lossSvg = svg('svg', { viewBox: '0 0 ' + LW + ' ' + LH, preserveAspectRatio: 'xMidYMid meet' });
    lossSvg.appendChild(svg('path', { class: 't10-axis', d: 'M' + lmL + ',' + (lmT + lih) + ' L' + (lmL + liw) + ',' + (lmT + lih) }));
    lossSvg.appendChild(svg('path', { class: 't10-axis', d: 'M' + lmL + ',' + lmT + ' L' + lmL + ',' + (lmT + lih) }));
    var lossLine = svg('path', { class: 't10-chart-line', d: '' });
    lossSvg.appendChild(lossLine);
    var lLab = svg('text', { class: 't10-text bold', x: lmL + liw, y: lmT + lih + 18, 'text-anchor': 'end' });
    lLab.textContent = 'step';
    lossSvg.appendChild(lLab);
    var lYlab = svg('text', { class: 't10-text bold', x: lmL + 4, y: lmT - 2, 'text-anchor': 'start' });
    lYlab.textContent = 'Loss';
    lossSvg.appendChild(lYlab);
    lossBox.appendChild(lossSvg);
    side.appendChild(lossBox);

    var counter = el('div', { class: 't10-mlp-counter', text: 'step #0  ·  Loss = ' + state.s7LossHistory[0].toFixed(4) });
    side.appendChild(counter);

    var actions = el('div', { class: 't10-actions-row' });
    var oneBtn = setTracking(el('button', { class: 't10-action primary', type: 'button', text: '单步训练' }), 't10_scene7_one', 'mlp_one_step');
    var burstBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: '连训 20 步' }), 't10_scene7_burst', 'mlp_burst');
    var resetBtn = setTracking(el('button', { class: 't10-action ghost', type: 'button', text: '重置 θ' }), 't10_scene7_reset', 'mlp_reset');
    actions.appendChild(oneBtn);
    actions.appendChild(burstBtn);
    actions.appendChild(resetBtn);
    side.appendChild(actions);

    var endActions = el('div', { class: 't10-actions-row' });
    var nextBtn = setTracking(el('button', { class: 't10-action success', type: 'button', text: '完成 T10', disabled: 'disabled' }), 't10_scene7_next', 'scene_done');
    endActions.appendChild(nextBtn);
    side.appendChild(endActions);

    pane.appendChild(side);
    wrap.appendChild(pane);

    wrap.appendChild(feedbackBar(6));

    function drawFit() {
      var d = '';
      var SAMPLES = 80;
      var diverging = false;
      for (var i = 0; i <= SAMPLES; i++) {
        var x = xMin + (xMax - xMin) * i / SAMPLES;
        var y = helpers.mlpPredict(state.s7Theta, x);
        if (!isFinite(y) || Math.abs(y) > 8) { diverging = true; y = Math.max(-2.4, Math.min(2.4, y || 0)); }
        d += (i === 0 ? 'M' : 'L') + xOf(x).toFixed(2) + ',' + yOf(Math.max(-2.4, Math.min(2.4, y))).toFixed(2) + ' ';
      }
      line.setAttribute('d', d);
      line.classList.toggle('warn', diverging);
    }

    function drawLoss() {
      var H = state.s7LossHistory;
      var maxStep = Math.max(20, H.length - 1);
      var maxLoss = 0;
      H.forEach(function (v) { if (isFinite(v) && v > maxLoss) maxLoss = v; });
      if (maxLoss <= 0) maxLoss = 1;
      var d = '';
      H.forEach(function (v, i) {
        var lx = lmL + (i / Math.max(1, maxStep)) * liw;
        var ly = lmT + (1 - Math.min(1, v / maxLoss)) * lih;
        d += (i === 0 ? 'M' : 'L') + lx.toFixed(2) + ',' + ly.toFixed(2) + ' ';
      });
      lossLine.setAttribute('d', d);
      var zone = helpers.lrZone(state.s7Lr);
      lossLine.classList.toggle('warn', zone.key === 'huge');
    }

    function updateNextBtn() {
      var enoughTries = Object.keys(state.s7LrTries).length >= 3;
      if (enoughTries && state.s7BurstDone) {
        state.s7Done = true;
        nextBtn.removeAttribute('disabled');
        renderProgress();
      }
    }

    function oneStep() {
      var t = helpers.mlpStep(state.s7Theta, state.s7Lr);
      state.s7Theta = t;
      state.s7StepCount += 1;
      var l = helpers.mlpLoss(state.s7Theta);
      state.s7LossHistory.push(l);
      counter.textContent = 'step #' + state.s7StepCount + '  ·  Loss = ' + l.toFixed(4);
      drawFit();
      drawLoss();
      state.s7LrTries[state.s7Lr] = true;
      setFeedback(6, '走了 1 步：η = ' + state.s7Lr.toFixed(3) + '，Loss = ' + l.toFixed(4) + '。', helpers.lrZone(state.s7Lr).tone);
      updateNextBtn();
    }

    function burst() {
      oneBtn.setAttribute('disabled', 'disabled');
      burstBtn.setAttribute('disabled', 'disabled');
      var i = 0;
      function tick() {
        if (i >= 20) {
          oneBtn.removeAttribute('disabled');
          burstBtn.removeAttribute('disabled');
          state.s7BurstDone = true;
          updateNextBtn();
          var l = state.s7LossHistory[state.s7LossHistory.length - 1];
          setFeedback(6, '连训 20 步后 Loss = ' + l.toFixed(4) + '。试试三个 η 都跑一遍再下结论。', helpers.lrZone(state.s7Lr).tone);
          return;
        }
        oneStep();
        i += 1;
        setTimeout(tick, 90);
      }
      tick();
    }

    function reset() {
      state.s7Theta = mlpCfg.init.slice();
      state.s7StepCount = 0;
      state.s7LossHistory = [helpers.mlpLoss(state.s7Theta)];
      counter.textContent = 'step #0  ·  Loss = ' + state.s7LossHistory[0].toFixed(4);
      drawFit();
      drawLoss();
      setFeedback(6, 'θ 已重置，可以换一个 η 再来。', 'grad');
    }

    oneBtn.addEventListener('click', oneStep);
    burstBtn.addEventListener('click', burst);
    resetBtn.addEventListener('click', reset);
    nextBtn.addEventListener('click', function () {
      setFeedback(6, 'T10 学习率完成：方向交给梯度，步长交给 η。', 'good');
      renderProgress();
    });

    drawFit();
    drawLoss();

    return wrap;
  }

  // ---------- 渲染 ----------
  function render() {
    sceneBuilders = [buildScene0, buildScene1, buildScene2, buildScene3, buildScene4, buildScene5, buildScene6];
    window.addEventListener('hashchange', function () { showScene(sceneFromHash()); });
    showScene(sceneFromHash());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
}());
