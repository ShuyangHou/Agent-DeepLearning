(function () {
  'use strict';

  var guide = window.T07_GUIDE;
  var scenes = guide.scenes;
  var net = guide.network;
  var curve = guide.curve;

  var state = {
    scene: 0,
    maxScene: 0,
    played: { forward: false, loss: false, backward: false, update: false },
    feedback: {},
    epochIndex: 0,
    epochsDone: { 0: false, 1: false, 2: false, 3: false },
    quizChoice: '',
    quizDone: false
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var scenePager = document.getElementById('scenePager');

  var sceneBuilders = null; // populated in mount()

  var defaultFeedback = [
    '先让信号从 x 流到 y′，看一次完整的前向。',
    '把 y′ 和真实 y 一比，把差距变成 Loss。',
    '让 Loss 顺着前向连接逆着回去，给每条边一份梯度。',
    '用 w ← w − η·∂L/∂w 把所有权重一起挪一小步。',
    '一直循环：模型曲线慢慢贴上真实曲线，Loss 慢慢小下去。'
  ];

  var fakeGrads = [
    { name: '∂L/∂w23', val: -0.21 },
    { name: '∂L/∂w22', val: 0.04 },
    { name: '∂L/∂w21', val: -0.11 },
    { name: '∂L/∂w13', val: 0.08 },
    { name: '∂L/∂w12', val: -0.06 },
    { name: '∂L/∂w11', val: -0.12 }
  ];

  // ---------- helpers ----------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('data-') === 0) node.setAttribute(k, attrs[k]);
        else if (k === 'style') node.setAttribute('style', attrs[k]);
        else node[k] = attrs[k];
      });
    }
    if (children) {
      children.forEach(function (c) { if (c) node.appendChild(c); });
    }
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
      bar.className = 't07-feedback' + (tone ? ' tone-' + tone : '');
    }
  }

  function feedbackFor(idx) {
    return state.feedback[idx] || { text: defaultFeedback[idx], tone: '' };
  }

  function reduceMotionPreferred() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function completedEpochCount() {
    return Object.keys(state.epochsDone).filter(function (k) {
      return state.epochsDone[k];
    }).length;
  }

  function allEpochsDone() {
    return completedEpochCount() === curve.steps.length;
  }

  function currentCurveStepIndex() {
    for (var i = curve.steps.length - 1; i >= 0; i -= 1) {
      if (state.epochsDone[i]) return i;
    }
    return 0;
  }

  function sceneStatusLabel(idx) {
    if (!canEnter(idx)) return '未解锁';
    if (sceneReady(idx)) return '已完成';
    if (state.scene === idx) return '当前';
    return '已解锁';
  }

  function sceneReady(idx) {
    if (idx === 0) return state.played.forward;
    if (idx === 1) return state.played.loss;
    if (idx === 2) return state.played.backward;
    if (idx === 3) return state.played.update;
    if (idx === 4) return allEpochsDone() && state.quizDone;
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

  function showScene(idx, options) {
    options = options || {};
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
    if (!options.skipScroll) {
      window.scrollTo({ top: 0, behavior: reduceMotionPreferred() ? 'auto' : 'smooth' });
    }
  }

  function sceneFromHash() {
    var m = (location.hash || '').match(/#\/scene\/(\d+)/);
    if (!m) return 0;
    var n = parseInt(m[1], 10);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(scenes.length - 1, n - 1));
  }

  // ---------- progress nav ----------

  function renderProgress() {
    progressNav.innerHTML = '';
    scenes.forEach(function (sc, idx) {
      var btn = el('a', {
        href: '#/scene/' + (idx + 1),
        text: (idx + 1) + ' · ' + sc.pill
      });
      btn.setAttribute('aria-label', '第 ' + (idx + 1) + ' 节，' + sc.pill + '，状态：' + sceneStatusLabel(idx));
      btn.classList.toggle('is-active', state.scene === idx);
      btn.classList.toggle('is-done', sceneReady(idx));
      if (state.scene === idx) {
        btn.setAttribute('aria-current', 'step');
      }
      if (!canEnter(idx)) {
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('is-locked');
      }
      setTracking(btn, 't07_progress_step_' + (idx + 1), 'progress_jump', { scene: idx + 1 });
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
      class: 't07-pager-btn ghost',
      type: 'button',
      text: '\u2190 \u4e0a\u4e00\u8282'
    });
    if (prevIdx < 0) {
      prev.setAttribute('disabled', 'disabled');
    } else {
      prev.title = scenes[prevIdx] ? scenes[prevIdx].pill : '';
      prev.addEventListener('click', function () { goToScene(prevIdx); });
    }
    setTracking(prev, 't07_pager_prev', 'pager_prev', { scene: idx + 1 });

    var counter = el('span', {
      class: 't07-pager-counter',
      text: (idx + 1) + ' / ' + scenes.length + ' · ' + (scenes[idx] ? scenes[idx].pill : '')
    });

    var next = el('button', {
      class: 't07-pager-btn primary',
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
    setTracking(next, 't07_pager_next', 'pager_next', { scene: idx + 1 });

    scenePager.appendChild(prev);
    scenePager.appendChild(counter);
    scenePager.appendChild(next);
  }

  // ---------- network SVG ----------

  var NET_GEOM = {
    width: 520,
    height: 280,
    xInput: 70,
    xHidden: 260,
    xOutput: 450,
    yMid: 140,
    hiddenSpacing: 90
  };

  function nodeCenter(kind, idx) {
    if (kind === 'input') return { x: NET_GEOM.xInput, y: NET_GEOM.yMid };
    if (kind === 'output') return { x: NET_GEOM.xOutput, y: NET_GEOM.yMid };
    var n = net.hidden.length;
    var startY = NET_GEOM.yMid - ((n - 1) / 2) * NET_GEOM.hiddenSpacing;
    return { x: NET_GEOM.xHidden, y: startY + idx * NET_GEOM.hiddenSpacing };
  }

  function buildNetworkSvg() {
    var root = svg('svg', { viewBox: '0 0 ' + NET_GEOM.width + ' ' + NET_GEOM.height });
    var edgeLayer = svg('g', { class: 't07-edges' });
    var pulseLayer = svg('g', { class: 't07-pulses' });
    var weightLayer = svg('g', { class: 't07-weights' });
    var nodeLayer = svg('g', { class: 't07-nodes' });

    // edges input -> hidden
    net.hidden.forEach(function (h, i) {
      var a = nodeCenter('input');
      var b = nodeCenter('hidden', i);
      var line = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't07-edge', 'data-edge': 'in-' + i
      });
      edgeLayer.appendChild(line);
      var pulse = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't07-edge-pulse', 'data-pulse': 'in-' + i, stroke: '#2563eb'
      });
      pulseLayer.appendChild(pulse);

      var w = svg('text', {
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8,
        class: 't07-weight-label', 'data-weight': 'in-' + i
      });
      w.textContent = 'w1' + (i + 1) + '=' + net.weightsInput[i].toFixed(2);
      weightLayer.appendChild(w);
    });

    // edges hidden -> output
    net.hidden.forEach(function (h, i) {
      var a = nodeCenter('hidden', i);
      var b = nodeCenter('output');
      var line = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't07-edge', 'data-edge': 'out-' + i
      });
      edgeLayer.appendChild(line);
      var pulse = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't07-edge-pulse', 'data-pulse': 'out-' + i, stroke: '#2563eb'
      });
      pulseLayer.appendChild(pulse);

      var w = svg('text', {
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 8,
        class: 't07-weight-label', 'data-weight': 'out-' + i
      });
      w.textContent = 'w2' + (i + 1) + '=' + net.weightsOutput[i].toFixed(2);
      weightLayer.appendChild(w);
    });

    // nodes
    function makeNode(kind, idx, label, klass) {
      var c = nodeCenter(kind, idx);
      var circle = svg('circle', {
        cx: c.x, cy: c.y, r: 28,
        class: 't07-node' + (klass ? ' ' + klass : ''),
        'data-node': kind + (idx == null ? '' : '-' + idx)
      });
      var t = svg('text', {
        x: c.x, y: c.y, class: 't07-node-label'
      });
      t.textContent = label;
      nodeLayer.appendChild(circle);
      nodeLayer.appendChild(t);
    }

    makeNode('input', null, net.input.label);
    net.hidden.forEach(function (h, i) { makeNode('hidden', i, h.label); });
    makeNode('output', null, net.output.label, 'is-output');

    root.appendChild(edgeLayer);
    root.appendChild(pulseLayer);
    root.appendChild(weightLayer);
    root.appendChild(nodeLayer);
    return root;
  }

  function pulseEdges(scope, direction) {
    // direction: 'forward' or 'backward'
    var groups = direction === 'forward'
      ? [scope.querySelectorAll('[data-pulse^="in-"]'), scope.querySelectorAll('[data-pulse^="out-"]')]
      : [scope.querySelectorAll('[data-pulse^="out-"]'), scope.querySelectorAll('[data-pulse^="in-"]')];
    var color = direction === 'forward' ? '#2563eb' : '#7c3aed';
    groups.forEach(function (grp, gi) {
      Array.prototype.forEach.call(grp, function (line, li) {
        line.setAttribute('stroke', color);
        // reset animation
        line.classList.remove('is-active');
        void line.getBoundingClientRect();
        setTimeout(function () { line.classList.add('is-active'); }, gi * 350 + li * 80);
      });
    });
    // recolor static edges
    var edgeClass = direction === 'forward' ? 'is-forward' : 'is-backward';
    scope.querySelectorAll('.t07-edge').forEach(function (e) {
      e.classList.remove('is-forward', 'is-backward');
    });
    setTimeout(function () {
      scope.querySelectorAll('.t07-edge').forEach(function (e) { e.classList.add(edgeClass); });
    }, 100);
  }

  function markWeightsUpdated(scope) {
    scope.querySelectorAll('[data-weight]').forEach(function (el) {
      el.classList.add('is-updated');
      var key = el.getAttribute('data-weight');
      var parts = key.split('-');
      var dir = parts[0]; // 'in' or 'out'
      var i = parseInt(parts[1], 10);
      var newW = dir === 'in' ? net.weightsInputAfter[i] : net.weightsOutputAfter[i];
      var prefix = dir === 'in' ? 'w1' : 'w2';
      el.textContent = prefix + (i + 1) + '=' + newW.toFixed(2);
    });
    scope.querySelectorAll('.t07-node').forEach(function (n) {
      if (!n.classList.contains('is-output')) n.classList.add('is-updated');
    });
  }

  function resetNetwork(scope) {
    scope.querySelectorAll('[data-weight]').forEach(function (el) {
      el.classList.remove('is-updated');
      var key = el.getAttribute('data-weight');
      var parts = key.split('-');
      var dir = parts[0];
      var i = parseInt(parts[1], 10);
      var w = dir === 'in' ? net.weightsInput[i] : net.weightsOutput[i];
      var prefix = dir === 'in' ? 'w1' : 'w2';
      el.textContent = prefix + (i + 1) + '=' + w.toFixed(2);
    });
    scope.querySelectorAll('.t07-node.is-updated').forEach(function (n) {
      n.classList.remove('is-updated');
    });
    scope.querySelectorAll('.t07-edge').forEach(function (e) {
      e.classList.remove('is-forward', 'is-backward');
    });
  }

  // ---------- shared scene head ----------

  function sceneHead(idx) {
    var s = scenes[idx];
    var head = el('div', { class: 't07-scene-head' });
    var left = el('div', null, [
      el('span', { class: 'pill', text: s.pill }),
      el('h2', { text: s.title }),
      el('p', { class: 't07-goal', text: s.goal }),
      el('p', { class: 't07-concept', text: s.concept })
    ]);
    var tagWrap = el('div', null, [
      el('div', { class: 'tag', text: s.tag }),
    ]);
    var ul = el('ul', { class: 't07-tasks' });
    s.tasks.forEach(function (t) { ul.appendChild(el('li', { text: t })); });
    left.appendChild(ul);
    head.appendChild(left);
    head.appendChild(tagWrap);
    return head;
  }

  function feedbackBar(idx) {
    var fb = feedbackFor(idx);
    var bar = el('div', {
      class: 't07-feedback' + (fb.tone ? ' tone-' + fb.tone : ''),
      text: fb.text,
      'data-feedback-for': idx
    });
    return bar;
  }

  function metric(label, value, tone) {
    var node = el('div', { class: 't07-metric' + (tone ? ' tone-' + tone : '') });
    node.appendChild(el('span', { class: 'label', text: label }));
    node.appendChild(el('span', { class: 'value', text: value, 'data-metric-value': label }));
    return node;
  }

  function updateMetric(scope, label, value) {
    var node = scope.querySelector('[data-metric-value="' + label + '"]');
    if (node) node.textContent = value;
  }

  function renderGradRows(scope) {
    fakeGrads.forEach(function (g) {
      var row = scope.querySelector('[data-grad="' + g.name + '"]');
      if (!row) return;
      row.style.opacity = '1';
      var v = row.querySelector('.value');
      if (v) v.textContent = (g.val > 0 ? '+' : '') + g.val.toFixed(2);
    });
  }

  // ---------- Scene 0: Forward ----------

  function buildScene0() {
    var wrap = el('section', { class: 't07-scene', 'data-scene-index': 0 });
    wrap.appendChild(sceneHead(0));

    var netBox = el('div', { class: 't07-network' });
    netBox.appendChild(buildNetworkSvg());
    wrap.appendChild(netBox);

    var panel = el('div', { class: 't07-panel' });
    panel.appendChild(el('h3', { text: '前向计算面板' }));
    panel.appendChild(metric('输入 x', net.input.value.toFixed(2), 'forward'));
    panel.appendChild(metric('预测 y\u2032', '—', 'forward'));
    panel.appendChild(metric('真实 y', net.target.toFixed(2)));
    var actions = el('div', { class: 't07-actions-row' });
    var playBtn = setTracking(el('button', {
      class: 't07-action primary',
      type: 'button',
      text: '播放前向'
    }), 't07_play_forward', 'forward_play');
    var nextBtn = setTracking(el('button', {
      class: 't07-action ghost',
      type: 'button',
      text: '下一步 →',
      disabled: 'disabled'
    }), 't07_next_after_forward', 'forward_next');
    actions.appendChild(playBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    var media = el('div', { class: 't07-media' });
    var video = el('video', {
      controls: true,
      preload: 'metadata',
      poster: './assets/backprop_signal_flow_poster.png'
    });
    var source = el('source');
    source.setAttribute('src', './assets/backprop_signal_flow.mp4');
    source.setAttribute('type', 'video/mp4');
    video.appendChild(source);
    media.appendChild(video);
    media.appendChild(el('div', { class: 'caption' }, [
      el('span', { text: '动画 · 一次完整反向传播（4 个阶段）' }),
      el('span', { text: '蓝=前向　红=Loss　紫=梯度反向　绿=更新' })
    ]));
    wrap.appendChild(media);

    wrap.appendChild(feedbackBar(0));

    if (state.played.forward) {
      updateMetric(panel, '预测 y\u2032', net.predictionBefore.toFixed(2));
      nextBtn.removeAttribute('disabled');
    }

    var isPlaying = false;
    playBtn.addEventListener('click', function () {
      if (isPlaying) return;
      isPlaying = true;
      playBtn.setAttribute('disabled', 'disabled');
      pulseEdges(netBox, 'forward');
      setTimeout(function () {
        updateMetric(panel, '预测 y\u2032', net.predictionBefore.toFixed(2));
        state.played.forward = true;
        nextBtn.removeAttribute('disabled');
        setFeedback(0, '前向算出 y\u2032 = ' + net.predictionBefore.toFixed(2) +
                       '，离真实 ' + net.target.toFixed(2) + ' 还差不少。', 'forward');
        renderProgress();
        renderPager();
        playBtn.removeAttribute('disabled');
        isPlaying = false;
      }, 900);
    });
    nextBtn.addEventListener('click', function () { goToScene(1); });
    return wrap;
  }

  // ---------- Scene 1: Loss ----------

  function buildScene1() {
    var wrap = el('section', { class: 't07-scene', 'data-scene-index': 1 });
    wrap.appendChild(sceneHead(1));

    var diff = net.target - net.predictionBefore;
    var loss = diff * diff;

    var leftBox = el('div', { class: 't07-network' });
    leftBox.classList.add('t07-stack');
    leftBox.appendChild(el('div', {
      class: 't07-metric t07-metric-lg tone-forward'
    }, [
      el('span', { class: 'label', text: '预测 y\u2032' }),
      el('span', { class: 'value', text: net.predictionBefore.toFixed(2) })
    ]));
    leftBox.appendChild(el('div', {
      class: 't07-metric t07-metric-lg'
    }, [
      el('span', { class: 'label', text: '真实 y' }),
      el('span', { class: 'value', text: net.target.toFixed(2) })
    ]));
    var lossMetric = el('div', {
      class: 't07-metric t07-metric-lg tone-loss'
    }, [
      el('span', { class: 'label', text: 'Loss = (y − y\u2032)\u00B2' }),
      el('span', { class: 'value', text: '—', 'data-metric-value': 'Loss' })
    ]);
    leftBox.appendChild(lossMetric);
    wrap.appendChild(leftBox);

    var panel = el('div', { class: 't07-panel' });
    panel.appendChild(el('h3', { text: 'Loss 是什么' }));
    var note = el('p', {
      text: '把预测和真实之间的差变成一个具体数字。这个数字越大，模型说明欠改得越多；它也是反向传播的“起点信号”。',
      class: 't07-note'
    });
    panel.appendChild(note);
    var actions = el('div', { class: 't07-actions-row' });
    var calcBtn = setTracking(el('button', {
      class: 't07-action primary', type: 'button', text: '计算 Loss'
    }), 't07_calc_loss', 'loss_calc');
    var nextBtn = setTracking(el('button', {
      class: 't07-action ghost', type: 'button', text: '把误差送回去 →', disabled: 'disabled'
    }), 't07_to_backward', 'loss_next');
    actions.appendChild(calcBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(1));

    if (state.played.loss) {
      updateMetric(wrap, 'Loss', loss.toFixed(2));
      nextBtn.removeAttribute('disabled');
    }

    calcBtn.addEventListener('click', function () {
      updateMetric(wrap, 'Loss', loss.toFixed(2));
      state.played.loss = true;
      nextBtn.removeAttribute('disabled');
      setFeedback(1, '差距 ' + diff.toFixed(2) + ' → 平方得 Loss = ' + loss.toFixed(2) +
                     '。这个数会被送回网络里逐层分摊。', 'loss');
      renderProgress();
      renderPager();
    });
    nextBtn.addEventListener('click', function () { goToScene(2); });
    return wrap;
  }

  // ---------- Scene 2: Backward ----------

  function buildScene2() {
    var wrap = el('section', { class: 't07-scene', 'data-scene-index': 2 });
    wrap.appendChild(sceneHead(2));

    var netBox = el('div', { class: 't07-network' });
    netBox.appendChild(buildNetworkSvg());
    wrap.appendChild(netBox);

    var panel = el('div', { class: 't07-panel' });
    panel.appendChild(el('h3', { text: '每条权重拿到了多少梯度' }));
    var gradList = el('div', { class: 't07-grad-list' });
    fakeGrads.forEach(function (g) {
      var row = el('div', {
        class: 't07-metric tone-grad',
        'data-grad': g.name
      }, [
        el('span', { class: 'label', text: g.name }),
        el('span', { class: 'value', text: '—', 'data-metric-value': g.name })
      ]);
      row.style.opacity = '0.35';
      gradList.appendChild(row);
    });
    panel.appendChild(gradList);

    var actions = el('div', { class: 't07-actions-row' });
    var playBtn = setTracking(el('button', {
      class: 't07-action primary', type: 'button', text: '播放反向传播'
    }), 't07_play_backward', 'backward_play');
    var nextBtn = setTracking(el('button', {
      class: 't07-action ghost', type: 'button', text: '更新权重 →', disabled: 'disabled'
    }), 't07_to_update', 'backward_next');
    actions.appendChild(playBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(2));

    if (state.played.backward) {
      renderGradRows(gradList);
      nextBtn.removeAttribute('disabled');
    }

    var isPlaying = false;
    playBtn.addEventListener('click', function () {
      if (isPlaying) return;
      isPlaying = true;
      playBtn.setAttribute('disabled', 'disabled');
      pulseEdges(netBox, 'backward');
      fakeGrads.forEach(function (g, idx) {
        setTimeout(function () {
          var node = gradList.querySelector('[data-grad="' + g.name + '"]');
          if (!node) return;
          node.style.opacity = '1';
          var v = node.querySelector('.value');
          v.textContent = (g.val > 0 ? '+' : '') + g.val.toFixed(2);
        }, 280 + idx * 140);
      });
      setTimeout(function () {
        state.played.backward = true;
        nextBtn.removeAttribute('disabled');
        setFeedback(2, '梯度沿着网络逆着走了一趟，每条边都拿到了自己的 ∂L/∂w。', 'grad');
        renderProgress();
        renderPager();
        playBtn.removeAttribute('disabled');
        isPlaying = false;
      }, 280 + fakeGrads.length * 140 + 250);
    });
    nextBtn.addEventListener('click', function () { goToScene(3); });
    return wrap;
  }

  // ---------- Scene 3: Update ----------

  function buildScene3() {
    var wrap = el('section', { class: 't07-scene', 'data-scene-index': 3 });
    wrap.appendChild(sceneHead(3));

    var netBox = el('div', { class: 't07-network' });
    netBox.appendChild(buildNetworkSvg());
    wrap.appendChild(netBox);

    var panel = el('div', { class: 't07-panel' });
    panel.appendChild(el('h3', { text: '更新规则' }));
    panel.appendChild(el('div', {
      class: 't07-metric t07-formula tone-update'
    }, [
      el('span', { class: 'label', text: '公式' }),
      el('span', { class: 'value', text: 'w ← w − η · ∂L/∂w' })
    ]));
    panel.appendChild(metric('学习率 η', '0.10', 'update'));
    panel.appendChild(metric('Loss 更新前', '0.34', 'loss'));
    panel.appendChild(metric('Loss 更新后', '—', 'update'));

    var actions = el('div', { class: 't07-actions-row' });
    var stepBtn = setTracking(el('button', {
      class: 't07-action success', type: 'button', text: '执行更新'
    }), 't07_apply_update', 'update_apply');
    var resetBtn = setTracking(el('button', {
      class: 't07-action ghost', type: 'button', text: '回到初始'
    }), 't07_reset_update', 'update_reset');
    var nextBtn = setTracking(el('button', {
      class: 't07-action ghost', type: 'button', text: '看训练循环 →', disabled: 'disabled'
    }), 't07_to_loop', 'update_next');
    actions.appendChild(stepBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(3));

    if (state.played.update) {
      markWeightsUpdated(netBox);
      updateMetric(wrap, 'Loss 更新后', '0.08');
      nextBtn.removeAttribute('disabled');
    }

    var isPlaying = false;
    stepBtn.addEventListener('click', function () {
      if (isPlaying) return;
      isPlaying = true;
      stepBtn.setAttribute('disabled', 'disabled');
      markWeightsUpdated(netBox);
      pulseEdges(netBox, 'forward');
      setTimeout(function () {
        updateMetric(wrap, 'Loss 更新后', '0.08');
        state.played.update = true;
        nextBtn.removeAttribute('disabled');
        setFeedback(3, '所有权重一起挪了一小步。再做一次前向，预测 y\u2032 = ' +
                        net.predictionAfter.toFixed(2) + '，Loss 从 0.34 降到 0.08。', 'update');
        renderProgress();
        renderPager();
        stepBtn.removeAttribute('disabled');
        isPlaying = false;
      }, 700);
    });
    resetBtn.addEventListener('click', function () {
      resetNetwork(netBox);
      updateMetric(wrap, 'Loss 更新后', '—');
    });
    nextBtn.addEventListener('click', function () { goToScene(4); });
    return wrap;
  }

  // ---------- Scene 4: Training loop ----------

  var CURVE_GEOM = { width: 480, height: 280, pad: 32 };

  function curvePoint(x, y) {
    var w = CURVE_GEOM.width;
    var h = CURVE_GEOM.height;
    var pad = CURVE_GEOM.pad;
    var px = pad + ((x + 1.05) / 2.1) * (w - 2 * pad);
    var py = (h / 2) - y * ((h / 2 - pad) / 0.8);
    return { x: px, y: py };
  }

  function curvePath(ys) {
    return curve.xs.map(function (x, i) {
      var p = curvePoint(x, ys[i]);
      return (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }).join(' ');
  }

  function buildScene4() {
    var wrap = el('section', { class: 't07-scene', 'data-scene-index': 4 });
    wrap.appendChild(sceneHead(4));

    var loopBox = el('div', { class: 't07-loop' });

    var curveBox = el('div', { class: 't07-curve' });
    var curveSvg = svg('svg', { viewBox: '0 0 ' + CURVE_GEOM.width + ' ' + CURVE_GEOM.height });
    // axes
    curveSvg.appendChild(svg('line', {
      x1: CURVE_GEOM.pad, y1: CURVE_GEOM.height / 2,
      x2: CURVE_GEOM.width - CURVE_GEOM.pad, y2: CURVE_GEOM.height / 2,
      class: 't07-curve-axis'
    }));
    curveSvg.appendChild(svg('line', {
      x1: CURVE_GEOM.pad, y1: CURVE_GEOM.pad,
      x2: CURVE_GEOM.pad, y2: CURVE_GEOM.height - CURVE_GEOM.pad,
      class: 't07-curve-axis'
    }));
    // target curve
    var target = svg('path', {
      class: 't07-curve-target',
      d: curvePath(curve.target)
    });
    curveSvg.appendChild(target);
    // sample dots
    curve.xs.forEach(function (x, i) {
      var p = curvePoint(x, curve.target[i]);
      curveSvg.appendChild(svg('circle', {
        cx: p.x, cy: p.y, r: 4, class: 't07-curve-sample'
      }));
    });
    // initial prediction line
    var pred = svg('path', {
      class: 't07-curve-pred',
      d: curvePath(curve.steps[0].line),
      'data-pred-line': 'true'
    });
    curveSvg.appendChild(pred);
    curveBox.appendChild(curveSvg);
    loopBox.appendChild(curveBox);

    var rightCol = el('div', { class: 't07-loss-bars' });
    rightCol.appendChild(el('h3', { class: 't07-panel-title', text: 'Loss 每轮快照' }));
    var bars = el('div', { class: 't07-bars' });
    var maxLoss = curve.steps[0].loss;
    curve.steps.forEach(function (st, idx) {
      var bar = el('div', { class: 't07-bar', 'data-bar-index': idx });
      bar.appendChild(el('div', { class: 'val', text: st.loss.toFixed(2) }));
      bar.appendChild(el('div', { class: 'fill' }));
      bar.appendChild(el('div', { class: 'cap', text: 'E' + st.epoch }));
      bars.appendChild(bar);
    });
    rightCol.appendChild(bars);

    var controls = el('div', { class: 't07-epoch-controls' });
    var epochButtons = [];
    curve.steps.forEach(function (st, idx) {
      var btn = setTracking(el('button', {
        class: 't07-action ghost', type: 'button',
        text: '执行 Epoch ' + st.epoch
      }), 't07_run_epoch_' + st.epoch, 'epoch_run', { epoch: st.epoch });
      btn.addEventListener('click', function () { runEpoch(idx); });
      epochButtons.push(btn);
      controls.appendChild(btn);
    });
    var resetBtn = setTracking(el('button', {
      class: 't07-action ghost', type: 'button', text: '重置'
    }), 't07_reset_loop', 'loop_reset');
    resetBtn.addEventListener('click', function () { resetLoop(); });
    controls.appendChild(resetBtn);
    rightCol.appendChild(controls);

    var summary = el('div', { class: 't07-status-card' }, [
      el('h3', { class: 't07-panel-title', text: '训练进度' }),
      el('div', { class: 't07-status-row' }, [
        el('div', null, [
          el('strong', { text: '4 个 Epoch' }),
          el('p', { class: 't07-status-copy', text: '按顺序跑完，才能进入最后的概念检查。' })
        ]),
        el('div', { class: 't07-status-meta' }, [
          el('span', { class: 't07-status-value', text: '0 / 4', 'data-scene4-progress': 'value' }),
          el('span', { class: 't07-status-badge is-pending', text: '进行中', 'data-scene4-progress': 'badge' })
        ])
      ]),
      el('div', { class: 't07-status-row' }, [
        el('div', null, [
          el('strong', { text: '检查题' }),
          el('p', { class: 't07-status-copy', text: '答对后，这一关才算真正完成。' })
        ]),
        el('div', { class: 't07-status-meta' }, [
          el('span', { class: 't07-status-value', text: '未解锁', 'data-scene4-quiz': 'value' }),
          el('span', { class: 't07-status-badge is-locked', text: '锁定', 'data-scene4-quiz': 'badge' })
        ])
      ]),
      el('p', { class: 't07-status-note', 'data-scene4-note': 'true' })
    ]);
    rightCol.appendChild(summary);
    loopBox.appendChild(rightCol);

    wrap.appendChild(loopBox);
    wrap.appendChild(feedbackBar(4));
    var quizHost = el('div', { 'data-scene4-quiz-host': 'true' });
    wrap.appendChild(quizHost);

    function setScene4Status(key, value, badgeText, badgeClass) {
      var valueNode = summary.querySelector('[data-scene4-' + key + '="value"]');
      var badgeNode = summary.querySelector('[data-scene4-' + key + '="badge"]');
      if (valueNode) valueNode.textContent = value;
      if (badgeNode) {
        badgeNode.textContent = badgeText;
        badgeNode.className = 't07-status-badge ' + badgeClass;
      }
    }

    function refreshScene4() {
      var done = completedEpochCount();
      var stepIndex = currentCurveStepIndex();
      pred.setAttribute('d', curvePath(curve.steps[stepIndex].line));

      bars.querySelectorAll('.t07-bar').forEach(function (bar, idx) {
        var active = !!state.epochsDone[idx];
        bar.classList.toggle('is-done', active);
        bar.querySelector('.fill').style.height = active
          ? Math.round((curve.steps[idx].loss / maxLoss) * 100) + '%'
          : '0%';
      });

      epochButtons.forEach(function (btn, idx) {
        var completed = !!state.epochsDone[idx];
        var unlocked = idx === 0 || !!state.epochsDone[idx - 1];
        btn.classList.toggle('is-complete', completed);
        btn.textContent = completed ? ('Epoch ' + curve.steps[idx].epoch + ' 已完成') : ('执行 Epoch ' + curve.steps[idx].epoch);
        if (!completed && !unlocked) {
          btn.setAttribute('disabled', 'disabled');
          btn.setAttribute('title', '先完成前面的 epoch');
        } else {
          btn.removeAttribute('disabled');
          btn.removeAttribute('title');
        }
      });

      setScene4Status(
        'progress',
        done + ' / ' + curve.steps.length,
        allEpochsDone() ? '已完成' : '进行中',
        allEpochsDone() ? 'is-done' : 'is-pending'
      );
      setScene4Status(
        'quiz',
        allEpochsDone() ? (state.quizDone ? '已完成' : '待作答') : '未解锁',
        allEpochsDone() ? (state.quizDone ? '通过' : '待完成') : '锁定',
        allEpochsDone() ? (state.quizDone ? 'is-done' : 'is-pending') : 'is-locked'
      );

      var note = summary.querySelector('[data-scene4-note="true"]');
      if (note) {
        if (!allEpochsDone()) {
          note.textContent = '先把 4 轮训练跑完，再做最后一道检查题。';
        } else if (!state.quizDone) {
          note.textContent = '训练循环已经走通了，现在用一道题把概念收束住。';
        } else {
          note.textContent = '训练循环和概念检查都已完成，可以通过顶部进度回看任意一屏。';
        }
      }

      quizHost.innerHTML = '';
      quizHost.appendChild(allEpochsDone() ? buildQuiz(refreshScene4) : buildQuizLock());
    }

    function runEpoch(idx) {
      if (idx > 0 && !state.epochsDone[idx - 1]) {
        setFeedback(4, '先把前面的 epoch 跑一遍。', 'loss');
        return;
      }
      if (state.epochsDone[idx]) {
        setFeedback(4, 'Epoch ' + curve.steps[idx].epoch + ' 已完成，可以继续下一轮或直接重置。', 'forward');
        refreshScene4();
        return;
      }
      var st = curve.steps[idx];
      pred.setAttribute('d', curvePath(st.line));
      var bar = bars.querySelector('[data-bar-index="' + idx + '"]');
      bar.classList.add('is-done');
      var fill = bar.querySelector('.fill');
      fill.style.height = Math.round((st.loss / maxLoss) * 100) + '%';
      state.epochsDone[idx] = true;
      var done = completedEpochCount();
      setFeedback(4, 'Epoch ' + st.epoch + ' 跑完：Loss = ' + st.loss.toFixed(2) +
                     '，预测曲线又贴近了一点。已完成 ' + done + ' / 4 轮。' +
                     (done === curve.steps.length ? ' 现在可以做最后的检查题了。' : ''),
                     done === curve.steps.length ? 'update' : 'grad');
      renderProgress();
      renderPager();
      refreshScene4();
    }

    function resetLoop() {
      state.epochsDone = { 0: false, 1: false, 2: false, 3: false };
      state.quizChoice = '';
      state.quizDone = false;
      pred.setAttribute('d', curvePath(curve.steps[0].line));
      bars.querySelectorAll('.t07-bar').forEach(function (b) {
        b.classList.remove('is-done');
        b.querySelector('.fill').style.height = '0%';
      });
      setFeedback(4, '已重置。可以重新跑一遍 4 轮训练。', '');
      renderProgress();
      renderPager();
      refreshScene4();
    }

    refreshScene4();
    return wrap;
  }

  function buildQuiz(refreshScene4) {
    var quiz = guide.quiz;
    var box = el('div', { class: 't07-quiz' });
    box.appendChild(el('h3', { text: quiz.question }));
    var opts = el('div', { class: 'options' });
    quiz.options.forEach(function (op) {
      var btn = setTracking(el('button', {
        class: 't07-quiz .option' /* placeholder */
      }), 't07_quiz_' + op.key, 'quiz_pick', { option: op.key });
      btn.className = 'option';
      btn.type = 'button';
      btn.innerHTML = '<strong>' + op.label + '.</strong> ' + op.text;
      if (state.quizChoice === op.key) {
        btn.classList.add(op.correct ? 'is-correct' : 'is-wrong');
      }
      if (state.quizDone) {
        btn.setAttribute('disabled', 'disabled');
      }
      btn.addEventListener('click', function () {
        if (state.quizDone) return;
        state.quizChoice = op.key;
        opts.querySelectorAll('.option').forEach(function (b) {
          b.classList.remove('is-correct', 'is-wrong');
        });
        if (op.correct) {
          btn.classList.add('is-correct');
          state.quizDone = true;
          setFeedback(4, '✔ 选对了，反向传播就是这样按贡献分配责任的。', 'update');
          renderProgress();
          renderPager();
        } else {
          btn.classList.add('is-wrong');
          setFeedback(4, '再想想：反向传播并不是均摊或只更新最后一层。', 'loss');
        }
        if (refreshScene4) refreshScene4();
      });
      opts.appendChild(btn);
    });
    box.appendChild(opts);
    if (state.quizDone) {
      box.appendChild(el('p', {
        class: 't07-quiz-note',
        text: '检查题已通过，这一屏现在会在顶部进度中显示为“已完成”。'
      }));
    }
    return box;
  }

  function buildQuizLock() {
    return el('div', { class: 't07-quiz t07-quiz-locked' }, [
      el('h3', { text: '概念检查题将于 4 个 Epoch 全部完成后解锁' }),
      el('p', {
        class: 't07-quiz-note',
        text: '先把训练循环完整跑通，再用最后一道题确认“梯度负责分配责任、参数沿反方向更新”这两个关键点。'
      })
    ]);
  }

  // ---------- mount ----------

  function mount() {
    sceneBuilders = [buildScene0, buildScene1, buildScene2, buildScene3, buildScene4];
    window.addEventListener('hashchange', function () { showScene(sceneFromHash()); });
    showScene(sceneFromHash());
  }

  mount();
}());
