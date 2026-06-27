(function () {
  'use strict';

  window.CNN05_GUIDE = {
    module: {
      id: 'CNN05-lenet5-classic-cnn',
      title: '经典卷积神经网络：LeNet-5',
      subtitle: '观察一张数字 7 的 32×32×1 灰度图像如何沿着 LeNet-5 的固定结构，变成 0-9 的输出概率。'
    },
    scenes: [
      {
        title: 'LeNet-5 要做什么',
        tag: '画面 1',
        pill: '输入到输出',
        goal: '用一段短动画先看懂本关主线：数字 7 图像进入经典 LeNet-5 网络，最后输出识别到的数字。',
        concept: '这一关先抓住直观主线：输入是一张数字图片，LeNet-5 会处理这张图片，输出 0-9 十个数字的概率，其中最高的就是当前识别结果。',
        tasks: ['观看 LeNet-5 识别流程', '进入 LeNet-5 总览']
      },
      {
        title: 'LeNet-5 模块总览',
        tag: '画面 2',
        pill: '整体地图',
        goal: '先用整洁的模块地图看懂：LeNet-5 大概由哪些部分组成，每一部分负责什么。',
        concept: 'LeNet-5 可以先看成一条清晰路线：输入数字图片，逐步提取和压缩特征，再把这些特征整理成 0-9 的判断概率。',
        tasks: ['查看模块地图', '进入 C1']
      },
      {
        title: 'C1 生成 6 张特征图',
        tag: '画面 3',
        pill: '28×28×6',
        goal: '用真实数字 7 输入运行第一层卷积，看到 6 个 5×5 卷积核各自生成什么样的特征图。',
        concept: 'C1 把同一张输入图像交给 6 个不同卷积核；每个卷积核关注一种局部模式，并生成一张记录响应强弱的 28×28 特征图。',
        tasks: ['运行 C1', '继续看激活和池化']
      },
      {
        title: '激活和 S2 池化',
        tag: '画面 4',
        pill: '14×14×6',
        goal: '接着画面 3 的 C1 输出，观察激活前后有什么变化，再看 S2 如何把每张特征图缩小。',
        concept: '激活会把负响应压到 0、保留有效正响应；S2 在激活后的特征图上做池化，把 28×28×6 缩小为 14×14×6。',
        tasks: ['通过激活函数', '通过 S2 池化', '看第二个卷积层']
      },
      {
        title: '后续卷积：C3 和 S4',
        tag: '画面 5',
        pill: '16 张特征图',
        goal: '用一个代表性视图看懂：C3 继续组合 S2 特征，S4 再次缩小空间。',
        concept: '后续卷积层不必逐个展开看。C3 有 16 个卷积核，会生成 16 张 10×10 特征图；S4 再把它们缩小成 16 张 5×5 特征图。',
        tasks: ['运行 C3', '通过 S4 池化', '看分类头']
      },
      {
        title: '分类头：全连接到输出',
        tag: '画面 6',
        pill: '400 → 120 → 84 → 10',
        goal: '把 S4 的 5×5×16 特征图送进分类头，观察 C5、F6 和输出层如何一步步得到 0-9 概率。',
        concept: '卷积和池化已经把图像变成局部特征；分类头会把这些特征展平、综合，再连接到 10 个数字类别，其中概率最高的类别就是预测结果。',
        tasks: ['运行 C5', '运行 F6', '生成输出概率', '跑完整流程']
      },
      {
        title: '跑一次完整 LeNet-5',
        tag: '画面 7',
        pill: '前向传播',
        goal: '完整回放数字 7 图像如何经过 LeNet-5，最后变成“预测为 7”的输出概率。',
        concept: 'LeNet-5 的主线是：输入像素矩阵，卷积提取特征，激活筛选响应，池化压缩特征，全连接输出 0-9 概率。',
        tasks: ['运行完整 LeNet-5', '完成 3 道检查题']
      }
    ],
    transitions: [
      { label: '看 LeNet-5 总览', kicker: '输入输出已看懂' },
      { label: '看 C1 生成特征图', kicker: '模块地图已看过' },
      { label: '继续看激活和池化', kicker: 'C1 输出已生成' },
      { label: '看第二个卷积层', kicker: 'S2 输出已得到' },
      { label: '看分类头', kicker: 'S4 输出已得到' },
      { label: '跑完整流程', kicker: '输出概率已生成' }
    ],
    overviewModules: [
      { key: 'input', title: '输入图像', layers: '输入', role: '把数字 7 的灰度像素矩阵送进网络。', output: '数字 7 的亮度矩阵', shape: '32×32×1' },
      { key: 'early', title: '浅层特征', layers: 'C1 + 激活 + S2', role: '先找简单笔画线索，并保留更重要的响应。', output: '6 张较小的浅层特征图', shape: '14×14×6' },
      { key: 'deep', title: '组合特征', layers: 'C3 + S4', role: '在上一层线索上组合并缩小局部特征。', output: '16 张 5×5 特征图', shape: '5×5×16' },
      { key: 'evidence', title: '全连接证据', layers: 'C5 + F6', role: '把 S4 小特征图整理成分类前向量。', output: '84 个分类证据值', shape: '84' },
      { key: 'output', title: '输出结果', layers: '输出层', role: '给出 0-9 十个数字的概率，最高的就是预测结果。', output: '0-9 概率，预测 7', shape: '10 个概率值' }
    ],
    layers: [
      { key: 'input', label: '输入', shape: '32×32×1', kind: 'input', note: '数字 7 的灰度亮度矩阵进入网络' },
      { key: 'c1', label: 'C1', shape: '28×28×6', kind: 'conv', note: '6 个 5×5 卷积核生成 6 张特征图' },
      { key: 'act1', label: '激活', shape: '28×28×6', kind: 'act', note: '筛选有效响应' },
      { key: 's2', label: 'S2', shape: '14×14×6', kind: 'pool', note: '2×2 池化缩小宽高' },
      { key: 'c3', label: 'C3', shape: '10×10×16', kind: 'conv', note: '组合上一层线索' },
      { key: 'act2', label: '激活', shape: '10×10×16', kind: 'act', note: '再次筛选响应' },
      { key: 's4', label: 'S4', shape: '5×5×16', kind: 'pool', note: '再次缩小特征图' },
      { key: 'c5', label: 'C5', shape: '120', kind: 'dense', note: '把 5×5×16 汇总成 120 个证据点' },
      { key: 'f6', label: 'F6', shape: '84', kind: 'dense', note: '综合分类前证据' },
      { key: 'out', label: '输出', shape: '10', kind: 'output', note: '输出 0-9 概率，最高的是数字 7' }
    ],
    probabilities: [
      { digit: 0, value: 4 },
      { digit: 1, value: 2 },
      { digit: 2, value: 9 },
      { digit: 3, value: 6 },
      { digit: 4, value: 5 },
      { digit: 5, value: 7 },
      { digit: 6, value: 3 },
      { digit: 7, value: 58 },
      { digit: 8, value: 2 },
      { digit: 9, value: 4 }
    ],
    quiz: [
      {
        key: 'q1',
        question: '哪一类层负责提取局部特征？',
        answer: 'a',
        hint: '卷积核会扫描图像或特征图。',
        options: [
          { key: 'a', label: 'A', text: '卷积层' },
          { key: 'b', label: 'B', text: '池化层' },
          { key: 'c', label: 'C', text: '全连接层' }
        ]
      },
      {
        key: 'q2',
        question: '哪一类层负责缩小特征图？',
        answer: 'b',
        hint: '宽高减半发生在池化层。',
        options: [
          { key: 'a', label: 'A', text: '激活函数' },
          { key: 'b', label: 'B', text: '池化层' },
          { key: 'c', label: 'C', text: '全连接层' }
        ]
      },
      {
        key: 'q3',
        question: 'LeNet-5 最后输出几个数字类别？',
        answer: 'c',
        hint: '手写数字类别是 0 到 9。',
        options: [
          { key: 'a', label: 'A', text: '6 个' },
          { key: 'b', label: 'B', text: '16 个' },
          { key: 'c', label: 'C', text: '10 个' }
        ]
      }
    ]
  };
}());
