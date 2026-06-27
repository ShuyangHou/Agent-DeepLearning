from manimlib import *


PROBABILITIES = [4, 2, 9, 6, 5, 7, 3, 58, 2, 4]


class LeNet5IntroOverview(Scene):
    default_camera_config = {
        "background_color": "#f8fafc",
        "fps": 30,
    }

    def construct(self):
        title = Text("LeNet-5 怎样识别数字图片", font_size=38, weight=BOLD)
        title.set_color("#27446e")
        title.to_edge(UP, buff=0.28)

        subtitle = Text("一张数字 7 的灰度图进入网络，最后输出 0-9 的判断概率", font_size=22, weight=BOLD)
        subtitle.set_color("#64748b")
        subtitle.next_to(title, DOWN, buff=0.08)

        input_group = self.make_input_panel()
        input_group.move_to(LEFT * 4.25 + DOWN * 0.12)

        machine_group = self.make_machine_panel()
        machine_group.move_to(ORIGIN + DOWN * 0.08)

        output_group = self.make_output_panel()
        output_group.move_to(RIGHT * 4.22 + DOWN * 0.1)

        arrow_in = Arrow(
            input_group.get_right() + RIGHT * 0.08,
            machine_group.get_left() + LEFT * 0.08,
            buff=0.08,
            stroke_width=6,
            color="#f07e47",
        )
        arrow_out = Arrow(
            machine_group.get_right() + RIGHT * 0.08,
            output_group.get_left() + LEFT * 0.08,
            buff=0.08,
            stroke_width=6,
            color="#f07e47",
        )

        final_note = Text("本关带你了解模型识别数字图片的细节", font_size=24, weight=BOLD)
        final_note.set_color("#27446e")
        note_box = RoundedRectangle(
            width=9.25,
            height=0.62,
            corner_radius=0.12,
            stroke_color="#dbe5ef",
            stroke_width=2,
            fill_color="#ffffff",
            fill_opacity=1,
        )
        final_group = VGroup(note_box, final_note)
        final_group.to_edge(DOWN, buff=0.28)

        self.play(FadeIn(title, shift=DOWN * 0.12), FadeIn(subtitle, shift=DOWN * 0.12), run_time=0.65)
        self.play(FadeIn(input_group, shift=RIGHT * 0.18), run_time=0.65)
        self.wait(0.15)
        self.play(ShowCreation(arrow_in), FadeIn(machine_group, shift=UP * 0.12), run_time=0.7)

        traveler = self.make_digit_grid(rows=14, cols=14, cell_size=0.105)
        traveler.move_to(input_group.digit.get_center())
        self.play(TransformFromCopy(input_group.digit, traveler), run_time=0.28)
        self.play(traveler.animate.move_to(machine_group.get_center()).scale(0.72), run_time=0.85)
        self.play(
            FadeOut(traveler, scale=0.85),
            machine_group.box.animate.set_fill("#e8f7ef", opacity=1),
            Flash(machine_group.get_center(), color="#228d5c", flash_radius=1.25),
            run_time=0.85,
        )
        self.play(machine_group.box.animate.set_fill("#ffffff", opacity=1), run_time=0.25)

        self.play(ShowCreation(arrow_out), FadeIn(output_group.frame, shift=LEFT * 0.12), FadeIn(output_group.label), run_time=0.62)
        bar_anims = [GrowFromEdge(bar, DOWN) for bar in output_group.bars]
        label_anims = [FadeIn(label, shift=UP * 0.04) for label in output_group.digit_labels]
        self.play(LaggedStart(*bar_anims, lag_ratio=0.07), LaggedStart(*label_anims, lag_ratio=0.04), run_time=1.25)
        self.play(FadeIn(output_group.percent_labels, shift=UP * 0.05), run_time=0.45)

        winner = SurroundingRectangle(output_group.winner_group, color="#f07e47", buff=0.07, stroke_width=4)
        prediction = Text("预测结果：7", font_size=34, weight=BOLD)
        prediction.set_color("#f07e47")
        prediction.next_to(output_group, DOWN, buff=0.14)
        self.play(ShowCreation(winner), FadeIn(prediction, shift=UP * 0.08), run_time=0.65)
        self.play(Flash(output_group.winner_group.get_center(), color="#f07e47", flash_radius=0.9), run_time=0.72)

        self.play(FadeIn(final_group, shift=UP * 0.12), run_time=0.65)
        self.wait(1.0)

    def make_input_panel(self):
        label = Text("输入图像", font_size=23, weight=BOLD)
        label.set_color("#27446e")
        digit = self.make_digit_grid()
        shape = Text("数字 7  ·  32×32×1 灰度像素", font_size=18, weight=BOLD)
        shape.set_color("#64748b")
        panel = VGroup(label, digit, shape)
        panel.arrange(DOWN, buff=0.16)
        panel.digit = digit
        return panel

    def make_machine_panel(self):
        box = RoundedRectangle(
            width=3.05,
            height=2.1,
            corner_radius=0.22,
            stroke_color="#27446e",
            stroke_width=4,
            fill_color="#ffffff",
            fill_opacity=1,
        )
        title = Text("LeNet-5", font_size=37, weight=BOLD)
        title.set_color("#27446e")
        subtitle = Text("经典数字识别网络", font_size=18, weight=BOLD)
        subtitle.set_color("#64748b")

        dots = VGroup()
        for index in range(8):
            dot = Dot(radius=0.045, color="#228d5c" if index in [2, 3, 4] else "#f07e47")
            dot.move_to(LEFT * 0.84 + RIGHT * index * 0.24 + DOWN * 0.55)
            dots.add(dot)

        group = VGroup(box, title, subtitle, dots)
        title.move_to(box.get_center() + UP * 0.26)
        subtitle.next_to(title, DOWN, buff=0.12)
        group.box = box
        return group

    def make_output_panel(self):
        label = Text("输出概率", font_size=23, weight=BOLD)
        label.set_color("#27446e")
        frame = RoundedRectangle(
            width=3.05,
            height=2.35,
            corner_radius=0.16,
            stroke_color="#dbe5ef",
            stroke_width=2,
            fill_color="#ffffff",
            fill_opacity=1,
        )

        chart = VGroup()
        bars = []
        digit_labels = []
        percent_labels = VGroup()
        winner_group = VGroup()
        max_value = max(PROBABILITIES)
        for digit, value in enumerate(PROBABILITIES):
            height = 0.22 + value / max_value * 1.18
            color = "#f07e47" if digit == 7 else "#8fb2d9"
            bar = RoundedRectangle(
                width=0.18,
                height=height,
                corner_radius=0.035,
                stroke_color=color,
                stroke_width=1,
                fill_color=color,
                fill_opacity=0.92,
            )
            bar.move_to(LEFT * 1.18 + RIGHT * digit * 0.26 + DOWN * 0.18 + UP * height / 2)
            label_digit = Text(str(digit), font_size=13, weight=BOLD)
            label_digit.set_color("#f07e47" if digit == 7 else "#27446e")
            label_digit.next_to(bar, DOWN, buff=0.07)
            bars.append(bar)
            digit_labels.append(label_digit)
            chart.add(bar, label_digit)
            if digit == 7:
                percent = Text("58%", font_size=16, weight=BOLD)
                percent.set_color("#f07e47")
                percent.next_to(bar, UP, buff=0.05)
                percent_labels.add(percent)
                winner_group.add(bar, label_digit, percent)

        chart.move_to(frame.get_center() + DOWN * 0.03)
        percent_labels.move_to(percent_labels.get_center())
        group = VGroup(frame, label, chart, percent_labels)
        label.next_to(frame, UP, buff=0.12)
        group.frame = frame
        group.label = label
        group.bars = bars
        group.digit_labels = digit_labels
        group.percent_labels = percent_labels
        group.winner_group = winner_group
        return group

    def make_digit_grid(self, rows=16, cols=16, cell_size=0.145):
        grid = VGroup()
        cells = []
        for row in range(rows):
            row_cells = []
            for col in range(cols):
                value = self.pixel_value(row, col, rows, cols)
                rect = RoundedRectangle(
                    width=cell_size,
                    height=cell_size,
                    corner_radius=cell_size * 0.18,
                    stroke_color="#d8e1eb",
                    stroke_width=0.55,
                    fill_color="#27446e" if value > 0.55 else "#f4f7fb",
                    fill_opacity=1,
                )
                if value > 0.55:
                    rect.set_fill("#27446e", opacity=1)
                rect.move_to([
                    (col - (cols - 1) / 2) * (cell_size + 0.012),
                    ((rows - 1) / 2 - row) * (cell_size + 0.012),
                    0,
                ])
                grid.add(rect)
                row_cells.append(rect)
            cells.append(row_cells)
        border = SurroundingRectangle(grid, color="#27446e", buff=0.06, stroke_width=2.2)
        border.set_fill("#ffffff", opacity=0.25)
        group = VGroup(border, grid)
        group.cells = cells
        return group

    def pixel_value(self, row, col, rows, cols):
        r = row / max(rows - 1, 1)
        c = col / max(cols - 1, 1)
        top = 0.14 <= r <= 0.27 and 0.16 <= c <= 0.86
        cap = 0.24 <= r <= 0.36 and 0.68 <= c <= 0.86
        diagonal_center = 0.86 - (r - 0.25) * 0.82
        diagonal = 0.27 <= r <= 0.88 and abs(c - diagonal_center) <= 0.075
        return 1 if top or cap or diagonal else 0
