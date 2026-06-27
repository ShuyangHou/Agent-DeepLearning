# Design

本项目沿用一套统一的教学模块视觉语言：每个模块（T07 / T08 / T10 ...）共享 `base.css` 里的设计 token，再用 `style.css` 定义模块色调和场景专属结构。下面记录的是当前实际生效的视觉规则，作为后续美化与一致性的基线。

## Theme & Mood
克制的浅色教学界面：底色是带极轻冷调的浅灰白，主体内容承载在白色卡壳上。模块色调用蓝紫红绿橙五色 **作为语义信号**（前向 / 梯度 / Loss / 更新 / 步长），不做大色块装饰。

## Color
核心 token（已在 `Chapter3-Training/*/base.css`）：

| Token | Value | 用途 |
| ---- | ---- | ---- |
| `--ui-bg-page` | `#eef2f7` | 页面底色 |
| `--ui-bg-page-top` | `#f7f9fc` | 顶部柔光 |
| `--ui-bg-card` | `#ffffff` | 卡壳 |
| `--ui-bg-soft` | `#eef3fb` | 嵌入式区域底 |
| `--ui-bg-muted` | `#f6f8fc` | 按钮 / 标签底 |
| `--ui-text-main` | `#21324a` | 主文本 |
| `--ui-text-muted` | `#68778f` | 辅文本 |
| `--ui-text-light` | `#8b97ab` | 弱化文字 |
| `--ui-border` | `#d7deea` | 边框 |
| `--ui-accent` | `#27446e` | 主品牌色（深蓝） |
| `--ui-success` | `#228d5c` | 成功 |
| `--ui-danger` | `#c43f52` | 警示 |

模块语义色（每个模块在 `style.css` 顶部复刻同一套，名称随模块前缀）：

| 含义 | 颜色 | 何时出现 |
| ---- | ---- | ---- |
| 前向 / 当前状态 / 主按钮 | `#2563eb` | 网络前向、预测曲线、主 CTA |
| 梯度 / 反向 | `#7c3aed` | 反向箭头、∂L/∂w 标签 |
| Loss / 上升 | `#dc2626` | Loss 数值、发散告警 |
| 更新 / 下降 / 成功 | `#16a34a` | 参数更新箭头、Loss 下降、过关 |
| 参数 / 学习率 / 步长 | `#f97316` | 滑杆、小球、被操作的权重 |
| 灰阶 ink / muted / line | `#0f172a` / `#64748b` / `#cbd5e1` | 主文 / 辅文 / 轴线 |

**对比度自检**：正文 `#21324a` on `#ffffff` 远超 4.5:1。muted 文 `#64748b` 仅用于辅注释 / 轴标签（≥ 14px 或加粗），不放正文段。所有色色相同时与"语义角色"绑定，不在装饰里乱用。

## Typography
- 主字栈：`"Segoe UI", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif`
- 等宽字栈：`"Cascadia Code", "SFMono-Regular", Consolas, monospace`
- 标题 `edu-title`：42px / line-height 1.06 / letter-spacing -0.03em（display 楼板，不能再紧）
- 副标题 `edu-subtitle`：17px / muted / 1.6
- 场景标题 `h2`：22px / ink
- 正文 / 任务标签：13-14px
- 数值与公式必须等宽，避免 `0/O` 混读
- 主标题与场景标题之间允许一档大跨度，但模块内部不可再叠加新尺寸；所有数字 / 公式走等宽

## Layout
- 外壳 `.edu-shell` 居中、最大 1200px；模块外壳 `.t0x-shell` 最大 1180px。
- 每个"场景"是一张白色卡，圆角 `--ui-radius-xl: 24px`，1px 边 + soft shadow，内部双列（≥980px）布局：左信息 / 右控制。
- 控制 / 反馈 / 视频 / 网络图区按 `grid-column: 1 / -1` 跨整行。
- 间距节奏：场景之间 24px，场景内 head→panel→feedback 14-22px。
- 移动端（≤980px）一律单列。
- 禁止嵌套卡：场景卡内部用 soft-bg 嵌入区，不再加 1px 边 + shadow。

## Motion
- 切换场景：滚动到目标卡 `smooth`。
- 梯度脉冲：1.2s 走完一条边，`ease-in-out`，只在用户主动触发时播放。
- 球 / 折线 / 曲线更新：0.4-0.8s `ease`，不允许 bounce / elastic。
- 全部动画必须有 `@media (prefers-reduced-motion: reduce)` 退化（当前缺，后续补）。

## Components
- **进度条 `.t0x-progress`**：胶囊按钮，当前态主色背景，已过关绿色描边，未解锁灰且 `disabled`。
- **场景头 `.t0x-scene-head`**：左 pill + h2 + goal + concept + 任务 chips；右 tag（画面 N）。
- **公式块 `.t0x-formula`**：白底 1px 边等宽字，关键符号上色（var / lr / grad / loss / update）。
- **网络图 / 山谷 / 曲线**：SVG，统一坐标系，箭头 marker 与轴 tick 颜色取自模块 token。
- **反馈条 `.t0x-feedback`**：左 3px 主色描边 + soft 背景。tone 决定描边色（good / warn / loss / grad）。**禁止侧条 6px+ 色块。**
- **视频卡 `.t0x-media`**：1px 边 + soft 圆角 + 简短 caption；poster 必填。

## Anti-patterns
- 禁止 `border-radius ≥ 28px` 出现在卡上（任何场景卡只允许 `--ui-radius-xl: 24px`）。
- 禁止文字渐变、玻璃拟态、装饰性大渐变、AI 奶油色背景。
- 禁止侧条 `border-left: 6px solid X` 当作装饰用；反馈条限 3px。
- 禁止 emoji 当作信息载体（emoji 仅作为预告卡的辅助视觉，且必须配文字）。
- 禁止 `01 / 02 / 03` 装饰编号当作每段 section 的 eyebrow，只允许"画面 N"作为关卡定位。
- 禁止字号缩放跟视口宽度走（display 标题保持 clamp 上限 ≤ 42px）。
- 禁止把 1px 边 + ≥16px blur 阴影同时叠在按钮 / 小卡上（"ghost card"），按钮要么有边要么有阴影。
