from manimlib import *


IMAGE = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
]

KERNEL = [
    [-1, -1, -1],
    [2, 2, 2],
    [-1, -1, -1],
]


class ConvolutionScanFeatureMap(Scene):
    default_camera_config = {
        "background_color": "#f8fafc",
    }

    def construct(self):
        title = Text("横线卷积核扫完整张数字 7", font_size=36, weight=BOLD)
        title.set_color("#27446e")
        title.to_edge(UP, buff=0.28)

        subtitle = Text("每停一个位置，就计算一个响应分数，并填进特征图", font_size=21, weight=BOLD)
        subtitle.set_color("#64748b")
        subtitle.next_to(title, DOWN, buff=0.08)

        image_grid = self.make_image_grid(IMAGE)
        image_label = self.label("输入图像：数字 7", "#27446e")
        image_group = VGroup(image_label, image_grid)
        image_grid.next_to(image_label, DOWN, buff=0.18)
        image_group.move_to(LEFT * 3.45 + UP * 0.05)

        feature_values = self.response_map()
        feature_grid = self.make_feature_grid(feature_values)
        feature_label = self.label("特征图：横线响应", "#228d5c")
        feature_group = VGroup(feature_label, feature_grid)
        feature_grid.next_to(feature_label, DOWN, buff=0.18)
        feature_group.move_to(RIGHT * 3.18 + UP * 0.05)

        kernel_badge = self.make_kernel_badge()
        kernel_badge.next_to(image_grid, DOWN, buff=0.28)

        score_box = RoundedRectangle(
            width=4.85,
            height=0.72,
            corner_radius=0.12,
            stroke_color="#f07e47",
            stroke_width=3,
            fill_color="#fff7ed",
            fill_opacity=1,
        )
        score_text = Text("等待扫描", font_size=24, weight=BOLD)
        score_text.set_color("#8a4b15")
        score_text.move_to(score_box.get_center())
        score_group = VGroup(score_box, score_text)
        score_group.to_edge(DOWN, buff=0.28)

        self.play(
            FadeIn(title, shift=DOWN * 0.1),
            FadeIn(subtitle, shift=DOWN * 0.1),
            FadeIn(image_group, shift=RIGHT * 0.14),
            FadeIn(feature_group, shift=LEFT * 0.14),
            FadeIn(kernel_badge, shift=UP * 0.12),
            FadeIn(score_group),
            run_time=0.9,
        )

        scan_frame = self.window_frame(image_grid, 0, 0)
        kernel_overlay = self.kernel_overlay(image_grid, 0, 0)
        self.play(ShowCreation(scan_frame), FadeIn(kernel_overlay, scale=0.98), run_time=0.35)

        previous_score = score_text
        first = True
        for index, (row, col, score) in enumerate(self.scan_positions(feature_values)):
            target_frame = self.window_frame(image_grid, row, col)
            target_overlay = self.kernel_overlay(image_grid, row, col)
            feature_cell = feature_grid.cells[row][col]
            feature_value = Text(self.fmt(score), font_size=25, weight=BOLD)
            feature_value.set_color("#ffffff" if score >= 3 else "#27446e")
            feature_value.move_to(feature_cell.get_center())

            new_score = Text(f"位置 ({row + 1},{col + 1})  响应 = {self.fmt(score)}", font_size=23, weight=BOLD)
            new_score.set_color("#8a4b15")
            new_score.move_to(score_box.get_center())

            if first:
                self.play(
                    ReplacementTransform(scan_frame, target_frame),
                    ReplacementTransform(kernel_overlay, target_overlay),
                    FadeOut(previous_score),
                    FadeIn(new_score),
                    run_time=0.2,
                )
                first = False
            else:
                self.play(
                    ReplacementTransform(scan_frame, target_frame),
                    ReplacementTransform(kernel_overlay, target_overlay),
                    FadeOut(previous_score),
                    FadeIn(new_score),
                    run_time=0.22,
                )
            scan_frame = target_frame
            kernel_overlay = target_overlay
            previous_score = new_score

            hot = score >= 3
            fill = "#228d5c" if hot else "#e8eef7"
            stroke = "#228d5c" if hot else "#cbd5e1"
            fill_rect = RoundedRectangle(
                width=feature_cell.get_width(),
                height=feature_cell.get_height(),
                corner_radius=0.08,
                stroke_color=stroke,
                stroke_width=2.5,
                fill_color=fill,
                fill_opacity=0.92 if hot else 1,
            )
            fill_rect.move_to(feature_cell.get_center())
            self.play(
                Transform(feature_cell[0], fill_rect),
                FadeIn(feature_value, scale=0.9),
                run_time=0.18,
            )
            feature_cell.add(feature_value)

        final_note = Text("高响应位置连起来，就是横线卷积核找到的线索", font_size=19, weight=BOLD)
        final_note.set_color("#228d5c")
        final_note.move_to(score_box.get_center())
        self.play(
            FadeOut(previous_score),
            FadeIn(final_note),
            Flash(feature_grid.get_center(), color="#228d5c", flash_radius=1.6),
            run_time=0.8,
        )
        self.wait(0.8)

    def label(self, text, color):
        mob = Text(text, font_size=24, weight=BOLD)
        mob.set_color(color)
        return mob

    def make_image_grid(self, matrix, cell_size=0.48):
        grid = VGroup()
        cells = []
        for row_index, row in enumerate(matrix):
            row_cells = []
            for col_index, value in enumerate(row):
                rect = RoundedRectangle(
                    width=cell_size,
                    height=cell_size,
                    corner_radius=0.045,
                    stroke_color="#d6dee9",
                    stroke_width=1.2,
                    fill_color=self.pixel_fill(value),
                    fill_opacity=1,
                )
                label = Text(self.fmt(value), font_size=14, weight=BOLD)
                label.set_color("#ffffff" if value >= 0.95 else "#64748b")
                cell = VGroup(rect, label)
                x_offset = (len(row) - 1) / 2
                y_offset = (len(matrix) - 1) / 2
                cell.move_to([(col_index - x_offset) * (cell_size + 0.035), (y_offset - row_index) * (cell_size + 0.035), 0])
                grid.add(cell)
                row_cells.append(cell)
            cells.append(row_cells)
        grid.cells = cells
        grid.cell_size = cell_size
        return grid

    def make_feature_grid(self, values, cell_size=0.58):
        grid = VGroup()
        cells = []
        for row_index, row in enumerate(values):
            row_cells = []
            for col_index, _ in enumerate(row):
                rect = RoundedRectangle(
                    width=cell_size,
                    height=cell_size,
                    corner_radius=0.075,
                    stroke_color="#cbd5e1",
                    stroke_width=2,
                    fill_color="#f1f5f9",
                    fill_opacity=1,
                )
                cell = VGroup(rect)
                x_offset = (len(row) - 1) / 2
                y_offset = (len(values) - 1) / 2
                cell.move_to([(col_index - x_offset) * (cell_size + 0.05), (y_offset - row_index) * (cell_size + 0.05), 0])
                grid.add(cell)
                row_cells.append(cell)
            cells.append(row_cells)
        grid.cells = cells
        return grid

    def make_kernel_badge(self):
        group = VGroup()
        label = Text("横线卷积核", font_size=18, weight=BOLD)
        label.set_color("#228d5c")
        mini = VGroup()
        for row_index, row in enumerate(KERNEL):
            for col_index, value in enumerate(row):
                rect = RoundedRectangle(
                    width=0.3,
                    height=0.3,
                    corner_radius=0.035,
                    stroke_color="#228d5c" if value > 0 else "#27446e",
                    stroke_width=1.2,
                    fill_color="#e8f7ef" if value > 0 else "#eef3f8",
                    fill_opacity=1,
                )
                text = Text(self.signed(value), font_size=10, weight=BOLD)
                text.set_color("#228d5c" if value > 0 else "#27446e")
                cell = VGroup(rect, text)
                cell.move_to([(col_index - 1) * 0.32, (1 - row_index) * 0.32, 0])
                mini.add(cell)
        mini.next_to(label, DOWN, buff=0.1)
        group.add(label, mini)
        return group

    def window_frame(self, image_grid, row, col):
        cells = VGroup()
        for dr in range(3):
            for dc in range(3):
                cells.add(image_grid.cells[row + dr][col + dc])
        frame = SurroundingRectangle(cells, color="#f07e47", buff=0.035, stroke_width=4)
        frame.set_fill("#f07e47", opacity=0.04)
        return frame

    def kernel_overlay(self, image_grid, row, col):
        group = VGroup()
        for dr in range(3):
            for dc in range(3):
                image_cell = image_grid.cells[row + dr][col + dc]
                value = KERNEL[dr][dc]
                rect = RoundedRectangle(
                    width=image_grid.cell_size * 0.82,
                    height=image_grid.cell_size * 0.82,
                    corner_radius=0.04,
                    stroke_color="#228d5c" if value > 0 else "#27446e",
                    stroke_width=1.3,
                    fill_color="#dff4e8" if value > 0 else "#eef3f8",
                    fill_opacity=0.62,
                )
                text = Text(self.signed(value), font_size=11, weight=BOLD)
                text.set_color("#228d5c" if value > 0 else "#27446e")
                cell = VGroup(rect, text)
                cell.move_to(image_cell.get_center())
                group.add(cell)
        return group

    def response_map(self):
        values = []
        for row in range(len(IMAGE) - 2):
            out_row = []
            for col in range(len(IMAGE[0]) - 2):
                score = 0
                for dr in range(3):
                    for dc in range(3):
                        score += IMAGE[row + dr][col + dc] * KERNEL[dr][dc]
                out_row.append(round(score, 1))
            values.append(out_row)
        return values

    def scan_positions(self, values):
        for row in range(len(values)):
            for col in range(len(values[0])):
                yield row, col, values[row][col]

    def pixel_fill(self, value):
        if value >= 0.95:
            return "#27446e"
        if value >= 0.45:
            return "#9fb0c8"
        return "#ffffff"

    def fmt(self, value):
        if abs(value - round(value)) < 0.001:
            return str(int(round(value)))
        return f"{value:.1f}"

    def signed(self, value):
        return f"+{self.fmt(value)}" if value > 0 else self.fmt(value)
