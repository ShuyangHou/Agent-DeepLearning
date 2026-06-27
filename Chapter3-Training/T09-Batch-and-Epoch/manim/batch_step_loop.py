from manimlib import *


BLUE_FORWARD = "#2563eb"
RED_LOSS = "#dc2626"
PURPLE_GRAD = "#7c3aed"
GREEN_UPDATE = "#16a34a"
ORANGE_PARAM = "#f97316"
INK = "#0f172a"
MUTED = "#64748b"
PANEL_BG = "#f8fafc"
PANEL_LINE = "#cbd5e1"


class BatchStepLoop(Scene):
    # T09 picture 1: walk the dataset (N=24) -> shuffle -> slice into B=4 batches
    # -> consume batch by batch with a gradient pulse, and label
    # "1 epoch = N/B steps".

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("One epoch = N / B steps", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("shuffle the dataset, slice it into batches, consume them one step at a time",
                        font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        # === Stage 1: dataset of N = 24 (4 rows x 6 cols) ===
        rows, cols = 4, 6
        cell_size = 0.5
        gap = 0.12
        grid_w = cols * cell_size + (cols - 1) * gap
        grid_h = rows * cell_size + (rows - 1) * gap

        cells = []  # row-major, ids 0..23
        for r in range(rows):
            for c in range(cols):
                square = RoundedRectangle(
                    width=cell_size, height=cell_size, corner_radius=0.07,
                    stroke_color=PANEL_LINE, stroke_width=1.5,
                    fill_color="#ffffff", fill_opacity=1,
                )
                x = -grid_w / 2 + cell_size / 2 + c * (cell_size + gap)
                y = grid_h / 2 - cell_size / 2 - r * (cell_size + gap)
                square.move_to(RIGHT * x + UP * (y + 1.3))
                cells.append(square)
        grid = VGroup(*cells)

        grid_caption = Text("dataset  N = 24", font_size=20, weight=BOLD)
        grid_caption.set_color(MUTED)
        grid_caption.next_to(grid, UP, buff=0.18)

        stage_tag = self.make_stage_tag("Stage 1 / Whole dataset", BLUE_FORWARD)
        self.play(FadeIn(title, shift=DOWN * 0.1), FadeIn(subtitle, shift=DOWN * 0.1),
                  FadeIn(stage_tag), run_time=0.5)
        self.play(
            FadeIn(grid_caption, shift=DOWN * 0.05),
            LaggedStart(*[FadeIn(c, scale=0.85) for c in cells], lag_ratio=0.025),
            run_time=1.1,
        )

        # === Stage 2: shuffle the cells ===
        new_stage = self.make_stage_tag("Stage 2 / Shuffle", PURPLE_GRAD)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        order = [5, 17, 2, 22, 9, 14, 0, 11, 19, 6, 3, 20,
                 8, 15, 23, 1, 12, 18, 7, 4, 21, 10, 16, 13]
        targets = [cells[i].get_center() for i in range(24)]
        # move cell with current id "order[k]" into slot k
        shuffle_anims = []
        for slot, original_id in enumerate(order):
            shuffle_anims.append(cells[original_id].animate.move_to(targets[slot]))
        self.play(LaggedStart(*shuffle_anims, lag_ratio=0.015), run_time=1.2)

        # rebuild "logical" order list so cells_in_order[k] is the cell now in slot k
        cells_in_order = [cells[order[k]] for k in range(24)]

        # === Stage 3: slice into 6 batches of B = 4 ===
        new_stage = self.make_stage_tag("Stage 3 / Slice into batches  B = 4", ORANGE_PARAM)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        batch_palette = [
            ("#fee2e2", "#dc2626"),
            ("#fed7aa", "#f97316"),
            ("#fef9c3", "#ca8a04"),
            ("#dcfce7", "#16a34a"),
            ("#dbeafe", "#2563eb"),
            ("#ede9fe", "#7c3aed"),
        ]
        # group cells into 6 batches of 4 (slots 0..3, 4..7, ...)
        batches = [cells_in_order[i * 4:(i + 1) * 4] for i in range(6)]
        recolor_anims = []
        for bi, batch in enumerate(batches):
            fill, stroke = batch_palette[bi]
            for cell in batch:
                recolor_anims.append(cell.animate.set_fill(fill, opacity=1).set_stroke(stroke, width=2))
        self.play(LaggedStart(*recolor_anims, lag_ratio=0.02), run_time=0.9)

        # === Stage 4: consume batch by batch, step counter ticks up ===
        new_stage = self.make_stage_tag("Stage 4 / Step by step", GREEN_UPDATE)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        step_panel = RoundedRectangle(
            width=5.4, height=1.1, corner_radius=0.16,
            stroke_color=PANEL_LINE, stroke_width=1.6,
            fill_color="#ffffff", fill_opacity=1,
        )
        step_panel.move_to(DOWN * 2.05)
        step_title = Text("step counter", font_size=18, weight=BOLD)
        step_title.set_color(MUTED)
        step_title.move_to(step_panel.get_center() + UP * 0.28)
        step_value = Text("0 / 6", font_size=30, weight=BOLD)
        step_value.set_color(INK)
        step_value.move_to(step_panel.get_center() + DOWN * 0.12)
        self.play(FadeIn(step_panel, shift=UP * 0.1), FadeIn(step_title), FadeIn(step_value),
                  run_time=0.4)

        for bi, batch in enumerate(batches):
            fill, stroke = batch_palette[bi]
            # halo around this batch
            xs = [c.get_center()[0] for c in batch]
            ys = [c.get_center()[1] for c in batch]
            halo = RoundedRectangle(
                width=max(xs) - min(xs) + cell_size + 0.18,
                height=max(ys) - min(ys) + cell_size + 0.18,
                corner_radius=0.12,
                stroke_color=stroke, stroke_width=3,
                fill_color=fill, fill_opacity=0.0,
            )
            halo.move_to(RIGHT * ((min(xs) + max(xs)) / 2) + UP * ((min(ys) + max(ys)) / 2))

            # gradient arrow from this batch down to the step panel
            start_pt = halo.get_bottom() + DOWN * 0.08
            end_pt = step_panel.get_top() + UP * 0.05
            grad_arrow = Arrow(
                start_pt, end_pt, buff=0.05,
                stroke_color=PURPLE_GRAD, stroke_width=4,
            )

            new_value = Text(f"{bi + 1} / 6", font_size=30, weight=BOLD)
            new_value.set_color(INK)
            new_value.move_to(step_value.get_center())

            self.play(
                FadeIn(halo, scale=0.92),
                run_time=0.25,
            )
            self.play(
                GrowArrow(grad_arrow),
                LaggedStart(*[Indicate(c, color=stroke, scale_factor=1.15) for c in batch],
                            lag_ratio=0.05, run_time=0.55),
                run_time=0.55,
            )
            self.play(
                Transform(step_value, new_value),
                Flash(step_panel.get_center(), color=GREEN_UPDATE, flash_radius=0.4),
                run_time=0.35,
            )
            # consume batch: fade halo and arrow, dim cells
            dim_anims = [c.animate.set_fill("#f1f5f9", opacity=1).set_stroke(PANEL_LINE, width=1.2)
                         for c in batch]
            self.play(
                FadeOut(halo), FadeOut(grad_arrow),
                *dim_anims,
                run_time=0.3,
            )

        # === Stage 5: closing caption ===
        new_stage = self.make_stage_tag("Stage 5 / 1 epoch = 6 steps", INK)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        closing = Text("N = 24,  B = 4   =>   1 epoch = 6 steps",
                       font_size=24, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.35)
        self.play(FadeIn(closing, shift=UP * 0.1), run_time=0.4)
        self.wait(0.8)

    # ---------- helpers ----------

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=5.2, height=0.55, corner_radius=0.14,
            stroke_color=color, stroke_width=2.5,
            fill_color="#ffffff", fill_opacity=0.95,
        )
        label = Text(text, font_size=21, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        group = VGroup(bg, label)
        group.to_corner(UL, buff=0.36).shift(DOWN * 0.55)
        return group
