(function () {
  'use strict';

  window.T08_GUIDE = {
    module: {
      id: 'T08-chain-rule',
      title: '链式法则',
      subtitle: '把反向传播那条"回去的路"放大、拆段、再相乘——这就是链式法则。'
    },
    // 单条计算链：w -> z -> h -> y' -> Loss
    chain: {
      nodes: [
        { id: 'w', label: 'w', role: 'param', desc: '要更新的权重' },
        { id: 'z', label: 'z', role: 'mid',   desc: 'z = w · x + b' },
        { id: 'h', label: 'h', role: 'mid',   desc: 'h = activation(z)' },
        { id: 'yhat', label: "y'", role: 'mid', desc: "y' = v · h + c" },
        { id: 'loss', label: 'L', role: 'loss', desc: 'L = (y' + "'" + ' − y)^2' }
      ],
      // 四段边：每段对应一个局部偏导
      segments: [
        {
          id: 'dz_dw',
          from: 'w',
          to: 'z',
          label: '∂z/∂w',
          intuition: 'w 轻轻变大，z 也跟着同向变；这就是 ∂z/∂w。',
          local: '局部就是仿射的斜率：z = w · x + b ⇒ ∂z/∂w = x。'
        },
        {
          id: 'dh_dz',
          from: 'z',
          to: 'h',
          label: '∂h/∂z',
          intuition: 'z 动一下，激活曲线决定 h 怎么变；陡的地方放大、平的地方衰减。',
          local: '局部就是激活函数在当前点的斜率：σ′(z) 或 ReLU′(z)。'
        },
        {
          id: 'dyhat_dh',
          from: 'h',
          to: 'yhat',
          label: "∂y'/∂h",
          intuition: 'h 动一下，输出权重决定 y′ 怎么动；连接越强，影响越大。',
          local: "局部就是这条连接的权重：y' = v · h + c ⇒ ∂y'/∂h = v。"
        },
        {
          id: 'dloss_dyhat',
          from: 'yhat',
          to: 'loss',
          label: "∂L/∂y'",
          intuition: "y′ 一动，误差线变长或变短，Loss 跟着改。",
          local: "对 MSE：L = (y' − y)^2 ⇒ ∂L/∂y' = 2(y' − y)。"
        }
      ],
      // 用于场景 3 拼接的链式法则
      productOrder: ['dloss_dyhat', 'dyhat_dh', 'dh_dz', 'dz_dw'],
      productLabel: "dL/dw  =  ∂L/∂y'  ×  ∂y'/∂h  ×  ∂h/∂z  ×  ∂z/∂w"
    },
    // 场景 4：隐藏层共享回传
    network: {
      hidden: [
        { id: 'h1', label: 'h1', weight: 0.85,  dirW: '↑', dirB: '↑', hintW: '增大一点', hintB: '增大一点' },
        { id: 'h2', label: 'h2', weight: -0.55, dirW: '↓', dirB: '↓', hintW: '减小一点', hintB: '减小一点' },
        { id: 'h3', label: 'h3', weight: 0.30,  dirW: '↑', dirB: '↑', hintW: '小步增大', hintB: '小步增大' }
      ]
    },
    scenes: [
      {
        title: '把回传路径放大成一条链',
        tag: '画面 1',
        pill: '看清链条',
        goal: '从 MLP 里把"一个权重 w 一路影响到 Loss"的路径拎出来，单独放大，先在视觉上接受："这是一条有方向的计算链"。',
        concept: '不要一开始就想整张网络，先把一条链看清楚：w → z → h → y′ → Loss，方向是固定的。',
        tasks: ['观察五个节点四段边', '看清链条的方向']
      },
      {
        title: '在每一段上做"局部影响"实验',
        tag: '画面 2',
        pill: '局部偏导',
        goal: '在链条的每一段上"轻轻拨一下"前一个量，观察后一个量怎么变；把"局部偏导"的概念落到直觉上。',
        concept: '导数 = 局部影响。先在每段上做个迷你实验，再去谈"整条链上 w 对 Loss 的影响"。',
        tasks: ['依次点击四段边', '看每段的局部直觉']
      },
      {
        title: '把四段局部影响拼成一条乘法',
        tag: '画面 3',
        pill: '链式相乘',
        goal: "亲眼看到链式法则的核心结论：dL/dw = ∂L/∂y' · ∂y'/∂h · ∂h/∂z · ∂z/∂w。",
        concept: '链式法则就是"沿途每一段拿一份，按顺序乘起来"，不是死背公式。',
        tasks: ['点击 合成总影响', '观察四张卡按顺序相乘']
      },
      {
        title: '隐藏层也能拿到梯度',
        tag: '画面 4',
        pill: '共享回传',
        goal: '在多神经元 MLP 上，看输出层算出的梯度如何沿连接分流到每个隐藏神经元；每个 (w_i, b_i) 都通过同样的链式相乘拿到自己的方向。',
        concept: '上一段是共享的，下一段各自不同——这就是反向传播算法之所以高效的本质原因。',
        tasks: ['点击 回传到隐藏层', '依次查看 h1 / h2 / h3']
      },
      {
        title: '一个小测验',
        tag: '画面 5',
        pill: '概念巩固',
        goal: '用一道概念题确认你已经掌握了"链式法则 = 沿途局部影响连续相乘"这个核心结论。',
        concept: '把整件事用自己的话讲一遍，比算十次偏导都重要。',
        tasks: ['选出最准确的描述']
      }
    ],
    transitions: [
      { label: '把链条上的每一段都拨一下', kicker: '链条已经看清' },
      { label: '把四段局部拼起来',         kicker: '四段局部都试过了' },
      { label: '把链式法则搬到多神经元',   kicker: '总影响合成完毕' },
      { label: '做一道小题确认一下',       kicker: '隐藏层梯度都已得到' },
      { label: 'T08 完成：链式法则就是连续相乘', kicker: '概念测验已通过' }
    ],
    quiz: {
      question: '关于链式法则在反向传播里的作用，下列说法最准确的是？',
      options: [
        {
          key: 'a',
          label: 'A',
          text: '链式法则会一次性给出每个参数对 Loss 的精确数值，无需关心中间量。',
          correct: false,
          wrong: '想一下：链式法则恰恰是要沿途看每一段，它跳不过中间量。'
        },
        {
          key: 'b',
          label: 'B',
          text: '链式法则把 Loss 对远处参数的偏导拆成沿途每一段局部偏导的乘积，分段算、再相乘。',
          correct: true,
          rightFeedback: '对，这就是反向传播之所以成立的原因。'
        },
        {
          key: 'c',
          label: 'C',
          text: '链式法则只在隐藏层有效，输出层和 Loss 之间不需要它。',
          correct: false,
          wrong: "输出层到 Loss 也是一段：∂L/∂y' 同样是链条上的一节。"
        }
      ]
    }
  };
}());
