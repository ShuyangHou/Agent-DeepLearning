(function () {
  'use strict';

  var guide = window.CNN05_GUIDE;
  var state = {
    scene: 0,
    maxScene: 0,
    enteringScene: null,
    feedback: {},
    introWatched: false,
    overviewVisited: {},
    c1Progress: 0,
    c1Playing: false,
    selectedC1Map: 0,
    activationDone: false,
    s2Done: false,
    c3Progress: 0,
    c3Playing: false,
    selectedC3Map: 0,
    s4Done: false,
    c5Done: false,
    f6Done: false,
    evidenceViewed: false,
    outputDone: false,
    highestViewed: false,
    otherViewed: false,
    selectedDigit: null,
    forwardProgress: 0,
    forwardDone: false,
    quizAnswers: {},
    done: false
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var defaultFeedback = [
    '先看一遍：数字 7 图像进入 LeNet-5，最后输出 0-9 概率并预测为 7。',
    '先点击查看 5 个模块，建立 LeNet-5 从输入到输出的整体地图。',
    'C1 会用 6 个 5×5 卷积核扫描数字 7 的输入图像。',
    '先让 C1 的响应通过激活函数。',
    '用代表性视图看懂 C3 如何继续组合特征，S4 如何再次缩小特征图。',
    '把 S4 输出送进分类头：400 个特征值经过 C5、F6，最后连到 0-9 概率。',
    '跑一次数字 7 的完整前向传播，再完成轻量检查。'
  ];
  var c1Kernels = [
    {
      key: 'horizontal',
      title: '横画检测',
      role: '寻找数字 7 顶部横向笔画',
      mapSummary: '顶部横画最亮',
      values: [
        [-1, -1, -1, -1, -1],
        [-1,  0,  0,  0, -1],
        [ 2,  2,  2,  2,  2],
        [-1,  0,  0,  0, -1],
        [-1, -1, -1, -1, -1]
      ]
    },
    {
      key: 'diagonal',
      title: '斜线检测',
      role: '寻找数字 7 向下倾斜的主笔画',
      mapSummary: '斜向笔画最亮',
      values: [
        [-1, -1, -1, -1,  2],
        [-1, -1, -1,  2, -1],
        [-1, -1,  2, -1, -1],
        [-1,  2, -1, -1, -1],
        [ 2, -1, -1, -1, -1]
      ]
    },
    {
      key: 'corner',
      title: '转折检测',
      role: '寻找横画转向斜画的位置',
      mapSummary: '右上转折最亮',
      values: [
        [ 2,  2,  2,  2,  0],
        [-1, -1,  0,  2,  0],
        [-1, -1,  0,  2, -1],
        [-1,  0,  2,  0, -1],
        [-1, -1, -1, -1, -1]
      ]
    },
    {
      key: 'edge',
      title: '边缘增强',
      role: '突出笔画和背景的分界',
      mapSummary: '笔画边界更亮',
      values: [
        [-1, -1, -1, -1, -1],
        [-1,  1,  1,  1, -1],
        [-1,  1,  4,  1, -1],
        [-1,  1,  1,  1, -1],
        [-1, -1, -1, -1, -1]
      ]
    },
    {
      key: 'endpoint',
      title: '端点检测',
      role: '寻找笔画开始和结束的位置',
      mapSummary: '端点区域最亮',
      values: [
        [ 2,  2,  1, -1, -1],
        [ 2,  2,  1, -1, -1],
        [ 1,  1,  0, -1, -1],
        [-1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1]
      ]
    },
    {
      key: 'smooth',
      title: '局部汇总',
      role: '汇总附近亮度，保留稳定笔画区域',
      mapSummary: '整条 7 的笔画变亮',
      values: [
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 2, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0]
      ]
    }
  ];
  var c3Combinations = [
    { title: '横画+转折', sources: [[0, 0.48], [2, 0.34], [3, 0.18]] },
    { title: '斜线+边缘', sources: [[1, 0.52], [3, 0.32], [5, 0.16]] },
    { title: '转折+斜线', sources: [[2, 0.48], [1, 0.34], [5, 0.18]] },
    { title: '端点+横画', sources: [[4, 0.46], [0, 0.34], [2, 0.2]] },
    { title: '笔画整体', sources: [[5, 0.5], [0, 0.25], [1, 0.25]] },
    { title: '右上结构', sources: [[2, 0.5], [0, 0.25], [3, 0.25]] },
    { title: '下斜结构', sources: [[1, 0.58], [4, 0.22], [5, 0.2]] },
    { title: '边缘组合', sources: [[3, 0.52], [1, 0.24], [0, 0.24]] },
    { title: '顶部证据', sources: [[0, 0.56], [2, 0.26], [5, 0.18]] },
    { title: '主体证据', sources: [[1, 0.42], [5, 0.38], [3, 0.2]] },
    { title: '端点证据', sources: [[4, 0.55], [1, 0.25], [3, 0.2]] },
    { title: '弯折证据', sources: [[2, 0.58], [3, 0.22], [5, 0.2]] },
    { title: '横斜连接', sources: [[0, 0.36], [1, 0.34], [2, 0.3]] },
    { title: '稳定亮区', sources: [[5, 0.62], [3, 0.2], [4, 0.18]] },
    { title: '轮廓线索', sources: [[3, 0.45], [4, 0.3], [1, 0.25]] },
    { title: '数字7证据', sources: [[0, 0.28], [1, 0.28], [2, 0.22], [5, 0.22]] }
  ];
  var c1ImageRows = [
    '0000000000000000000000000000',
    '0000000000000000000010000000',
    '0000000000000000010000010000',
    '0000000000000000000010000000',
    '0000000000000001101000000000',
    '0000000000000000000000000000',
    '0000000000000001020000000000',
    '0000000000000026bd2000000000',
    '0000000010116cfffe1100000000',
    '00001000029efd98eb0000000000',
    '00000014eff94004f80000000000',
    '00000014a9500103f50000000000',
    '000000000100000af20000000000',
    '000000000000000de10000000000',
    '000000010000000cc00000000000',
    '000000000000012fa00000000000',
    '000000000010006f310000000000',
    '000000000000019f200000000000',
    '00000000000000ac000000000000',
    '00000000000010dc000000000000',
    '00000000000001fa000000000000',
    '00000000000005f5000000000000',
    '0000000000001af2000000000000',
    '0000000000000be2000000000000',
    '0000000000000cd0000000000000',
    '0000000000106f90000000000000',
    '0000000020008f40000000000000',
    '0000000000000100000000000000'
  ];
  var c1PaddedImage = createPaddedImage(c1ImageRows, 2);
  var c1FeatureCache = {};
  var c1RawFeatureCache = {};

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

  function setFeedback(index, message, tone) {
    state.feedback[index] = { text: message, tone: tone || '' };
  }

  function feedbackFor(index) {
    return state.feedback[index] || { text: defaultFeedback[index], tone: '' };
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

  function countKeys(obj) {
    return Object.keys(obj).filter(function (key) { return obj[key]; }).length;
  }

  function overviewComplete() {
    return !!state.overviewVisited.output;
  }

  function sceneReady(index) {
    if (index === 0) return state.introWatched;
    if (index === 1) return overviewComplete();
    if (index === 2) return state.c1Progress >= 6;
    if (index === 3) return state.activationDone && state.s2Done;
    if (index === 4) return state.c3Progress >= 16 && state.s4Done;
    if (index === 5) return state.c5Done && state.f6Done && state.outputDone;
    return state.forwardDone && guide.quiz.every(function (q) { return state.quizAnswers[q.key] === q.answer; });
  }

  function taskDone(index, label) {
    if (index === 0) {
      if (label.indexOf('观看') !== -1) return state.introWatched;
      return state.maxScene >= 1;
    }
    if (index === 1) {
      if (label.indexOf('模块地图') !== -1) return overviewComplete();
      return state.maxScene >= 2;
    }
    if (index === 2) {
      if (label.indexOf('运行') !== -1) return state.c1Progress >= 6;
      return state.maxScene >= 3;
    }
    if (index === 3) {
      if (label.indexOf('激活') !== -1) return state.activationDone;
      if (label.indexOf('S2') !== -1) return state.s2Done;
      return state.maxScene >= 4;
    }
    if (index === 4) {
      if (label.indexOf('C3') !== -1) return state.c3Progress >= 16;
      if (label.indexOf('S4') !== -1) return state.s4Done;
      return state.maxScene >= 5;
    }
    if (index === 5) {
      if (label.indexOf('C5') !== -1) return state.c5Done;
      if (label.indexOf('F6') !== -1) return state.f6Done;
      if (label.indexOf('生成') !== -1) return state.outputDone;
      return state.maxScene >= 6;
    }
    if (index === 6) {
      if (label.indexOf('运行') !== -1) return state.forwardDone;
      if (label.indexOf('3 道') !== -1) return guide.quiz.every(function (q) { return state.quizAnswers[q.key] === q.answer; });
      return state.done;
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
      } else {
        state.done = true;
        setFeedback(index, '你已经认识了 LeNet-5 的主要结构。下一关可以进入 MNIST 训练。', 'is-good');
        render();
      }
    }, 190);
  }

  function pixelValue(row, col) {
    var top = row >= 5 && row <= 8 && col >= 6 && col <= 25;
    var diagonalCenter = 25 - (row - 8) * 0.72;
    var diagonal = row > 8 && row <= 28 && Math.abs(col - diagonalCenter) <= 1.8;
    var hook = row >= 8 && row <= 11 && col >= 21 && col <= 25;
    var base = top || diagonal || hook ? 0.94 : 0.035;
    if (top && (row === 5 || row === 8)) base = 0.82;
    if ((row + col) % 11 === 0) base += 0.025;
    return clamp(base, 0, 1);
  }

  function pixelShade(value) {
    var light = Math.round(98 - value * 70);
    return 'hsl(213 35% ' + light + '%)';
  }

  function renderDigitGrid(size, options) {
    var opts = options || {};
    var rows = opts.rows || size || 16;
    var cols = opts.cols || size || 16;
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-digit-grid' + (opts.compact ? ' cnn05-digit-grid--compact' : '') + (opts.mini ? ' cnn05-digit-grid--mini' : '');
    wrap.style.setProperty('--cols', cols);
    wrap.style.setProperty('--rows', rows);
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var sourceR = Math.floor(r / rows * 32);
        var sourceC = Math.floor(c / cols * 32);
        var value = pixelValue(sourceR, sourceC);
        var cell = document.createElement('span');
        cell.className = 'cnn05-pixel';
        cell.style.setProperty('--shade', pixelShade(value));
        if (opts.highlightWidth && r === Math.floor(rows * 0.28)) cell.classList.add('is-width');
        if (opts.highlightHeight && c === Math.floor(cols * 0.45)) cell.classList.add('is-height');
        if (value > 0.58) cell.classList.add('is-ink');
        wrap.appendChild(cell);
      }
    }
    return wrap;
  }

  function miniMap(seed, options) {
    var opts = options || {};
    var rows = opts.rows || 7;
    var cols = opts.cols || 7;
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-mini-map' + (opts.hot ? ' is-hot' : '') + (opts.dim ? ' is-dim' : '');
    wrap.style.setProperty('--cols', cols);
    wrap.style.setProperty('--rows', rows);
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var v = (Math.sin((r + 1) * (seed + 1.7) + c * 1.3) + 1) / 2;
        var cell = document.createElement('span');
        cell.style.setProperty('--v', v.toFixed(2));
        if (v > 0.72) cell.className = 'is-hot';
        wrap.appendChild(cell);
      }
    }
    return wrap;
  }

  function renderFeatureStack(count, options) {
    var opts = options || {};
    var readyCount = typeof opts.ready === 'number' ? opts.ready : count;
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-feature-stack' + (opts.spread ? ' is-spread' : '') + (opts.small ? ' is-small' : '');
    for (var i = 0; i < count; i += 1) {
      var card = document.createElement(opts.buttons ? 'button' : 'div');
      if (opts.buttons) card.type = 'button';
      card.className = 'cnn05-feature-card' + (i < readyCount ? ' is-ready' : '') + (opts.selected === i ? ' is-selected' : '');
      card.style.setProperty('--i', i);
      card.innerHTML = '<span>' + (opts.prefix || '特征图') + (i + 1) + '</span>';
      card.appendChild(miniMap(i + (opts.seed || 0), { rows: opts.rows || 6, cols: opts.cols || 6, hot: i < readyCount && i === opts.selected, dim: i >= readyCount }));
      if (opts.buttons && i < readyCount) {
        card.addEventListener('click', function (idx) {
          return function () {
            if (opts.onClick) opts.onClick(idx);
          };
        }(i));
      }
      wrap.appendChild(card);
    }
    return wrap;
  }

  function renderC1Input(progress) {
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-c1-input';
    wrap.innerHTML =
      '<div class="cnn05-c1-image-wrap">' +
        '<img class="cnn05-c1-photo" src="assets/image_7.jpg" alt="数字 7 的灰度输入图像">' +
      '</div>';
    if (progress > 0) wrap.classList.add('is-running');
    return wrap;
  }

  function kernelCellClass(value) {
    if (value > 0) return 'is-positive';
    if (value < 0) return 'is-negative';
    return 'is-zero';
  }

  function renderC1Kernels(slot, ready) {
    slot.className = 'cnn05-c1-kernel-grid';
    c1Kernels.forEach(function (kernel, idx) {
      var card = document.createElement('article');
      card.className = 'cnn05-c1-kernel-card';
      if (idx < ready) card.classList.add('is-done');
      if (idx === ready && ready < c1Kernels.length) card.classList.add('is-current');
      var matrix = document.createElement('div');
      matrix.className = 'cnn05-c1-kernel-matrix';
      kernel.values.forEach(function (row) {
        row.forEach(function (value) {
          var cell = document.createElement('span');
          cell.className = kernelCellClass(value);
          cell.textContent = value;
          matrix.appendChild(cell);
        });
      });
      card.innerHTML =
        '<header><b>' + String(idx + 1).padStart(2, '0') + '</b><strong>' + kernel.title + '</strong></header>' +
        '<p>' + kernel.role + '</p>';
      card.appendChild(matrix);
      slot.appendChild(card);
    });
  }

  function createPaddedImage(rows, pad) {
    var image = rows.map(function (row) {
      return row.split('').map(function (ch) {
        return parseInt(ch, 16) / 15;
      });
    });
    var width = image[0].length + pad * 2;
    var blank = [];
    for (var i = 0; i < width; i += 1) blank.push(0);
    var padded = [];
    for (var top = 0; top < pad; top += 1) padded.push(blank.slice());
    image.forEach(function (row) {
      var paddedRow = [];
      for (var left = 0; left < pad; left += 1) paddedRow.push(0);
      paddedRow = paddedRow.concat(row);
      for (var right = 0; right < pad; right += 1) paddedRow.push(0);
      padded.push(paddedRow);
    });
    for (var bottom = 0; bottom < pad; bottom += 1) padded.push(blank.slice());
    return padded;
  }

  function normalizeFeature(values) {
    var max = -Infinity;
    values.forEach(function (row) {
      row.forEach(function (value) {
        if (value > max) max = value;
      });
    });
    if (max < 0.0001) {
      return values.map(function (row) {
        return row.map(function () { return 0; });
      });
    }
    return values.map(function (row) {
      return row.map(function (value) {
        return clamp(Math.max(0, value) / max, 0, 1);
      });
    });
  }

  function c1RawFeatureMatrix(kernel) {
    if (c1RawFeatureCache[kernel.key]) return c1RawFeatureCache[kernel.key];
    var raw = [];
    for (var r = 0; r <= c1PaddedImage.length - 5; r += 1) {
      var row = [];
      for (var c = 0; c <= c1PaddedImage[0].length - 5; c += 1) {
        var sum = 0;
        for (var kr = 0; kr < 5; kr += 1) {
          for (var kc = 0; kc < 5; kc += 1) {
            sum += c1PaddedImage[r + kr][c + kc] * kernel.values[kr][kc];
          }
        }
        row.push(sum);
      }
      raw.push(row);
    }
    c1RawFeatureCache[kernel.key] = raw;
    return raw;
  }

  function c1FeatureMatrix(kernel) {
    if (c1FeatureCache[kernel.key]) return c1FeatureCache[kernel.key];
    var raw = c1RawFeatureMatrix(kernel);
    c1FeatureCache[kernel.key] = normalizeFeature(raw);
    return c1FeatureCache[kernel.key];
  }

  function featureRange(matrix) {
    var min = Infinity;
    var max = -Infinity;
    matrix.forEach(function (row) {
      row.forEach(function (value) {
        if (value < min) min = value;
        if (value > max) max = value;
      });
    });
    return { min: min, max: max };
  }

  function pooledFeatureValue(matrix, row, col, rows, cols) {
    var rowStart = Math.floor(row * matrix.length / rows);
    var rowEnd = Math.max(rowStart + 1, Math.floor((row + 1) * matrix.length / rows));
    var colStart = Math.floor(col * matrix[0].length / cols);
    var colEnd = Math.max(colStart + 1, Math.floor((col + 1) * matrix[0].length / cols));
    var best = 0;
    for (var r = rowStart; r < rowEnd; r += 1) {
      for (var c = colStart; c < colEnd; c += 1) {
        best = Math.max(best, matrix[r][c]);
      }
    }
    return best;
  }

  function renderC1FeatureMap(kernel, options) {
    var opts = options || {};
    var rows = opts.rows || 14;
    var cols = opts.cols || 14;
    var matrix = c1FeatureMatrix(kernel);
    var map = document.createElement('div');
    map.className = 'cnn05-c1-map' + (opts.dim ? ' is-dim' : '');
    map.style.setProperty('--cols', cols);
    map.style.setProperty('--rows', rows);
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var cell = document.createElement('span');
        cell.style.setProperty('--v', pooledFeatureValue(matrix, r, c, rows, cols).toFixed(2));
        map.appendChild(cell);
      }
    }
    return map;
  }

  function renderActivationMap(kernel, active, options) {
    var opts = options || {};
    var rows = opts.rows || 16;
    var cols = opts.cols || 16;
    var raw = c1RawFeatureMatrix(kernel);
    var range = featureRange(raw);
    var maxPositive = Math.max(0.0001, range.max);
    var maxAbsNegative = Math.max(0.0001, Math.abs(Math.min(0, range.min)));
    var map = document.createElement('div');
    map.className = 'cnn05-activation-map' + (active ? ' is-after' : ' is-before');
    map.style.setProperty('--cols', cols);
    map.style.setProperty('--rows', rows);
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var rowStart = Math.floor(r * raw.length / rows);
        var rowEnd = Math.max(rowStart + 1, Math.floor((r + 1) * raw.length / rows));
        var colStart = Math.floor(c * raw[0].length / cols);
        var colEnd = Math.max(colStart + 1, Math.floor((c + 1) * raw[0].length / cols));
        var positive = 0;
        var negative = 0;
        for (var rr = rowStart; rr < rowEnd; rr += 1) {
          for (var cc = colStart; cc < colEnd; cc += 1) {
            positive = Math.max(positive, raw[rr][cc]);
            negative = Math.min(negative, raw[rr][cc]);
          }
        }
        var cell = document.createElement('span');
        if (active) {
          cell.style.setProperty('--v', clamp(Math.max(0, positive) / maxPositive, 0, 1).toFixed(2));
        } else if (positive >= Math.abs(negative)) {
          cell.className = 'is-positive';
          cell.style.setProperty('--v', clamp(positive / maxPositive, 0, 1).toFixed(2));
        } else {
          cell.className = 'is-negative';
          cell.style.setProperty('--v', clamp(Math.abs(negative) / maxAbsNegative, 0, 1).toFixed(2));
        }
        map.appendChild(cell);
      }
    }
    return map;
  }

  function renderS2FeatureMap(kernel, options) {
    var opts = options || {};
    return renderC1FeatureMap(kernel, { rows: opts.rows || 7, cols: opts.cols || 7, dim: opts.dim });
  }

  function renderActivationCompare(slot, selected) {
    var kernel = c1Kernels[selected] || c1Kernels[0];
    slot.className = 'cnn05-activation-compare';
    var before = document.createElement('article');
    before.className = 'cnn05-activation-panel';
    before.innerHTML = '<span>激活前</span><strong>正响应 + 负响应</strong>';
    before.appendChild(renderActivationMap(kernel, false));
    var after = document.createElement('article');
    after.className = 'cnn05-activation-panel is-after';
    after.innerHTML = '<span>激活后</span><strong>负值归零，只保留有效响应</strong>';
    after.appendChild(renderActivationMap(kernel, true));
    slot.appendChild(before);
    slot.appendChild(after);
  }

  function renderS2FeatureMaps(slot, ready, selected, onClick) {
    slot.className = 'cnn05-s2-feature-grid';
    c1Kernels.forEach(function (kernel, idx) {
      var isReady = !!ready;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'cnn05-feature-card cnn05-c1-feature-card cnn05-s2-feature-card' + (isReady ? ' is-ready' : '') + (isReady && selected === idx ? ' is-selected' : '');
      card.disabled = !isReady;
      card.innerHTML =
        '<span><b>' + String(idx + 1).padStart(2, '0') + '</b>' + kernel.title + '</span>' +
        '<small>' + (isReady ? '14×14 池化后' : '等待 S2') + '</small>';
      card.appendChild(renderS2FeatureMap(kernel, { dim: !isReady }));
      if (isReady) {
        card.addEventListener('click', function () {
          onClick(idx);
        });
      }
      slot.appendChild(card);
    });
  }

  function c3CombinationValue(combo, row, col, rows, cols) {
    var total = 0;
    var weightSum = 0;
    combo.sources.forEach(function (source) {
      var kernel = c1Kernels[source[0]];
      var weight = source[1];
      total += pooledFeatureValue(c1FeatureMatrix(kernel), row, col, rows, cols) * weight;
      weightSum += weight;
    });
    return clamp(Math.pow(weightSum ? total / weightSum : 0, 0.86), 0, 1);
  }

  function renderC3FeatureMap(combo, options) {
    var opts = options || {};
    var rows = opts.rows || 8;
    var cols = opts.cols || 8;
    var map = document.createElement('div');
    map.className = 'cnn05-c3-map' + (opts.dim ? ' is-dim' : '');
    map.style.setProperty('--cols', cols);
    map.style.setProperty('--rows', rows);
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var cell = document.createElement('span');
        cell.style.setProperty('--v', c3CombinationValue(combo, r, c, rows, cols).toFixed(2));
        map.appendChild(cell);
      }
    }
    return map;
  }

  function renderC3FeatureMaps(slot, ready, selected, onClick) {
    slot.className = 'cnn05-c3-feature-grid';
    c3Combinations.forEach(function (combo, idx) {
      var isReady = idx < ready;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'cnn05-feature-card cnn05-c3-feature-card' + (isReady ? ' is-ready' : '') + (isReady && selected === idx ? ' is-selected' : '');
      card.disabled = !isReady;
      card.innerHTML =
        '<span><b>' + String(idx + 1).padStart(2, '0') + '</b>' + combo.title + '</span>' +
        '<small>' + (isReady ? '来自 S2 特征组合' : '等待 C3') + '</small>';
      card.appendChild(renderC3FeatureMap(combo, { dim: !isReady }));
      if (isReady) {
        card.addEventListener('click', function () {
          onClick(idx);
        });
      }
      slot.appendChild(card);
    });
  }

  function s4FlattenValue(index) {
    var mapIndex = Math.floor(index / 25);
    var cellIndex = index % 25;
    var row = Math.floor(cellIndex / 5);
    var col = cellIndex % 5;
    var combo = c3Combinations[(state.selectedC3Map + mapIndex) % c3Combinations.length];
    var base = c3CombinationValue(combo, row, col, 5, 5);
    var wave = 0.84 + 0.16 * ((Math.sin((mapIndex + 1) * 1.3 + cellIndex * 0.7) + 1) / 2);
    return clamp(base * wave, 0, 1);
  }

  function renderS4FlatVector(slot) {
    slot.className = 'cnn05-flat-vector';
    slot.style.setProperty('--cols', 20);
    for (var i = 0; i < 400; i += 1) {
      var cell = document.createElement('span');
      cell.style.setProperty('--v', s4FlattenValue(i).toFixed(2));
      if (i % 25 === 0) cell.className = 'is-boundary';
      slot.appendChild(cell);
    }
  }

  function renderDenseVector(slot, count, ready, options) {
    var opts = options || {};
    var cols = opts.cols || 12;
    var hot = opts.hot || [];
    slot.className = 'cnn05-dense-vector cnn05-dense-vector--' + (opts.kind || 'plain') + (ready >= count ? ' is-ready' : '');
    slot.style.setProperty('--cols', cols);
    for (var i = 0; i < count; i += 1) {
      var node = document.createElement(opts.onClick ? 'button' : 'span');
      if (opts.onClick) node.type = 'button';
      node.style.setProperty('--v', ((Math.sin((i + 1) * 1.17) + 1) / 2).toFixed(2));
      if (i < ready) node.classList.add('is-ready');
      if (hot.indexOf(i) !== -1) node.classList.add('is-hot');
      if (opts.onClick) {
        node.disabled = i >= ready;
        if (i < ready) {
          node.addEventListener('click', function (idx) {
            return function () {
              opts.onClick(idx);
            };
          }(i));
        }
      }
      slot.appendChild(node);
    }
  }

  function renderFaninDiagram(slot, options) {
    var opts = options || {};
    slot.className = 'cnn05-fanin-diagram cnn05-fanin-diagram--' + (opts.kind || 'c5') + (opts.active ? ' is-active' : '');
    var inputs = document.createElement('div');
    inputs.className = 'cnn05-fanin-inputs';
    for (var i = 0; i < 14; i += 1) {
      var input = document.createElement('span');
      if (i === 2 || i === 5 || i === 9 || i === 12) input.className = 'is-hot';
      inputs.appendChild(input);
    }
    var lines = document.createElement('div');
    lines.className = 'cnn05-fanin-lines';
    for (var line = 0; line < 5; line += 1) lines.appendChild(document.createElement('i'));
    var target = document.createElement('div');
    target.className = 'cnn05-fanin-target';
    target.textContent = opts.target || '1';
    slot.innerHTML = '<strong>' + opts.title + '</strong><p>' + opts.text + '</p>';
    var visual = document.createElement('div');
    visual.className = 'cnn05-fanin-visual';
    visual.appendChild(inputs);
    visual.appendChild(lines);
    visual.appendChild(target);
    slot.appendChild(visual);
  }

  function createC3RepresentativeKernelCard(compact) {
    var kernel = {
      title: '组合横画、斜线和转折',
      values: [
        [ 1,  1,  0, -1, -1],
        [ 1,  2,  1,  0, -1],
        [ 0,  1,  2,  1,  0],
        [-1,  0,  1,  2,  1],
        [-1, -1,  0,  1,  1]
      ]
    };
    var card = document.createElement('article');
    card.className = 'cnn05-c1-kernel-card cnn05-c3-rep-kernel is-done' + (compact ? ' is-compact' : '');
    var matrix = document.createElement('div');
    matrix.className = 'cnn05-c1-kernel-matrix';
    kernel.values.forEach(function (row) {
      row.forEach(function (value) {
        var cell = document.createElement('span');
        cell.className = kernelCellClass(value);
        cell.textContent = value;
        matrix.appendChild(cell);
      });
    });
    card.innerHTML = compact ? '' : '<header><b>×16</b><strong>代表卷积核</strong></header><p>' + kernel.title + '</p>';
    card.appendChild(matrix);
    return card;
  }

  function renderC3RepresentativeKernel(slot) {
    slot.appendChild(createC3RepresentativeKernelCard(false));
  }

  function renderLayerStack(slot, options) {
    var opts = options || {};
    var sheets = opts.sheets || 5;
    var offset = opts.offset || 7;
    var size = opts.size || 104;
    var stack = document.createElement('div');
    stack.className = 'cnn05-layer-stack cnn05-layer-stack--' + (opts.kind || 'feature') + (opts.dim ? ' is-dim' : '') + (opts.ready ? ' is-ready' : '');
    stack.style.width = (size + offset * (sheets - 1)) + 'px';
    stack.style.height = (size + offset * (sheets - 1)) + 'px';
    stack.style.setProperty('--stack-size', size + 'px');
    for (var i = sheets - 1; i >= 0; i -= 1) {
      var sheet = document.createElement('div');
      sheet.className = 'cnn05-stack-sheet' + (i === 0 ? ' is-front' : '');
      sheet.style.left = (i * offset) + 'px';
      sheet.style.top = ((sheets - i - 1) * offset) + 'px';
      sheet.style.zIndex = String(20 - i);
      if (i === 0 && opts.content) sheet.appendChild(opts.content);
      stack.appendChild(sheet);
    }
    if (opts.count) {
      var count = document.createElement('b');
      count.className = 'cnn05-stack-count';
      count.textContent = opts.count;
      stack.appendChild(count);
    }
    slot.appendChild(stack);
    return stack;
  }

  function renderC1FeatureMaps(slot, ready, selected, onClick) {
    slot.className = 'cnn05-c1-feature-grid';
    c1Kernels.forEach(function (kernel, idx) {
      var isReady = idx < ready;
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'cnn05-feature-card cnn05-c1-feature-card' + (isReady ? ' is-ready' : '') + (isReady && selected === idx ? ' is-selected' : '');
      card.disabled = !isReady;
      card.innerHTML =
        '<span><b>' + String(idx + 1).padStart(2, '0') + '</b>' + kernel.title + '</span>' +
        '<small>' + (isReady ? kernel.mapSummary : '等待生成') + '</small>';
      card.appendChild(renderC1FeatureMap(kernel, { dim: !isReady }));
      if (isReady) {
        card.addEventListener('click', function () {
          onClick(idx);
        });
      }
      slot.appendChild(card);
    });
  }

  function renderModuleVisual(item) {
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-module-visual cnn05-module-visual--' + item.key;
    if (item.key === 'input') {
      wrap.appendChild(renderDigitGrid(18, { mini: true }));
    } else if (item.key === 'early') {
      wrap.appendChild(renderOverviewS2Preview());
    } else if (item.key === 'deep') {
      wrap.appendChild(renderOverviewS4Preview());
    } else if (item.key === 'evidence') {
      wrap.appendChild(renderOverviewDensePreview());
    } else if (item.key === 'output') {
      wrap.appendChild(renderOutputPreview());
    }
    return wrap;
  }

  function renderOverviewS2Preview() {
    var preview = document.createElement('div');
    preview.className = 'cnn05-overview-feature-strip';
    c1Kernels.forEach(function (kernel) {
      preview.appendChild(renderS2FeatureMap(kernel, { rows: 7, cols: 7 }));
    });
    return preview;
  }

  function renderOverviewS4Preview() {
    var preview = document.createElement('div');
    preview.className = 'cnn05-overview-s4-preview';
    var stackSlot = document.createElement('div');
    renderLayerStack(stackSlot, {
      kind: 'pool',
      sheets: 5,
      size: 88,
      ready: true,
      count: 16,
      content: renderC3FeatureMap(c3Combinations[15], { rows: 5, cols: 5 })
    });
    preview.appendChild(stackSlot.firstElementChild);
    return preview;
  }

  function renderOverviewDensePreview() {
    var preview = document.createElement('div');
    preview.className = 'cnn05-overview-dense-flow';
    [
      { label: '400', kind: 'flat', count: 28 },
      { label: '120', kind: 'c5', count: 18 },
      { label: '84', kind: 'f6', count: 14 }
    ].forEach(function (group, index) {
      var block = document.createElement('div');
      block.className = 'cnn05-overview-vector-block cnn05-overview-vector-block--' + group.kind;
      block.innerHTML = '<strong>' + group.label + '</strong>';
      var dots = document.createElement('div');
      for (var i = 0; i < group.count; i += 1) {
        var dot = document.createElement('span');
        dot.style.setProperty('--v', ((Math.sin((i + 1) * (index + 1.2)) + 1) / 2).toFixed(2));
        if (i === 3 || i === 9) dot.className = 'is-hot';
        dots.appendChild(dot);
      }
      block.appendChild(dots);
      preview.appendChild(block);
      if (index < 2) preview.appendChild(document.createElement('i'));
    });
    return preview;
  }

  function renderFeaturePreview(count, rows, cols, seed) {
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-feature-preview';
    for (var i = 0; i < count; i += 1) {
      var map = miniMap(i + seed, { rows: rows, cols: cols, hot: i % 3 === 0 });
      wrap.appendChild(map);
    }
    return wrap;
  }

  function renderEvidencePreview() {
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-evidence-preview';
    for (var i = 0; i < 24; i += 1) {
      var dot = document.createElement('span');
      dot.style.setProperty('--v', ((Math.sin(i * 1.7) + 1) / 2).toFixed(2));
      if (i === 5 || i === 13 || i === 18) dot.className = 'is-hot';
      wrap.appendChild(dot);
    }
    return wrap;
  }

  function renderOutputPreview() {
    var max = probabilityMax();
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-output-preview';
    guide.probabilities.forEach(function (item) {
      var bar = document.createElement('span');
      bar.style.setProperty('--p', item.value);
      bar.textContent = item.digit;
      if (item.digit === max.digit) bar.className = 'is-max';
      wrap.appendChild(bar);
    });
    return wrap;
  }

  function renderTrack(activeKeys, compact, progressIndex) {
    var active = activeKeys || [];
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-track' + (compact ? ' cnn05-track--compact' : '');
    guide.layers.forEach(function (layer, idx) {
      var node = document.createElement('div');
      node.className = 'cnn05-track-node cnn05-track-node--' + layer.kind;
      if (active.indexOf(layer.key) !== -1 || active.indexOf(layer.label) !== -1 || (typeof progressIndex === 'number' && idx <= progressIndex)) node.classList.add('is-active');
      node.innerHTML = '<strong>' + layer.label + '</strong><span>' + layer.shape + '</span>';
      wrap.appendChild(node);
    });
    return wrap;
  }

  function probabilityMax() {
    return guide.probabilities.reduce(function (best, item) {
      return item.value > best.value ? item : best;
    }, guide.probabilities[0]);
  }

  function renderProbabilityBars(interactive) {
    var max = probabilityMax();
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-prob-bars' + (state.outputDone ? ' is-ready' : '');
    guide.probabilities.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cnn05-prob-bar';
      if (item.digit === max.digit) button.classList.add('is-max');
      if (state.selectedDigit === item.digit) button.classList.add('is-selected');
      button.style.setProperty('--p', state.outputDone ? item.value : 0);
      button.innerHTML = '<span>' + item.value + '%</span><i></i><strong>' + item.digit + '</strong>';
      if (interactive && state.outputDone) {
        button.addEventListener('click', function () {
          state.selectedDigit = item.digit;
          if (item.digit === max.digit) {
            state.highestViewed = true;
            setFeedback(5, '数字 ' + item.digit + ' 的概率最高，所以当前预测是 ' + item.digit + '。', 'is-good');
          } else {
            state.otherViewed = true;
            setFeedback(5, '数字 ' + item.digit + ' 也有概率，但低于数字 7。分类会选择最高概率。', '');
          }
          render();
        });
      }
      wrap.appendChild(button);
    });
    return wrap;
  }

  function renderProgress() {
    progressNav.innerHTML = '';
    guide.scenes.slice(0, state.maxScene + 1).forEach(function (scene, index) {
      var button = document.createElement('button');
      button.type = 'button';
      setTracking(button, 'cnn05_progress_scene_' + (index + 1) + '_btn', 'progress_select_click', { scene: index + 1 });
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
      item.className = 'cnn05-task' + (taskDone(index, label) ? ' is-done' : '');
      item.innerHTML = '<i></i><span>' + label + '</span>';
      taskList.appendChild(item);
    });
    conceptText.textContent = sceneReady(index) || index < state.maxScene ? guide.scenes[index].concept : '完成当前动作后解锁。';
  }

  function renderIntroScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn05-intro-grid">' +
        '<section class="cnn05-card cnn05-video-card"><span class="cnn05-mini-label">本关开场动画</span><video id="introVideo" class="cnn05-intro-video" src="assets/lenet5_intro_overview.mp4" poster="assets/lenet5_intro_overview_poster.png" preload="metadata" controls playsinline muted></video><button id="introConfirm" class="edu-btn edu-btn--primary cnn05-intro-confirm" type="button">我看懂了：输入图像，输出概率</button></section>' +
      '</div>';
    var video = mount.querySelector('#introVideo');
    var confirm = mount.querySelector('#introConfirm');
    confirm.disabled = !!disabled;
    if (state.introWatched) confirm.classList.add('is-done');
    function markIntroWatched() {
      if (disabled || state.introWatched) return;
      state.introWatched = true;
      setFeedback(index, '很好，主线已经抓住了：输入数字 7 图像，LeNet-5 处理后输出 0-9 概率。', 'is-good');
      render();
    }
    video.addEventListener('ended', markIntroWatched);
    confirm.addEventListener('click', markIntroWatched);
    renderInlineAction(mount, index, '进入 LeNet-5 总览', state.introWatched, disabled);
  }

  function renderDigitNodes(activeDigit) {
    var wrap = document.createElement('div');
    wrap.className = 'cnn05-digit-nodes';
    for (var i = 0; i < 10; i += 1) {
      var span = document.createElement('span');
      if (i === activeDigit) span.className = 'is-active';
      span.textContent = i;
      wrap.appendChild(span);
    }
    return wrap;
  }

  function renderOverviewScene(mount, index, disabled) {
    var modules = guide.overviewModules;
    var activeIndex = modules.findIndex(function (item) { return item.key !== 'input' && !state.overviewVisited[item.key]; });
    if (activeIndex < 0) activeIndex = modules.length;
    mount.innerHTML =
      '<div class="cnn05-overview">' +
        '<section class="cnn05-card cnn05-overview-map"><span class="cnn05-mini-label">模块地图</span><div class="cnn05-overview-flow" id="overviewFlow"></div></section>' +
      '</div>';
    var flow = mount.querySelector('#overviewFlow');
    modules.forEach(function (item, moduleIndex) {
      if (moduleIndex === 0 || state.overviewVisited[item.key]) {
        var outputCard = document.createElement(moduleIndex === 0 ? 'article' : 'button');
        outputCard.type = moduleIndex === 0 ? undefined : 'button';
        outputCard.className = 'cnn05-overview-node cnn05-overview-node--result cnn05-overview-node--' + item.key + (moduleIndex === 0 ? ' is-input' : ' is-viewed');
        outputCard.innerHTML =
          '<strong>' + item.title + '</strong>' +
          '<b>' + item.shape + '</b>' +
          '<p>' + (moduleIndex === 0 ? item.role : item.output) + '</p>';
        outputCard.insertBefore(renderModuleVisual(item), outputCard.querySelector('p'));
        flow.appendChild(outputCard);
      }
      if (moduleIndex < modules.length - 1 && moduleIndex < activeIndex) {
        var nextItem = modules[moduleIndex + 1];
        var moduleCard = document.createElement('button');
        moduleCard.type = 'button';
        moduleCard.className = 'cnn05-overview-node cnn05-overview-node--module cnn05-overview-node--' + nextItem.key + (moduleIndex + 1 === activeIndex ? ' is-pending' : ' is-done');
        moduleCard.disabled = !!disabled || moduleIndex + 1 !== activeIndex;
        moduleCard.innerHTML =
          '<span>' + String(moduleIndex + 1).padStart(2, '0') + '</span>' +
          '<strong>' + nextItem.layers + '</strong>' +
          '<p>' + nextItem.role + '</p>' +
          '<small>' + (moduleIndex + 1 === activeIndex ? '点击查看输出' : '已处理') + '</small>';
        moduleCard.addEventListener('click', function () {
          if (disabled || moduleCard.disabled) return;
          state.overviewVisited[nextItem.key] = true;
          setFeedback(index, nextItem.layers + ' 处理后得到：' + nextItem.output + '。', 'is-good');
          render();
        });
        flow.appendChild(moduleCard);
      }
    });
    renderInlineAction(mount, index, '看 C1 生成特征图', overviewComplete(), disabled);
  }

  function renderC1Scene(mount, index, disabled) {
    var done = state.c1Progress >= 6;
    mount.innerHTML =
      '<div class="cnn05-c1-grid">' +
        '<section class="cnn05-card cnn05-c1-input-card"><span class="cnn05-mini-label">输入图像</span><div id="c1Input"></div></section>' +
        '<div class="cnn05-c1-flow">' +
          '<section class="cnn05-card cnn05-layer-card cnn05-c1-kernel-panel"><span class="cnn05-mini-label">C1 卷积层</span><h3>6 个 5×5 卷积核</h3><p>每个卷积核扫描同一张图；正数匹配笔画，负数压低不匹配区域。32 - 5 + 1 = 28。</p><div id="c1Kernels"></div></section>' +
          '<section class="cnn05-card cnn05-c1-output-card"><span class="cnn05-mini-label">C1 输出：' + (done ? '28×28×6' : state.c1Progress + '/6') + '</span><div id="c1Features"></div><p class="cnn05-note">亮处表示这个卷积核在数字 7 对应位置响应高。</p></section>' +
        '</div>' +
      '</div>';
    mount.querySelector('#c1Input').appendChild(renderC1Input(state.c1Progress));
    renderC1Kernels(mount.querySelector('#c1Kernels'), state.c1Progress);
    renderC1FeatureMaps(mount.querySelector('#c1Features'), state.c1Progress, state.selectedC1Map, function (idx) {
      state.selectedC1Map = idx;
      setFeedback(index, c1Kernels[idx].title + '生成的特征图：' + c1Kernels[idx].mapSummary + '。', 'is-good');
      render();
    });
    renderRunButton(mount, '运行 C1', state.c1Playing ? '扫描中...' : (done ? 'C1 已完成' : '运行 C1'), !disabled && !state.c1Playing && !done, function () {
      playProgress(index, 'c1Progress', 6, 360, function (step) {
        state.selectedC1Map = step - 1;
        setFeedback(index, c1Kernels[step - 1].title + '生成了第 ' + step + ' 张 28×28 特征图。', 'is-good');
      }, function () {
        state.c1Playing = false;
        setFeedback(index, '6 个卷积核生成 6 张特征图。它们叠在一起，就是 C1 的输出 28×28×6。', 'is-good');
      }, 'c1Playing');
    });
    renderInlineAction(mount, index, '继续看激活和池化', sceneReady(index), disabled);
  }

  function renderKernelDots(slot, count, ready, label) {
    slot.className = 'cnn05-kernel-dots';
    for (var i = 0; i < count; i += 1) {
      var dot = document.createElement('span');
      dot.className = i < ready ? 'is-done' : '';
      dot.textContent = label + (i + 1);
      slot.appendChild(dot);
    }
  }

  function playProgress(sceneIndex, prop, total, delay, onStep, onDone, playingProp) {
    state[prop] = 0;
    if (playingProp) state[playingProp] = true;
    render();
    for (var i = 1; i <= total; i += 1) {
      window.setTimeout(function (step) {
        return function () {
          state[prop] = step;
          if (onStep) onStep(step);
          if (step === total && onDone) onDone();
          render();
        };
      }(i), delay * i);
    }
  }

  function renderActivationScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn05-transform-grid">' +
        '<section class="cnn05-card cnn05-act-input-card"><span class="cnn05-mini-label">承接画面 3：C1 输出 28×28×6</span><div id="actInput"></div><p class="cnn05-note">这里沿用上一幕的 6 张 C1 特征图。</p></section>' +
        '<section class="cnn05-card cnn05-transform-card"><span class="cnn05-mini-label">激活前后对比</span><h3>' + c1Kernels[state.selectedC1Map].title + '</h3><div id="actPreview"></div><div class="cnn05-stage-tags"><span class="' + (!state.activationDone ? 'is-active' : '') + '">激活前</span><span class="' + (state.activationDone && !state.s2Done ? 'is-active' : '') + '">激活后</span><span class="' + (state.s2Done ? 'is-active' : '') + '">S2 池化后</span></div><strong>' + (state.s2Done ? '14×14×6' : '28×28×6') + '</strong></section>' +
        '<section class="cnn05-card cnn05-s2-output-card"><span class="cnn05-mini-label">S2 输出：' + (state.s2Done ? '14×14×6' : '等待池化') + '</span><div id="s2Output"></div></section>' +
      '</div>';
    renderC1FeatureMaps(mount.querySelector('#actInput'), 6, state.selectedC1Map, function (idx) {
      state.selectedC1Map = idx;
      setFeedback(index, '现在对比的是：' + c1Kernels[idx].title + '的激活前后变化。', 'is-good');
      render();
    });
    renderActivationCompare(mount.querySelector('#actPreview'), state.selectedC1Map);
    renderS2FeatureMaps(mount.querySelector('#s2Output'), state.s2Done, state.selectedC1Map, function (idx) {
      state.selectedC1Map = idx;
      setFeedback(index, 'S2 后的' + c1Kernels[idx].title + '特征图更小，但仍保留主要响应位置。', 'is-good');
      render();
    });
    renderRunButton(mount, '通过激活函数', state.activationDone ? '激活已完成' : '通过激活函数', !disabled && !state.activationDone, function () {
      state.activationDone = true;
      setFeedback(index, '激活函数不会改变特征图尺寸，它让有效响应更明显。', 'is-good');
      render();
    });
    renderRunButton(mount, '通过 S2 池化', state.s2Done ? 'S2 已完成' : '通过 S2 池化', !disabled && state.activationDone && !state.s2Done, function () {
      state.s2Done = true;
      setFeedback(index, 'S2 把每张特征图的宽高减半：28×28 变成 14×14，但张数仍然是 6。', 'is-good');
      render();
    });
    renderInlineAction(mount, index, '看第二个卷积层', sceneReady(index), disabled);
  }

  function renderC3Scene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn05-deep-flow cnn05-layer-pipeline">' +
        '<section class="cnn05-card cnn05-pipeline-card">' +
          '<span class="cnn05-mini-label">C3 / S4 横向流程</span>' +
          '<div class="cnn05-layer-route">' +
            '<article class="cnn05-layer-step is-input"><header><b>S2 输入</b><strong>14×14×6</strong></header><div id="c3InputStack"></div><p>承接上一幕的 6 张池化特征图</p></article>' +
            '<i class="cnn05-flow-arrow"></i>' +
            '<article class="cnn05-layer-step is-kernel"><header><b>C3 卷积核</b><strong>16 个 5×5</strong></header><div id="c3KernelStack"></div><p>每个核组合上一层的笔画线索</p></article>' +
            '<i class="cnn05-flow-arrow"></i>' +
            '<article class="cnn05-layer-step is-c3"><header><b>C3 输出</b><strong>' + (state.c3Progress >= 16 ? '10×10×16' : state.c3Progress + '/16') + '</strong></header><div id="c3OutputStack"></div><p>得到 16 张更抽象的特征图</p></article>' +
            '<i class="cnn05-flow-arrow"></i>' +
            '<article class="cnn05-layer-step is-s4"><header><b>S4 池化</b><strong>' + (state.s4Done ? '5×5×16' : '等待 S4') + '</strong></header><div id="s4OutputStack"></div><p>数量不变，每张图宽高减半</p></article>' +
          '</div>' +
        '</section>' +
      '</div>';
    renderLayerStack(mount.querySelector('#c3InputStack'), {
      kind: 'input',
      sheets: 4,
      size: 104,
      ready: true,
      content: renderS2FeatureMap(c1Kernels[state.selectedC1Map], { rows: 8, cols: 8 })
    });
    renderLayerStack(mount.querySelector('#c3KernelStack'), {
      kind: 'kernel',
      sheets: 5,
      size: 116,
      ready: state.c3Progress >= 16,
      content: createC3RepresentativeKernelCard(true)
    });
    renderLayerStack(mount.querySelector('#c3OutputStack'), {
      kind: 'feature',
      sheets: 5,
      size: 104,
      dim: state.c3Progress < 16,
      ready: state.c3Progress >= 16,
      content: renderC3FeatureMap(c3Combinations[state.selectedC3Map], { rows: 8, cols: 8, dim: state.c3Progress < 16 })
    });
    renderLayerStack(mount.querySelector('#s4OutputStack'), {
      kind: 'pool',
      sheets: 5,
      size: 104,
      dim: !state.s4Done,
      ready: state.s4Done,
      content: renderC3FeatureMap(c3Combinations[state.selectedC3Map], { rows: 5, cols: 5, dim: !state.s4Done })
    });
    renderRunButton(mount, '运行 C3', state.c3Playing ? 'C3 生成中...' : (state.c3Progress >= 16 ? 'C3 已完成' : '运行 C3'), !disabled && !state.c3Playing && state.c3Progress < 16, function () {
      playProgress(index, 'c3Progress', 16, 130, null, function () {
        state.c3Playing = false;
        setFeedback(index, 'C3 把上一层的 6 张特征图组合成 16 张更抽象的特征图。', 'is-good');
      }, 'c3Playing');
    });
    renderRunButton(mount, '通过 S4 池化', state.s4Done ? 'S4 已完成' : '通过 S4 池化', !disabled && state.c3Progress >= 16 && !state.s4Done, function () {
      state.s4Done = true;
      setFeedback(index, 'S4 把每张特征图从 10×10 缩小到 5×5，但仍然保留 16 张。', 'is-good');
      render();
    });
    renderInlineAction(mount, index, '看分类头', sceneReady(index), disabled);
  }

  function renderEvidenceScene(mount, index, disabled) {
    var max = probabilityMax();
    mount.innerHTML =
      '<div class="cnn05-classifier-grid">' +
        '<section class="cnn05-card cnn05-classifier-flow-card">' +
          '<span class="cnn05-mini-label">分类头流程</span>' +
          '<h3>S4 特征进入全连接分类头</h3>' +
          '<div class="cnn05-classifier-route">' +
            '<article class="cnn05-classifier-step"><header><b>S4 输出</b><strong>5×5×16</strong></header><div id="clsS4Stack"></div><p>16 张小特征图</p></article>' +
            '<i class="cnn05-classifier-arrow"></i>' +
            '<article class="cnn05-classifier-step"><header><b>展平</b><strong>400</strong></header><div id="clsFlatVector"></div><p>把小图排成一条向量</p></article>' +
            '<i class="cnn05-classifier-arrow"></i>' +
            '<article class="cnn05-classifier-step ' + (state.c5Done ? 'is-ready' : '') + '"><header><b>C5</b><strong>120</strong></header><div id="clsC5Points"></div><p>汇总高层证据</p></article>' +
            '<i class="cnn05-classifier-arrow"></i>' +
            '<article class="cnn05-classifier-step ' + (state.f6Done ? 'is-ready' : '') + '"><header><b>F6</b><strong>84</strong></header><div id="clsF6Points"></div><p>整理分类前特征</p></article>' +
            '<i class="cnn05-classifier-arrow"></i>' +
            '<article class="cnn05-classifier-step ' + (state.outputDone ? 'is-ready is-output' : 'is-output') + '"><header><b>输出层</b><strong>10</strong></header><div id="clsOutputNodes"></div><p>连接到 0-9 类别</p></article>' +
          '</div>' +
        '</section>' +
        '<section class="cnn05-card cnn05-classifier-fanin-card"><span class="cnn05-mini-label">全连接在做什么</span><div class="cnn05-classifier-fanin-row"><div id="c5Fanin"></div><div id="f6Fanin"></div></div><p class="cnn05-note">每个点都会接收上一层很多输入：C5 先综合局部特征，F6 再把证据重组成更适合分类的向量。</p></section>' +
        '<section class="cnn05-card cnn05-prob-card cnn05-classifier-prob-card"><span class="cnn05-mini-label">输出层：84 → 10</span><h3>' + (state.outputDone ? '当前最高：数字 ' + max.digit : '等待输出概率') + '</h3><div id="probBars"></div><p class="cnn05-note">' + (state.outputDone ? '数字 7 的概率最高，所以模型把这张图识别为 7。' : '输出层把 84 维向量连接到 0-9 十个数字。') + '</p></section>' +
      '</div>';
    renderLayerStack(mount.querySelector('#clsS4Stack'), {
      kind: 'pool',
      sheets: 5,
      size: 86,
      ready: true,
      count: 16,
      content: renderC3FeatureMap(c3Combinations[state.selectedC3Map], { rows: 5, cols: 5 })
    });
    renderS4FlatVector(mount.querySelector('#clsFlatVector'));
    renderFaninDiagram(mount.querySelector('#c5Fanin'), {
      kind: 'c5',
      active: state.c5Done,
      title: '一个 C5 证据点',
      text: '从 400 个 S4 特征值中接收输入，学会某种高层线索。',
      target: 'C5'
    });
    renderFaninDiagram(mount.querySelector('#f6Fanin'), {
      kind: 'f6',
      active: state.f6Done,
      title: '一个 F6 神经元',
      text: '从 120 个 C5 证据点中接收输入，整理成分类前特征。',
      target: 'F6'
    });
    renderDenseVector(mount.querySelector('#clsC5Points'), 120, state.c5Done ? 120 : 0, {
      kind: 'c5',
      cols: 12,
      hot: state.c5Done ? [7, 18, 42, 73, 96] : []
    });
    renderDenseVector(mount.querySelector('#clsF6Points'), 84, state.f6Done ? 84 : 0, {
      kind: 'f6',
      cols: 12,
      hot: state.f6Done ? [6, 21, 37, 58, 70] : []
    });
    mount.querySelector('#clsOutputNodes').appendChild(renderDigitNodes(state.outputDone ? max.digit : null));
    mount.querySelector('#probBars').appendChild(renderProbabilityBars(false));
    renderRunButton(mount, '运行 C5', state.c5Done ? 'C5 已完成' : '运行 C5：400 → 120', !disabled && !state.c5Done, function () {
      state.c5Done = true;
      setFeedback(index, 'C5 把 400 个 S4 特征值汇总成 120 个高层证据点。', 'is-good');
      render();
    });
    renderRunButton(mount, '运行 F6', state.f6Done ? 'F6 已完成' : '运行 F6：120 → 84', !disabled && state.c5Done && !state.f6Done, function () {
      state.f6Done = true;
      state.evidenceViewed = true;
      setFeedback(index, 'F6 把 120 个证据整理成 84 维分类前向量。', 'is-good');
      render();
    });
    renderRunButton(mount, '生成输出概率', state.outputDone ? '输出概率已生成' : '生成输出概率：84 → 10', !disabled && state.f6Done && !state.outputDone, function () {
      state.outputDone = true;
      state.selectedDigit = max.digit;
      state.highestViewed = true;
      setFeedback(index, '输出层已经生成 0-9 十个概率。数字 7 最高，可以进入完整流程。', 'is-good');
      render();
    });
  }

  function renderPointCloud(slot, count, ready, onClick) {
    slot.className = 'cnn05-point-cloud';
    slot.style.setProperty('--cols', count > 90 ? 12 : 7);
    for (var i = 0; i < count; i += 1) {
      var point = document.createElement('button');
      point.type = 'button';
      point.className = i < ready ? 'is-ready' : '';
      point.disabled = i >= ready;
      point.addEventListener('click', onClick);
      slot.appendChild(point);
    }
  }

  function renderForwardScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn05-forward-grid">' +
        '<section class="cnn05-card cnn05-video-card cnn05-forward-video-card"><div class="cnn05-forward-card-head"><span class="cnn05-mini-label">完整 LeNet-5 动画</span><strong>' + (state.forwardDone ? '完整流程已运行' : '从输入到输出') + '</strong></div><video id="forwardVideo" class="cnn05-intro-video cnn05-forward-video" src="assets/lenet5_full_forward.mp4" poster="assets/lenet5_full_forward_poster.png" preload="metadata" controls playsinline muted></video></section>' +
        '<section class="cnn05-card cnn05-quiz-card ' + (state.forwardDone ? 'is-visible' : '') + '"><div class="cnn05-forward-card-head"><span class="cnn05-mini-label">轻量检查</span><strong>' + (state.forwardDone ? '完成 3 道检查题' : '跑完流程后解锁') + '</strong></div><div id="quizCards"></div></section>' +
      '</div>';
    var video = mount.querySelector('#forwardVideo');
    renderQuizCards(mount.querySelector('#quizCards'), index, disabled || !state.forwardDone);
    renderRunButton(mount, '运行完整 LeNet-5', state.forwardDone ? '完整流程已运行' : '运行完整 LeNet-5', !disabled && !state.forwardDone, function () {
      state.forwardProgress = 0;
      setFeedback(index, '正在播放完整前向传播动画：像素、特征、证据、概率会依次出现。', 'is-good');
      var runButton = mount.querySelector('.cnn05-inline-action');
      if (runButton) runButton.disabled = true;
      video.currentTime = 0;
      video.play();
    });
    video.addEventListener('ended', function () {
      state.forwardProgress = guide.layers.length - 1;
      state.forwardDone = true;
      state.outputDone = true;
      setFeedback(index, '完整前向传播结束。现在完成三道检查题。', 'is-good');
      render();
    });
  }

  function renderForwardViz(slot, layer) {
    if (layer.kind === 'input') slot.appendChild(renderDigitGrid(12, { compact: true }));
    else if (layer.kind === 'output') slot.appendChild(renderProbabilityBars(false));
    else if (layer.kind === 'dense') renderPointCloud(slot, layer.key === 'c5' ? 120 : 84, layer.key === 'c5' ? 120 : 84, function () {});
    else slot.appendChild(renderFeatureStack(layer.key === 'c3' || layer.key === 's4' || layer.key === 'act2' ? 16 : 6, { ready: 16, rows: 4, cols: 4, small: true }));
  }

  function renderQuizCards(slot, index, disabled) {
    guide.quiz.forEach(function (q) {
      var card = document.createElement('article');
      card.className = 'cnn05-check-card';
      card.innerHTML = '<h4>' + q.question + '</h4><div></div>';
      var options = card.querySelector('div');
      q.options.forEach(function (opt) {
        var button = document.createElement('button');
        button.type = 'button';
        var chosen = state.quizAnswers[q.key] === opt.key;
        button.className = chosen ? (opt.key === q.answer ? 'is-correct' : 'is-wrong') : '';
        button.innerHTML = '<strong>' + opt.label + '</strong><span>' + opt.text + '</span>';
        button.disabled = !!disabled || state.quizAnswers[q.key] === q.answer;
        button.addEventListener('click', function () {
          state.quizAnswers[q.key] = opt.key;
          if (opt.key === q.answer) setFeedback(index, '对。' + q.hint, 'is-good');
          else setFeedback(index, q.hint, 'is-bad');
          render();
        });
        options.appendChild(button);
      });
      slot.appendChild(card);
    });
  }

  function renderRunButton(mount, id, label, enabled, onClick) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'edu-btn edu-btn--primary cnn05-inline-action';
    button.textContent = label;
    setTracking(button, 'cnn05_' + id.replace(/\s+/g, '_') + '_btn', 'scene_action_click', { label: label });
    button.disabled = !enabled;
    if (enabled) button.addEventListener('click', onClick);
    mount.appendChild(button);
  }

  function renderInlineAction(mount, index, label, ready, disabled) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'edu-btn cnn05-next-action' + (ready ? ' edu-btn--primary' : '');
    button.textContent = label;
    button.disabled = !!disabled || !ready;
    setTracking(button, 'cnn05_continue_scene_' + (index + 1) + '_btn', 'continue_click', { scene: index + 1, label: label });
    if (!button.disabled) button.addEventListener('click', function () { continueFromScene(index); });
    mount.appendChild(button);
  }

  function renderSceneBody(index, mount, disabled) {
    if (index === 0) renderIntroScene(mount, index, disabled);
    if (index === 1) renderOverviewScene(mount, index, disabled);
    if (index === 2) renderC1Scene(mount, index, disabled);
    if (index === 3) renderActivationScene(mount, index, disabled);
    if (index === 4) renderC3Scene(mount, index, disabled);
    if (index === 5) renderEvidenceScene(mount, index, disabled);
    if (index === 6) renderForwardScene(mount, index, disabled);
  }

  function renderTransition(section, index) {
    var slot = section.querySelector('[data-role="transitionSlot"]');
    slot.innerHTML = '';
    slot.classList.remove('is-visible');
    if (index !== state.maxScene || !sceneReady(index)) return;
    if (index >= guide.scenes.length - 1) return;
    var copy = transitionCopy(index);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cnn05-transition-card';
    setTracking(button, 'cnn05_transition_scene_' + (index + 1) + '_btn', 'transition_continue_click', { scene: index + 1, label: copy.label });
    button.innerHTML = '<span>' + copy.kicker + '</span><b>' + copy.insight + '</b><strong>' + copy.label + '</strong>';
    button.addEventListener('click', function () { continueFromScene(index); });
    slot.appendChild(button);
    slot.classList.add('is-visible');
  }

  function createSceneSection(index) {
    var scene = guide.scenes[index];
    var section = document.createElement('section');
    var disabled = index < state.maxScene;
    var feedback = feedbackFor(index);
    section.className = 'cnn05-stage cnn05-scene-section';
    section.dataset.sceneIndex = String(index);
    section.setAttribute('data-tr-id', 'cnn05_scene_' + (index + 1) + '_panel');
    section.setAttribute('data-tr-view', 'panel_show');
    section.setAttribute('data-tr-props', JSON.stringify({ panel: 'scene', scene: index + 1 }));
    if (index === state.scene) section.classList.add('is-active');
    if (index < state.maxScene) section.classList.add('is-past');
    if (index === state.maxScene) section.classList.add('is-current');
    if (index === state.enteringScene) section.classList.add('is-entering');
    section.innerHTML =
      '<header class="cnn05-stage-head">' +
        '<div><span class="cnn05-kicker">' + scene.tag + '</span><h2>' + scene.title + '</h2><p>' + scene.goal + '</p></div>' +
        '<div class="cnn05-range-pill">' + scene.pill + '</div>' +
      '</header>' +
      '<div class="cnn05-layout">' +
        '<section class="cnn05-workbench" aria-label="交互区域"></section>' +
        '<aside class="cnn05-side-panel" aria-label="任务信息"><section class="cnn05-side-section"><h3>完成条件</h3><div class="cnn05-task-list" data-role="taskList"></div></section><section class="cnn05-side-section cnn05-concept-card"><h3>本幕启发</h3><p data-role="conceptText">完成当前动作后解锁。</p></section></aside>' +
      '</div>' +
      '<div class="cnn05-transition-slot" data-role="transitionSlot"></div>' +
      '<footer class="cnn05-bottom-bar"><p class="cnn05-feedback ' + feedback.tone + '">' + feedback.text + '</p></footer>';
    renderSidePanel(section, index);
    renderSceneBody(index, section.querySelector('.cnn05-workbench'), disabled);
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
