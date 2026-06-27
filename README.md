# Agent-DeepLearning

面向 Agent 学习深度学习的交互式可视化模块集合。每个模块是一组按 LDD 模板设计的画面，配套 manim 动画与前端实现。

视频制作工具：https://github.com/3b1b/manim

## 模块索引

### 卷积神经网络（CNN）
- [Digital-Image](Digital-Image/) — CNN01 模型眼中的图像
- [ConvKernel](ConvKernel/) — CNN03 卷积核侦探
- [LeNet-5](LeNet-5/) — CNN05 经典卷积神经网络 LeNet-5

### 训练机制
- [Backprop-ChainRule](Backprop-ChainRule/) — 曲线拟合中的反向传播与链式法则
- [LearningRate](LearningRate/) — 学习率是什么

## 目录约定

每个模块目录的结构：

```
<Module>/
├── SKILL.md          # 模块设计文档（LDD）
├── assets/           # 视频、海报图、引用图片
└── manim/            # manim 动画源码
```

实现就绪的模块还会包含 `index.html`、`style.css`、`script.js`、`guide.js`、`info.json`、`module.json` 等前端文件。