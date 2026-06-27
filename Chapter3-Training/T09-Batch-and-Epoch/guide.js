(function () {
  'use strict';

  // ---------------- 基础常量 ----------------
  // 演示用数据集：N=24，画成 4 行 × 6 列
  var N = 24;
  var GRID_ROWS = 4;
  var GRID_COLS = 6;

  // batch 大小预设；只展示 N 能整除的几档
  var BATCH_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24];

  // ---------------- 工具 ----------------
  function range(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    return a;
  }

  // 固定洗牌（带种子），保证可复现，又能制造"洗过"的感觉
  function seededShuffle(arr, seed) {
    var out = arr.slice();
    var s = seed || 1;
    for (var i = out.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var j = s % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // 给定 batch size 生成一个 epoch 的 batch 序列（每个元素是样本编号数组）
  function buildEpochBatches(batchSize, seed) {
    var order = seededShuffle(range(N), seed);
    return chunk(order, batchSize);
  }

  // ---------------- loss 曲线模拟 ----------------
  // 思路：基础趋势是指数下降；不同 batch size 加不同噪声幅度，
  // 且每个 epoch 内的 step 数 = N / B。
  function simulateLoss(batchSize, numEpochs, seed) {
    var stepsPerEpoch = Math.max(1, Math.floor(N / batchSize));
    var totalSteps = stepsPerEpoch * numEpochs;
    var pts = [];
    var s = seed || 7;
    // 噪声幅度：B 越小越大；B 越大越小（粗略反比于 sqrt(B)）
    var noise = 0.55 / Math.sqrt(batchSize);
    for (var i = 0; i < totalSteps; i++) {
      var t = i / Math.max(1, totalSteps - 1);
      var base = 0.18 + 0.82 * Math.exp(-2.6 * t);   // 趋势：1 → ~0.18
      // 简单确定性"伪随机"
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      var r = ((s >> 8) & 0xffff) / 0xffff - 0.5;
      var v = base + r * noise;
      if (v < 0.05) v = 0.05;
      pts.push({ step: i, epoch: Math.floor(i / stepsPerEpoch), loss: v });
    }
    return { stepsPerEpoch: stepsPerEpoch, totalSteps: totalSteps, points: pts };
  }

  // ---------------- 公开 ----------------
  window.T09_GUIDE = {
    module: {
      id: 'T09-batch-and-epoch',
      title: 'Batch 与 Epoch',
      subtitle: '一次训练循环由哪些时间尺度组成：把 step / batch / epoch 三个词钉死。'
    },
    dataset: {
      N: N,
      rows: GRID_ROWS,
      cols: GRID_COLS,
      batchOptions: BATCH_OPTIONS,
      defaultBatch: 4
    },
    helpers: {
      buildEpochBatches: buildEpochBatches,
      simulateLoss: simulateLoss
    },
    scenes: [
      {
        title: '完整数据集与"全量"的代价',
        tag: '画面 1',
        pill: '全量梯度',
        goal: '先在视觉上接受："训练集是 N 个样本的集合"。如果每一步都吃掉全部 N 个样本算一次梯度，逻辑上没错，但代价是每动一下都要算所有人。',
        concept: '这种"一次算完所有样本"的做法叫 full-batch / batch gradient descent；N 一大就吃不消。',
        tasks: ['观察 N = 24 的数据方阵', '点击 算一次全量梯度']
      },
      {
        title: '洗牌、切批、走一步',
        tag: '画面 2',
        pill: '一步 = 一个 batch',
        goal: '亲手把数据集打散、切成大小为 B 的小份；每一份做一次"前向 + 反向 + 更新"就是一步（step）。',
        concept: '一次"前向 + 反向 + 更新" = 一步；这一步用的那份样本叫 batch。',
        tasks: ['调整 batch 大小 B', '点击 洗牌', '依次点击 走一步']
      },
      {
        title: 'N/B 步走完一个 epoch',
        tag: '画面 3',
        pill: '一个 epoch',
        goal: '把"步"串起来：当 batch 队列被吃光，刚好走完整份数据 → 这就是一个 epoch。',
        concept: 'epoch 是"数据集层面"的时间单位；step 是"参数更新层面"的时间单位。',
        tasks: ['点击 自动跑完一个 epoch', '观察时间轴与队列同步']
      },
      {
        title: '多个 epoch + batch size 的取舍',
        tag: '画面 4',
        pill: 'batch size 取舍',
        goal: '看连续 3 个 epoch 的 loss 曲线，比较 B=1 / B=4 / B=24 下"噪声 vs 平滑"和"每个 epoch 的 step 数"。',
        concept: 'B 小：颠簸但灵活；B 大：平滑但慢；B 中：折中，最常用。',
        tasks: ['切换 batch 大小', '点击 跑 3 个 epoch']
      },
      {
        title: '一个小测验',
        tag: '画面 5',
        pill: '概念巩固',
        goal: '用一道概念题确认你已经掌握了 step / batch / epoch 三者的对应关系。',
        concept: '把这三个词用自己的话讲一遍，比算十次更管用。',
        tasks: ['挑出最准确的描述']
      }
    ],
    transitions: [
      { label: '把数据集切成 batch',      kicker: '全量梯度已演示' },
      { label: '把这一轮串起来',           kicker: '已走过若干步' },
      { label: '多跑几个 epoch',           kicker: '一个 epoch 走完了' },
      { label: '进入小测验',               kicker: '3 个 epoch 已跑完' },
      { label: 'T09 完成：step / batch / epoch 已分清', kicker: '概念测验已通过' }
    ],
    quiz: {
      question: '训练集有 N=1000 个样本，设 batch size B=100。下列说法正确的是？',
      options: [
        {
          key: 'a',
          label: 'A',
          text: '一个 epoch 等于 1 步，因为每个 epoch 都只更新一次参数。',
          correct: false,
          wrong: '想想画面 3：epoch 是按 batch 走完整遍数据，不是只走一步。'
        },
        {
          key: 'b',
          label: 'B',
          text: '一个 epoch 等于 10 步，每一步用 100 个样本做一次前向+反向+更新；跑 5 个 epoch 一共更新 50 次。',
          correct: true,
          rightFeedback: '对了：1 epoch = N/B 步；epoch 是"过完一遍数据"的尺度，step 是"更新一次参数"的尺度。'
        },
        {
          key: 'c',
          label: 'C',
          text: 'batch size 越大越好，因为方向更准。',
          correct: false,
          wrong: '画面 4 已经展示过：B 大方向稳但慢、B 小灵活但抖；B 是个折中。'
        }
      ]
    }
  };
}());
