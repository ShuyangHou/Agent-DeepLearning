(function () {
  'use strict';

  var guide = window.T09_GUIDE;
  var scenes = guide.scenes;
  var dataset = guide.dataset;
  var helpers = guide.helpers;

  // ---------- 全局状态 ----------
  var state = {
    scene: 0,
    maxScene: 0,
    // 画面 1
    fullBatchDone: false,
    // 画面 2
    s2BatchSize: dataset.defaultBatch,
    s2Seed: 1,
    s2Batches: helpers.buildEpochBatches(dataset.defaultBatch, 1),
    s2StepIdx: 0,         // 已消耗的 batch 数
    s2StepCount: 0,       // 已走的 step 总数（含跨多次洗牌）
    s2EverStepped: false,
    // 画面 3
    s3Seed: 5,
    s3Batches: helpers.buildEpochBatches(dataset.defaultBatch, 5),
    s3StepIdx: 0,
    s3Done: false,
    // 画面 4
    s4BatchSize: 4,
    s4Done: false,
    // 画面 5
    quizChoice: '',
    quizDone: false,
    feedback: {}
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');

  var defaultFeedback = [
    '先看 N = 24 的整张方阵，再点击 算一次全量梯度。',
    '调一下 B、洗洗牌，然后点 走一步：你会看到一个 batch 被吃掉，step 计数 +1。',
    '点 自动跑完一个 epoch：N/B 步刚好把数据走一遍。',
    '选一个 batch 大小，点 跑 3 个 epoch，对比 loss 曲线的噪声与平滑。',
    '挑出最准确的一项；把 step / batch / epoch 三者关系用自己的话讲清楚。'
  ];

  // ---------- DOM 工具 ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('data-') === 0 || k === 'role' || k === 'aria-label') node.setAttribute(k, attrs[k]);
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
      bar.className = 't09-feedback' + (tone ? ' tone-' + tone : '');
    }
  }

  function feedbackFor(idx) {
    return state.feedback[idx] || { text: defaultFeedback[idx], tone: '' };
  }

  // ---------- 进入条件 ----------
  function sceneReady(idx) {
    if (idx === 0) return state.fullBatchDone;
    if (idx === 1) return state.s2EverStepped;
    if (idx === 2) return state.s3Done;
    if (idx === 3) return state.s4Done;
    if (idx === 4) return state.quizDone;
    return false;
  }

  function canEnter(idx) {
    if (idx === 0) return true;
    return sceneReady(idx - 1) || idx <= state.maxScene;
  }

  function goToScene(idx) {
    if (!canEnter(idx)) return;
    state.scene = idx;
    state.maxScene = Math.max(state.maxScene, idx);
    renderProgress();
    var node = sceneStack.querySelector('[data-scene-index="' + idx + '"]');
    if (node) setTimeout(function () { node.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  }

  // ---------- 进度条 ----------
  function renderProgress() {
    progressNav.innerHTML = '';
    scenes.forEach(function (sc, idx) {
      var btn = el('button', { type: 'button', text: (idx + 1) + ' · ' + sc.pill });
      btn.classList.toggle('is-active', state.scene === idx);
      btn.classList.toggle('is-done', sceneReady(idx));
      if (!canEnter(idx)) btn.setAttribute('disabled', 'disabled');
      setTracking(btn, 't09_progress_step_' + (idx + 1), 'progress_jump', { scene: idx + 1 });
      btn.addEventListener('click', function () { goToScene(idx); });
      progressNav.appendChild(btn);
    });
  }

  // ---------- 共享：场景头 + 反馈条 ----------
  function sceneHead(idx) {
    var s = scenes[idx];
    var head = el('div', { class: 't09-scene-head' });
    var left = el('div', null, [
      el('span', { class: 'pill', text: s.pill }),
      el('h2', { text: s.title }),
      el('p', { class: 't09-goal', text: s.goal }),
      el('p', { class: 't09-concept', text: s.concept })
    ]);
    var ul = el('ul', { class: 't09-tasks' });
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
      class: 't09-feedback' + (fb.tone ? ' tone-' + fb.tone : ''),
      text: fb.text,
      'data-feedback-for': idx
    });
  }

  // ---------- 数据方阵（共享构件） ----------
  function buildDataGrid(opts) {
    opts = opts || {};
    var wrap = el('div', { class: 't09-dataset' });
    var head = el('div', { class: 't09-dataset-head' });
    head.appendChild(el('div', { text: opts.title || '训练集' }));
    head.appendChild(el('div', { class: 'tag', text: opts.tag || ('N = ' + dataset.N) }));
    wrap.appendChild(head);
    var grid = el('div', { class: 't09-grid' });
    for (var i = 0; i < dataset.N; i++) {
      var cell = el('div', { class: 't09-cell', 'data-cell': i, text: String(i + 1) });
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function clearGridState(gridEl) {
    var cells = gridEl.querySelectorAll('.t09-cell');
    cells.forEach(function (c) {
      c.classList.remove('is-current', 'is-fullhighlight');
    });
  }

  function markCells(gridEl, ids, klass) {
    ids.forEach(function (i) {
      var c = gridEl.querySelector('[data-cell="' + i + '"]');
      if (c) c.classList.add(klass);
    });
  }

  function unmarkCells(gridEl, ids, klass) {
    ids.forEach(function (i) {
      var c = gridEl.querySelector('[data-cell="' + i + '"]');
      if (c) c.classList.remove(klass);
    });
  }

  // ---------- 场景 0：全量梯度 ----------
  function buildScene0() {
    var wrap = el('section', { class: 't09-scene', 'data-scene-index': 0 });
    wrap.appendChild(sceneHead(0));

    var grid = buildDataGrid({ tag: 'N = ' + dataset.N });
    wrap.appendChild(grid);
    var gridInner = grid.querySelector('.t09-grid');

    var panel = el('div', { class: 't09-panel' });
    panel.appendChild(el('h3', { text: '全量梯度' }));
    panel.appendChild(el('div', {
      class: 't09-formula',
      html: '<span class="var">g</span> = mean over <span class="par">all N samples</span>'
    }));
    panel.appendChild(el('p', {
      class: 't09-concept',
      text: '这种"一次算完所有 N 个样本"的做法叫 full-batch / batch gradient descent。'
    }));

    var actions = el('div', { class: 't09-actions-row' });
    var fullBtn = setTracking(el('button', {
      class: 't09-action primary', type: 'button', text: '算一次全量梯度'
    }), 't09_scene0_full', 'full_batch');
    var nextBtn = setTracking(el('button', {
      class: 't09-action ghost', type: 'button', text: '把数据集切成 batch →', disabled: 'disabled'
    }), 't09_scene0_next', 'scene_next');
    actions.appendChild(fullBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    wrap.appendChild(feedbackBar(0));

    fullBtn.addEventListener('click', function () {
      clearGridState(gridInner);
      for (var i = 0; i < dataset.N; i++) {
        (function (k) {
          setTimeout(function () {
            var c = gridInner.querySelector('[data-cell="' + k + '"]');
            if (c) c.classList.add('is-fullhighlight');
          }, k * 18);
        }(i));
      }
      state.fullBatchDone = true;
      nextBtn.removeAttribute('disabled');
      setFeedback(0, '这一步用到了全部 24 个样本：方向最准，但每动一下都要把整张表算一遍。N 一大就吃不消。', 'grad');
      renderProgress();
    });

    nextBtn.addEventListener('click', function () { goToScene(1); });

    return wrap;
  }

  // ---------- 场景 1：mini-batch step ----------
  function buildScene1() {
    var wrap = el('section', { class: 't09-scene', 'data-scene-index': 1 });
    wrap.appendChild(sceneHead(1));

    var grid = buildDataGrid({ tag: 'N = ' + dataset.N });
    wrap.appendChild(grid);
    var gridInner = grid.querySelector('.t09-grid');

    // 右侧控制
    var panel = el('div', { class: 't09-panel' });
    panel.appendChild(el('h3', { text: '走一步 = 一个 batch' }));

    // batch size 选择
    var bRow = el('div', { class: 't09-row' });
    bRow.appendChild(el('span', { class: 'label', text: 'Batch 大小 B' }));
    var bSel = el('select', { class: 't09-select' });
    dataset.batchOptions.forEach(function (b) {
      var opt = document.createElement('option');
      opt.value = String(b);
      opt.textContent = String(b);
      if (b === state.s2BatchSize) opt.selected = true;
      bSel.appendChild(opt);
    });
    setTracking(bSel, 't09_scene1_batch_size', 'batch_size_change');
    bRow.appendChild(bSel);
    panel.appendChild(bRow);

    var stepsHint = el('div', { class: 't09-formula' });
    function refreshHint() {
      var B = state.s2BatchSize;
      stepsHint.innerHTML =
        'N = ' + dataset.N + ' &nbsp; B = <span class="par">' + B + '</span>' +
        ' &nbsp; ⇒ 1 epoch = <span class="var">' + Math.floor(dataset.N / B) + '</span> 步';
    }
    refreshHint();
    panel.appendChild(stepsHint);

    // 控制按钮
    var actions = el('div', { class: 't09-actions-row' });
    var shuffleBtn = setTracking(el('button', {
      class: 't09-action ghost', type: 'button', text: '🔀 洗牌'
    }), 't09_scene1_shuffle', 'shuffle');
    var stepBtn = setTracking(el('button', {
      class: 't09-action primary', type: 'button', text: '走一步 →'
    }), 't09_scene1_step', 'step');
    var nextBtn = setTracking(el('button', {
      class: 't09-action ghost', type: 'button', text: '把这一轮串起来 →', disabled: 'disabled'
    }), 't09_scene1_next', 'scene_next');
    actions.appendChild(shuffleBtn);
    actions.appendChild(stepBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);

    // step 状态卡
    var stepCard = el('div', { class: 't09-step-card' });
    var stepKLabel = el('div', { class: 'k', text: 'STEP' });
    var stepVValue = el('div', { class: 'v', text: '#0' });
    var sampleLabel = el('div', { class: 'k', text: '本步样本' });
    var sampleValue = el('div', { class: 'v', text: '—' });
    var gradLabel = el('div', { class: 'k', text: '梯度方向' });
    var gradWrap = el('div', { class: 'v grad' });
    var arrow = el('span', { class: 't09-arrow', text: '↘' });
    gradWrap.appendChild(arrow);
    stepCard.appendChild(stepKLabel);
    stepCard.appendChild(stepVValue);
    stepCard.appendChild(sampleLabel);
    stepCard.appendChild(sampleValue);
    stepCard.appendChild(gradLabel);
    stepCard.appendChild(gradWrap);
    panel.appendChild(stepCard);

    wrap.appendChild(panel);

    // batch 队列
    var queue = el('div', { class: 't09-queue' });
    var qHead = el('div', { class: 't09-queue-head' });
    qHead.appendChild(el('div', { text: 'batch 队列（等待被吃掉）' }));
    var qTag = el('div', { class: 'tag' });
    qHead.appendChild(qTag);
    queue.appendChild(qHead);
    var qRow = el('div', { class: 't09-queue-row' });
    queue.appendChild(qRow);
    wrap.appendChild(queue);

    wrap.appendChild(feedbackBar(1));

    function renderQueue() {
      qRow.innerHTML = '';
      state.s2Batches.forEach(function (b, i) {
        var slot = el('div', {
          class: 't09-batch-slot' + (i < state.s2StepIdx ? ' is-done' : (i === state.s2StepIdx ? ' is-current' : '')),
          'data-batch-index': i,
          text: 'B' + (i + 1)
        });
        qRow.appendChild(slot);
      });
      qTag.textContent = '剩 ' + Math.max(0, state.s2Batches.length - state.s2StepIdx) + ' / ' + state.s2Batches.length;
    }

    function resetEpoch(seed) {
      state.s2Seed = seed;
      state.s2Batches = helpers.buildEpochBatches(state.s2BatchSize, seed);
      state.s2StepIdx = 0;
      clearGridState(gridInner);
      // 已用过的格子也清掉
      gridInner.querySelectorAll('.t09-cell.is-used').forEach(function (c) { c.classList.remove('is-used'); });
      renderQueue();
    }

    function doStep() {
      if (state.s2StepIdx >= state.s2Batches.length) {
        // epoch 已走完：自动重新洗牌
        resetEpoch(state.s2Seed + 7);
        setFeedback(1, '这一轮的 batch 都吃完了，已经自动重新洗牌；继续走下一步。', 'batch');
        return;
      }
      var ids = state.s2Batches[state.s2StepIdx];
      // 高亮当前 batch
      clearGridState(gridInner);
      markCells(gridInner, ids, 'is-current');
      // 走完后短暂保留，再淡入"已用过"
      setTimeout(function () {
        unmarkCells(gridInner, ids, 'is-current');
        markCells(gridInner, ids, 'is-used');
      }, 750);

      state.s2StepIdx += 1;
      state.s2StepCount += 1;
      state.s2EverStepped = true;
      stepVValue.textContent = '#' + state.s2StepCount;
      sampleValue.textContent = ids.map(function (k) { return k + 1; }).join(', ');
      arrow.classList.remove('is-step');
      void arrow.getBoundingClientRect();
      arrow.classList.add('is-step');
      renderQueue();
      setFeedback(1, '第 ' + state.s2StepCount + ' 步：吃了一个大小为 ' + state.s2BatchSize + ' 的 batch，做一次前向 + 反向 + 更新。', 'batch');

      if (state.s2StepIdx >= state.s2Batches.length) {
        nextBtn.removeAttribute('disabled');
        setFeedback(1, '这一轮的 batch 都吃完了：' + state.s2Batches.length + ' 步刚好走完整个数据集——这就是 1 个 epoch。', 'update');
      }
      renderProgress();
    }

    bSel.addEventListener('change', function () {
      state.s2BatchSize = parseInt(bSel.value, 10);
      refreshHint();
      resetEpoch(state.s2Seed);
      setFeedback(1, 'Batch 大小已改为 ' + state.s2BatchSize + '：一个 epoch 现在有 ' + state.s2Batches.length + ' 步。', 'grad');
    });
    shuffleBtn.addEventListener('click', function () {
      resetEpoch((state.s2Seed * 31 + 11) & 0x7fffffff);
      setFeedback(1, '已重新洗牌：样本顺序变了，batch 也跟着重新切。', 'grad');
    });
    stepBtn.addEventListener('click', doStep);
    nextBtn.addEventListener('click', function () { goToScene(2); });

    renderQueue();

    return wrap;
  }

  // ---------- 场景 2：一个 epoch ----------
  function buildScene2() {
    var wrap = el('section', { class: 't09-scene', 'data-scene-index': 2 });
    wrap.appendChild(sceneHead(2));

    var grid = buildDataGrid({ tag: 'N = ' + dataset.N + ' · B = 4' });
    wrap.appendChild(grid);
    var gridInner = grid.querySelector('.t09-grid');

    var panel = el('div', { class: 't09-panel' });
    panel.appendChild(el('h3', { text: '一个 epoch = N / B 个 step' }));
    panel.appendChild(el('div', {
      class: 't09-formula',
      html: 'N = 24 &nbsp; B = <span class="par">4</span> &nbsp; ⇒ 1 epoch = <span class="var">6</span> 步'
    }));

    var progressText = el('div', { class: 't09-formula', text: '已走 0 / 6 步' });
    panel.appendChild(progressText);

    var actions = el('div', { class: 't09-actions-row' });
    var runBtn = setTracking(el('button', {
      class: 't09-action primary', type: 'button', text: '自动跑完一个 epoch'
    }), 't09_scene2_run', 'run_epoch');
    var resetBtn = setTracking(el('button', {
      class: 't09-action ghost', type: 'button', text: '重置'
    }), 't09_scene2_reset', 'reset_epoch');
    var nextBtn = setTracking(el('button', {
      class: 't09-action ghost', type: 'button', text: '多跑几个 epoch →', disabled: 'disabled'
    }), 't09_scene2_next', 'scene_next');
    actions.appendChild(runBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);

    wrap.appendChild(panel);

    // 时间轴
    var timeline = el('div', { class: 't09-timeline' });
    var tHead = el('div', { class: 't09-timeline-head' });
    tHead.appendChild(el('div', { text: 'epoch 时间轴' }));
    tHead.appendChild(el('div', { text: '6 段刻度 · 每段一步' }));
    timeline.appendChild(tHead);
    var tRow = el('div', { class: 't09-timeline-row' });
    for (var i = 0; i < 6; i++) {
      tRow.appendChild(el('div', { class: 't09-tick', 'data-tick': i }));
    }
    timeline.appendChild(tRow);
    var tLabels = el('div', { class: 't09-epoch-labels' });
    for (var j = 0; j < 6; j++) {
      tLabels.appendChild(el('div', { text: 'step ' + (j + 1) }));
    }
    timeline.appendChild(tLabels);
    wrap.appendChild(timeline);

    wrap.appendChild(feedbackBar(2));

    function resetEpoch3() {
      state.s3Batches = helpers.buildEpochBatches(4, state.s3Seed);
      state.s3StepIdx = 0;
      clearGridState(gridInner);
      gridInner.querySelectorAll('.t09-cell.is-used').forEach(function (c) { c.classList.remove('is-used'); });
      tRow.querySelectorAll('.t09-tick').forEach(function (t) { t.classList.remove('is-on', 'is-current'); });
      progressText.textContent = '已走 0 / 6 步';
      runBtn.removeAttribute('disabled');
    }

    function runEpoch() {
      runBtn.setAttribute('disabled', 'disabled');
      var i = 0;
      function tick() {
        if (i >= state.s3Batches.length) {
          state.s3Done = true;
          nextBtn.removeAttribute('disabled');
          setFeedback(2, '6 步走完了整个数据集——这就是 1 个 epoch。下一画面我们把 epoch 串起来。', 'update');
          renderProgress();
          return;
        }
        var ids = state.s3Batches[i];
        var t = tRow.querySelector('[data-tick="' + i + '"]');
        clearGridState(gridInner);
        markCells(gridInner, ids, 'is-current');
        if (t) {
          tRow.querySelectorAll('.t09-tick.is-current').forEach(function (n) { n.classList.remove('is-current'); });
          t.classList.add('is-current');
        }
        setTimeout(function () {
          unmarkCells(gridInner, ids, 'is-current');
          markCells(gridInner, ids, 'is-used');
          if (t) { t.classList.remove('is-current'); t.classList.add('is-on'); }
        }, 480);
        state.s3StepIdx = i + 1;
        progressText.textContent = '已走 ' + (i + 1) + ' / 6 步';
        i += 1;
        setTimeout(tick, 620);
      }
      tick();
    }

    runBtn.addEventListener('click', runEpoch);
    resetBtn.addEventListener('click', function () {
      state.s3Seed = (state.s3Seed * 17 + 3) & 0x7fffffff;
      state.s3Done = false;
      resetEpoch3();
      nextBtn.setAttribute('disabled', 'disabled');
      setFeedback(2, '已重置：重新洗了一次牌；再点 自动跑完一个 epoch。', 'grad');
      renderProgress();
    });
    nextBtn.addEventListener('click', function () { goToScene(3); });

    resetEpoch3();
    return wrap;
  }

  // ---------- 场景 3：多 epoch + batch size 对比 ----------
  function buildScene3() {
    var wrap = el('section', { class: 't09-scene', 'data-scene-index': 3 });
    wrap.appendChild(sceneHead(3));

    var panel = el('div', { class: 't09-panel' });
    panel.appendChild(el('h3', { text: 'batch size 的取舍' }));

    // chip 切换
    var chipRow = el('div', { class: 't09-row' });
    chipRow.appendChild(el('span', { class: 'label', text: 'Batch 大小' }));
    var chips = el('div', { class: 't09-chips' });
    [1, 4, 24].forEach(function (b) {
      var chip = el('button', {
        type: 'button', class: 't09-chip' + (b === state.s4BatchSize ? ' is-active' : ''),
        text: 'B = ' + b, 'data-chip-b': b
      });
      setTracking(chip, 't09_scene3_chip_' + b, 'batch_chip', { B: b });
      chips.appendChild(chip);
    });
    chipRow.appendChild(chips);
    panel.appendChild(chipRow);

    // 概念卡
    var cards = el('div', { class: 't09-formula' });
    cards.innerHTML =
      '<div><span class="par">B 小</span>：每步噪声大，但灵活、能跳出局部小坑。</div>' +
      '<div><span class="var">B 中</span>：折中，最常用。</div>' +
      '<div><span class="loss">B 大</span>：每步平滑、方向准，但每步算得慢。</div>';
    panel.appendChild(cards);

    var actions = el('div', { class: 't09-actions-row' });
    var runBtn = setTracking(el('button', {
      class: 't09-action primary', type: 'button', text: '跑 3 个 epoch'
    }), 't09_scene3_run', 'run_multi');
    var nextBtn = setTracking(el('button', {
      class: 't09-action ghost', type: 'button', text: '进入小测验 →', disabled: 'disabled'
    }), 't09_scene3_next', 'scene_next');
    actions.appendChild(runBtn);
    actions.appendChild(nextBtn);
    panel.appendChild(actions);
    wrap.appendChild(panel);

    // 多 epoch 时间轴
    var timeline = el('div', { class: 't09-timeline' });
    var tHead = el('div', { class: 't09-timeline-head' });
    tHead.appendChild(el('div', { text: 'epoch 时间轴（3 个 epoch）' }));
    var tInfo = el('div', { text: '' });
    tHead.appendChild(tInfo);
    timeline.appendChild(tHead);
    var tRow = el('div', { class: 't09-timeline-row' });
    timeline.appendChild(tRow);
    var tLabels = el('div', { class: 't09-epoch-labels' });
    timeline.appendChild(tLabels);
    wrap.appendChild(timeline);

    // 折线图
    var chartBox = el('div', { class: 't09-chart' });
    var W = 720, H = 240, P = 32;
    var chartSvg = svg('svg', { viewBox: '0 0 ' + W + ' ' + H });
    // 轴
    chartSvg.appendChild(svg('line', { x1: P, y1: H - P, x2: W - P, y2: H - P, class: 't09-chart-axis' }));
    chartSvg.appendChild(svg('line', { x1: P, y1: P, x2: P, y2: H - P, class: 't09-chart-axis' }));
    // y 标尺
    [0, 0.25, 0.5, 0.75, 1.0].forEach(function (v) {
      var y = H - P - v * (H - 2 * P);
      chartSvg.appendChild(svg('line', { x1: P - 4, y1: y, x2: P, y2: y, class: 't09-chart-tick' }));
      var t = svg('text', { x: P - 8, y: y + 4, 'text-anchor': 'end', class: 't09-chart-text' });
      t.textContent = v.toFixed(2);
      chartSvg.appendChild(t);
    });
    var xLabel = svg('text', { x: W / 2, y: H - 6, 'text-anchor': 'middle', class: 't09-chart-text' });
    xLabel.textContent = 'step';
    chartSvg.appendChild(xLabel);
    var yLabel = svg('text', { x: 12, y: P - 10, class: 't09-chart-text' });
    yLabel.textContent = 'loss';
    chartSvg.appendChild(yLabel);
    // 动态曲线层
    var pathLayer = svg('g', { class: 't09-chart-paths' });
    chartSvg.appendChild(pathLayer);
    chartBox.appendChild(chartSvg);
    var legend = el('div', { class: 't09-chart-legend' });
    legend.innerHTML =
      '<span><span class="sw" style="background:#dc2626"></span>B = 1</span>' +
      '<span><span class="sw" style="background:#2563eb"></span>B = 4</span>' +
      '<span><span class="sw" style="background:#16a34a"></span>B = 24</span>';
    chartBox.appendChild(legend);
    wrap.appendChild(chartBox);

    wrap.appendChild(feedbackBar(3));

    function timelineFor(B) {
      var stepsPerEpoch = Math.max(1, Math.floor(dataset.N / B));
      var total = stepsPerEpoch * 3;
      tRow.innerHTML = '';
      tLabels.innerHTML = '';
      // 控制最大格数：当 B=1 时 total=72，太密，则按 epoch 用 3 大格代替
      var renderCells = total > 36 ? 18 : total;
      var cellsPerEpoch = Math.max(1, Math.floor(renderCells / 3));
      for (var i = 0; i < 3; i++) {
        for (var k = 0; k < cellsPerEpoch; k++) {
          tRow.appendChild(el('div', {
            class: 't09-tick',
            'data-epoch': i,
            'data-cell-idx': i * cellsPerEpoch + k
          }));
        }
      }
      for (var e = 0; e < 3; e++) {
        tLabels.appendChild(el('div', {
          text: 'epoch ' + (e + 1),
          style: 'grid-column: span ' + cellsPerEpoch
        }));
      }
      tInfo.textContent = 'B = ' + B + ' · 每个 epoch ' + stepsPerEpoch + ' 步 · 共 ' + total + ' 步';
      return { stepsPerEpoch: stepsPerEpoch, total: total, renderCells: renderCells, cellsPerEpoch: cellsPerEpoch };
    }

    function drawCurve(B, sim) {
      // 清空旧曲线
      while (pathLayer.firstChild) pathLayer.removeChild(pathLayer.firstChild);
      var pts = sim.points;
      var n = pts.length;
      var xs = pts.map(function (_, i) { return P + (W - 2 * P) * (n === 1 ? 0 : i / (n - 1)); });
      var ys = pts.map(function (p) { return H - P - p.loss * (H - 2 * P); });
      var d = '';
      for (var i = 0; i < n; i++) {
        d += (i === 0 ? 'M' : 'L') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1) + ' ';
      }
      var klass = 't09-chart-line ' + (B === 1 ? 'b-small' : (B === 4 ? 'b-mid' : 'b-large'));
      var path = svg('path', { d: d, class: klass });
      // 动画：用 stroke-dasharray 模拟"画出来"
      var len = 0;
      for (var j = 1; j < n; j++) {
        var dx = xs[j] - xs[j - 1];
        var dy = ys[j] - ys[j - 1];
        len += Math.sqrt(dx * dx + dy * dy);
      }
      path.setAttribute('stroke-dasharray', String(len));
      path.setAttribute('stroke-dashoffset', String(len));
      pathLayer.appendChild(path);
      // 触发动画
      requestAnimationFrame(function () {
        path.style.transition = 'stroke-dashoffset 1.8s ease-out';
        path.setAttribute('stroke-dashoffset', '0');
      });
    }

    function animateTimeline(plan) {
      var ticks = tRow.querySelectorAll('.t09-tick');
      var i = 0;
      function tick() {
        if (i >= ticks.length) return;
        var node = ticks[i];
        ticks.forEach(function (n) { n.classList.remove('is-current'); });
        node.classList.add('is-current');
        setTimeout(function () {
          node.classList.remove('is-current');
          node.classList.add('is-on');
          var ep = parseInt(node.getAttribute('data-epoch'), 10);
          node.classList.add('tone-' + (ep + 1));
        }, 70);
        i += 1;
        setTimeout(tick, Math.max(40, 1800 / plan.renderCells));
      }
      tick();
    }

    function runOnce() {
      var B = state.s4BatchSize;
      var plan = timelineFor(B);
      var sim = helpers.simulateLoss(B, 3, 17 + B * 11);
      drawCurve(B, sim);
      animateTimeline(plan);
      state.s4Done = true;
      nextBtn.removeAttribute('disabled');
      var msg;
      if (B === 1)
        msg = 'B = 1：曲线非常颠簸，每个样本都拉一下方向；好处是灵活，坏处是噪声大。';
      else if (B === 4)
        msg = 'B = 4：折中——曲线相对平稳，又不像全量那样僵；这是工程上最常用的档位。';
      else
        msg = 'B = 24：曲线最平滑，但 3 个 epoch 总共只更新 ' + sim.totalSteps + ' 次，节奏慢。';
      setFeedback(3, msg, 'update');
      renderProgress();
    }

    chips.querySelectorAll('.t09-chip').forEach(function (c) {
      c.addEventListener('click', function () {
        state.s4BatchSize = parseInt(c.getAttribute('data-chip-b'), 10);
        chips.querySelectorAll('.t09-chip').forEach(function (n) { n.classList.remove('is-active'); });
        c.classList.add('is-active');
        timelineFor(state.s4BatchSize);
        setFeedback(3, 'Batch 大小切到 B = ' + state.s4BatchSize + '：再点 跑 3 个 epoch 看曲线。', 'grad');
      });
    });
    runBtn.addEventListener('click', runOnce);
    nextBtn.addEventListener('click', function () { goToScene(4); });

    timelineFor(state.s4BatchSize);

    return wrap;
  }

  // ---------- 场景 4：测验 ----------
  function buildScene4() {
    var wrap = el('section', { class: 't09-scene', 'data-scene-index': 4 });
    wrap.appendChild(sceneHead(4));

    var quiz = el('div', { class: 't09-quiz' });
    quiz.appendChild(el('h3', { text: guide.quiz.question }));
    var opts = el('div', { class: 'options' });
    guide.quiz.options.forEach(function (o) {
      var btn = el('button', {
        type: 'button', class: 'option',
        text: o.label + '. ' + o.text,
        'data-key': o.key
      });
      setTracking(btn, 't09_quiz_' + o.key, 'quiz_choose', { key: o.key });
      btn.addEventListener('click', function () {
        if (state.quizDone && o.correct) return;
        opts.querySelectorAll('.option').forEach(function (b) { b.classList.remove('is-correct', 'is-wrong'); });
        if (o.correct) {
          btn.classList.add('is-correct');
          state.quizChoice = o.key;
          state.quizDone = true;
          setFeedback(4, o.rightFeedback, 'update');
        } else {
          btn.classList.add('is-wrong');
          setFeedback(4, o.wrong, 'loss');
        }
        renderProgress();
      });
      opts.appendChild(btn);
    });
    quiz.appendChild(opts);

    var media = el('div', { class: 't09-media' });
    var v1 = el('video', {
      controls: 'controls', preload: 'metadata',
      poster: './assets/batch_step_loop_poster.png',
      src: './assets/batch_step_loop.mp4'
    });
    media.appendChild(v1);
    media.appendChild(el('div', { class: 'caption', text: '动画 1：洗牌 → 切批 → 走 6 步 = 一个 epoch（manim）' }));
    var v2 = el('video', {
      controls: 'controls', preload: 'metadata',
      poster: './assets/batch_size_compare_poster.png',
      src: './assets/batch_size_compare.mp4'
    });
    media.appendChild(v2);
    media.appendChild(el('div', { class: 'caption', text: '动画 2：B=1 / B=4 / B=24 三档 loss 曲线对比（manim）' }));

    wrap.appendChild(quiz);
    wrap.appendChild(media);
    wrap.appendChild(feedbackBar(4));
    return wrap;
  }

  // ---------- 装配 ----------
  function render() {
    sceneStack.innerHTML = '';
    sceneStack.appendChild(buildScene0());
    sceneStack.appendChild(buildScene1());
    sceneStack.appendChild(buildScene2());
    sceneStack.appendChild(buildScene3());
    sceneStack.appendChild(buildScene4());
    renderProgress();
  }

  document.addEventListener('DOMContentLoaded', render);
}());
