(function () {
  'use strict';

  var guide = window.CNN03_GUIDE;
  var imageMatrix = guide.imageMatrix;
  var mainKernel = guide.kernels[0];
  var state = {
    scene: 0,
    maxScene: 0,
    enteringScene: null,
    feedback: {},
    played: {},
    scoreProgress: 0,
    calcProgress: 0,
    calcPlaying: false,
    scanProgress: 0,
    scanPlaying: false,
    featureClicks: {},
    selectedFeature: null,
    multiProgress: 0,
    multiPlaying: false,
    activeKernel: 'horizontal',
    summaryDone: false,
    quizChoice: '',
    quizDone: false
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var scanPositions = makeScanPositions();
  var responseMaps = {};
  guide.kernels.forEach(function (kernel) {
    responseMaps[kernel.key] = computeResponseMap(kernel.weights);
  });

  var defaultFeedback = [
    '先从人类视觉熟悉的局部线索开始。',
    '先看卷积核怎样计算，再比较它对不同局部区域的响应。',
    '看看检测器扫完整张图会发生什么。',
    '让三种卷积核扫描同一张数字 7，比较它们留下的特征图。',
    '把卷积核的作用收束起来，再看它怎样组成卷积神经网络。',
    '选择你认为正确的解释。'
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setTracking(element, id, eventName, props, eventType) {
    if (!element) return element;
    element.setAttribute('data-tr-id', id);
    if (eventName) element.setAttribute(eventType || 'data-tr-click', eventName);
    if (props) element.setAttribute('data-tr-props', JSON.stringify(props));
    return element;
  }

  function sceneElement(index) {
    return sceneStack.querySelector('[data-scene-index="' + index + '"]');
  }

  function scrollToScene(index, block) {
    window.setTimeout(function () {
      var element = sceneElement(index);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: block || 'start' });
    }, 40);
  }

  function setFeedback(index, message, tone) {
    state.feedback[index] = { text: message, tone: tone || '' };
  }

  function feedbackFor(index) {
    return state.feedback[index] || { text: defaultFeedback[index], tone: '' };
  }

  function sceneReady(index) {
    if (index === 0) return !!state.played.intro;
    if (index === 1) return state.calcProgress >= 9 && state.scoreProgress >= guide.patches.length;
    if (index === 2) return state.scanProgress >= scanPositions.length;
    if (index === 3) return state.multiProgress >= guide.kernels.length;
    if (index === 4) return !!state.summaryDone;
    return !!state.quizDone;
  }

  function taskDone(index, label) {
    if (index === 0) {
      if (label.indexOf('视觉特征') !== -1) return !!state.played.intro;
      if (label.indexOf('模型识别') !== -1) return state.maxScene >= 1;
    }
    if (index === 1) {
      if (label.indexOf('计算') !== -1 || label.indexOf('卷积核') !== -1) return state.calcProgress >= 9;
      if (label.indexOf('响应') !== -1) return state.scoreProgress >= guide.patches.length;
      if (label.indexOf('扫描') !== -1) return state.maxScene >= 2;
    }
    if (index === 2) {
      if (label.indexOf('扫描') !== -1) return state.scanProgress >= scanPositions.length;
      if (label.indexOf('回看') !== -1) return state.maxScene >= 3;
    }
    if (index === 3) {
      if (label.indexOf('3 种') !== -1 || label.indexOf('特征图') !== -1) return state.multiProgress >= guide.kernels.length;
      if (label.indexOf('局部特征') !== -1) return state.multiProgress >= guide.kernels.length;
    }
    if (index === 4) {
      if (label.indexOf('作用') !== -1 || label.indexOf('卷积神经网络') !== -1) return !!state.summaryDone;
    }
    if (index === 5) {
      if (label.indexOf('正确') !== -1) return !!state.quizChoice;
      if (label.indexOf('对比') !== -1) return !!state.quizDone;
    }
    return false;
  }

  function transitionCopy(index) {
    var transition = guide.transitions[index] || {};
    return {
      label: transition.label || '继续',
      kicker: transition.kicker || '继续',
      insight: guide.scenes[index].concept
    };
  }

  function continueFromScene(index) {
    if (!sceneReady(index)) return;
    var section = sceneElement(index);
    if (section) section.classList.add('is-continuing');
    window.setTimeout(function () {
      if (index < guide.scenes.length - 1) {
        state.maxScene = Math.max(state.maxScene, index + 1);
        state.scene = index + 1;
        state.enteringScene = index + 1;
        render({ scrollTo: index + 1, block: 'center' });
      }
    }, 190);
  }

  function makeScanPositions() {
    var rows = imageMatrix.length - 2;
    var cols = imageMatrix[0].length - 2;
    var positions = [];
    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        positions.push({ row: row, col: col });
      }
    }
    return positions;
  }

  function patchAt(row, col) {
    return [0, 1, 2].map(function (dr) {
      return [0, 1, 2].map(function (dc) {
        return imageMatrix[row + dr][col + dc];
      });
    });
  }

  function scorePatch(patch, weights) {
    var score = 0;
    patch.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        score += value * weights[rowIndex][colIndex];
      });
    });
    return Math.round(score * 10) / 10;
  }

  function patchTerms(patch, weights) {
    var terms = [];
    patch.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        var weight = weights[rowIndex][colIndex];
        terms.push({
          pixel: value,
          weight: weight,
          product: value * weight
        });
      });
    });
    return terms;
  }

  function computeResponseMap(weights) {
    return scanPositions.map(function (pos) {
      return scorePatch(patchAt(pos.row, pos.col), weights);
    });
  }

  function responseNorm(value, map) {
    var min = Math.min.apply(null, map);
    var max = Math.max.apply(null, map);
    if (Math.abs(max - min) < 0.001) return 0.15;
    return (value - min) / (max - min);
  }

  function fmt(value) {
    if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
    return value.toFixed(1);
  }

  function pixelShade(value) {
    if (value >= 0.95) return '#27446e';
    if (value >= 0.45) return '#9fb0c8';
    return '#f7f9fc';
  }

  function cellClass(value) {
    if (value > 0) return 'is-ink';
    return '';
  }

  function renderMatrix(matrix, options) {
    var opts = options || {};
    var wrap = document.createElement('div');
    wrap.className = 'cnn03-matrix' + (opts.kernel ? ' cnn03-matrix--kernel' : '') + (opts.patch ? ' cnn03-matrix--patch' : '');
    matrix.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        var cell = document.createElement('span');
        cell.className = 'cnn03-cell';
        if (opts.kernel) {
          if (value > 0) cell.classList.add('is-positive');
          if (value < 0) cell.classList.add('is-negative');
          cell.textContent = value > 0 ? '+' + value : String(value);
        } else {
          if (cellClass(value)) cell.classList.add(cellClass(value));
          cell.textContent = opts.values ? fmt(value) : '';
          cell.style.setProperty('--shade', pixelShade(value));
        }
        if (opts.highlightRow === rowIndex || opts.highlightCol === colIndex) cell.classList.add('is-highlight');
        wrap.appendChild(cell);
      });
    });
    return wrap;
  }

  function renderImageGrid(options) {
    var opts = options || {};
    var wrap = document.createElement('div');
    wrap.className = 'cnn03-image-grid' + (opts.scanStyle ? ' cnn03-image-grid--scan-style' : '');
    wrap.style.setProperty('--cols', imageMatrix[0].length);
    wrap.style.setProperty('--rows', imageMatrix.length);
    imageMatrix.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        var cell = document.createElement('span');
        cell.className = 'cnn03-image-cell';
        if (cellClass(value)) cell.classList.add(cellClass(value));
        cell.style.setProperty('--shade', pixelShade(value));
        if (opts.values) cell.textContent = fmt(value);
        if (opts.window && rowIndex >= opts.window.row && rowIndex < opts.window.row + 3 && colIndex >= opts.window.col && colIndex < opts.window.col + 3) {
          cell.classList.add('is-window');
        }
        wrap.appendChild(cell);
      });
    });
    return wrap;
  }

  function renderFeatureImageDemo(done) {
    var wrap = document.createElement('div');
    wrap.className = 'cnn03-feature-image-demo' + (done ? ' is-searching' : '');
    wrap.innerHTML =
      '<div class="cnn03-hand-image" aria-label="手写数字 7">' +
        '<svg viewBox="0 0 120 120" role="img" aria-label="手写数字 7">' +
          '<path class="cnn03-human-stroke" d="M27 27 C45 22, 70 23, 94 28 C79 46, 66 63, 57 88 C54 96, 51 104, 48 111" />' +
          '<path class="cnn03-human-glint" d="M30 29 C49 26, 68 27, 88 31" />' +
        '</svg>' +
      '</div>';

    var image = wrap.querySelector('.cnn03-hand-image');
    [
      { label: '横线特征', cls: 'is-horizontal', no: '1' },
      { label: '拐角特征', cls: 'is-corner', no: '2' },
      { label: '竖线特征', cls: 'is-vertical', no: '3' }
    ].forEach(function (mark) {
      var node = document.createElement('span');
      node.className = 'cnn03-feature-mark ' + mark.cls;
      node.innerHTML = '<b>' + mark.no + '</b>';
      image.appendChild(node);
    });

    var legend = document.createElement('div');
    legend.className = 'cnn03-feature-legend';
    legend.innerHTML = '<span><b>1</b>横线特征</span><span><b>2</b>拐角特征</span><span><b>3</b>竖线特征</span>';
    wrap.appendChild(legend);

    return wrap;
  }

  function renderResponseGrid(kernelKey, limit, options) {
    var opts = options || {};
    var map = responseMaps[kernelKey || 'horizontal'];
    var count = typeof limit === 'number' ? limit : map.length;
    var wrap = document.createElement('div');
    wrap.className = 'cnn03-response-grid';
    wrap.style.setProperty('--cols', imageMatrix[0].length - 2);
    map.forEach(function (value, index) {
      var ready = index < count;
      var node = opts.buttons ? document.createElement('button') : document.createElement('span');
      if (opts.buttons) node.type = 'button';
      node.className = 'cnn03-response-cell';
      node.style.setProperty('--v', ready ? responseNorm(value, map).toFixed(2) : '0');
      node.textContent = ready && opts.values ? fmt(value) : '';
      if (!ready) node.classList.add('is-empty');
      if (ready && responseNorm(value, map) > 0.78) node.classList.add('is-hot');
      if (state.selectedFeature === String(index)) node.classList.add('is-selected');
      if (state.featureClicks[String(index)]) node.classList.add('is-read');
      if (opts.buttons) {
        var pos = scanPositions[index];
        node.dataset.index = String(index);
        setTracking(node, 'cnn03_feature_' + index + '_btn', 'feature_probe_click', { index: index, row: pos.row, col: pos.col });
        node.addEventListener('click', function () {
          handleFeatureClick(index);
        });
      }
      wrap.appendChild(node);
    });
    return wrap;
  }

  function renderProgress() {
    progressNav.innerHTML = '';
    guide.scenes.slice(0, state.maxScene + 1).forEach(function (scene, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.disabled = false;
      button.className = '';
      setTracking(button, 'cnn03_progress_scene_' + (index + 1) + '_btn', 'progress_select_click', { scene: index + 1 });
      if (index === state.scene) button.classList.add('is-active');
      if (index < state.maxScene) button.classList.add('is-complete');
      if (index === state.maxScene && sceneReady(index)) button.classList.add('is-ready');
      button.innerHTML = '<strong>' + (index + 1) + '</strong><span>' + scene.title + '</span>';
      button.addEventListener('click', function () {
        state.scene = index;
        render({ scrollTo: index, block: 'center' });
      });
      progressNav.appendChild(button);
    });
  }

  function renderSidePanel(section, index) {
    var taskList = section.querySelector('[data-role="taskList"]');
    var conceptText = section.querySelector('[data-role="conceptText"]');
    taskList.innerHTML = '';
    guide.scenes[index].tasks.forEach(function (label) {
      var item = document.createElement('div');
      item.className = 'cnn03-task' + (taskDone(index, label) ? ' is-done' : '');
      item.innerHTML = '<i></i><span>' + label + '</span>';
      taskList.appendChild(item);
    });
    conceptText.textContent = sceneReady(index) || index < state.maxScene ? guide.scenes[index].concept : '完成当前动作后解锁。';
  }

  function playIntro(index) {
    state.scene = index;
    state.played.intro = true;
    setFeedback(index, '问题来了：模型能不能也找到这些局部特征？下一幕开始看它的办法。', 'is-good');
    state.maxScene = Math.max(state.maxScene, 1);
    state.scene = 1;
    state.enteringScene = 1;
    render({ scrollTo: 1, block: 'center' });
  }

  function renderIntroScene(mount, index, disabled) {
    var done = !!state.played.intro;
    mount.innerHTML =
      '<div class="cnn03-intro-grid">' +
        '<section class="cnn03-card cnn03-image-feature-card" data-tr-id="cnn03_intro_image_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"intro_image"}\'>' +
          '<span class="cnn03-mini-label">数字图片里的局部特征</span>' +
          '<div id="introFeatureImage"></div>' +
        '</section>' +
        '<section class="cnn03-card cnn03-intro-prompt-card" data-tr-id="cnn03_intro_question_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"intro_question"}\'>' +
          '<p class="cnn03-intro-question">人看图片时能发现这些视觉特征，那么模型会认识这些特征吗？</p>' +
          (done ? '' : '<button class="edu-btn edu-btn--primary" id="introPlayBtn" type="button" data-tr-id="cnn03_intro_play_btn" data-tr-click="intro_play_click">模型能看到这些特征吗？</button>') +
        '</section>' +
      '</div>';
    mount.querySelector('#introFeatureImage').appendChild(renderFeatureImageDemo(done));
    var play = mount.querySelector('#introPlayBtn');
    if (play) {
      play.disabled = !!disabled;
      if (!play.disabled) play.addEventListener('click', function () { playIntro(index); });
    }
  }

  function playScore(index) {
    state.scene = index;
    state.scoreProgress = 0;
    state.calcProgress = 0;
    state.calcPlaying = true;
    setFeedback(index, '先看横线卷积核怎样把局部像素和权重对应相乘、相加。');
    render();
  }

  function revealPatchScores(index) {
    state.scoreProgress = 0;
    render();
    guide.patches.forEach(function (patch, step) {
      window.setTimeout(function () {
        state.scoreProgress = step + 1;
        var score = scorePatch(patch.matrix, mainKernel.weights);
        var message = patch.label + '响应分数 = ' + fmt(score) + '。';
        if (patch.key === 'line') message += '它最像横线卷积核要找的模式。';
        else message += '和卷积核的模式越接近的区域，响应分数就会越高。';
        if (patch.key !== 'corner') setFeedback(index, message, 'is-good');
        render();
      }, 520 * (step + 1));
    });
  }

  function renderScoreScene(mount, index, disabled) {
    var calcDone = state.calcProgress >= 9;
    var scoresDone = state.scoreProgress >= guide.patches.length;
    var showPatches = calcDone || state.scoreProgress > 0;
    mount.innerHTML =
      '<div class="cnn03-kernel-lab">' +
        '<section class="cnn03-card cnn03-kernel-primer">' +
          '<span class="cnn03-mini-label">卷积核是什么</span>' +
          '<div class="cnn03-primer-copy">' +
            '<strong>一组会滑动的小权重模板</strong>' +
            '<p>它盖到局部图像上时，同一位置的像素值和权重相乘，9 个乘积相加，得到这个位置的响应分数。</p>' +
          '</div>' +
          '<div id="scoreKernel"></div>' +
        '</section>' +
        '<section class="cnn03-card cnn03-calc-video-card">' +
          '<span class="cnn03-mini-label">一次响应分数怎么算</span>' +
          '<video class="cnn03-calc-video" src="assets/convolution_overlay_sum.mp4" poster="assets/convolution_overlay_sum_poster.png" preload="metadata" controls playsinline muted ' + (state.calcPlaying ? 'autoplay' : '') + '></video>' +
        '</section>' +
        (showPatches ? '<section class="cnn03-score-patches is-visible" id="scorePatches"></section>' : '') +
      '</div>';
    mount.querySelector('#scoreKernel').appendChild(renderMatrix(mainKernel.weights, { kernel: true, highlightRow: 1 }));
    var video = mount.querySelector('.cnn03-calc-video');
    if (video && !disabled) {
      video.addEventListener('ended', function () {
        state.calcPlaying = false;
        state.calcProgress = 9;
        setFeedback(index, '计算过程看完了：接着比较它对三种区域的响应分数。', 'is-good');
        revealPatchScores(index);
      });
      if (state.calcPlaying) {
        video.play().catch(function () {
          state.calcPlaying = false;
          setFeedback(index, '如果浏览器拦截自动播放，请直接点视频播放键；视频结束后会比较三种区域分数。');
          render();
        });
      }
    }
    var patches = mount.querySelector('#scorePatches');
    if (patches) {
      guide.patches.forEach(function (patch, idx) {
        var score = scorePatch(patch.matrix, mainKernel.weights);
        var terms = patchTerms(patch.matrix, mainKernel.weights);
        var visible = state.scoreProgress > idx;
        var card = document.createElement('article');
        card.className = 'cnn03-card cnn03-patch-card' + (visible ? ' is-scored' : '');
        card.innerHTML =
          '<span class="cnn03-mini-label">' + patch.label + '</span>' +
          '<p>' + (patch.key === 'line' ? '中间一行正好是横向笔画。' : '局部形状和横线模板不够像。') + '</p>' +
          '<div class="cnn03-score-meter"><span style="width:' + (visible ? Math.max(8, clamp(score / 6 * 100, 0, 100)) : 0) + '%"></span></div>' +
          '<div class="cnn03-patch-calc ' + (visible ? 'is-visible' : '') + '">' +
            terms.map(function (term) {
              return '<span>' + fmt(term.pixel) + '&times;' + fmt(term.weight) + '=' + fmt(term.product) + '</span>';
            }).join('') +
            '<b>' + terms.map(function (term) { return fmt(term.product); }).join(' + ') + ' = ' + fmt(score) + '</b>' +
          '</div>' +
          '<strong>' + (visible ? '响应分数 ' + fmt(score) : '等待计算') + '</strong>';
        card.insertBefore(renderMatrix(patch.matrix, { patch: true, values: true }), card.querySelector('.cnn03-score-meter'));
        patches.appendChild(card);
      });
    }
    if (!(calcDone && scoresDone)) {
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'edu-btn edu-btn--primary cnn03-inline-action';
      action.textContent = state.calcPlaying ? '计算动画播放中' : '播放卷积核计算与对比';
      setTracking(action, 'cnn03_score_play_btn', 'score_play_click');
      action.disabled = !!disabled || !!state.calcPlaying;
      if (!action.disabled) action.addEventListener('click', function () { playScore(index); });
      mount.appendChild(action);
    }
  }

  function playCalc(index) {
    state.scene = index;
    state.calcProgress = 0;
    state.calcPlaying = true;
    setFeedback(index, 'Manim 动画会逐格展示：哪个像素和哪个权重相乘。');
    render();
  }

  function renderCalcScene(mount, index, disabled) {
    var patch = guide.patches[0].matrix;
    var terms = [];
    patch.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        var weight = mainKernel.weights[rowIndex][colIndex];
        terms.push({
          pixel: value,
          weight: weight,
          product: value * weight,
          row: rowIndex + 1,
          col: colIndex + 1
        });
      });
    });
    var score = terms.reduce(function (sum, term) { return sum + term.product; }, 0);
    var done = state.calcProgress >= 9;
    mount.innerHTML =
      '<div class="cnn03-calc-demo">' +
        '<section class="cnn03-card cnn03-calc-video-card">' +
          '<span class="cnn03-mini-label">Manim 动画演示</span>' +
          '<video class="cnn03-calc-video" src="assets/convolution_overlay_sum.mp4" poster="assets/convolution_overlay_sum_poster.png" preload="metadata" controls playsinline muted ' + (state.calcPlaying ? 'autoplay' : '') + '></video>' +
        '</section>' +
        '<section class="cnn03-card cnn03-calc-explain-card">' +
          '<span class="cnn03-mini-label">对应位置一对一相乘</span>' +
          '<div class="cnn03-calc-matrices">' +
            '<div><b>局部像素</b><div id="calcPatch"></div></div>' +
            '<strong class="cnn03-calc-times">&times;</strong>' +
            '<div><b>卷积核权重</b><div id="calcKernel"></div></div>' +
          '</div>' +
          '<div class="cnn03-term-grid">' + terms.map(function (term) {
            return '<span><em>(' + term.row + ',' + term.col + ')</em><b>' + fmt(term.pixel) + ' &times; ' + fmt(term.weight) + '</b><strong>' + fmt(term.product) + '</strong></span>';
          }).join('') + '</div>' +
          '<div class="cnn03-sum-strip ' + (done ? 'is-complete' : '') + '">' +
            '<span>' + terms.map(function (term) { return fmt(term.product); }).join(' + ') + '</span>' +
            '<strong>= ' + fmt(score) + '</strong>' +
          '</div>' +
        '</section>' +
      '</div>';
    mount.querySelector('#calcPatch').appendChild(renderMatrix(patch, { patch: true, values: true }));
    mount.querySelector('#calcKernel').appendChild(renderMatrix(mainKernel.weights, { kernel: true, highlightRow: 1 }));
    var video = mount.querySelector('.cnn03-calc-video');
    if (video && !disabled) {
      video.addEventListener('ended', function () {
        state.calcPlaying = false;
        state.calcProgress = 9;
        setFeedback(index, '卷积操作的核心就是：局部像素和卷积核权重对应相乘，再求和。', 'is-good');
        render();
      });
      if (state.calcPlaying) {
        video.play().catch(function () {
          state.calcPlaying = false;
          setFeedback(index, '如果浏览器拦截自动播放，请直接点视频的播放按钮。');
          render();
        });
      }
    }
    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'edu-btn edu-btn--primary cnn03-inline-action';
    action.textContent = state.calcPlaying ? '动画播放中' : (done ? '重新播放 Manim 动画' : '播放 Manim 计算动画');
    setTracking(action, 'cnn03_calc_play_btn', 'calc_play_click');
    action.disabled = !!disabled || !!state.calcPlaying;
    if (!action.disabled) action.addEventListener('click', function () { playCalc(index); });
    mount.appendChild(action);
  }

  function playScan(index) {
    state.scene = index;
    state.scanProgress = 0;
    state.scanPlaying = true;
    setFeedback(index, '卷积核从左上角开始扫描。');
    render();
  }

  function renderScanScene(mount, index, disabled) {
    var limit = state.scanProgress;
    mount.innerHTML =
      '<div class="cnn03-scan-grid">' +
        '<section class="cnn03-card cnn03-scan-video-card"><span class="cnn03-mini-label">横线卷积核扫描完整数字 7</span><video class="cnn03-scan-video" src="assets/convolution_scan_feature_map.mp4" poster="assets/convolution_scan_feature_map_poster.png" preload="metadata" controls playsinline muted ' + (state.scanPlaying ? 'autoplay' : '') + '></video></section>' +
        '<section class="cnn03-card"><span class="cnn03-mini-label">生成后的特征图</span><div id="scanNumbers"></div><p class="cnn03-small-note">每个数字都是横线卷积核在一个 3×3 位置上的响应分数。</p></section>' +
      '</div>';
    mount.querySelector('#scanNumbers').appendChild(renderResponseGrid('horizontal', limit, { values: true }));
    var video = mount.querySelector('.cnn03-scan-video');
    if (video && !disabled) {
      video.addEventListener('ended', function () {
        state.scanPlaying = false;
        state.scanProgress = scanPositions.length;
        setFeedback(index, '完整扫描结束：所有响应分数组成了一张新的特征图。', 'is-good');
        render();
      });
      if (state.scanPlaying) {
        video.play().catch(function () {
          state.scanPlaying = false;
          setFeedback(index, '如果浏览器拦截自动播放，请直接点视频播放键。');
          render();
        });
      }
    }
    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'edu-btn edu-btn--primary cnn03-inline-action';
    action.textContent = state.scanPlaying ? '扫描视频播放中' : (limit >= scanPositions.length ? '重新播放扫描视频' : '播放扫描视频');
    setTracking(action, 'cnn03_scan_play_btn', 'scan_play_click');
    action.disabled = !!disabled || !!state.scanPlaying;
    if (!action.disabled) action.addEventListener('click', function () { playScan(index); });
    mount.appendChild(action);
  }

  function handleFeatureClick(index) {
    var key = String(index);
    var pos = scanPositions[index];
    state.selectedFeature = key;
    state.featureClicks[key] = true;
    state.scene = 3;
    setFeedback(3, '这里响应高，是因为原图这个位置有类似横线的笔画。', 'is-good');
    if (Object.keys(state.featureClicks).length >= 2) {
      setFeedback(3, '特征图记录了这个卷积核在哪里看到了它关心的模式。', 'is-good');
    }
    render();
  }

  function renderFeatureScene(mount, index, disabled) {
    var done = state.multiProgress >= guide.kernels.length;
    mount.innerHTML =
      '<div class="cnn03-feature-kernels">' +
        '<section class="cnn03-card cnn03-feature-source"><span class="cnn03-mini-label">输入图像：数字 7</span><div id="featureImage"></div><p>每个卷积核都扫这张数字 7，但关注的局部模式不同。</p></section>' +
        '<section class="cnn03-feature-map-set" id="featureKernelSet"></section>' +
        '<section class="cnn03-card cnn03-feature-conclusion ' + (done ? 'is-visible' : '') + '">' +
          '<span class="cnn03-mini-label">模型学到的线索</span>' +
          '<h3>不同特征图，记录不同局部特征</h3>' +
          '<p>横线卷积核、竖线卷积核、拐角卷积核会从同一张图中提取不同响应。模型把这些响应组合起来，就能判断图像里有哪些局部结构。</p>' +
        '</section>' +
      '</div>';
    mount.querySelector('#featureImage').appendChild(renderImageGrid({ values: true, scanStyle: true }));
    var grid = mount.querySelector('#featureKernelSet');
    guide.kernels.forEach(function (kernel, idx) {
      var visible = state.multiProgress > idx;
      var card = document.createElement('section');
      card.className = 'cnn03-card cnn03-feature-map-card' + (visible ? ' is-visible' : '');
      card.innerHTML =
        '<span class="cnn03-mini-label">' + kernel.label + '</span>' +
        '<div class="cnn03-feature-map-body"><div class="cnn03-kernel-slot"></div><div class="cnn03-map-slot"></div></div>' +
        '<p>' + kernel.concept + '</p>';
      card.querySelector('.cnn03-kernel-slot').appendChild(renderMatrix(kernel.weights, { kernel: true }));
      card.querySelector('.cnn03-map-slot').appendChild(renderResponseGrid(kernel.key, visible ? responseMaps[kernel.key].length : 0, { values: visible }));
      grid.appendChild(card);
    });
    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'edu-btn edu-btn--primary cnn03-inline-action';
    action.textContent = done ? '已生成三张特征图' : (state.multiPlaying ? '特征图生成中' : '生成不同卷积核的特征图');
    setTracking(action, 'cnn03_feature_maps_play_btn', 'feature_maps_play_click');
    action.disabled = !!disabled || done || state.multiPlaying;
    if (!action.disabled) action.addEventListener('click', function () { playMulti(index); });
    mount.appendChild(action);
  }

  function playMulti(index) {
    state.scene = index;
    state.multiProgress = 0;
    state.multiPlaying = true;
    setFeedback(index, '三个卷积核分别查看自己关心的局部模式。');
    render();
    guide.kernels.forEach(function (kernel, stepIndex) {
      window.setTimeout(function () {
        state.multiProgress = stepIndex + 1;
        state.activeKernel = kernel.key;
        if (state.multiProgress >= guide.kernels.length) {
          state.multiPlaying = false;
          setFeedback(index, '多个卷积核一起工作，同一张图像就被分解成多种局部特征线索。', 'is-good');
        } else {
          setFeedback(index, kernel.label + '生成自己的特征图。', 'is-good');
        }
        render();
      }, 640 * (stepIndex + 1));
    });
  }

  function renderMultiScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn03-summary-grid">' +
        '<section class="cnn03-card cnn03-summary-card">' +
          '<span class="cnn03-mini-label">卷积核的作用</span>' +
          '<div class="cnn03-summary-stack">' +
            '<div><strong>局部扫描</strong><span>每次只看一个小窗口，判断这个局部像不像目标模式。</span></div>' +
            '<div><strong>共享权重</strong><span>同一组 3×3 权重在整张图上重复使用，不用给每个位置单独学参数。</span></div>' +
            '<div><strong>生成特征图</strong><span>每个位置的响应分数排成一张图，记录特征出现在哪里。</span></div>' +
          '</div>' +
        '</section>' +
        '<section class="cnn03-card cnn03-summary-card cnn03-summary-card--answer">' +
          '<span class="cnn03-mini-label">下一步</span>' +
          '<h3>很多卷积核，组成卷积神经网络</h3>' +
          '<div class="cnn03-cnn-flow">' +
            '<span>输入图像</span><b>→</b><span>卷积核</span><b>→</b><span>特征图</span><b>→</b><span>卷积层</span><b>→</b><span>卷积神经网络</span>' +
          '</div>' +
          '<p>一个卷积核负责寻找一种局部特征；许多卷积核放在一起，就是一层会提取多种特征的卷积层。多个卷积层继续叠加，就形成后面要学习的卷积神经网络。</p>' +
        '</section>' +
      '</div>';
    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'edu-btn edu-btn--primary cnn03-inline-action';
    action.textContent = state.summaryDone ? '已引出卷积神经网络' : '进入卷积神经网络';
    setTracking(action, 'cnn03_summary_done_btn', 'summary_done_click');
    action.disabled = !!disabled || state.summaryDone;
    if (!action.disabled) action.addEventListener('click', function () {
      state.summaryDone = true;
      state.scene = index;
      setFeedback(index, '对：卷积核负责提取局部特征，卷积神经网络会把很多这样的卷积层连接起来。', 'is-good');
      render();
    });
    if (!state.summaryDone) mount.appendChild(action);
  }

  function handleQuiz(choice) {
    state.quizChoice = choice.key;
    state.scene = 5;
    if (choice.correct) {
      state.quizDone = true;
      setFeedback(5, '对。图像变大时，扫描位置会变多；但这个 3×3 卷积核本身还是这 9 个权重。', 'is-good');
    } else {
      setFeedback(5, '关键不是给每个位置单独配参数，也不是把大图粗暴缩小。卷积核会用同一小组权重重复检测。', 'is-bad');
    }
    render();
  }

  function renderQuizScene(mount, index) {
    mount.innerHTML =
      '<div class="cnn03-quiz-grid">' +
        '<section class="cnn03-card cnn03-quiz-card"><h3>' + guide.quiz.question + '</h3><div id="quizOptions"></div></section>' +
        '<section class="cnn03-card cnn03-compare-card ' + (state.quizDone ? 'is-visible' : '') + '"><span class="cnn03-mini-label">参数对比</span><div class="cnn03-compare"><div><strong>MLP</strong><b>24,883,200</b><span>4K RGB 输入连接到 1 个隐藏神经元</span></div><div><strong>卷积核</strong><b>9</b><span>同一个 3×3 检测器在不同位置复用</span></div></div></section>' +
      '</div>';
    var options = mount.querySelector('#quizOptions');
    guide.quiz.options.forEach(function (choice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cnn03-option' + (state.quizChoice === choice.key ? (choice.correct ? ' is-correct' : ' is-wrong') : '');
      setTracking(button, 'cnn03_quiz_' + choice.key + '_btn', 'quiz_select_click', { option: choice.key, correct: choice.correct });
      button.innerHTML = '<strong>' + choice.label + '</strong><span>' + choice.text + '</span>';
      button.addEventListener('click', function () { handleQuiz(choice); });
      options.appendChild(button);
    });
  }

  function renderSceneBody(index, mount, disabled) {
    if (index === 0) renderIntroScene(mount, index, disabled);
    if (index === 1) renderScoreScene(mount, index, disabled);
    if (index === 2) renderScanScene(mount, index, disabled);
    if (index === 3) renderFeatureScene(mount, index, disabled);
    if (index === 4) renderMultiScene(mount, index, disabled);
    if (index === 5) renderQuizScene(mount, index, disabled);
  }

  function renderTransition(section, index) {
    var slot = section.querySelector('[data-role="transitionSlot"]');
    slot.innerHTML = '';
    slot.classList.remove('is-visible');
    if (index === 0) return;
    if (index !== state.maxScene || !sceneReady(index)) return;
    var copy = transitionCopy(index);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cnn03-transition-card';
    setTracking(button, 'cnn03_transition_scene_' + (index + 1) + '_btn', 'transition_continue_click', { scene: index + 1, label: copy.label });
    button.innerHTML = '<span>' + copy.kicker + '</span><b>' + copy.insight + '</b><strong>' + copy.label + '</strong>';
    button.addEventListener('click', function () { continueFromScene(index); });
    slot.appendChild(button);
    slot.classList.add('is-visible');
  }

  function createSceneSection(index) {
    var scene = guide.scenes[index];
    var section = document.createElement('section');
    section.className = 'cnn03-stage cnn03-scene-section';
    section.dataset.sceneIndex = String(index);
    section.setAttribute('data-tr-id', 'cnn03_scene_' + (index + 1) + '_panel');
    section.setAttribute('data-tr-view', 'panel_show');
    section.setAttribute('data-tr-props', JSON.stringify({ panel: 'scene', scene: index + 1 }));
    if (index === state.scene) section.classList.add('is-active');
    if (index < state.maxScene) section.classList.add('is-past');
    if (index === state.maxScene) section.classList.add('is-current');
    if (index === state.enteringScene) section.classList.add('is-entering');

    var disabled = index < state.maxScene;
    var feedback = feedbackFor(index);
    section.innerHTML =
      '<header class="cnn03-stage-head">' +
        '<div>' +
          '<span class="cnn03-kicker" data-role="sceneTag">' + scene.tag + '</span>' +
          '<h2 data-role="sceneTitle">' + scene.title + '</h2>' +
          '<p>' + scene.goal + '</p>' +
        '</div>' +
        '<div class="cnn03-range-pill">' + scene.pill + '</div>' +
      '</header>' +
      '<div class="cnn03-layout">' +
        '<section class="cnn03-workbench" aria-label="交互区域" data-tr-id="cnn03_workbench_scene_' + (index + 1) + '_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"workbench","scene":' + (index + 1) + '}\'></section>' +
        '<aside class="cnn03-side-panel" aria-label="任务信息" data-tr-id="cnn03_side_scene_' + (index + 1) + '_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"side","scene":' + (index + 1) + '}\'>' +
          '<section class="cnn03-side-section"><h3>完成条件</h3><div class="cnn03-task-list" data-role="taskList"></div></section>' +
          '<section class="cnn03-side-section cnn03-concept-card"><h3>本幕启发</h3><p data-role="conceptText">完成当前动作后解锁。</p></section>' +
        '</aside>' +
      '</div>' +
      '<div class="cnn03-transition-slot" data-role="transitionSlot" aria-live="polite"></div>' +
      '<footer class="cnn03-bottom-bar"><p class="cnn03-feedback ' + feedback.tone + '" data-role="feedbackText">' + feedback.text + '</p></footer>';

    renderSidePanel(section, index);
    renderSceneBody(index, section.querySelector('.cnn03-workbench'), disabled);
    renderTransition(section, index);
    return section;
  }

  function render(options) {
    var opts = options || {};
    state.maxScene = clamp(state.maxScene, 0, guide.scenes.length - 1);
    state.scene = clamp(state.scene, 0, state.maxScene);
    renderProgress();
    sceneStack.innerHTML = '';
    for (var index = 0; index <= state.maxScene; index += 1) {
      sceneStack.appendChild(createSceneSection(index));
    }
    if (typeof opts.scrollTo === 'number') scrollToScene(opts.scrollTo, opts.block || 'center');
    state.enteringScene = null;
  }

  render();
}());
