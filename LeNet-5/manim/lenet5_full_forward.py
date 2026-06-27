from manimlib import *


BLUE = "#27446e"
MUTED = "#64748b"
LINE = "#dbe5ef"
PURPLE = "#6750c7"
GREEN = "#228d5c"
ORANGE = "#f07e47"
GOLD = "#c28b16"
PAPER = "#ffffff"
BG = "#f8fafc"

PROBABILITIES = [4, 2, 9, 6, 5, 7, 3, 58, 2, 4]

C1_KERNELS = [
    {
        "title": "横画检测",
        "summary": "顶部横画最亮",
        "values": [
            [-1, -1, -1, -1, -1],
            [-1, 0, 0, 0, -1],
            [2, 2, 2, 2, 2],
            [-1, 0, 0, 0, -1],
            [-1, -1, -1, -1, -1],
        ],
    },
    {
        "title": "斜线检测",
        "summary": "斜向笔画最亮",
        "values": [
            [-1, -1, -1, -1, 2],
            [-1, -1, -1, 2, -1],
            [-1, -1, 2, -1, -1],
            [-1, 2, -1, -1, -1],
            [2, -1, -1, -1, -1],
        ],
    },
    {
        "title": "转折检测",
        "summary": "右上转折最亮",
        "values": [
            [2, 2, 2, 2, 0],
            [-1, -1, 0, 2, 0],
            [-1, -1, 0, 2, -1],
            [-1, 0, 2, 0, -1],
            [-1, -1, -1, -1, -1],
        ],
    },
    {
        "title": "边缘增强",
        "summary": "笔画边界更亮",
        "values": [
            [-1, -1, -1, -1, -1],
            [-1, 1, 1, 1, -1],
            [-1, 1, 4, 1, -1],
            [-1, 1, 1, 1, -1],
            [-1, -1, -1, -1, -1],
        ],
    },
    {
        "title": "端点检测",
        "summary": "端点区域最亮",
        "values": [
            [2, 2, 1, -1, -1],
            [2, 2, 1, -1, -1],
            [1, 1, 0, -1, -1],
            [-1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1],
        ],
    },
    {
        "title": "局部汇总",
        "summary": "整条 7 的笔画变亮",
        "values": [
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [1, 1, 2, 1, 1],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
        ],
    },
]

C3_COMBINATIONS = [
    {"title": "横画+转折", "sources": [(0, 0.48), (2, 0.34), (3, 0.18)]},
    {"title": "斜线+边缘", "sources": [(1, 0.52), (3, 0.32), (5, 0.16)]},
    {"title": "转折+斜线", "sources": [(2, 0.48), (1, 0.34), (5, 0.18)]},
    {"title": "端点+横画", "sources": [(4, 0.46), (0, 0.34), (2, 0.2)]},
    {"title": "笔画整体", "sources": [(5, 0.5), (0, 0.25), (1, 0.25)]},
    {"title": "右上结构", "sources": [(2, 0.5), (0, 0.25), (3, 0.25)]},
    {"title": "下斜结构", "sources": [(1, 0.58), (4, 0.22), (5, 0.2)]},
    {"title": "边缘组合", "sources": [(3, 0.52), (1, 0.24), (0, 0.24)]},
    {"title": "顶部证据", "sources": [(0, 0.56), (2, 0.26), (5, 0.18)]},
    {"title": "主体证据", "sources": [(1, 0.42), (5, 0.38), (3, 0.2)]},
    {"title": "端点证据", "sources": [(4, 0.55), (1, 0.25), (3, 0.2)]},
    {"title": "弯折证据", "sources": [(2, 0.58), (3, 0.22), (5, 0.2)]},
    {"title": "横斜连接", "sources": [(0, 0.36), (1, 0.34), (2, 0.3)]},
    {"title": "稳定亮区", "sources": [(5, 0.62), (3, 0.2), (4, 0.18)]},
    {"title": "轮廓线索", "sources": [(3, 0.45), (4, 0.3), (1, 0.25)]},
    {"title": "数字7证据", "sources": [(0, 0.28), (1, 0.28), (2, 0.22), (5, 0.22)]},
]

C1_IMAGE_ROWS = [
    "0000000000000000000000000000",
    "0000000000000000000010000000",
    "0000000000000000010000010000",
    "0000000000000000000010000000",
    "0000000000000001101000000000",
    "0000000000000000000000000000",
    "0000000000000001020000000000",
    "0000000000000026bd2000000000",
    "0000000010116cfffe1100000000",
    "00001000029efd98eb0000000000",
    "00000014eff94004f80000000000",
    "00000014a9500103f50000000000",
    "000000000100000af20000000000",
    "000000000000000de10000000000",
    "000000010000000cc00000000000",
    "000000000000012fa00000000000",
    "000000000010006f310000000000",
    "000000000000019f200000000000",
    "00000000000000ac000000000000",
    "00000000000010dc000000000000",
    "00000000000001fa000000000000",
    "00000000000005f5000000000000",
    "0000000000001af2000000000000",
    "0000000000000be2000000000000",
    "0000000000000cd0000000000000",
    "0000000000106f90000000000000",
    "0000000020008f40000000000000",
    "0000000000000100000000000000",
]

C3_REP_KERNEL = [
    [1, 1, 0, -1, -1],
    [1, 2, 1, 0, -1],
    [0, 1, 2, 1, 0],
    [-1, 0, 1, 2, 1],
    [-1, -1, 0, 1, 1],
]


