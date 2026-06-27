(function () {
  'use strict';

  // ---------------- 山谷物理 ----------------
  // Loss(w) = 0.5 * a * (w - w*)^2 + 浅噪声，w 在 [-3, 3]，最小点 w* = 0
  // 梯度 g(w) = a * (w - w*)；用作所有"山谷"场景的统一损失景观。
  var VALLEY = {
    a: 1.0,
    wStar: 0.0,
    wMin: -3.0,
    wMax: 3.0,
    lossMax: 5.0
  };

  function loss(w) {
    var d = w - VALLEY.wStar;
    return 0.5 * VALLEY.a * d * d;
  }
  function grad(w) { return VALLEY.a * (w - VALLEY.wStar); }

  // 一次 GD 步：返回新参数与本步信息
  function gdStep(w, lr) {
    var g = grad(w);
    var step = lr * g;
    var wNew = w - step;
    // 数值安全：限制在视图内的"发散"区段
    if (wNew > 30) wNew = 30;
    if (wNew < -30) wNew = -30;
    return {
      from: w,
      to: wNew,
      grad: g,
      step: step,
      lossFrom: loss(w),
      lossTo: loss(wNew)
    };
  }

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  // 根据 lr 选择区域分级（与画面 2 - 6 的 LR 分档一致）
  function lrZone(lr) {
    if (lr <= 0.02) return { key: 'tiny', label: '太小：很稳但很慢', tone: 'good' };
    if (lr <= 0.2)  return { key: 'good', label: '合适：稳定且高效', tone: 'good' };
    if (lr <= 0.85) return { key: 'big',  label: '偏大：可能在底部来回',  tone: 'warn' };
    return            { key: 'huge', label: '过大：容易跨过最低点甚至发散', tone: 'loss' };
  }

  // ---------------- MLP 拟合模拟 ----------------
  // 用一个最小可视化模型：参数 theta = [a, b, c]，预测 y = a*sin(b*x) + c
  // 真实曲线：y = 1.2*sin(1.6*x) + 0.1*x，外加少量噪声
  // 这样 GD 在三参数空间里下降，能直观地体现"学习率太小慢 / 合适稳 / 太大震 / 极大发散"。
  var MLP = {
    xs: [],
    ys: [],
    init: [0.4, 0.7, 0.0],
    range: { xMin: -3.0, xMax: 3.0 }
  };

  (function buildDataset() {
    var N = 28;
    var s = 7;
    for (var i = 0; i < N; i++) {
      var x = MLP.range.xMin + (MLP.range.xMax - MLP.range.xMin) * (i / (N - 1));
      // 简单 LCG 噪声
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var noise = (((s >> 8) & 0xffff) / 0xffff - 0.5) * 0.18;
      var y = 1.2 * Math.sin(1.6 * x) + 0.1 * x + noise;
      MLP.xs.push(x);
      MLP.ys.push(y);
    }
  }());

  function mlpPredict(theta, x) {
    return theta[0] * Math.sin(theta[1] * x) + theta[2];
  }

  function mlpLoss(theta) {
    var sum = 0;
    for (var i = 0; i < MLP.xs.length; i++) {
      var d = mlpPredict(theta, MLP.xs[i]) - MLP.ys[i];
      sum += d * d;
    }
    return sum / MLP.xs.length;
  }

  function mlpGrad(theta) {
    // 解析梯度 ∂L/∂a, ∂L/∂b, ∂L/∂c
    var ga = 0, gb = 0, gc = 0;
    var N = MLP.xs.length;
    for (var i = 0; i < N; i++) {
      var x = MLP.xs[i];
      var y = MLP.ys[i];
      var s = Math.sin(theta[1] * x);
      var pred = theta[0] * s + theta[2];
      var err = pred - y;
      ga += 2 * err * s;
      gb += 2 * err * theta[0] * x * Math.cos(theta[1] * x);
      gc += 2 * err;
    }
    return [ga / N, gb / N, gc / N];
  }

  function mlpStep(theta, lr) {
    var g = mlpGrad(theta);
    var t2 = [
      theta[0] - lr * g[0],
      theta[1] - lr * g[1],
      theta[2] - lr * g[2]
    ];
    // 数值溢出保护
    for (var i = 0; i < 3; i++) {
      if (!isFinite(t2[i])) t2[i] = theta[i];
      if (t2[i] > 20) t2[i] = 20;
      if (t2[i] < -20) t2[i] = -20;
    }
    return t2;
  }

  // ---------------- 学习率档位 ----------------
  var LR_GRID_SHARED = [0.001, 0.005, 0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.85, 1.05, 1.3, 1.6];

  function snapLr(lr) {
    // 找到最接近的预设值
    var best = LR_GRID_SHARED[0];
    var bestD = Math.abs(lr - best);
    LR_GRID_SHARED.forEach(function (v) {
      var d = Math.abs(lr - v);
      if (d < bestD) { bestD = d; best = v; }
    });
    return best;
  }

  // ---------------- 暴露 ----------------
  window.T10_GUIDE = {
    module: {
      id: 'T10-learning-rate',
      title: '学习率',
      subtitle: '梯度给方向，学习率给步长：手动调一下，看 Loss 怎么从稳稳下降变成飞起。'
    },
    valley: {
      a: VALLEY.a,
      wStar: VALLEY.wStar,
      wMin: VALLEY.wMin,
      wMax: VALLEY.wMax,
      lossMax: VALLEY.lossMax
    },
    lr: {
      grid: LR_GRID_SHARED,
      min: 0.001,
      max: 1.6,
      defaults: {
        scene1: 0.1,
        smallScene: 0.005,
        goodScene: 0.1,
        bigScene: 0.6,
        hugeScene: 1.3,
        mlpDefault: 0.05
      }
    },
    mlp: {
      xs: MLP.xs.slice(),
      ys: MLP.ys.slice(),
      init: MLP.init.slice(),
      xMin: MLP.range.xMin,
      xMax: MLP.range.xMax,
      lrOptions: [0.005, 0.05, 0.4]
    },
    helpers: {
      loss: loss,
      grad: grad,
      gdStep: gdStep,
      lrZone: lrZone,
      snapLr: snapLr,
      clamp: clamp,
      mlpPredict: mlpPredict,
      mlpLoss: mlpLoss,
      mlpGrad: mlpGrad,
      mlpStep: mlpStep
    },
    scenes: [
      {
        title: '认识学习率：参数更新里的步长控制器',
        tag: '画面 1',
        pill: '认识本关',
        goal: '梯度已经告诉你"往哪边改"，这一关补上"每一步改多少"——也就是参数更新公式里那个 η（学习率）。',
        concept: '更新公式：新参数 = 旧参数 − 学习率 × 梯度。梯度决定方向，学习率决定步长。',
        tasks: ['点开三张预告卡', '点击 开始寻找步长 η']
      },
      {
        title: '在 Loss 山谷里走一步',
        tag: '画面 2',
        pill: '一次更新',
        goal: '在一个 U 形山谷上手动选学习率，让小球沿梯度反方向走一步，亲手感受步长怎么变化。',
        concept: '紫色箭头是梯度方向，绿色箭头是更新方向；学习率越大，绿色箭头越长。',
        tasks: ['拖动学习率滑杆至少 3 次', '点击 走一步']
      },
      {
        title: '小学习率：很稳，但很慢',
        tag: '画面 3',
        pill: '太小',
        goal: '把学习率锁到很小，连续走 30 步，看小球如何缓慢、安全地往谷底挪。',
        concept: 'Loss 通常会稳定下降，但每一步幅度小，到谷底前要走很多步。',
        tasks: ['点击 用小学习率训练 30 步', '看完留下灰色轨迹']
      },
      {
        title: '合适学习率：稳稳地下来',
        tag: '画面 4',
        pill: '合适',
        goal: '把学习率调到合适档，连续走 15 步，让小球高效地逼近谷底，对比小学习率的灰色轨迹。',
        concept: '合适的学习率能在速度和稳定之间取得平衡：每一步都有效，整体趋势稳定下降。',
        tasks: ['点击 用合适学习率训练 15 步', '看 Loss 曲线下降得更快']
      },
      {
        title: '大学习率：在谷底来回震荡',
        tag: '画面 5',
        pill: '太大',
        goal: '把学习率调大，连续走 10 步，看小球如何跨过谷底，在两侧来回跳。',
        concept: 'Loss 折线呈锯齿状：方向没错，但步长太大，每一步都跳过了好位置。',
        tasks: ['点击 用大学习率训练 10 步']
      },
      {
        title: '极大学习率：训练直接发散',
        tag: '画面 6',
        pill: '发散',
        goal: '把学习率推到极大，看小球越跳越远，Loss 飞向天上——这就是训练发散。',
        concept: '学习率过大时，更新会把参数推得越来越远，Loss 反而上升、不再回头。',
        tasks: ['点击 用极大学习率训练 5 步', '观察发散警示']
      },
      {
        title: '搬到 MLP 曲线拟合里',
        tag: '画面 7',
        pill: 'MLP 实战',
        goal: '把同一个 η 用到一个迷你 MLP 拟合上：拖动学习率、连训 20 步，看蓝色预测曲线追散点的速度与稳定性。',
        concept: '同一个学习率思路：太小拟合慢，合适稳定逼近，太大震荡甚至发散。',
        tasks: ['至少试 3 个学习率', '点击 连训 20 步', '看 Loss 曲线随 η 变化']
      }
    ],
    previewCards: [
      {
        key: 'small',
        zone: 'lr-small',
        emoji: '🐢',
        title: '走太小',
        copy: '步子小到几乎挪不动，Loss 下降得又慢又安静。'
      },
      {
        key: 'mid',
        zone: 'lr-mid',
        emoji: '🚶',
        title: '走刚好',
        copy: '一步一步稳稳地往低处走，方向和步长都配得上。'
      },
      {
        key: 'large',
        zone: 'lr-large',
        emoji: '🦘',
        title: '走太大',
        copy: '一步跨过头，Loss 来回震，甚至越走越远。'
      }
    ],
    transitions: [
      { label: '开始寻找步长 η',           kicker: '更新公式已经补全' },
      { label: '继续：先用很小的步长',     kicker: '亲手走了一步' },
      { label: '试试合适的步长',           kicker: '小学习率轨迹已留下' },
      { label: '看看大步长会怎样',         kicker: '合适学习率收敛漂亮' },
      { label: '看看极大学习率',           kicker: '大学习率开始震荡' },
      { label: '搬到 MLP 曲线拟合 →',     kicker: '已看到发散的样子' },
      { label: 'T10 完成：学习率心智模型已建立', kicker: 'MLP 拟合实验完成' }
    ]
  };
}());
