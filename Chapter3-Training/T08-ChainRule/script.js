(function () {
  'use strict';

  var guide = window.T08_GUIDE;
  var scenes = guide.scenes;
  var chain = guide.chain;
  var network = guide.network;

  var state = {
    scene: 0,
    maxScene: 0,
    chainViewed: false,
    segmentsDone: {},
    multiplyDone: false,
    backpropDone: false,
    hiddenDone: { h1: false, h2: false, h3: false },
    feedback: {},
    quizChoice: '',
    quizDone: false
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var scenePager = document.getElementById('scenePager');

  var sceneBuilders = null; // populated in render()

  var defaultFeedback = [
    '先把这条链看清：w → z → h → y\u2032 → Loss，五个节点四段边。',
    '依次点击四段边，每段都做一个"轻轻拨一下"的小实验。',
    '点击 合成总影响，让四张局部偏导卡按顺序拼成总梯度。',
    '先回传到隐藏层，再点开每个 h_i 看它自己的局部链。',
    '挑一个最准确的描述，把链式法则用自己的话讲清楚。'
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
      bar.className = 't08-feedback' + (tone ? ' tone-' + tone : '');
    }
  }

  function feedbackFor(idx) {
    return state.feedback[idx] || { text: defaultFeedback[idx], tone: '' };
  }

  function allSegmentsDone() {
    return chain.segments.every(function (s) { return state.segmentsDone[s.id]; });
  }

  function allHiddenDone() {
    return network.hidden.every(function (h) { return state.hiddenDone[h.id]; });
  }

  function sceneReady(idx) {
    if (idx === 0) return state.chainViewed;
    if (idx === 1) return allSegmentsDone();
    if (idx === 2) return state.multiplyDone;
    if (idx === 3) return state.backpropDone && allHiddenDone();
    if (idx === 4) return state.quizDone;
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

  // ---------- progress nav ----------

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
      setTracking(btn, 't08_progress_step_' + (idx + 1), 'progress_jump', { scene: idx + 1 });
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
      class: 't08-pager-btn ghost',
      type: 'button',
      text: '\u2190 \u4e0a\u4e00\u8282'
    });
    if (prevIdx < 0) {
      prev.setAttribute('disabled', 'disabled');
    } else {
      prev.title = scenes[prevIdx] ? scenes[prevIdx].pill : '';
      prev.addEventListener('click', function () { goToScene(prevIdx); });
    }
    setTracking(prev, 't08_pager_prev', 'pager_prev', { scene: idx + 1 });

    var counter = el('span', {
      class: 't08-pager-counter',
      text: (idx + 1) + ' / ' + scenes.length + ' · ' + (scenes[idx] ? scenes[idx].pill : '')
    });

    var next = el('button', {
      class: 't08-pager-btn primary',
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
    setTracking(next, 't08_pager_next', 'pager_next', { scene: idx + 1 });

    scenePager.appendChild(prev);
    scenePager.appendChild(counter);
    scenePager.appendChild(next);
  }

  // ---------- chain SVG ----------

  // Geometry for a horizontal chain of 5 nodes.
  var CHAIN_GEOM = {
    width: 560,
    height: 220,
    yMid: 110,
    margin: 60,
    nodeR: 26
  };

  function chainNodePos(idx) {
    var n = chain.nodes.length;
    var span = CHAIN_GEOM.width - CHAIN_GEOM.margin * 2;
    var step = span / (n - 1);
    return { x: CHAIN_GEOM.margin + idx * step, y: CHAIN_GEOM.yMid };
  }

  function buildChainSvg(opts) {
    opts = opts || {};
    var root = svg('svg', { viewBox: '0 0 ' + CHAIN_GEOM.width + ' ' + CHAIN_GEOM.height });
    var edgeLayer = svg('g', { class: 't08-chain-edges' });
    var pulseLayer = svg('g', { class: 't08-chain-pulses' });
    var tagLayer = svg('g', { class: 't08-chain-tags' });
    var nodeLayer = svg('g', { class: 't08-chain-nodes' });

    chain.segments.forEach(function (seg, i) {
      var aIdx = i;
      var bIdx = i + 1;
      var a = chainNodePos(aIdx);
      var b = chainNodePos(bIdx);
      var line = svg('line', {
        x1: a.x + CHAIN_GEOM.nodeR, y1: a.y,
        x2: b.x - CHAIN_GEOM.nodeR, y2: b.y,
        class: 't08-chain-edge', 'data-edge': seg.id
      });
      if (opts.clickable) line.style.cursor = 'pointer';
      edgeLayer.appendChild(line);

      var pulse = svg('line', {
        x1: a.x + CHAIN_GEOM.nodeR, y1: a.y,
        x2: b.x - CHAIN_GEOM.nodeR, y2: b.y,
        class: 't08-chain-pulse', 'data-pulse': seg.id, stroke: '#7c3aed'
      });
      pulseLayer.appendChild(pulse);

      var tag = svg('text', {
        x: (a.x + b.x) / 2, y: a.y - 18,
        class: 't08-edge-tag', 'data-tag': seg.id
      });
      tag.textContent = seg.label;
      tagLayer.appendChild(tag);
    });

    chain.nodes.forEach(function (n, i) {
      var c = chainNodePos(i);
      var klass = 't08-chain-node';
      if (n.role === 'loss') klass += ' is-loss';
      if (n.role === 'param') klass += ' is-param';
      var circle = svg('circle', {
        cx: c.x, cy: c.y, r: CHAIN_GEOM.nodeR,
        class: klass, 'data-node': n.id
      });
      var t = svg('text', { x: c.x, y: c.y, class: 't08-chain-label' });
      t.textContent = n.label;
      nodeLayer.appendChild(circle);
      nodeLayer.appendChild(t);
    });

    root.appendChild(edgeLayer);
    root.appendChild(pulseLayer);
    root.appendChild(tagLayer);
    root.appendChild(nodeLayer);
    return root;
  }

  function pulseChainSegment(scope, segId, color) {
    var pulse = scope.querySelector('[data-pulse="' + segId + '"]');
    if (!pulse) return;
    pulse.setAttribute('stroke', color || '#7c3aed');
    pulse.classList.remove('is-active');
    void pulse.getBoundingClientRect();
    pulse.classList.add('is-active');
  }

  // ---------- shared scene head ----------

  function sceneHead(idx) {
    var s = scenes[idx];
    var head = el('div', { class: 't08-scene-head' });
    var left = el('div', null, [
      el('span', { class: 'pill', text: s.pill }),
      el('h2', { text: s.title }),
      el('p', { class: 't08-goal', text: s.goal }),
      el('p', { class: 't08-concept', text: s.concept })
    ]);
    var ul = el('ul', { class: 't08-tasks' });
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
      class: 't08-feedback' + (fb.tone ? ' tone-' + fb.tone : ''),
      text: fb.text,
      'data-feedback-for': idx
    });
  }

  // ---------- Scene 0: chain unrolled ----------

  function buildScene0() {
    var wrap = el('section', { class: 't08-scene', 'data-scene-index': 0 });
    wrap.appendChild(sceneHead(0));

    var chainBox = el('div', { class: 't08-chain' });
    chainBox.appendChild(buildChainSvg({ clickable: false }));
    wrap.appendChild(chainBox);

    var panel = el('div', { class: 't08-panel' });
    panel.appendChild(el('h3', { text: '链条上的每个量' }));
    var nodeList = el('div', { class: 't08-formula' });
    chain.nodes.forEach(function (n) {
      var line = el('div');
      var nameSpan = el('span', { class: n.role === 'param' ? 'par' : (n.role === 'loss' ? 'loss' : 'var'), text: n.label });
      line.appendChild(nameSpan);
      line.appendChild(document.createTextNode('  ' + n.desc));
      nodeList.appendChild(line);
    });
    panel.appendChild(nodeList);

    var actions = el('div', { class: 't08-actions-row' });
    var seeBtn = setTracking(el('button', {
      class: 't08-action primary', type: 'button', text: '看清这条链'
    }), 't08_scene0_view_chain', 'chain_view');
    var nextBtn = setTracking(el('button', {
      class: 't08-action ghost', type: 'button', text: '开始拨动局部 →', disabled: 'disabled'
    }), 't08_scene0_next', 'chain_next');
    actions.appendChild(seeBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(0));

    seeBtn.addEventListener('click', function () {
      // Light up segments left-to-right.
      chain.segments.forEach(function (seg, i) {
        var edge = chainBox.querySelector('[data-edge="' + seg.id + '"]');
        if (edge) {
          edge.classList.remove('is-cool');
          edge.classList.add('is-hot');
        }
        setTimeout(function () { pulseChainSegment(chainBox, seg.id, '#2563eb'); }, i * 220);
      });
      state.chainViewed = true;
      nextBtn.removeAttribute('disabled');
      setFeedback(0, '看清了：链条上每一段都是一个简单的局部关系。下一画面我们去拨动每一段。', 'grad');
      renderProgress();
    });
    nextBtn.addEventListener('click', function () { goToScene(1); });
    return wrap;
  }

  // ---------- Scene 1: local effects ----------

  function buildScene1() {
    var wrap = el('section', { class: 't08-scene', 'data-scene-index': 1 });
    wrap.appendChild(sceneHead(1));

    var chainBox = el('div', { class: 't08-chain' });
    chainBox.appendChild(buildChainSvg({ clickable: true }));
    wrap.appendChild(chainBox);

    var panel = el('div', { class: 't08-panel' });
    panel.appendChild(el('h3', { text: '四段局部偏导' }));

    var grid = el('div', { class: 't08-localgrid' });
    chain.segments.forEach(function (seg) {
      var card = el('div', { class: 't08-local', 'data-local': seg.id });
      card.appendChild(el('div', { class: 'lhead', text: seg.label }));
      card.appendChild(el('div', { class: 'ltext', text: seg.local }));
      grid.appendChild(card);
    });
    panel.appendChild(grid);

    var actions = el('div', { class: 't08-actions-row' });
    var nextBtn = setTracking(el('button', {
      class: 't08-action ghost', type: 'button', text: '把四段拼起来 →', disabled: 'disabled'
    }), 't08_scene1_next', 'segments_next');
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(1));

    function handleSegment(seg) {
      var edge = chainBox.querySelector('[data-edge="' + seg.id + '"]');
      var tag = chainBox.querySelector('[data-tag="' + seg.id + '"]');
      if (edge) edge.classList.add('is-hot');
      if (tag) tag.classList.add('is-hot');
      pulseChainSegment(chainBox, seg.id, '#7c3aed');
      var card = panel.querySelector('[data-local="' + seg.id + '"]');
      if (card) card.classList.add('is-done');
      state.segmentsDone[seg.id] = true;
      setFeedback(1, seg.intuition, 'grad');
      if (allSegmentsDone()) {
        nextBtn.removeAttribute('disabled');
        setFeedback(1, '四段局部都试过了。下一画面把它们按顺序乘起来，就是链式法则。', 'update');
      }
      renderProgress();
    }

    chain.segments.forEach(function (seg) {
      var edge = chainBox.querySelector('[data-edge="' + seg.id + '"]');
      var tag = chainBox.querySelector('[data-tag="' + seg.id + '"]');
      var card = panel.querySelector('[data-local="' + seg.id + '"]');
      var trigger = function () { handleSegment(seg); };
      if (edge) edge.addEventListener('click', trigger);
      if (tag) tag.addEventListener('click', trigger);
      if (card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', trigger);
      }
    });

    nextBtn.addEventListener('click', function () { goToScene(2); });
    return wrap;
  }

  // ---------- Scene 2: multiplication ----------

  function buildScene2() {
    var wrap = el('section', { class: 't08-scene', 'data-scene-index': 2 });
    wrap.appendChild(sceneHead(2));

    var chainBox = el('div', { class: 't08-chain' });
    chainBox.appendChild(buildChainSvg({ clickable: false }));
    // visually: keep all edges hot in this scene
    chain.segments.forEach(function (seg) {
      var edge = chainBox.querySelector('[data-edge="' + seg.id + '"]');
      var tag = chainBox.querySelector('[data-tag="' + seg.id + '"]');
      if (edge) edge.classList.add('is-hot');
      if (tag) tag.classList.add('is-hot');
    });
    wrap.appendChild(chainBox);

    var panel = el('div', { class: 't08-panel' });
    panel.appendChild(el('h3', { text: '链式法则' }));
    panel.appendChild(el('div', { class: 't08-formula', text: chain.productLabel }));
    var actions = el('div', { class: 't08-actions-row' });
    var playBtn = setTracking(el('button', {
      class: 't08-action primary', type: 'button', text: '合成总影响'
    }), 't08_scene2_compose', 'chain_compose');
    var resetBtn = setTracking(el('button', {
      class: 't08-action ghost', type: 'button', text: '再做一次'
    }), 't08_scene2_reset', 'chain_reset');
    var nextBtn = setTracking(el('button', {
      class: 't08-action ghost', type: 'button', text: '下一画面 →', disabled: 'disabled'
    }), 't08_scene2_next', 'chain_next');
    actions.appendChild(playBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    // Multiply lane
    var mul = el('div', { class: 't08-multiply' });
    mul.appendChild(el('h3', { text: 'dL/dw  =  ?' }));
    var row = el('div', { class: 't08-mul-row' });
    chain.productOrder.forEach(function (segId, i) {
      if (i > 0) row.appendChild(el('div', { class: 't08-mul-op', text: '×' }));
      row.appendChild(el('div', { class: 't08-mul-slot', 'data-slot': segId, text: '[   ]' }));
    });
    mul.appendChild(row);
    var result = el('div', { class: 't08-mul-result', 'data-result': '' });
    result.innerHTML = '<span class="head">dL/dw</span><span class="equal">=</span>' +
      "∂L/∂y\u2032 · ∂y\u2032/∂h · ∂h/∂z · ∂z/∂w";
    mul.appendChild(result);
    wrap.appendChild(mul);

    wrap.appendChild(feedbackBar(2));

    function resetSlots() {
      chain.productOrder.forEach(function (segId) {
        var slot = mul.querySelector('[data-slot="' + segId + '"]');
        if (slot) {
          slot.classList.remove('is-filled');
          slot.textContent = '[   ]';
        }
      });
      result.classList.remove('is-shown');
    }

    function composeOnce() {
      resetSlots();
      // Pulse along the chain in reverse direction (Loss -> w) to mirror backprop
      chain.productOrder.forEach(function (segId, i) {
        setTimeout(function () {
          var slot = mul.querySelector('[data-slot="' + segId + '"]');
          var seg = chain.segments.find(function (s) { return s.id === segId; });
          if (slot && seg) {
            slot.classList.add('is-filled');
            slot.textContent = seg.label;
          }
          pulseChainSegment(chainBox, segId, '#7c3aed');
        }, i * 420);
      });
      setTimeout(function () {
        result.classList.add('is-shown');
        state.multiplyDone = true;
        nextBtn.removeAttribute('disabled');
        setFeedback(2, '链式法则就是把沿途每一段局部影响乘起来，得到远处参数对 Loss 的总影响。', 'update');
        renderProgress();
      }, chain.productOrder.length * 420 + 200);
    }

    playBtn.addEventListener('click', composeOnce);
    resetBtn.addEventListener('click', function () {
      resetSlots();
      setFeedback(2, '清空了。再点 合成总影响，看一遍四段是怎么相乘的。', 'grad');
    });
    nextBtn.addEventListener('click', function () { goToScene(3); });

    // Optional inline video
    var media = el('div', { class: 't08-media' });
    var video = el('video', {
      controls: true, preload: 'metadata',
      poster: './assets/chain_rule_unrolled_poster.png'
    });
    var source = el('source');
    source.setAttribute('src', './assets/chain_rule_unrolled.mp4');
    source.setAttribute('type', 'video/mp4');
    video.appendChild(source);
    media.appendChild(video);
    media.appendChild(el('div', { class: 'caption' }, [
      el('span', { text: '动画 · 链条拨动 → 四段局部相乘' }),
      el('span', { text: '蓝=链条　紫=梯度反向　绿=总梯度' })
    ]));
    wrap.appendChild(media);

    return wrap;
  }

  // ---------- Scene 3: multi-neuron sharing ----------

  var NET_GEOM = {
    width: 560,
    height: 300,
    xInput: 70,
    xHidden: 280,
    xOutput: 460,
    yMid: 150,
    spacing: 90,
    nodeR: 28
  };

  function netPos(kind, idx) {
    if (kind === 'input') return { x: NET_GEOM.xInput, y: NET_GEOM.yMid };
    if (kind === 'output') return { x: NET_GEOM.xOutput, y: NET_GEOM.yMid - 30 };
    if (kind === 'loss')   return { x: NET_GEOM.xOutput + 20, y: NET_GEOM.yMid + 80 };
    var n = network.hidden.length;
    var startY = NET_GEOM.yMid - ((n - 1) / 2) * NET_GEOM.spacing;
    return { x: NET_GEOM.xHidden, y: startY + idx * NET_GEOM.spacing };
  }

  function buildNetworkSvg() {
    var root = svg('svg', { viewBox: '0 0 ' + NET_GEOM.width + ' ' + NET_GEOM.height });
    var edgeLayer = svg('g', { class: 't08-net-edges' });
    var pulseLayer = svg('g', { class: 't08-net-pulses' });
    var nodeLayer = svg('g', { class: 't08-net-nodes' });

    // input -> hidden
    network.hidden.forEach(function (h, i) {
      var a = netPos('input');
      var b = netPos('hidden', i);
      var strong = Math.abs(h.weight) > 0.5;
      var line = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't08-net-edge ' + (strong ? 'is-strong' : 'is-faint'),
        'data-edge': 'in-' + h.id
      });
      edgeLayer.appendChild(line);
      var pulse = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't08-net-pulse', 'data-pulse': 'in-' + h.id, stroke: '#2563eb'
      });
      pulseLayer.appendChild(pulse);
    });
    // hidden -> output
    network.hidden.forEach(function (h, i) {
      var a = netPos('hidden', i);
      var b = netPos('output');
      var strong = Math.abs(h.weight) > 0.5;
      var line = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't08-net-edge ' + (strong ? 'is-strong' : 'is-faint'),
        'data-edge': 'out-' + h.id
      });
      edgeLayer.appendChild(line);
      var pulse = svg('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 't08-net-pulse', 'data-pulse': 'out-' + h.id, stroke: '#7c3aed'
      });
      pulseLayer.appendChild(pulse);
    });
    // output -> loss
    var oa = netPos('output');
    var ob = netPos('loss');
    var olEdge = svg('line', {
      x1: oa.x, y1: oa.y, x2: ob.x, y2: ob.y,
      class: 't08-net-edge is-strong', 'data-edge': 'out-loss'
    });
    edgeLayer.appendChild(olEdge);
    var olPulse = svg('line', {
      x1: oa.x, y1: oa.y, x2: ob.x, y2: ob.y,
      class: 't08-net-pulse', 'data-pulse': 'out-loss', stroke: '#dc2626'
    });
    pulseLayer.appendChild(olPulse);

    function makeNode(kind, idx, label, klass) {
      var c = kind === 'hidden' ? netPos(kind, idx) : netPos(kind);
      var circle = svg('circle', {
        cx: c.x, cy: c.y, r: NET_GEOM.nodeR,
        class: 't08-net-node' + (klass ? ' ' + klass : ''),
        'data-node': kind + (idx == null ? '' : '-' + idx)
      });
      var t = svg('text', { x: c.x, y: c.y, class: 't08-chain-label' });
      t.textContent = label;
      nodeLayer.appendChild(circle);
      nodeLayer.appendChild(t);
    }
    makeNode('input', null, 'x', 'is-input');
    network.hidden.forEach(function (h, i) { makeNode('hidden', i, h.label); });
    makeNode('output', null, "y'");
    makeNode('loss', null, 'L', 'is-loss');

    root.appendChild(edgeLayer);
    root.appendChild(pulseLayer);
    root.appendChild(nodeLayer);
    return root;
  }

  function pulseNetEdge(scope, key, color) {
    var pulse = scope.querySelector('[data-pulse="' + key + '"]');
    if (!pulse) return;
    pulse.setAttribute('stroke', color);
    pulse.classList.remove('is-active');
    void pulse.getBoundingClientRect();
    pulse.classList.add('is-active');
  }

  function buildScene3() {
    var wrap = el('section', { class: 't08-scene', 'data-scene-index': 3 });
    wrap.appendChild(sceneHead(3));

    var netBox = el('div', { class: 't08-network' });
    netBox.appendChild(buildNetworkSvg());
    wrap.appendChild(netBox);

    var panel = el('div', { class: 't08-panel' });
    panel.appendChild(el('h3', { text: '隐藏层梯度表' }));
    var table = el('div', { class: 't08-gradtable' });
    table.appendChild(el('div', { class: 'row head' }, [
      el('div', { text: '神经元' }),
      el('div', { text: '梯度方向' }),
      el('div', { text: '建议' })
    ]));
    network.hidden.forEach(function (h) {
      var row = el('div', { class: 'row', 'data-grad-row': h.id }, [
        el('div', { class: 'cell-name', text: 'w · ' + h.label + ' / b · ' + h.label }),
        el('div', { class: 'cell-dir', text: '待定' }),
        el('div', { class: 'cell-hint', text: '待定' })
      ]);
      table.appendChild(row);
    });
    panel.appendChild(table);

    var actions = el('div', { class: 't08-actions-row' });
    var backBtn = setTracking(el('button', {
      class: 't08-action primary', type: 'button', text: '回传到隐藏层'
    }), 't08_scene3_backprop', 'hidden_backprop');
    var nextBtn = setTracking(el('button', {
      class: 't08-action ghost', type: 'button', text: '做个小测验 →', disabled: 'disabled'
    }), 't08_scene3_next', 'hidden_next');
    actions.appendChild(backBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    var hint = el('div', { class: 't08-panel' });
    hint.appendChild(el('h3', { text: '点开任一神经元，看它自己的局部链' }));
    hint.appendChild(el('div', { class: 't08-formula', text: 'w_i / b_i  →  z_i  →  h_i  →  y\u2032  →  L  （上一段是共享的，下一段各自不同）' }));
    wrap.appendChild(hint);

    wrap.appendChild(feedbackBar(3));

    function fillRow(h) {
      var row = panel.querySelector('[data-grad-row="' + h.id + '"]');
      if (!row) return;
      row.classList.add('is-done');
      row.querySelector('.cell-dir').textContent = h.dirW + ' / ' + h.dirB;
      row.querySelector('.cell-hint').textContent = h.hintW + ' / ' + h.hintB;
    }

    function handleHidden(h) {
      // Highlight that hidden node and its input edge.
      netBox.querySelectorAll('.t08-net-node').forEach(function (n) {
        n.classList.remove('is-active');
      });
      var node = netBox.querySelector('[data-node="hidden-' + network.hidden.indexOf(h) + '"]');
      if (node) node.classList.add('is-active');
      pulseNetEdge(netBox, 'in-' + h.id, '#7c3aed');
      state.hiddenDone[h.id] = true;
      fillRow(h);
      setFeedback(3, h.label + ' 的参数仍然遵守同一条链式法则；上一段（Loss → y\u2032）是共享的，到了 ' + h.label + ' 这里再各拼自己的局部段。', 'grad');
      if (allHiddenDone()) {
        nextBtn.removeAttribute('disabled');
        setFeedback(3, '每个隐藏神经元都通过同一条链式法则拿到了自己的方向。这就是反向传播之所以高效。', 'update');
      }
      renderProgress();
    }

    network.hidden.forEach(function (h) {
      var node = netBox.querySelector('[data-node="hidden-' + network.hidden.indexOf(h) + '"]');
      if (node) node.addEventListener('click', function () { handleHidden(h); });
    });

    backBtn.addEventListener('click', function () {
      pulseNetEdge(netBox, 'out-loss', '#dc2626');
      setTimeout(function () {
        network.hidden.forEach(function (h, i) {
          setTimeout(function () { pulseNetEdge(netBox, 'out-' + h.id, '#7c3aed'); }, i * 220);
        });
      }, 250);
      state.backpropDone = true;
      setFeedback(3, '输出层把 Loss 的影响分给每个隐藏神经元；连接越关键，回传越强。现在点开任一神经元看它自己的局部链。', 'grad');
      renderProgress();
    });
    nextBtn.addEventListener('click', function () { goToScene(4); });

    // Inline video
    var media = el('div', { class: 't08-media' });
    var video = el('video', {
      controls: true, preload: 'metadata',
      poster: './assets/multi_neuron_chain_poster.png'
    });
    var source = el('source');
    source.setAttribute('src', './assets/multi_neuron_chain.mp4');
    source.setAttribute('type', 'video/mp4');
    video.appendChild(source);
    media.appendChild(video);
    media.appendChild(el('div', { class: 'caption' }, [
      el('span', { text: '动画 · 多隐藏神经元上的反向梯度共享与分流' }),
      el('span', { text: '红=Loss　紫=梯度　橙=参数' })
    ]));
    wrap.appendChild(media);

    return wrap;
  }

  // ---------- Scene 4: quiz ----------

  function buildScene4() {
    var wrap = el('section', { class: 't08-scene', 'data-scene-index': 4 });
    wrap.appendChild(sceneHead(4));

    var quiz = el('div', { class: 't08-quiz' });
    quiz.appendChild(el('h3', { text: guide.quiz.question }));
    var options = el('div', { class: 'options' });
    guide.quiz.options.forEach(function (opt) {
      var btn = setTracking(el('button', {
        class: 'option', type: 'button',
        text: opt.label + '. ' + opt.text,
        'data-key': opt.key
      }), 't08_quiz_option_' + opt.key, 'quiz_choose', { option: opt.key });
      btn.addEventListener('click', function () {
        if (state.quizDone) return;
        if (opt.correct) {
          btn.classList.add('is-correct');
          state.quizDone = true;
          state.quizChoice = opt.key;
          setFeedback(4, opt.rightFeedback || '答得对。', 'update');
        } else {
          btn.classList.add('is-wrong');
          setFeedback(4, opt.wrong || '再想想链式法则的核心动作。', 'loss');
        }
        renderProgress();
      });
      options.appendChild(btn);
    });
    quiz.appendChild(options);
    wrap.appendChild(quiz);

    var summary = el('div', { class: 't08-panel' });
    summary.appendChild(el('h3', { text: '一句话总结' }));
    summary.appendChild(el('div', { class: 't08-formula',
      text: "dL/dw  =  ∂L/∂y\u2032 · ∂y\u2032/∂h · ∂h/∂z · ∂z/∂w —— 沿途每段局部影响连续相乘。" }));
    wrap.appendChild(summary);

    wrap.appendChild(feedbackBar(4));

    return wrap;
  }

  // ---------- transitions ----------

  function buildTransitionAfter(idx) {
    if (idx >= scenes.length - 1) return null;
    var t = guide.transitions[idx];
    if (!t) return null;
    var wrap = el('section', { class: 't08-transition', 'data-transition-after': idx });
    var info = el('div');
    info.appendChild(el('div', { class: 'label', text: t.label }));
    info.appendChild(el('div', { class: 'kicker', text: t.kicker }));
    wrap.appendChild(info);
    var btn = setTracking(el('button', {
      class: 't08-action primary', type: 'button',
      text: '进入画面 ' + (idx + 2)
    }), 't08_transition_' + (idx + 1), 'transition_next', { from: idx + 1, to: idx + 2 });
    btn.addEventListener('click', function () { goToScene(idx + 1); });
    wrap.appendChild(btn);
    return wrap;
  }

  // ---------- mount ----------

  function render() {
    sceneBuilders = [buildScene0, buildScene1, buildScene2, buildScene3, buildScene4];
    window.addEventListener('hashchange', function () { showScene(sceneFromHash()); });
    showScene(sceneFromHash());
  }

  render();
}());