def clamp(value, low=0, high=1):
    return max(low, min(high, value))


def hex_image(rows):
    return [[int(ch, 16) / 15 for ch in row] for row in rows]


def pad_image(image, pad):
    width = len(image[0]) + pad * 2
    blank = [0] * width
    padded = [blank[:] for _ in range(pad)]
    for row in image:
        padded.append([0] * pad + row + [0] * pad)
    padded.extend(blank[:] for _ in range(pad))
    return padded


def normalize(values):
    max_value = max(max(row) for row in values)
    if max_value < 0.0001:
        return [[0 for _ in row] for row in values]
    return [[clamp(max(0, value) / max_value) for value in row] for row in values]


SOURCE_IMAGE = hex_image(C1_IMAGE_ROWS)
PADDED_IMAGE = pad_image(SOURCE_IMAGE, 2)
FEATURE_CACHE = {}


def raw_feature(kernel_values):
    raw = []
    for row in range(len(PADDED_IMAGE) - 4):
        out_row = []
        for col in range(len(PADDED_IMAGE[0]) - 4):
            total = 0
            for kr in range(5):
                for kc in range(5):
                    total += PADDED_IMAGE[row + kr][col + kc] * kernel_values[kr][kc]
            out_row.append(total)
        raw.append(out_row)
    return raw


def feature_matrix(index):
    if index not in FEATURE_CACHE:
        FEATURE_CACHE[index] = normalize(raw_feature(C1_KERNELS[index]["values"]))
    return FEATURE_CACHE[index]


def pooled_value(matrix, row, col, rows, cols):
    row_start = int(row * len(matrix) / rows)
    row_end = max(row_start + 1, int((row + 1) * len(matrix) / rows))
    col_start = int(col * len(matrix[0]) / cols)
    col_end = max(col_start + 1, int((col + 1) * len(matrix[0]) / cols))
    best = 0
    for rr in range(row_start, row_end):
        for cc in range(col_start, col_end):
            best = max(best, matrix[rr][cc])
    return best


def c3_value(combo, row, col, rows, cols):
    total = 0
    weight_sum = 0
    for source, weight in combo["sources"]:
        total += pooled_value(feature_matrix(source), row, col, rows, cols) * weight
        weight_sum += weight
    return clamp((total / weight_sum) ** 0.86 if weight_sum else 0)


def s4_flatten_value(index):
    map_index = index // 25
    cell_index = index % 25
    row = cell_index // 5
    col = cell_index % 5
    combo = C3_COMBINATIONS[map_index % len(C3_COMBINATIONS)]
    base = c3_value(combo, row, col, 5, 5)
    wave = 0.84 + 0.16 * ((np.sin((map_index + 1) * 1.3 + cell_index * 0.7) + 1) / 2)
    return clamp(base * wave)


def blend_hex(a, b, t):
    a = a.lstrip("#")
    b = b.lstrip("#")
    out = []
    for i in range(0, 6, 2):
        av = int(a[i:i + 2], 16)
        bv = int(b[i:i + 2], 16)
        out.append(round(av + (bv - av) * t))
    return "#{:02x}{:02x}{:02x}".format(*out)


