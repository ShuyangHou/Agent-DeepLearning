(function () {
  'use strict';

  var guide = window.CNN01_GUIDE;
  var matrix = guide.pixelMatrix;
  var state = {
    scene: 0,
    maxScene: 0,
    enteringScene: null,
    answered: false,
    humanChoice: '',
    zoom: 1,
    valueTasks: { black: false, white: false, gray: false },
    readPixels: {},
    selectedPixel: null,
    normalizedProgress: 0,
    matchSelected: null,
    matches: {},
    mismatchKey: '',
    finished: false,
    feedback: {},
    promptedScenes: {},
    zoomPlaying: false,
    normalizePlaying: false
  };

  var sceneStack = document.getElementById('sceneStack');
  var progressNav = document.getElementById('progressNav');
  var defaultFeedback = [
    '先用人类视觉判断这张图。',
    '点击播放放大动画，观察笔画边缘会发生什么。',
    '点击不同深浅的像素格，看看它们背后的数字。',
    '点击“整数归一化到0-1范围”，观察 0-255 如何变成 0-1。',
    '把每个矩阵连到它渲染出来的像素图。'
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalized(value) {
    return value / 255;
  }

  function fmtNorm(value) {
    var n = normalized(value);
    if (n <= 0.004) return '0';
    if (n >= 0.996) return '1';
    return n.toFixed(2);
  }

  function shade(value) {
    if (value >= 250) return '#ffffff';
    var lightness = Math.round(16 + normalized(value) * 78);
    return 'hsl(0 0% ' + lightness + '%)';
  }

  function shadeNorm(value) {
    if (value >= 0.98) return '#ffffff';
    var lightness = Math.round(16 + value * 78);
    return 'hsl(0 0% ' + lightness + '%)';
  }

  function pixelKind(value) {
    if (value <= 40) return 'black';
    if (value >= 235) return 'white';
    return 'gray';
  }

  function kindLabel(kind) {
    if (kind === 'black') return '黑色像素';
    if (kind === 'white') return '白色像素';
    return '灰色像素';
  }

  function setTracking(element, id, eventName, props, eventType) {
    if (!element) return element;
    element.setAttribute('data-tr-id', id);
    if (eventName) element.setAttribute(eventType || 'data-tr-click', eventName);
    if (props) element.setAttribute('data-tr-props', JSON.stringify(props));
    return element;
  }

  function cellKey(row, col) {
    return row + '-' + col;
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

  function allValueTasksDone() {
    return state.valueTasks.black && state.valueTasks.white && state.valueTasks.gray;
  }

  function sceneReady(index) {
    if (index === 0) return state.answered;
    if (index === 1) return state.zoom >= 16;
    if (index === 2) return allValueTasksDone();
    if (index === 3) return state.normalizedProgress >= 100;
    return state.finished;
  }

  function transitionCopy(index) {
    var concept = guide.scenes[index].concept;
    if (index === 0) {
      return {
        label: '进入模型视角',
        kicker: '进入模型眼中的图像',
        text: '现在只看模型能读取的像素信息。',
        insight: concept
      };
    }
    if (index === 1) {
      return {
        label: '读取像素数值',
        kicker: '网格已经显现',
        text: '下一步点选格子，摸到每个位置背后的亮度值。',
        insight: concept
      };
    }
    if (index === 2) {
      return {
        label: '把数值压到 0-1',
        kicker: '三类像素已读取',
        text: '现在把这张 8 位图像缩放到统一的 0-1 亮度尺度。',
        insight: concept
      };
    }
    if (index === 3) {
      return {
        label: '进入理解小测',
        kicker: '先做一个小结',
        text: '下面做一个小测，看看你是否真的理解了模型眼中的图像。',
        insight: '到这里，图像已经从整体形状变成了按位置排列的 0-1 亮度矩阵，这就是模型眼中的图像。'
      };
    }
    return {
      label: '进入卷积核关',
      kicker: '本关完成',
      text: '带着这张 0-1 图像矩阵进入下一关。',
      insight: concept
    };
  }

  function continueFromScene(index) {
    if (!sceneReady(index) || index !== state.maxScene) return;
    var section = sceneElement(index);
    if (section) section.classList.add('is-continuing');
    window.setTimeout(function () {
      if (index === guide.scenes.length - 1) {
        window.location.href = '../ConvKernel/';
        return;
      }
      state.maxScene = Math.max(state.maxScene, index + 1);
      state.scene = index + 1;
      state.enteringScene = index + 1;
      render({ scrollTo: index + 1, block: 'center' });
    }, 220);
  }

  function taskDone(index, label) {
    if (index === 0) {
      if (label.indexOf('数字判断') !== -1) return state.answered;
      if (label.indexOf('继续观察') !== -1) return state.maxScene >= 1;
    }
    if (index === 1) {
      if (label.indexOf('放大观察') !== -1) return state.zoom >= 16;
      if (label.indexOf('读取') !== -1) return state.maxScene >= 2;
    }
    if (index === 2) {
      if (label.indexOf('黑色') !== -1) return state.valueTasks.black;
      if (label.indexOf('白色') !== -1) return state.valueTasks.white;
      if (label.indexOf('灰色') !== -1) return state.valueTasks.gray;
    }
    if (index === 3) {
      if (label.indexOf('归一化') !== -1) return state.normalizedProgress >= 100;
      if (label.indexOf('小测') !== -1) return state.maxScene >= 4;
    }
    if (index === 4) {
      if (label.indexOf('A') !== -1) return !!state.matches.a;
      if (label.indexOf('B') !== -1) return !!state.matches.b;
      if (label.indexOf('C') !== -1) return !!state.matches.c;
    }
    return false;
  }

  function conceptHint(index) {
    if (index < state.maxScene || sceneReady(index)) return guide.scenes[index].concept;
    return '完成当前动作后解锁。';
  }

  function renderProgress() {
    progressNav.innerHTML = '';
    guide.scenes.forEach(function (scene, index) {
      if (index > state.maxScene) return;
      var button = document.createElement('button');
      button.type = 'button';
      setTracking(button, 'cnn01_scene_' + (index + 1) + '_tab', 'scene_tab_click', { scene: index + 1, title: scene.title });
      button.className = index === state.scene ? 'is-active' : '';
      if (index < state.maxScene) button.classList.add('is-complete');
      if (index === state.maxScene && sceneReady(index)) button.classList.add('is-ready');
      button.innerHTML = '<strong>' + (index + 1) + '</strong><span>' + scene.title + '</span>';
      button.addEventListener('click', function () {
        state.scene = index;
        render({ scrollTo: index });
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
      item.className = 'cnn01-task' + (taskDone(index, label) ? ' is-done' : '');
      item.innerHTML = '<i></i><span>' + label + '</span>';
      taskList.appendChild(item);
    });

    conceptText.textContent = conceptHint(index);
  }

  function createPixelGrid(options) {
    var opts = options || {};
    var grid = document.createElement('div');
    grid.className = 'cnn01-pixel-grid';
    if (opts.large) grid.classList.add('cnn01-pixel-grid--large');
    if (opts.boundary) grid.classList.add('has-boundary');
    matrix.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        var cell = document.createElement(opts.buttons ? 'button' : 'span');
        if (opts.buttons) cell.type = 'button';
        cell.className = 'cnn01-pixel';
        cell.style.setProperty('--shade', shade(value));
        cell.dataset.value = String(value);
        cell.dataset.row = String(rowIndex);
        cell.dataset.col = String(colIndex);
        cell.dataset.kind = pixelKind(value);
        if (state.readPixels[cellKey(rowIndex, colIndex)]) {
          cell.classList.add('is-read');
        }
        if (state.selectedPixel && state.selectedPixel.row === rowIndex && state.selectedPixel.col === colIndex) {
          cell.classList.add('is-selected');
        }
        if (opts.buttons) {
          setTracking(cell, 'cnn01_pixel_' + rowIndex + '_' + colIndex + '_btn', 'pixel_read_click', {
            row: rowIndex + 1,
            col: colIndex + 1,
            kind: pixelKind(value)
          });
          cell.disabled = !!opts.disabled;
          cell.setAttribute('aria-label', '第 ' + (rowIndex + 1) + ' 行，第 ' + (colIndex + 1) + ' 列，像素值 ' + value);
          if (!opts.disabled) {
            cell.addEventListener('click', function () {
              handlePixelClick(opts.sceneIndex, rowIndex, colIndex, value);
            });
          }
        }
        grid.appendChild(cell);
      });
    });
    return grid;
  }

  function createHumanDigit() {
    var wrap = document.createElement('div');
    wrap.className = 'cnn01-human-digit';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<svg viewBox="0 0 120 120" role="img" aria-label="手写数字 7">' +
        '<path class="cnn01-human-stroke" d="M27 27 C45 22, 70 23, 94 28 C79 46, 66 63, 57 88 C54 96, 51 104, 48 111" />' +
        '<path class="cnn01-human-glint" d="M30 29 C49 26, 68 27, 88 31" />' +
      '</svg>' +
      '<span class="cnn01-human-label">人类判断：7</span>';
    return wrap;
  }

  function renderHumanScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn01-human-grid">' +
        '<section class="cnn01-human-card" data-tr-id="cnn01_human_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"human"}\'>' +
          '<div class="cnn01-hand-image ' + (state.answered ? 'is-answered' : '') + (state.humanChoice && state.humanChoice !== '7' ? ' is-marked' : '') + '" data-role="handImage" aria-label="手写数字 7"></div>' +
          '<p class="cnn01-question">这是数字几？</p>' +
          '<div class="cnn01-number-pad" data-role="numberPad" aria-label="答案选择"></div>' +
        '</section>' +
      '</div>';

    mount.querySelector('[data-role="handImage"]').appendChild(createHumanDigit());
    var pad = mount.querySelector('[data-role="numberPad"]');
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '不确定'].forEach(function (choice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'edu-btn';
      button.disabled = disabled;
      setTracking(button, 'cnn01_answer_' + (choice === '不确定' ? 'unknown' : choice) + '_btn', 'answer_click', { answer: choice });
      if (state.humanChoice === choice) button.classList.add(choice === '7' ? 'is-correct' : 'is-warn');
      button.textContent = choice;
      if (!disabled) {
        button.addEventListener('click', function () {
          state.answered = true;
          state.humanChoice = choice;
          state.scene = index;
          if (choice === '7') {
            setFeedback(index, '人类会根据整体形状直接认出这个数字。', 'is-good');
          } else if (choice === '不确定') {
            setFeedback(index, '不确定也没关系。现在你仍然是在看整体形状。', 'is-warn');
          } else {
            setFeedback(index, '从整体笔画看，它更像 7。人类判断依赖的是整体形状。', 'is-warn');
          }
          render();
          window.setTimeout(function () {
            if (state.maxScene === 0) {
              setFeedback(index, '接下来我们来学习模型眼中的图片是什么样的。', 'is-good');
              render();
            }
          }, 680);
        });
      }
      pad.appendChild(button);
    });
  }

  function playZoomAnimation(index) {
    state.scene = index;
    state.zoom = 1;
    state.zoomPlaying = true;
    setFeedback(index, '先看到的仍是一张正常的手写数字图片。');
    render();
    var steps = [4, 8, 12, 16];
    steps.forEach(function (value, stepIndex) {
      window.setTimeout(function () {
        state.zoom = value;
        if (value >= 16) {
          state.zoomPlaying = false;
          setFeedback(index, '放大后，图像显出了一个个固定位置的像素格。', 'is-good');
        } else if (value >= 8) {
          setFeedback(index, '继续放大，笔画边缘开始露出方块边界。', 'is-good');
        } else {
          setFeedback(index, '画面正在放大，连续笔画开始变得不那么平滑。', 'is-good');
        }
        render();
      }, 520 * (stepIndex + 1));
    });
  }

  function renderZoomScene(mount, index, disabled) {
    var zoomClass = state.zoom >= 16 ? 'is-max' : (state.zoom >= 8 ? 'is-grid' : (state.zoom >= 4 ? 'is-blocky' : ''));
    var isComplete = state.zoom >= 16;
    var isPlaying = state.zoomPlaying && !isComplete;
    var stageLabel = isComplete ? '16x' : (state.zoom > 1 ? state.zoom + 'x' : '1x');
    mount.innerHTML =
      '<div class="cnn01-model-view ' + zoomClass + '">' +
        '<section class="cnn01-zoom-card" data-tr-id="cnn01_zoom_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"zoom"}\'>' +
          '<div class="cnn01-view-switch">人类视角 <span></span> 模型视角</div>' +
          '<div class="cnn01-zoom-stage">' +
            '<div class="cnn01-zoom-image" id="zoomImage"></div>' +
            '<div class="cnn01-zoom-meter" aria-hidden="true"><span style="width:' + (state.zoom / 16 * 100) + '%"></span></div>' +
          '</div>' +
          '<div class="cnn01-zoom-action">' +
            '<span>放大观察</span>' +
            '<strong>' + stageLabel + '</strong>' +
            '<button class="edu-btn edu-btn--primary" id="zoomPlayBtn" type="button" data-tr-id="cnn01_zoom_play_btn" data-tr-click="zoom_play_click" data-tr-props=\'{"scene":2,"label":"播放放大动画"}\'>' + (isPlaying ? '播放中' : (isComplete ? '重新播放' : '播放放大动画')) + '</button>' +
          '</div>' +
        '</section>' +
      '</div>';
    if (state.zoom <= 1) {
      mount.querySelector('#zoomImage').appendChild(createHumanDigit());
    } else {
      mount.querySelector('#zoomImage').appendChild(createPixelGrid({ large: true, boundary: state.zoom >= 8 }));
    }
    var playBtn = mount.querySelector('#zoomPlayBtn');
    playBtn.disabled = false;
    playBtn.addEventListener('click', function () {
      playZoomAnimation(index);
    });
  }

  function handlePixelClick(index, row, col, value) {
    var kind = pixelKind(value);
    state.valueTasks[kind] = true;
    state.readPixels[cellKey(row, col)] = true;
    state.selectedPixel = { row: row, col: col, value: value, kind: kind };
    state.scene = index;
    if (kind === 'black') setFeedback(index, '黑色像素的亮度值接近 0。', 'is-good');
    if (kind === 'white') setFeedback(index, '白色像素的亮度值接近 255。', 'is-good');
    if (kind === 'gray') setFeedback(index, '灰色像素的亮度值在 0 和 255 之间。', 'is-good');
    if (allValueTasksDone()) {
      render();
      window.setTimeout(function () {
        if (state.maxScene === index) {
          setFeedback(index, '现在这张图片已经可以表示成一个 0-255 的整数矩阵。', 'is-good');
          render();
        }
      }, 360);
    } else {
      render();
    }
  }

  function renderValueMatrix() {
    var board = document.createElement('div');
    board.className = 'cnn01-matrix cnn01-matrix--raw';
    var revealAll = allValueTasksDone();
    matrix.forEach(function (row, rowIndex) {
      row.forEach(function (value, colIndex) {
        var cell = document.createElement('span');
        var selected = state.selectedPixel && state.selectedPixel.row === rowIndex && state.selectedPixel.col === colIndex;
        cell.className = 'cnn01-cell';
        if (selected || revealAll || state.readPixels[cellKey(rowIndex, colIndex)]) {
          cell.textContent = String(value);
          cell.classList.add(pixelKind(value));
          if (selected) cell.classList.add('is-selected');
          if (state.readPixels[cellKey(rowIndex, colIndex)]) cell.classList.add('is-read');
        } else {
          cell.textContent = '';
        }
        board.appendChild(cell);
      });
    });
    return board;
  }

  function renderReadScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn01-read-grid">' +
        '<section class="cnn01-read-card" data-tr-id="cnn01_pixel_read_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"pixel_read"}\'>' +
          '<h3>点击像素格</h3>' +
          '<div id="clickableGrid"></div>' +
          '<p>每个格子的数字表示这个位置的亮度。</p>' +
          '<div class="cnn01-pixel-bubble" id="pixelBubble"></div>' +
        '</section>' +
        '<section class="cnn01-matrix-panel" data-tr-id="cnn01_raw_matrix_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"raw_matrix"}\'>' +
          '<h3>0-255 整数矩阵</h3>' +
          '<div id="rawMatrix"></div>' +
          '<div class="cnn01-read-tasks">' +
            '<span class="' + (state.valueTasks.black ? 'is-done' : '') + '">黑色</span>' +
            '<span class="' + (state.valueTasks.white ? 'is-done' : '') + '">白色</span>' +
            '<span class="' + (state.valueTasks.gray ? 'is-done' : '') + '">灰色</span>' +
          '</div>' +
        '</section>' +
      '</div>';
    mount.querySelector('#clickableGrid').appendChild(createPixelGrid({ large: true, boundary: true, buttons: true, disabled: disabled, sceneIndex: index }));
    mount.querySelector('#rawMatrix').appendChild(renderValueMatrix());
    var bubble = mount.querySelector('#pixelBubble');
    if (state.selectedPixel) {
      bubble.classList.add('is-visible');
      bubble.innerHTML = '<strong>' + state.selectedPixel.value + '</strong><span>' + kindLabel(state.selectedPixel.kind) + '</span>';
    } else {
      bubble.textContent = '点一个黑、白或灰的格子';
    }
  }

  function renderNormalizeMatrix(kind) {
    var board = document.createElement('div');
    board.className = 'cnn01-matrix cnn01-matrix--normalize';
    var progressCells = Math.round(matrix.length * matrix[0].length * state.normalizedProgress / 100);
    var count = 0;
    matrix.forEach(function (row) {
      row.forEach(function (value) {
        var cell = document.createElement('span');
        cell.className = 'cnn01-cell ' + pixelKind(value);
        if (kind === 'raw') {
          cell.textContent = String(value);
        } else {
          cell.textContent = count < progressCells ? fmtNorm(value) : '';
        }
        count += 1;
        board.appendChild(cell);
      });
    });
    return board;
  }

  function setNormalizeFeedback(index) {
    if (state.normalizedProgress >= 100) {
      setFeedback(index, '现在 8 位图像已经落到 0-1，和其他位深可以使用同一套亮度尺度。', 'is-good');
    } else if (state.normalizedProgress >= 75) {
      setFeedback(index, '白色正在变成 1。', 'is-good');
    } else if (state.normalizedProgress >= 50) {
      setFeedback(index, '中间亮度会变成 0 和 1 之间的小数。', 'is-good');
    } else if (state.normalizedProgress >= 25) {
      setFeedback(index, '黑色变换后仍然是 0。', 'is-good');
    } else {
      setFeedback(index, '点击“整数归一化到0-1范围”，观察整数亮度如何落到 0-1。');
    }
  }

  function playNormalizeAnimation(index) {
    state.scene = index;
    state.normalizedProgress = 0;
    state.normalizePlaying = true;
    setNormalizeFeedback(index);
    render();
    [25, 50, 75, 100].forEach(function (value, stepIndex) {
      window.setTimeout(function () {
        state.normalizedProgress = value;
        if (value >= 100) state.normalizePlaying = false;
        setNormalizeFeedback(index);
        render();
      }, 460 * (stepIndex + 1));
    });
  }

  function renderNormalizeScene(mount, index, disabled) {
    var isComplete = state.normalizedProgress >= 100;
    var isPlaying = state.normalizePlaying && !isComplete;
    mount.innerHTML =
      '<div class="cnn01-normalize-grid">' +
        '<section class="cnn01-matrix-panel" data-tr-id="cnn01_normalize_raw_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"normalize_raw"}\'>' +
          '<h3>0-255 整数矩阵</h3>' +
          '<div id="normRaw"></div>' +
        '</section>' +
        '<section class="cnn01-matrix-panel" data-tr-id="cnn01_normalized_matrix_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"normalized_matrix"}\'>' +
          '<h3>0-1 亮度矩阵</h3>' +
          '<div id="normOut"></div>' +
        '</section>' +
        '<section class="cnn01-normalize-action" data-tr-id="cnn01_normalizer_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"normalizer"}\'>' +
          '<div class="cnn01-normalize-copy">' +
            '<strong>' + (isComplete ? '已经统一到 0-1' : (isPlaying ? '正在统一亮度尺度' : '播放动画，观察数值如何统一')) + '</strong>' +
            '<span>8 位图像使用 255 作为最大亮度；16 位图像使用 65535。动画会把它们统一到 0-1。</span>' +
          '</div>' +
          '<div class="cnn01-normalize-meter" aria-label="尺度统一进度"><span style="width:' + state.normalizedProgress + '%"></span></div>' +
          '<button class="edu-btn edu-btn--primary" id="normalizePlayBtn" type="button" data-tr-id="cnn01_normalize_play_btn" data-tr-click="normalize_play_click" data-tr-props=\'{"scene":4,"label":"整数归一化到0-1范围"}\'>' + (isPlaying ? '播放中' : (isComplete ? '重新播放' : '整数归一化到0-1范围')) + '</button>' +
        '</section>' +
      '</div>';
    mount.querySelector('#normRaw').appendChild(renderNormalizeMatrix('raw'));
    mount.querySelector('#normOut').appendChild(renderNormalizeMatrix('normalized'));
    var playButton = mount.querySelector('#normalizePlayBtn');
    playButton.disabled = false;
    playButton.addEventListener('click', function () {
      playNormalizeAnimation(index);
    });
  }

  function renderMatchMatrix(card) {
    var wrap = document.createElement('span');
    wrap.className = 'cnn01-match-matrix';
    card.matrix.forEach(function (row) {
      row.forEach(function (value) {
        var cell = document.createElement('i');
        cell.className = 'cnn01-match-matrix-cell';
        if (value <= 0.004) cell.classList.add('is-zero');
        else if (value >= 0.996) cell.classList.add('is-one');
        else cell.classList.add('is-half');
        cell.textContent = value === 0.5 ? '0.5' : String(value);
        wrap.appendChild(cell);
      });
    });
    return wrap;
  }

  function renderMiniImage(card) {
    var wrap = document.createElement('span');
    wrap.className = 'cnn01-mini-image';
    card.matrix.forEach(function (row) {
      row.forEach(function (value) {
        var px = document.createElement('i');
        px.style.setProperty('--shade', shadeNorm(value));
        wrap.appendChild(px);
      });
    });
    return wrap;
  }

  function findMatch(key) {
    return guide.matchCards.filter(function (card) { return card.key === key; })[0];
  }

  function selectMatch(index, role, key) {
    var current = state.matchSelected;
    state.scene = index;
    if (role === 'matrix') {
      state.matchSelected = { role: role, key: key };
      setFeedback(index, '已选矩阵 ' + findMatch(key).label + '，再点右侧对应的像素图。');
      render();
      return;
    }
    if (!current || current.role !== 'matrix') {
      state.matchSelected = { role: role, key: key };
      setFeedback(index, '先点左侧的矩阵卡片，再点右侧像素图。', 'is-warn');
      render();
      return;
    }
    if (current.key === key) {
      state.matches[key] = true;
      state.matchSelected = null;
      setFeedback(index, '数值的位置不变，渲染出来的位置也不变。', 'is-good');
      if (Object.keys(state.matches).length === guide.matchCards.length) {
        state.finished = true;
        setFeedback(index, '通关。模型真正接收到的是一张按位置排列的 0-1 数值矩阵。', 'is-good');
      }
      render();
      return;
    }
    state.matchSelected = null;
    state.mismatchKey = key;
    setFeedback(index, '再看每个格子的位置：0 是黑色，1 是白色，中间值是灰色。', 'is-bad');
    render();
    window.setTimeout(function () {
      state.mismatchKey = '';
      render();
    }, 360);
  }

  function drawMatchLines(root) {
    var grid = root.querySelector('.cnn01-match-grid');
    var svg = root.querySelector('.cnn01-match-lines');
    if (!grid || !svg) return;

    var gridBox = grid.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + gridBox.width + ' ' + gridBox.height);
    svg.innerHTML = '';

    Object.keys(state.matches).forEach(function (key) {
      var matrixButton = grid.querySelector('[data-match-role="matrix"][data-match-key="' + key + '"]');
      var imageButton = grid.querySelector('[data-match-role="image"][data-match-key="' + key + '"]');
      if (!matrixButton || !imageButton) return;

      var matrixBox = matrixButton.getBoundingClientRect();
      var imageBox = imageButton.getBoundingClientRect();
      var x1 = matrixBox.right - gridBox.left;
      var y1 = matrixBox.top + matrixBox.height / 2 - gridBox.top;
      var x2 = imageBox.left - gridBox.left;
      var y2 = imageBox.top + imageBox.height / 2 - gridBox.top;
      var curve = Math.max(38, Math.abs(x2 - x1) * 0.32);
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var start = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      var end = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      path.setAttribute('class', 'cnn01-match-line');
      path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + curve) + ' ' + y1 + ', ' + (x2 - curve) + ' ' + y2 + ', ' + x2 + ' ' + y2);
      start.setAttribute('class', 'cnn01-match-line-dot');
      start.setAttribute('cx', x1);
      start.setAttribute('cy', y1);
      start.setAttribute('r', 5);
      end.setAttribute('class', 'cnn01-match-line-dot');
      end.setAttribute('cx', x2);
      end.setAttribute('cy', y2);
      end.setAttribute('r', 5);
      svg.appendChild(path);
      svg.appendChild(start);
      svg.appendChild(end);
    });
  }

  function scheduleMatchLines(root) {
    window.setTimeout(function () {
      drawMatchLines(root);
    }, 40);
  }

  function renderMatchScene(mount, index, disabled) {
    mount.innerHTML =
      '<div class="cnn01-match-grid">' +
        '<svg class="cnn01-match-lines" aria-hidden="true"></svg>' +
        '<section class="cnn01-match-column" data-tr-id="cnn01_match_matrix_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"match_matrix"}\'>' +
          '<h3>0-1 亮度矩阵</h3>' +
          '<div id="matrixCards"></div>' +
        '</section>' +
        '<section class="cnn01-match-column" data-tr-id="cnn01_match_image_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"match_image"}\'>' +
          '<h3>渲染后的像素图</h3>' +
          '<div id="imageCards"></div>' +
        '</section>' +
      '</div>';

    var matrixCards = mount.querySelector('#matrixCards');
    guide.matchCards.forEach(function (card) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cnn01-match-card';
      button.disabled = disabled || !!state.matches[card.key];
      button.dataset.matchRole = 'matrix';
      button.dataset.matchKey = card.key;
      setTracking(button, 'cnn01_matrix_' + card.key + '_btn', 'matrix_match_select_click', { matrix: card.label });
      if (state.matchSelected && state.matchSelected.role === 'matrix' && state.matchSelected.key === card.key) button.classList.add('is-selected');
      if (state.matches[card.key]) button.classList.add('is-done');
      button.innerHTML = '<strong>矩阵 ' + card.label + '</strong>';
      button.appendChild(renderMatchMatrix(card));
      if (!button.disabled) button.addEventListener('click', function () { selectMatch(index, 'matrix', card.key); });
      matrixCards.appendChild(button);
    });

    var imageCards = mount.querySelector('#imageCards');
    guide.imageOrder.forEach(function (key, imageIndex) {
      var card = findMatch(key);
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'cnn01-match-card cnn01-image-card';
      button.disabled = disabled || !!state.matches[key];
      button.dataset.matchRole = 'image';
      button.dataset.matchKey = key;
      setTracking(button, 'cnn01_image_' + key + '_btn', 'image_match_select_click', { image: imageIndex + 1, key: key });
      if (state.mismatchKey === key) button.classList.add('is-shaking', 'is-wrong');
      if (state.matches[key]) button.classList.add('is-done');
      button.innerHTML = '<strong>像素图 ' + (imageIndex + 1) + '</strong>';
      button.appendChild(renderMiniImage(card));
      if (!button.disabled) button.addEventListener('click', function () { selectMatch(index, 'image', key); });
      imageCards.appendChild(button);
    });
    scheduleMatchLines(mount);
  }

  function renderSceneBody(index, mount, disabled) {
    if (index === 0) renderHumanScene(mount, index, disabled);
    if (index === 1) renderZoomScene(mount, index, disabled);
    if (index === 2) renderReadScene(mount, index, disabled);
    if (index === 3) renderNormalizeScene(mount, index, disabled);
    if (index === 4) renderMatchScene(mount, index, disabled);
  }

  function renderTransition(section, index) {
    var slot = section.querySelector('[data-role="transitionSlot"]');
    slot.innerHTML = '';
    slot.classList.remove('is-visible');
    if (index !== state.maxScene || !sceneReady(index)) return;

    var copy = transitionCopy(index);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'cnn01-transition-card';
    setTracking(button, 'cnn01_transition_scene_' + (index + 1) + '_btn', 'transition_continue_click', {
      scene: index + 1,
      label: copy.label
    });
    button.innerHTML =
      '<span>' + copy.kicker + '</span>' +
      '<b>' + copy.insight + '</b>' +
      '<strong>' + copy.label + '</strong>';
    button.addEventListener('click', function () {
      continueFromScene(index);
    });
    slot.appendChild(button);
    slot.classList.add('is-visible');
  }

  function createSceneSection(index) {
    var scene = guide.scenes[index];
    var section = document.createElement('section');
    section.className = 'cnn01-stage cnn01-scene-section';
    section.dataset.sceneIndex = String(index);
    section.setAttribute('data-tr-id', 'cnn01_scene_' + (index + 1) + '_panel');
    section.setAttribute('data-tr-view', 'panel_show');
    section.setAttribute('data-tr-props', JSON.stringify({ panel: 'scene', scene: index + 1 }));
    if (index === state.scene) section.classList.add('is-active');
    if (index < state.maxScene) section.classList.add('is-past');
    if (index === state.maxScene) section.classList.add('is-current');
    if (index === state.enteringScene) section.classList.add('is-entering');

    var disabled = index < state.maxScene;
    var feedback = feedbackFor(index);
    var goalHtml = scene.goal ? '<p data-role="sceneGoal">' + scene.goal + '</p>' : '';
    section.innerHTML =
      '<header class="cnn01-stage-head">' +
        '<div>' +
          '<span class="cnn01-kicker" data-role="sceneTag">' + scene.tag + '</span>' +
          '<h2 data-role="sceneTitle">' + scene.title + '</h2>' +
          goalHtml +
        '</div>' +
        '<div class="cnn01-range-pill" data-role="rangePill">' + scene.pill + '</div>' +
      '</header>' +
      '<div class="cnn01-layout">' +
        '<section class="cnn01-workbench" aria-label="交互区域" data-tr-id="cnn01_workbench_scene_' + (index + 1) + '_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"workbench","scene":' + (index + 1) + '}\'></section>' +
        '<aside class="cnn01-side-panel" aria-label="任务信息" data-tr-id="cnn01_status_scene_' + (index + 1) + '_panel" data-tr-view="panel_show" data-tr-props=\'{"panel":"status","scene":' + (index + 1) + '}\'>' +
          '<section class="cnn01-side-section">' +
            '<h3>完成条件</h3>' +
            '<div class="cnn01-task-list" data-role="taskList"></div>' +
          '</section>' +
          '<section class="cnn01-side-section cnn01-concept-card">' +
            '<h3>本幕启发</h3>' +
            '<p data-role="conceptText">完成当前动作后解锁。</p>' +
          '</section>' +
        '</aside>' +
      '</div>' +
      '<div class="cnn01-transition-slot" data-role="transitionSlot" aria-live="polite"></div>' +
      '<footer class="cnn01-bottom-bar cnn01-bottom-bar--feedback-only">' +
        '<p class="cnn01-feedback ' + feedback.tone + '" data-role="feedbackText">' + feedback.text + '</p>' +
      '</footer>';

    renderSidePanel(section, index);
    renderSceneBody(index, section.querySelector('.cnn01-workbench'), disabled);
    renderTransition(section, index);
    return section;
  }

  function maybeScrollToPrompt() {
    var index = state.maxScene;
    if (!sceneReady(index) || state.promptedScenes[index]) return;
    state.promptedScenes[index] = true;
  }

  function render(options) {
    var renderOptions = options || {};
    state.maxScene = clamp(state.maxScene, 0, guide.scenes.length - 1);
    state.scene = clamp(state.scene, 0, state.maxScene);
    renderProgress();
    sceneStack.innerHTML = '';
    for (var index = 0; index <= state.maxScene; index += 1) {
      sceneStack.appendChild(createSceneSection(index));
    }
    if (typeof renderOptions.scrollTo === 'number') {
      scrollToScene(renderOptions.scrollTo, renderOptions.block || 'center');
    } else {
      maybeScrollToPrompt();
    }
    state.enteringScene = null;
  }

  window.addEventListener('resize', function () {
    var matchScene = sceneElement(4);
    if (matchScene) drawMatchLines(matchScene);
  });

  render();
}());
