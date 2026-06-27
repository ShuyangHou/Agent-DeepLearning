(function () {
  'use strict';

  window.T07_GUIDE = {
    module: {
      id: 'T07-backpropagation',
      title: '反向传播',
      subtitle: '从一次预测开始，看误差如何变成每个权重的更新方向。'
    },
    // 一个最小的网络：x -> 三个隐藏神经元 h1/h2/h3 -> 输出 y'
    network: {
      input: { id: 'x', label: 'x', value: 0.8 },
      hidden: [
        { id: 'h1', label: 'h1' },
        { id: 'h2', label: 'h2' },
        { id: 'h3', label: 'h3' }
      ],
      output: { id: 'y', label: "y'" },
      // 初始权重（仅用于演示）
      weightsInput: [0.55, -0.40, 0.22],
      weightsOutput: [0.30, -0.65, 0.80],
      // 反向传播一轮后的“新权重”（演示用）
      weightsInputAfter: [0.62, -0.31, 0.34],
      weightsOutputAfter: [0.41, -0.50, 0.93],
      target: 1.0,
      predictionBefore: 0.42,
      predictionAfter: 0.71
    },
    // 训练循环用的曲线数据（与 manim 动画同步）
    curve: {
      xs: [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0],
      target: [-0.49, -0.42, -0.25, 0.25, 0.42, 0.49],
      steps: [
        { epoch: 1, line: [-0.05, -0.05, -0.04, -0.02, 0.0, 0.02], loss: 0.42 },
        { epoch: 2, line: [-0.32, -0.22, -0.12, 0.04, 0.18, 0.28], loss: 0.18 },
        { epoch: 3, line: [-0.50, -0.32, -0.15, 0.18, 0.34, 0.46], loss: 0.06 },
        { epoch: 4, line: [-0.55, -0.36, -0.14, 0.20, 0.40, 0.52], loss: 0.02 }
      ]
    },
    scenes: [
      {
        title: '前向预测：先猜一次',
        tag: '画面 1',
        pill: '前向传播',
        goal: '把输入 x 沿着权重一路推到输出，得到一次预测 y′；这是反向传播开始之前必须先做的事。',
        concept: '没有预测就没有误差。前向传播只是按当前权重把数据“算一遍”，得到一个具体的预测值。',
        tasks: ['观察信号从 x 流到 y′', '记下当前的预测值']
      },
      {
        title: '算 Loss：预测错了多少',
        tag: '画面 2',
        pill: 'Loss',
        goal: '比较预测 y′ 与真实 y，把它们之间的差距数字化成一个 Loss；这就是接下来要传回去的“责任”。',
        concept: 'Loss 既是当前性能的体检，也是反向传播的起点：只有它有方向、有大小，才能往回追溯每个权重该负多少责任。',
        tasks: ['看 y′ 与 y 的差', '把差值变成 Loss']
      },
      {
        title: '反向传播：把责任送回去',
        tag: '画面 3',
        pill: '梯度反向',
        goal: '沿着前向连接逆着走，给每条权重算出 ∂L/∂w —— 它说明：当前权重对损失贡献了多少、应该往哪边动。',
        concept: '反向传播本质上是“误差怎么分摊”：不是把 Loss 复制给每个权重，而是按它们在前向计算里的角色分配责任。',
        tasks: ['观察紫色梯度信号逆向流动', '看不同权重拿到不同的 ∂L/∂w']
      },
      {
        title: '参数更新：所有权重一起挪一小步',
        tag: '画面 4',
        pill: '参数更新',
        goal: '应用 w ← w − η · ∂L/∂w，给每条边的权重各自挪一小步。',
        concept: '梯度告诉方向，学习率 η 决定步长。一次反向传播会同时更新所有权重，而不是只调最后一层。',
        tasks: ['观察所有权重同时变化', '看预测重新做一次后 Loss 下降']
      },
      {
        title: '训练循环：曲线越来越准',
        tag: '画面 5',
        pill: '训练循环',
        goal: '把前面四步重复多轮，看模型预测曲线如何一步步向真实曲线靠拢、Loss 一直在下降。',
        concept: '一次反向传播只是一小步。真正“学会”是上万次循环里每次都让 Loss 略小一点、预测略准一点。',
        tasks: ['切换 4 个 epoch', '比较 Loss 条的变化']
      }
    ],
    transitions: [
      { label: '看看预测错了多少', kicker: '一次前向已经完成' },
      { label: '把误差送回去', kicker: 'Loss 已经算出来' },
      { label: '该动谁、动多少', kicker: '梯度已经流回每个权重' },
      { label: '把整件事循环起来', kicker: '一轮反向传播已经完成' },
      { label: '反向传播全流程已掌握', kicker: '训练循环展示完毕' }
    ],
    quiz: {
      question: '关于反向传播，下面哪一项最准确？',
      options: [
        {
          key: 'a',
          label: 'A',
          text: '反向传播会一次性把所有权重都按相同步长更新。',
          correct: false
        },
        {
          key: 'b',
          label: 'B',
          text: '反向传播沿着前向连接逆着走，按每个权重在预测里的“贡献”分配 ∂L/∂w，再用它来更新该权重。',
          correct: true
        },
        {
          key: 'c',
          label: 'C',
          text: '反向传播只更新最后一层权重，其他层靠下一轮前向自动调整。',
          correct: false
        }
      ]
    }
  };
}());