class LeNet5FullForward(Scene):
    video_slow_factor = 1.28

    default_camera_config = {
        "background_color": BG,
        "fps": 30,
    }

    def play(self, *animations, **kwargs):
        kwargs["run_time"] = kwargs.get("run_time", 1) * self.video_slow_factor
        return super().play(*animations, **kwargs)

    def wait(self, duration=1, stop_condition=None):
        return super().wait(duration * self.video_slow_factor, stop_condition)

    def construct(self):
        title = Text("跑一次完整 LeNet-5", font_size=37, weight=BOLD)
        title.set_color(BLUE)
        title.to_edge(UP, buff=0.24)

        subtitle = Text("沿用前面每一幕的输出元素，看数字 7 如何一路变成概率", font_size=21, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.08)

        route = self.make_route_bar()
        route.next_to(subtitle, DOWN, buff=0.18)

        note = self.make_note("从真实的数字 7 图像开始。")
        note.to_edge(DOWN, buff=0.22)

        self.play(FadeIn(title, shift=DOWN * 0.12), FadeIn(subtitle, shift=DOWN * 0.12), run_time=0.45)
        self.play(FadeIn(route), FadeIn(note, shift=UP * 0.08), run_time=0.55)

        panels = [
            self.make_input_panel(),
            self.make_c1_panel(),
            self.make_s2_panel(),
            self.make_c3_s4_panel(),
            self.make_dense_panel(),
            self.make_output_panel(),
        ]
        captions = [
            "输入是一张数字 7 的灰度图，像素越深，数值越大。",
            "C1 使用 6 个具体 5×5 卷积核扫描输入，每个核生成一张特征图。",
            "激活保留有效正响应，S2 把每张特征图从 28×28 缩小到 14×14。",
            "C3 继续组合 S2 的线索，S4 得到 16 张 5×5 小特征图。",
            "分类头把 5×5×16 展平成 400 个值，再整理成 C5 和 F6 的证据向量。",
            "输出层把 84 个证据连接到 10 个数字概率，数字 7 最高。",
        ]

        active_panel = None
        for index, panel in enumerate(panels):
            panel.move_to(DOWN * 0.18)
            new_note = self.make_note(captions[index])
            new_note.move_to(note)
            route_anims = self.route_active_anims(route, index)
            if active_panel is None:
                self.play(*route_anims, FadeIn(panel.shell, shift=UP * 0.08), Transform(note, new_note), run_time=0.62)
            else:
                self.play(*route_anims, Transform(note, new_note), FadeOut(active_panel.full_group, shift=LEFT * 0.12), FadeIn(panel.shell, shift=RIGHT * 0.12), run_time=0.6)
            self.reveal_panel_steps(panel, index)
            active_panel = panel

        output_panel = panels[-1]
        winner = SurroundingRectangle(output_panel.winner_group, color=ORANGE, buff=0.08, stroke_width=4)
        final_note = self.make_note("主线统一起来：图像 → 局部特征 → 组合特征 → 分类证据 → 预测为 7。")
        final_note.move_to(note)
        result = Text("预测结果：7", font_size=31, weight=BOLD)
        result.set_color(ORANGE)
        result.move_to(output_panel.box.get_top() + DOWN * 0.74 + RIGHT * 2.35)
        self.play(ShowCreation(winner), FadeIn(result, shift=UP * 0.05), Transform(note, final_note), run_time=0.7)
        self.play(Flash(output_panel.winner_group.get_center(), color=ORANGE, flash_radius=0.82), run_time=0.65)
        self.wait(0.9)

    def make_route_bar(self):
        data = [
            ("输入", "32×32×1", BLUE),
            ("C1", "28×28×6", PURPLE),
            ("激活+S2", "14×14×6", GREEN),
            ("C3+S4", "5×5×16", PURPLE),
            ("C5+F6", "84", GREEN),
            ("输出", "10", ORANGE),
        ]
        nodes = VGroup()
        for title, shape, color in data:
            box = RoundedRectangle(
                width=1.58,
                height=0.58,
                corner_radius=0.1,
                stroke_color=LINE,
                stroke_width=1.7,
                fill_color=PAPER,
                fill_opacity=1,
            )
            label = Text(title, font_size=14, weight=BOLD)
            label.set_color(color)
            shape_label = Text(shape, font_size=9.5, weight=BOLD)
            shape_label.set_color(MUTED)
            text = VGroup(label, shape_label).arrange(DOWN, buff=0.025)
            text.move_to(box.get_center())
            node = VGroup(box, text)
            node.box = box
            node.color = color
            nodes.add(node)
        nodes.arrange(RIGHT, buff=0.22)

        arrows = VGroup()
        for left, right in zip(nodes[:-1], nodes[1:]):
            arrows.add(Arrow(
                left.get_right() + RIGHT * 0.02,
                right.get_left() + LEFT * 0.02,
                buff=0.04,
                stroke_width=2.6,
                color="#b9c8d8",
                max_tip_length_to_length_ratio=0.18,
            ))
        group = VGroup(nodes, arrows)
        group.nodes = nodes
        group.arrows = arrows
        return group

    def route_active_anims(self, route, active_index):
        anims = []
        for index, node in enumerate(route.nodes):
            if index == active_index:
                anims.append(node.animate.set_opacity(1))
                anims.append(node.box.animate.set_stroke(node.color, width=3.3).set_fill("#fffaf6", opacity=1))
            else:
                anims.append(node.animate.set_opacity(0.36))
                anims.append(node.box.animate.set_stroke(LINE, width=1.5).set_fill(PAPER, opacity=1))
        for index, arrow in enumerate(route.arrows):
            if index == active_index - 1:
                anims.append(arrow.animate.set_color(route.nodes[active_index].color).set_opacity(0.95))
            else:
                anims.append(arrow.animate.set_color("#b9c8d8").set_opacity(0.26))
        return anims

    def make_big_panel(self, title, shape, color):
        box = RoundedRectangle(
            width=9.9,
            height=4.62,
            corner_radius=0.15,
            stroke_color=LINE,
            stroke_width=2,
            fill_color=PAPER,
            fill_opacity=1,
        )
        mini = Text(title, font_size=23, weight=BOLD)
        mini.set_color(color)
        shape_text = Text(shape, font_size=15, weight=BOLD)
        shape_text.set_color(MUTED)
        head = VGroup(mini, shape_text).arrange(RIGHT, buff=0.18)
        head.move_to(box.get_top() + DOWN * 0.34)
        group = VGroup(box, head)
        group.box = box
        group.color = color
        group.shell = VGroup(box, head)
        group.full_group = VGroup(group.shell)
        group.steps = []
        return group

    def make_flow_arrow(self, start, end, color="#b9c8d8"):
        return Arrow(
            start,
            end,
            buff=0.12,
            stroke_width=4,
            color=color,
            max_tip_length_to_length_ratio=0.15,
        )

    def make_input_panel(self):
        panel = self.make_big_panel("输入图像", "32×32×1", BLUE)
        digit = self.make_digit_from_rows(rows=22, cols=22, cell_size=0.074)
        digit.move_to(panel.box.get_center() + LEFT * 2.8 + DOWN * 0.08)
        pixel_grid = self.make_digit_from_rows(rows=12, cols=12, cell_size=0.055)
        pixel_grid.move_to(panel.box.get_center() + RIGHT * 1.35 + DOWN * 0.1)
        label_left = Text("数字 7 的灰度图", font_size=17, weight=BOLD).set_color(BLUE)
        label_left.next_to(digit, DOWN, buff=0.16)
        label_right = Text("像素矩阵：深色表示较大的亮度值", font_size=17, weight=BOLD).set_color(MUTED)
        label_right.next_to(pixel_grid, DOWN, buff=0.16)
        arrow = self.make_flow_arrow(digit.get_right() + RIGHT * 0.2, pixel_grid.get_left() + LEFT * 0.2, BLUE)
        panel.steps = [
            VGroup(digit, label_left),
            arrow,
            VGroup(pixel_grid, label_right),
        ]
        panel.visual = digit
        return panel

    def make_c1_panel(self):
        panel = self.make_big_panel("C1 卷积层", "6 个 5×5 卷积核 → 6 张 28×28 特征图", PURPLE)
        input_digit = self.make_digit_from_rows(rows=14, cols=14, cell_size=0.052)
        input_digit.move_to(panel.box.get_center() + LEFT * 4.05 + DOWN * 0.02)
        kernels = self.make_large_kernel_grid()
        kernels.move_to(panel.box.get_center() + LEFT * 1.05 + DOWN * 0.02)
        features = self.make_large_feature_grid()
        features.move_to(panel.box.get_center() + RIGHT * 3.0 + DOWN * 0.02)
        a1 = self.make_flow_arrow(input_digit.get_right() + RIGHT * 0.12, kernels.get_left() + LEFT * 0.12, PURPLE)
        a2 = self.make_flow_arrow(kernels.get_right() + RIGHT * 0.12, features.get_left() + LEFT * 0.12, PURPLE)
        panel.steps = [
            input_digit,
            a1,
            kernels,
            a2,
            features,
        ]
        panel.visual = features
        return panel

    def make_s2_panel(self):
        panel = self.make_big_panel("激活 + S2 池化", "28×28×6 → 14×14×6", GREEN)
        before = self.make_map_stack("c1", 6, 0, rows=10, cols=10, color=PURPLE, size=1.18)
        after = self.make_map_stack("s2", 6, 0, rows=7, cols=7, color=GREEN, size=1.18)
        before.move_to(panel.box.get_center() + LEFT * 2.55 + DOWN * 0.05)
        after.move_to(panel.box.get_center() + RIGHT * 2.55 + DOWN * 0.05)
        arrow = self.make_flow_arrow(before.get_right() + RIGHT * 0.3, after.get_left() + LEFT * 0.3, GREEN)
        label1 = Text("激活后特征图", font_size=17, weight=BOLD).set_color(PURPLE)
        label2 = Text("S2 输出：更小但保留主要响应", font_size=17, weight=BOLD).set_color(GREEN)
        label1.next_to(before, DOWN, buff=0.18)
        label2.next_to(after, DOWN, buff=0.18)
        panel.steps = [
            VGroup(before, label1),
            arrow,
            VGroup(after, label2),
        ]
        panel.visual = after
        return panel

    def make_c3_s4_panel(self):
        panel = self.make_big_panel("C3 + S4", "16 个组合卷积核 → 16 张 5×5 特征图", PURPLE)
        s2 = self.make_map_stack("s2", 6, 0, rows=7, cols=7, color=GREEN, size=0.98)
        kernel = self.wrap_tiny_map(self.make_matrix(C3_REP_KERNEL, cell_size=0.18, font_size=12), "代表 C3 卷积核", PURPLE)
        c3 = self.make_map_stack("c3", 16, 15, rows=8, cols=8, color=PURPLE, size=0.98)
        s4 = self.make_map_stack("c3", 16, 15, rows=5, cols=5, color=GREEN, size=0.98)
        row = VGroup(s2, kernel, c3, s4).arrange(RIGHT, buff=0.5)
        row.move_to(panel.box.get_center() + DOWN * 0.02)
        arrows = VGroup()
        for left, right in zip(row[:-1], row[1:]):
            arrows.add(self.make_flow_arrow(left.get_right() + RIGHT * 0.05, right.get_left() + LEFT * 0.05, PURPLE))
        labels = VGroup(
            Text("S2 输入", font_size=15, weight=BOLD).set_color(GREEN).next_to(s2, DOWN, buff=0.14),
            Text("组合线索", font_size=15, weight=BOLD).set_color(PURPLE).next_to(kernel, DOWN, buff=0.14),
            Text("C3 输出", font_size=15, weight=BOLD).set_color(PURPLE).next_to(c3, DOWN, buff=0.14),
            Text("S4 输出", font_size=15, weight=BOLD).set_color(GREEN).next_to(s4, DOWN, buff=0.14),
        )
        panel.steps = [
            VGroup(s2, labels[0]),
            arrows[0],
            VGroup(kernel, labels[1]),
            arrows[1],
            VGroup(c3, labels[2]),
            arrows[2],
            VGroup(s4, labels[3]),
        ]
        panel.visual = s4
        return panel

    def make_dense_panel(self):
        panel = self.make_big_panel("分类头", "5×5×16 → 400 → C5 120 → F6 84", GREEN)
        s4 = self.make_map_stack("c3", 16, 15, rows=5, cols=5, color=GREEN, size=0.86)
        flat = self.make_flat_vector().scale(1.2)
        c5 = self.make_dense_vector(120, 12, "C5 120", GREEN, hot=[7, 18, 42, 73, 96]).scale(1.05)
        f6 = self.make_dense_vector(84, 12, "F6 84", ORANGE, hot=[6, 21, 37, 58, 70]).scale(1.05)
        row = VGroup(s4, flat, c5, f6).arrange(RIGHT, buff=0.55)
        row.move_to(panel.box.get_center() + DOWN * 0.03)
        arrows = VGroup()
        for left, right in zip(row[:-1], row[1:]):
            arrows.add(self.make_flow_arrow(left.get_right() + RIGHT * 0.08, right.get_left() + LEFT * 0.08, GREEN))
        labels = VGroup(
            Text("S4 输出", font_size=15, weight=BOLD).set_color(GREEN).next_to(s4, DOWN, buff=0.16),
            Text("展平 400", font_size=15, weight=BOLD).set_color(BLUE).next_to(flat, DOWN, buff=0.16),
            Text("高层证据", font_size=15, weight=BOLD).set_color(GREEN).next_to(c5, DOWN, buff=0.16),
            Text("分类前向量", font_size=15, weight=BOLD).set_color(ORANGE).next_to(f6, DOWN, buff=0.16),
        )
        panel.steps = [
            VGroup(s4, labels[0]),
            arrows[0],
            VGroup(flat, labels[1]),
            arrows[1],
            VGroup(c5, labels[2]),
            arrows[2],
            VGroup(f6, labels[3]),
        ]
        panel.visual = f6
        return panel

    def make_output_panel(self):
        panel = self.make_big_panel("输出层", "84 → 10 个概率", ORANGE)
        f6 = self.make_dense_vector(84, 12, "F6 84", ORANGE, hot=[6, 21, 37, 58, 70]).scale(1.15)
        chart = self.make_probability_chart().scale(1.55)
        f6.move_to(panel.box.get_center() + LEFT * 2.55 + DOWN * 0.08)
        chart.move_to(panel.box.get_center() + RIGHT * 2.35 + DOWN * 0.08)
        arrow = self.make_flow_arrow(f6.get_right() + RIGHT * 0.25, chart.get_left() + LEFT * 0.25, ORANGE)
        label1 = Text("84 个分类前证据", font_size=17, weight=BOLD).set_color(ORANGE)
        label2 = Text("0-9 概率，7 最高", font_size=17, weight=BOLD).set_color(ORANGE)
        label1.next_to(f6, DOWN, buff=0.16)
        label2.next_to(chart, DOWN, buff=0.16)
        panel.steps = [
            VGroup(f6, label1),
            arrow,
            VGroup(chart.frame, chart.base_labels, label2),
            VGroup(*chart.bars),
            chart.labels,
        ]
        panel.visual = chart
        panel.bars = chart.bars
        panel.prob_labels = chart.labels
        panel.winner_group = chart.winner_group
        return panel

    def reveal_panel_steps(self, panel, index):
        for step_index, step in enumerate(panel.steps):
            if index == 5 and step_index == 3:
                self.play(LaggedStart(*[GrowFromEdge(bar, DOWN) for bar in panel.bars], lag_ratio=0.045), run_time=0.75)
                panel.full_group.add(step)
            elif index == 5 and step_index == 4:
                self.play(FadeIn(panel.prob_labels, shift=UP * 0.04), run_time=0.24)
                panel.full_group.add(step)
            elif isinstance(step, Arrow):
                self.play(ShowCreation(step), run_time=0.32)
                panel.full_group.add(step)
            else:
                self.play(FadeIn(step, shift=UP * 0.06), run_time=0.38)
                panel.full_group.add(step)
        if index != 5:
            self.play(Flash(panel.visual.get_center(), color=panel.color, flash_radius=0.72), run_time=0.34)

    def make_flow_row(self):
        stages = VGroup(
            self.make_input_stage(),
            self.make_c1_stage(),
            self.make_s2_stage(),
            self.make_c3_s4_stage(),
            self.make_dense_stage(),
            self.make_output_stage(),
        )
        stages.arrange(RIGHT, buff=0.22)
        stages.scale(0.92)
        stages.move_to(DOWN * 0.08)

        connectors = VGroup()
        for left, right in zip(stages[:-1], stages[1:]):
            connector = Arrow(
                left.get_right() + RIGHT * 0.04,
                right.get_left() + LEFT * 0.04,
                buff=0.06,
                stroke_width=4,
                color="#b9c8d8",
                max_tip_length_to_length_ratio=0.17,
            )
            connectors.add(connector)

        group = VGroup(stages, connectors)
        group.stages = stages
        group.connectors = connectors
        return group

    def make_stage_shell(self, title, shape, color, width=1.82, height=3.88):
        box = RoundedRectangle(
            width=width,
            height=height,
            corner_radius=0.12,
            stroke_color=LINE,
            stroke_width=2,
            fill_color=PAPER,
            fill_opacity=1,
        )
        head = Text(title, font_size=20, weight=BOLD)
        head.set_color(color)
        shape_text = Text(shape, font_size=13, weight=BOLD)
        shape_text.set_color(MUTED)
        head_group = VGroup(head, shape_text).arrange(DOWN, buff=0.04)
        head_group.move_to(box.get_top() + DOWN * 0.38)
        group = VGroup(box, head_group)
        group.box = box
        group.color = color
        return group

    def attach_visual(self, shell, visual, foot_text):
        visual.move_to(shell.box.get_center() + DOWN * 0.06)
        foot = Text(foot_text, font_size=11.5, weight=BOLD)
        foot.set_color(MUTED)
        foot.move_to(shell.box.get_bottom() + UP * 0.25)
        shell.add(visual, foot)
        shell.visual = visual
        return shell

    def make_input_stage(self):
        shell = self.make_stage_shell("输入图像", "32×32×1", BLUE)
        visual = self.make_digit_from_rows(rows=16, cols=16, cell_size=0.06)
        return self.attach_visual(shell, visual, "数字 7 灰度图")

    def make_c1_stage(self):
        shell = self.make_stage_shell("C1", "28×28×6", PURPLE, width=2.18)
        kernels = self.make_kernel_strip()
        features = self.make_feature_cards([0, 1, 2, 3, 4, 5], rows=8, cols=8, mode="c1", scale=0.44)
        features.next_to(kernels, DOWN, buff=0.16)
        visual = VGroup(kernels, features)
        return self.attach_visual(shell, visual, "6 个核 → 6 张特征图")

    def make_s2_stage(self):
        shell = self.make_stage_shell("激活 + S2", "14×14×6", GREEN, width=1.9)
        before = self.make_feature_map(0, rows=8, cols=8, mode="c1", cell_size=0.055)
        after = self.make_feature_map(0, rows=7, cols=7, mode="s2", cell_size=0.062)
        before_card = self.wrap_tiny_map(before, "激活后", PURPLE)
        after_card = self.wrap_tiny_map(after, "S2", GREEN)
        arrow = Arrow(before_card.get_right() + RIGHT * 0.03, after_card.get_left() + LEFT * 0.03, buff=0.04, stroke_width=2.4, color="#bcc8d6")
        pair = VGroup(before_card, arrow, after_card).arrange(RIGHT, buff=0.1)
        stack = self.make_map_stack("s2", 6, 0, rows=7, cols=7, color=GREEN, size=0.86)
        stack.next_to(pair, DOWN, buff=0.18)
        visual = VGroup(pair, stack)
        return self.attach_visual(shell, visual, "宽高减半，张数不变")

    def make_c3_s4_stage(self):
        shell = self.make_stage_shell("C3 + S4", "5×5×16", PURPLE, width=2.05)
        kernel = self.make_matrix(C3_REP_KERNEL, cell_size=0.125, font_size=9)
        kernel_card = self.wrap_tiny_map(kernel, "代表 5×5 核", PURPLE)
        c3_stack = self.make_map_stack("c3", 16, 15, rows=8, cols=8, color=PURPLE, size=0.86)
        s4_stack = self.make_map_stack("c3", 16, 15, rows=5, cols=5, color=GREEN, size=0.86)
        route = VGroup(kernel_card, c3_stack, s4_stack).arrange(DOWN, buff=0.14)
        return self.attach_visual(shell, route, "16 张组合特征")

    def make_dense_stage(self):
        shell = self.make_stage_shell("分类头", "400 → 120 → 84", GREEN, width=2.12)
        s4_stack = self.make_map_stack("c3", 16, 15, rows=5, cols=5, color=GREEN, size=0.78)
        flat = self.make_flat_vector()
        c5 = self.make_dense_vector(120, 12, "C5 120", GREEN, hot=[7, 18, 42, 73, 96])
        f6 = self.make_dense_vector(84, 12, "F6 84", ORANGE, hot=[6, 21, 37, 58, 70])
        row = VGroup(flat, c5, f6).arrange(RIGHT, buff=0.12)
        s4_stack.next_to(row, UP, buff=0.16)
        visual = VGroup(s4_stack, row)
        return self.attach_visual(shell, visual, "小图展平成证据")

    def make_output_stage(self):
        shell = self.make_stage_shell("输出层", "10 个概率", ORANGE)
        chart = self.make_probability_chart()
        shell = self.attach_visual(shell, chart, "最高概率是 7")
        shell.bars = chart.bars
        shell.prob_labels = chart.labels
        shell.winner_group = chart.winner_group
        return shell

    def activate_card(self, stage, color):
        return AnimationGroup(
            stage.box.animate.set_stroke(color, width=3.8).set_fill("#fffaf6", opacity=1),
            Flash(stage.get_center(), color=color, flash_radius=0.68),
            lag_ratio=0,
        )

    def make_note(self, text):
        box = RoundedRectangle(
            width=11.15,
            height=0.58,
            corner_radius=0.12,
            stroke_color=LINE,
            stroke_width=2,
            fill_color=PAPER,
            fill_opacity=1,
        )
        label = Text(text, font_size=20, weight=BOLD)
        label.set_color(BLUE)
        label.move_to(box.get_center())
        return VGroup(box, label)

    def make_digit_from_rows(self, rows=16, cols=16, cell_size=0.06):
        grid = VGroup()
        for row in range(rows):
            for col in range(cols):
                src_r = int(row / rows * len(SOURCE_IMAGE))
                src_c = int(col / cols * len(SOURCE_IMAGE[0]))
                value = SOURCE_IMAGE[src_r][src_c]
                color = blend_hex("#f8fafc", BLUE, value)
                cell = RoundedRectangle(
                    width=cell_size,
                    height=cell_size,
                    corner_radius=cell_size * 0.12,
                    stroke_color="#d8e1eb",
                    stroke_width=0.32,
                    fill_color=color,
                    fill_opacity=1,
                )
                cell.move_to([
                    (col - (cols - 1) / 2) * (cell_size + 0.006),
                    ((rows - 1) / 2 - row) * (cell_size + 0.006),
                    0,
                ])
                grid.add(cell)
        border = SurroundingRectangle(grid, color=BLUE, buff=0.045, stroke_width=1.5)
        return VGroup(border, grid)

    def make_kernel_strip(self):
        strip = VGroup()
        for idx, kernel in enumerate(C1_KERNELS):
            matrix = self.make_matrix(kernel["values"], cell_size=0.06, font_size=5.5)
            label = Text(str(idx + 1), font_size=8, weight=BOLD)
            label.set_color(PURPLE)
            card = VGroup(matrix, label).arrange(DOWN, buff=0.025)
            strip.add(card)
        strip.arrange(RIGHT, buff=0.055)
        return strip

    def make_large_kernel_grid(self):
        cards = VGroup()
        for idx, kernel in enumerate(C1_KERNELS):
            matrix = self.make_matrix(kernel["values"], cell_size=0.105, font_size=7.8)
            label = Text(str(idx + 1).zfill(2) + " " + kernel["title"], font_size=9.5, weight=BOLD)
            label.set_color(PURPLE)
            box = RoundedRectangle(
                width=0.8,
                height=0.95,
                corner_radius=0.06,
                stroke_color=PURPLE,
                stroke_width=1.2,
                fill_color=PAPER,
                fill_opacity=1,
            )
            label.move_to(box.get_top() + DOWN * 0.1)
            matrix.move_to(box.get_center() + DOWN * 0.08)
            card = VGroup(box, label, matrix)
            row = idx // 3
            col = idx % 3
            card.move_to(RIGHT * (col - 1) * 0.9 + DOWN * (row - 0.5) * 1.08)
            cards.add(card)
        return cards

    def make_large_feature_grid(self):
        cards = VGroup()
        for idx, kernel in enumerate(C1_KERNELS):
            feature = self.make_feature_map(idx, rows=8, cols=8, mode="c1", cell_size=0.052)
            label = Text(kernel["summary"], font_size=9.2, weight=BOLD)
            label.set_color(MUTED)
            box = RoundedRectangle(
                width=0.76,
                height=0.88,
                corner_radius=0.06,
                stroke_color=PURPLE,
                stroke_width=1.15,
                fill_color=PAPER,
                fill_opacity=1,
            )
            feature.move_to(box.get_center() + UP * 0.06)
            label.move_to(box.get_bottom() + UP * 0.09)
            card = VGroup(box, feature, label)
            row = idx // 3
            col = idx % 3
            card.move_to(RIGHT * (col - 1) * 0.86 + DOWN * (row - 0.5) * 1.0)
            cards.add(card)
        return cards

    def make_matrix(self, values, cell_size=0.1, font_size=8):
        group = VGroup()
        rows = len(values)
        cols = len(values[0])
        for row in range(rows):
            for col in range(cols):
                value = values[row][col]
                if value > 0:
                    fill = "#e8f7ef"
                    stroke = GREEN
                    text_color = GREEN
                elif value < 0:
                    fill = "#fff1ec"
                    stroke = ORANGE
                    text_color = ORANGE
                else:
                    fill = "#f5f7fa"
                    stroke = "#cbd5e1"
                    text_color = MUTED
                rect = RoundedRectangle(
                    width=cell_size,
                    height=cell_size,
                    corner_radius=cell_size * 0.09,
                    stroke_color=stroke,
                    stroke_width=0.55,
                    fill_color=fill,
                    fill_opacity=1,
                )
                rect.move_to([
                    (col - (cols - 1) / 2) * (cell_size + 0.006),
                    ((rows - 1) / 2 - row) * (cell_size + 0.006),
                    0,
                ])
                label = Text(str(value), font_size=font_size, weight=BOLD)
                label.set_color(text_color)
                label.move_to(rect.get_center())
                group.add(rect, label)
        return group

    def wrap_tiny_map(self, mobject, title, color):
        box = RoundedRectangle(
            width=max(0.72, mobject.get_width() + 0.18),
            height=mobject.get_height() + 0.38,
            corner_radius=0.07,
            stroke_color=color,
            stroke_width=1.2,
            fill_color=PAPER,
            fill_opacity=1,
        )
        label = Text(title, font_size=9.5, weight=BOLD)
        label.set_color(color)
        mobject.move_to(box.get_center() + DOWN * 0.07)
        label.move_to(box.get_top() + DOWN * 0.1)
        return VGroup(box, label, mobject)

    def make_feature_map(self, index, rows=8, cols=8, mode="c1", cell_size=0.055):
        group = VGroup()
        if mode in ["c1", "s2"]:
            matrix = feature_matrix(index)
            value_fn = lambda r, c: pooled_value(matrix, r, c, rows, cols)
            hot = PURPLE if mode == "c1" else GREEN
        else:
            combo = C3_COMBINATIONS[index % len(C3_COMBINATIONS)]
            value_fn = lambda r, c: c3_value(combo, r, c, rows, cols)
            hot = PURPLE if rows > 5 else GREEN
        for row in range(rows):
            for col in range(cols):
                value = value_fn(row, col)
                fill = blend_hex("#eef3f9", hot, value)
                rect = RoundedRectangle(
                    width=cell_size,
                    height=cell_size,
                    corner_radius=cell_size * 0.11,
                    stroke_width=0,
                    fill_color=fill,
                    fill_opacity=1,
                )
                rect.move_to([
                    (col - (cols - 1) / 2) * (cell_size + 0.006),
                    ((rows - 1) / 2 - row) * (cell_size + 0.006),
                    0,
                ])
                group.add(rect)
        return group

    def make_feature_cards(self, indexes, rows, cols, mode, scale=0.44):
        cards = VGroup()
        for index in indexes:
            card = self.wrap_tiny_map(self.make_feature_map(index, rows=rows, cols=cols, mode=mode, cell_size=0.052), C1_KERNELS[index]["summary"], PURPLE)
            card.scale(scale)
            cards.add(card)
        cards.arrange(RIGHT, buff=0.04)
        return cards

    def make_map_stack(self, mode, count, index, rows, cols, color, size=0.86):
        sheets = VGroup()
        for layer in range(4, -1, -1):
            sheet = RoundedRectangle(
                width=size,
                height=size,
                corner_radius=0.07,
                stroke_color=color,
                stroke_width=1.2,
                fill_color=PAPER,
                fill_opacity=1,
            )
            sheet.shift(RIGHT * layer * 0.035 + UP * layer * 0.028)
            sheets.add(sheet)
        front_map = self.make_feature_map(index, rows=rows, cols=cols, mode=mode, cell_size=size / (max(rows, cols) + 2.7))
        front_map.move_to(sheets[-1].get_center())
        count_label = Text("×" + str(count), font_size=14, weight=BOLD)
        count_label.set_color(color)
        count_label.move_to(sheets.get_right() + RIGHT * 0.18 + DOWN * 0.12)
        return VGroup(sheets, front_map, count_label)

    def make_flat_vector(self):
        dots = VGroup()
        cols = 20
        rows = 5
        for row in range(rows):
            for col in range(cols):
                idx = row * cols + col
                value = s4_flatten_value(idx * 4)
                dot = RoundedRectangle(
                    width=0.035,
                    height=0.035,
                    corner_radius=0.006,
                    stroke_width=0,
                    fill_color=blend_hex("#edf2f7", BLUE, value),
                    fill_opacity=1,
                )
                dot.move_to([(col - (cols - 1) / 2) * 0.043, ((rows - 1) / 2 - row) * 0.043, 0])
                dots.add(dot)
        label = Text("400", font_size=10, weight=BOLD)
        label.set_color(BLUE)
        label.next_to(dots, DOWN, buff=0.035)
        return VGroup(dots, label)

    def make_dense_vector(self, count, cols, label_text, color, hot=None):
        hot = hot or []
        rows = int(np.ceil(count / cols))
        dots = VGroup()
        for index in range(count):
            row = index // cols
            col = index % cols
            value = (np.sin((index + 1) * 1.17) + 1) / 2
            dot_color = color if index in hot else blend_hex("#e9eef5", color, 0.25 + value * 0.45)
            dot = Dot(radius=0.022, color=dot_color)
            dot.move_to([(col - (cols - 1) / 2) * 0.053, ((rows - 1) / 2 - row) * 0.053, 0])
            dots.add(dot)
        box = RoundedRectangle(
            width=max(0.78, dots.get_width() + 0.16),
            height=dots.get_height() + 0.3,
            corner_radius=0.07,
            stroke_color=color,
            stroke_width=1.2,
            fill_color=PAPER,
            fill_opacity=1,
        )
        dots.move_to(box.get_center() + UP * 0.04)
        label = Text(label_text, font_size=9.5, weight=BOLD)
        label.set_color(color)
        label.move_to(box.get_bottom() + UP * 0.08)
        return VGroup(box, dots, label)

    def make_probability_chart(self):
        frame = RoundedRectangle(
            width=1.28,
            height=1.38,
            corner_radius=0.08,
            stroke_color=LINE,
            stroke_width=1.3,
            fill_color=PAPER,
            fill_opacity=1,
        )
        bars = []
        labels = VGroup()
        winner_group = VGroup()
        max_value = max(PROBABILITIES)
        for digit, value in enumerate(PROBABILITIES):
            height = 0.16 + value / max_value * 0.82
            color = ORANGE if digit == 7 else "#8fb2d9"
            bar = RoundedRectangle(
                width=0.075,
                height=height,
                corner_radius=0.018,
                stroke_width=0,
                fill_color=color,
                fill_opacity=0.96,
            )
            bar.move_to(frame.get_center() + LEFT * 0.48 + RIGHT * digit * 0.105 + DOWN * 0.38 + UP * height / 2)
            digit_label = Text(str(digit), font_size=7.4, weight=BOLD)
            digit_label.set_color(color if digit == 7 else BLUE)
            digit_label.next_to(bar, DOWN, buff=0.025)
            labels.add(digit_label)
            bars.append(bar)
            if digit == 7:
                percent = Text("58%", font_size=9, weight=BOLD)
                percent.set_color(ORANGE)
                percent.next_to(bar, UP, buff=0.035)
                labels.add(percent)
                winner_group.add(bar, digit_label, percent)
        label = Text("输出概率", font_size=11, weight=BOLD)
        label.set_color(ORANGE)
        label.next_to(frame, DOWN, buff=0.07)
        bar_group = VGroup(*bars)
        group = VGroup(frame, bar_group, labels, label)
        group.frame = frame
        group.base_labels = VGroup(label)
        group.bars = bars
        group.labels = labels
        group.winner_group = winner_group
        return group
