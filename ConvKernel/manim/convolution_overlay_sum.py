from manimlib import *


PATCH = [
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
]

KERNEL = [
    [-1, -1, -1],
    [2, 2, 2],
    [-1, -1, -1],
]


class ConvolutionOverlaySum(Scene):
    default_camera_config = {
        "background_color": "#f8fafc",
    }

    def construct(self):
        title = Text("卷积核盖到局部图像上", font_size=38, weight=BOLD)
        title.set_color("#27446e")
        title.to_edge(UP, buff=0.28)

        subtitle = Text("对齐的每一个格子，都会做一次：像素 x 权重", font_size=22, weight=BOLD)
        subtitle.set_color("#64748b")
        subtitle.next_to(title, DOWN, buff=0.08)

        patch = self.make_patch_grid(PATCH)
        patch_label = self.label("局部像素窗口", "#27446e")
        patch_group = VGroup(patch_label, patch)
        patch.next_to(patch_label, DOWN, buff=0.18)
        patch_group.move_to(LEFT * 3.15 + UP * 0.35)

        kernel = self.make_kernel_sheet(KERNEL)
        kernel_label = self.label("横线检测器", "#228d5c")
        kernel_group = VGroup(kernel_label, kernel)
        kernel.next_to(kernel_label, DOWN, buff=0.18)
        kernel_group.move_to(RIGHT * 3.15 + UP * 0.35)

        arrow = Arrow(
            kernel_group.get_left() + LEFT * 0.1,
            patch_group.get_right() + RIGHT * 0.16,
            buff=0.1,
            color="#f07e47",
            stroke_width=6,
        )
        arrow_text = Text("逐位相乘", font_size=22, weight=BOLD)
        arrow_text.set_color("#f07e47")
        arrow_text.next_to(arrow, UP, buff=0.12)

        tray = self.make_tray()
        tray.to_edge(DOWN, buff=0.16)
        tray_label = Text("响应结果", font_size=20, weight=BOLD)
        tray_label.set_color("#8a4b15")
        tray_label.move_to(tray.get_top() + DOWN * 0.25)

        self.play(
            FadeIn(title, shift=DOWN * 0.12),
            FadeIn(subtitle, shift=DOWN * 0.12),
            FadeIn(patch_group, shift=RIGHT * 0.18),
            FadeIn(kernel_group, shift=LEFT * 0.18),
            ShowCreation(arrow),
            FadeIn(arrow_text),
            FadeIn(tray),
            FadeIn(tray_label),
            run_time=0.95,
        )

        landing_frame = SurroundingRectangle(
            patch,
            color="#f07e47",
            buff=0.08,
            stroke_width=5,
        )
        landing_frame.set_fill("#f07e47", opacity=0.05)

        self.play(
            FadeOut(arrow_text, shift=UP * 0.06),
            FadeOut(arrow),
            FadeOut(kernel_label, shift=UP * 0.08),
            ShowCreation(landing_frame),
            kernel.animate.move_to(patch.get_center()),
            run_time=1.1,
        )
        self.wait(0.15)

        overlay = self.make_overlay_grid(PATCH, KERNEL)
        overlay.move_to(patch.get_center())
        overlay_label = Text("逐点相乘，p是像素值，w是卷积核值", font_size=25, weight=BOLD)
        overlay_label.set_color("#27446e")
        overlay_label.move_to(RIGHT * 2.45 + UP * 0.95)

        self.play(
            FadeOut(kernel_group),
            FadeOut(patch_group),
            FadeOut(landing_frame),
            FadeIn(overlay, scale=0.98),
            FadeIn(overlay_label, shift=LEFT * 0.12),
            run_time=0.65,
        )

        pair_hint = Text("蓝色小数是像素，绿色小数是权重", font_size=20, weight=BOLD)
        pair_hint.set_color("#64748b")
        pair_hint.next_to(overlay_label, DOWN, buff=0.12)
        self.play(FadeIn(pair_hint), run_time=0.35)
        self.wait(0.25)

        product_matrix_label = VGroup(
            Text("乘积矩阵", font_size=20, weight=BOLD),
            Text("p x w", font_size=22, weight=BOLD),
        )
        product_matrix_label.arrange(DOWN, buff=0.04)
        product_matrix_label.set_color("#8a4b15")
        product_matrix = self.make_product_matrix(PATCH, KERNEL)
        product_matrix_label.next_to(product_matrix, RIGHT, buff=0.18)
        product_matrix_group = VGroup(product_matrix_label, product_matrix)
        product_matrix_group.move_to(RIGHT * 2.82 + DOWN * 1.03)
        self.play(FadeIn(product_matrix_group, shift=UP * 0.08), run_time=0.45)

        product_values = VGroup()
        for index, (row, col) in enumerate(self.cell_order()):
            pixel = PATCH[row][col]
            weight = KERNEL[row][col]
            product = pixel * weight

            focus = SurroundingRectangle(
                overlay.cells[row][col],
                color="#f07e47",
                buff=0.04,
                stroke_width=5,
            )
            focus.set_fill("#f07e47", opacity=0.06)

            formula = self.make_formula(pixel, weight, product)
            formula.move_to(RIGHT * 2.55 + UP * 0.25)

            product_value = self.product_value_text(product)
            product_value.move_to(product_matrix.cells[row][col].get_center())
            product_focus = SurroundingRectangle(
                product_matrix.cells[row][col],
                color="#f07e47",
                buff=0.035,
                stroke_width=4,
            )
            product_focus.set_fill("#f07e47", opacity=0.05)

            pulse_dot = Dot(overlay.cells[row][col].get_center(), radius=0.055, color="#f07e47")
            self.play(
                ShowCreation(focus),
                GrowFromCenter(pulse_dot),
                FadeIn(formula, shift=UP * 0.08),
                run_time=0.28,
            )
            self.play(
                ShowCreation(product_focus),
                TransformFromCopy(formula.product_chip, product_value),
                FadeOut(pulse_dot),
                run_time=0.36,
            )
            product_values.add(product_value)
            product_matrix.values[row][col] = product_value
            self.play(
                FadeOut(formula, shift=DOWN * 0.06),
                FadeOut(focus),
                FadeOut(product_focus),
                run_time=0.13,
            )

        expand_label = Text("把乘积矩阵按行展开相加", font_size=21, weight=BOLD)
        expand_label.set_color("#8a4b15")
        expand_label.move_to(tray.get_top() + DOWN * 0.25)

        sum_line = self.make_sum_expression(PATCH, KERNEL)
        sum_line.move_to(tray.get_center() + DOWN * 0.34)
        matrix_focus = SurroundingRectangle(
            product_matrix,
            color="#f07e47",
            buff=0.055,
            stroke_width=4,
        )
        matrix_focus.set_fill("#f07e47", opacity=0.045)

        source_values = [product_matrix.values[row][col] for row, col in self.cell_order()]
        term_targets = list(sum_line.terms)
        self.play(
            FadeOut(tray_label),
            FadeOut(pair_hint),
            FadeIn(expand_label, shift=UP * 0.06),
            ShowCreation(matrix_focus),
            *[
                TransformFromCopy(source, target)
                for source, target in zip(source_values, term_targets)
            ],
            FadeIn(sum_line.operators),
            FadeIn(sum_line.result),
            run_time=0.95,
        )
        self.wait(0.35)

        final_badge = RoundedRectangle(
            width=3.7,
            height=0.72,
            corner_radius=0.14,
            stroke_color="#228d5c",
            stroke_width=4,
            fill_color="#e8f7ef",
            fill_opacity=1,
        )
        final_text = Text("响应分数 = 6", font_size=34, weight=BOLD)
        final_text.set_color("#228d5c")
        final_text.move_to(final_badge.get_center())
        final_group = VGroup(final_badge, final_text)
        final_group.move_to(tray.get_center() + DOWN * 0.45)

        self.play(
            FadeOut(expand_label),
            FadeOut(matrix_focus),
            FadeOut(sum_line, shift=UP * 0.06),
            run_time=0.35,
        )
        self.play(FadeIn(final_group, scale=0.92), run_time=0.65)
        self.play(Flash(final_group.get_center(), color="#228d5c", flash_radius=0.95), run_time=0.75)
        self.wait(0.8)

    def cell_order(self):
        return [(row, col) for row in range(3) for col in range(3)]

    def label(self, text, color):
        mob = Text(text, font_size=23, weight=BOLD)
        mob.set_color(color)
        return mob

    def make_tray(self):
        return RoundedRectangle(
            width=6.4,
            height=1.84,
            corner_radius=0.16,
            stroke_color="#f07e47",
            stroke_width=3,
            fill_color="#fff7ed",
            fill_opacity=1,
        )

    def make_patch_grid(self, matrix, cell_size=0.84):
        grid = VGroup()
        cells = []
        for row_index, row in enumerate(matrix):
            row_cells = []
            for col_index, value in enumerate(row):
                cell = self.patch_cell(value, cell_size)
                cell.move_to(self.cell_point(row_index, col_index, cell_size))
                grid.add(cell)
                row_cells.append(cell)
            cells.append(row_cells)
        grid.cells = cells
        return grid

    def make_kernel_sheet(self, matrix, cell_size=0.84):
        grid = VGroup()
        cells = []
        for row_index, row in enumerate(matrix):
            row_cells = []
            for col_index, value in enumerate(row):
                cell = self.kernel_cell(value, cell_size, opacity=0.64)
                cell.move_to(self.cell_point(row_index, col_index, cell_size))
                grid.add(cell)
                row_cells.append(cell)
            cells.append(row_cells)

        border = SurroundingRectangle(grid, color="#f07e47", buff=0.055, stroke_width=4)
        border.set_fill("#f07e47", opacity=0.035)
        sheet = VGroup(border, grid)
        sheet.cells = cells
        return sheet

    def make_overlay_grid(self, patch_matrix, kernel_matrix, cell_size=0.92):
        grid = VGroup()
        cells = []
        for row_index in range(3):
            row_cells = []
            for col_index in range(3):
                pixel = patch_matrix[row_index][col_index]
                weight = kernel_matrix[row_index][col_index]
                cell = self.overlay_cell(pixel, weight, cell_size)
                cell.move_to(self.cell_point(row_index, col_index, cell_size))
                grid.add(cell)
                row_cells.append(cell)
            cells.append(row_cells)
        grid.cells = cells
        return grid

    def make_product_matrix(self, patch_matrix, kernel_matrix, cell_size=0.56):
        grid = VGroup()
        cells = []
        values = []
        for row_index in range(3):
            row_cells = []
            row_values = []
            for col_index in range(3):
                cell = self.product_matrix_cell(cell_size)
                cell.move_to(self.cell_point(row_index, col_index, cell_size))
                grid.add(cell)
                row_cells.append(cell)
                row_values.append(None)
            cells.append(row_cells)
            values.append(row_values)
        grid.cells = cells
        grid.values = values
        return grid

    def product_matrix_cell(self, size):
        return RoundedRectangle(
            width=size,
            height=size,
            corner_radius=0.08,
            stroke_color="#f07e47",
            stroke_width=2.2,
            fill_color="#fff7ed",
            fill_opacity=1,
        )

    def product_value_text(self, value):
        text = Text(self.fmt(value), font_size=22, weight=BOLD)
        text.set_color("#f07e47" if value else "#64748b")
        return text

    def make_sum_expression(self, patch_matrix, kernel_matrix):
        terms = VGroup()
        operators = VGroup()
        pieces = []
        products = [
            patch_matrix[row][col] * kernel_matrix[row][col]
            for row, col in self.cell_order()
        ]
        total = sum(products)

        for index, product in enumerate(products):
            term = Text(self.fmt(product), font_size=28, weight=BOLD)
            term.set_color("#f07e47" if product else "#64748b")
            terms.add(term)
            pieces.append(term)
            if index < len(products) - 1:
                plus = Text("+", font_size=26, weight=BOLD)
                plus.set_color("#64748b")
                operators.add(plus)
                pieces.append(plus)

        equals = Text("=", font_size=28, weight=BOLD)
        equals.set_color("#64748b")
        result = Text(self.fmt(total), font_size=32, weight=BOLD)
        result.set_color("#228d5c")
        result_group = VGroup(equals, result)
        operators.add(equals)
        pieces.extend([equals, result])

        expression = VGroup(*pieces)
        expression.arrange(RIGHT, buff=0.12)
        expression.terms = terms
        expression.operators = operators
        expression.result = result
        expression.result_group = result_group
        return expression

    def patch_cell(self, value, size):
        rect = RoundedRectangle(
            width=size,
            height=size,
            corner_radius=0.09,
            stroke_color="#cbd5e1",
            stroke_width=2,
            fill_color="#27446e" if value else "#ffffff",
            fill_opacity=1,
        )
        text = Text(self.fmt(value), font_size=26, weight=BOLD)
        text.set_color("#ffffff" if value else "#64748b")
        text.move_to(rect.get_center())
        return VGroup(rect, text)

    def kernel_cell(self, value, size, opacity):
        positive = value > 0
        rect = RoundedRectangle(
            width=size,
            height=size,
            corner_radius=0.09,
            stroke_color="#228d5c" if positive else "#27446e",
            stroke_width=2.5,
            fill_color="#dff4e8" if positive else "#e9eef5",
            fill_opacity=opacity,
        )
        text = Text(self.signed_weight(value), font_size=25, weight=BOLD)
        text.set_color("#228d5c" if positive else "#27446e")
        text.move_to(rect.get_center())
        return VGroup(rect, text)

    def overlay_cell(self, pixel, weight, size):
        base = RoundedRectangle(
            width=size,
            height=size,
            corner_radius=0.1,
            stroke_color="#cbd5e1",
            stroke_width=2,
            fill_color="#27446e" if pixel else "#ffffff",
            fill_opacity=1,
        )
        film = RoundedRectangle(
            width=size * 0.92,
            height=size * 0.92,
            corner_radius=0.08,
            stroke_color="#228d5c" if weight > 0 else "#27446e",
            stroke_width=2.6,
            fill_color="#dff4e8" if weight > 0 else "#eef3f8",
            fill_opacity=0.72,
        )
        pixel_chip = self.corner_chip(f"p={self.fmt(pixel)}", "#27446e", "#e8eef7")
        weight_chip = self.corner_chip(f"w={self.signed_weight(weight)}", "#228d5c" if weight > 0 else "#27446e", "#e8f7ef" if weight > 0 else "#eef3f8")
        pixel_chip.move_to(base.get_corner(UL) + RIGHT * 0.38 + DOWN * 0.25)
        weight_chip.move_to(base.get_corner(DR) + LEFT * 0.41 + UP * 0.25)
        product = Text(self.fmt(pixel * weight), font_size=24, weight=BOLD)
        product.set_color("#f07e47")
        product.move_to(base.get_center())
        product.set_opacity(0.0)
        return VGroup(base, film, pixel_chip, weight_chip, product)

    def corner_chip(self, text, color, fill):
        box = RoundedRectangle(
            width=0.72,
            height=0.36,
            corner_radius=0.06,
            stroke_color=color,
            stroke_width=1.6,
            fill_color=fill,
            fill_opacity=0.96,
        )
        label = Text(text, font_size=18, weight=BOLD)
        label.set_color(color)
        label.move_to(box.get_center())
        return VGroup(box, label)

    def make_formula(self, pixel, weight, product):
        pixel_chip = self.formula_chip(f"像素 {self.fmt(pixel)}", "#27446e", "#e8eef7")
        times = Text("x", font_size=28, weight=BOLD)
        times.set_color("#f07e47")
        weight_chip = self.formula_chip(f"权重 {self.signed_weight(weight)}", "#228d5c" if weight > 0 else "#27446e", "#e8f7ef" if weight > 0 else "#eef3f8")
        equals = Text("=", font_size=28, weight=BOLD)
        equals.set_color("#64748b")
        product_chip = self.formula_chip(self.fmt(product), "#f07e47", "#fff2e8")
        formula = VGroup(pixel_chip, times, weight_chip, equals, product_chip)
        formula.arrange(RIGHT, buff=0.14)
        formula.product_chip = product_chip
        return formula

    def formula_chip(self, text, color, fill):
        box = RoundedRectangle(
            width=max(0.8, 0.13 * len(text) + 0.38),
            height=0.42,
            corner_radius=0.11,
            stroke_color=color,
            stroke_width=2,
            fill_color=fill,
            fill_opacity=1,
        )
        label = Text(text, font_size=18, weight=BOLD)
        label.set_color(color)
        label.move_to(box.get_center())
        return VGroup(box, label)

    def make_term(self, value, first=False):
        label = Text(self.signed_term(value, first=first), font_size=24, weight=BOLD)
        label.set_color("#f07e47" if value else "#64748b")
        return label

    def cell_point(self, row, col, size):
        step = size + 0.08
        return [(col - 1) * step, (1 - row) * step, 0]

    def term_position(self, index):
        x = -2.4 + (index % 5) * 1.1
        y = -2.42 - (index // 5) * 0.22
        return [x, y, 0]

    def fmt(self, value):
        if abs(value - round(value)) < 0.001:
            return str(int(round(value)))
        return f"{value:.1f}"

    def signed_weight(self, value):
        return f"+{self.fmt(value)}" if value > 0 else self.fmt(value)

    def signed_term(self, value, first=False):
        text = self.fmt(value)
        if first:
            return text
        return f"+ {text}" if value >= 0 else f"- {self.fmt(abs(value))}"
