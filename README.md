# Agent-DeepLearning

面向 Agent 学习深度学习的交互式可视化模块集合。每个模块基于 LDD 模板设计画面，配套 manim 动画与前端实现。

视频制作工具：https://github.com/3b1b/manim

## 分工

| 章节 | 范围 | 负责人 |
| ---- | ---- | ------ |
| 第一章 机器学习基础 | T1–T3 | 鹏海 |
| 第二章 多层神经网络 | T4–T6 | 鹏海 |
| 第三章 神经网络训练 | T7–T12 | 宇海 |
| 第四章 CNN | T13–T18 | 宇海 |
| 第五章 RNN | T19–T24 | 鹏海 |

> 仓库当前只包含宇海负责的第三、四章目录。鹏海的章节启动后再加目录。

## 模块索引（宇海）

### 第三章 神经网络训练 — [Chapter3-Training/](Chapter3-Training/)

| 编号 | 模块 | 状态 |
| ---- | ---- | ---- |
| T7  | [反向传播](Chapter3-Training/T07-Backpropagation/)   | 前端 + manim 已就绪 |
| T8  | [链式法则](Chapter3-Training/T08-ChainRule/)          | 指向 T7，待拆稿 |
| T9  | [Batch 与 Epoch](Chapter3-Training/T09-Batch-and-Epoch/) | 占位 |
| T10 | [学习率](Chapter3-Training/T10-LearningRate/)        | SKILL 草稿 |
| T11 | [欠拟合与过拟合](Chapter3-Training/T11-Underfit-Overfit/) | 占位 |
| T12 | [权重正则（Weight Decay）](Chapter3-Training/T12-WeightDecay/) | 占位 |

### 第四章 CNN — [Chapter4-CNN/](Chapter4-CNN/)

| 编号 | 模块 | 状态 |
| ---- | ---- | ---- |
| T13 | [为什么 MLP 不适合图像](Chapter4-CNN/T13-WhyMLPNotForImages/) | 占位 |
| T14 | [卷积核](Chapter4-CNN/T14-ConvKernel/)                       | 前端 + manim 已就绪 |
| T15 | [下采样（池化与 GAP）](Chapter4-CNN/T15-Downsampling/)        | 占位 |
| T16 | [人工特征的分类器](Chapter4-CNN/T16-HandcraftedClassifier/)   | 占位 |
| T17 | [LeNet-5 手写数字识别](Chapter4-CNN/T17-LeNet5/)              | 前端 + manim 已就绪 |
| T18 | [梯度消失与 ResNet-18](Chapter4-CNN/T18-VanishingGradient-ResNet18/) | 占位 |
| 附  | [模型眼中的图像（旧 CNN01）](Chapter4-CNN/Appendix-DigitalImage/)    | 不在 T 编号内，留作前置素材 |

## 目录约定

```
<Chapter>/<Tnn-Module>/
├── SKILL.md          # 模块设计文档（LDD）
├── assets/           # 视频、海报图、引用图片
└── manim/            # manim 动画源码
```

实现就绪的模块还会包含 `index.html`、`style.css`、`script.js`、`guide.js`、`info.json`、`module.json` 等前端文件。
