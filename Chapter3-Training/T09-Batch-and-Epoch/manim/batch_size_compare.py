from manimlib import *

import math
import random


BLUE_FORWARD = "#2563eb"
RED_LOSS = "#dc2626"
PURPLE_GRAD = "#7c3aed"
GREEN_UPDATE = "#16a34a"
ORANGE_PARAM = "#f97316"
INK = "#0f172a"
MUTED = "#64748b"
PANEL_BG = "#f8fafc"
PANEL_LINE = "#cbd5e1"


# colors chosen so each curve stays distinguishable and matches the on-page chips
B1_COLOR = "#dc2626"   # noisy red
B4_COLOR = "#2563eb"   # mid blue
B24_COLOR = "#16a34a"  # smooth green


def simulate_loss(batch_size, num_epochs, n=24, seed=7):
    # mirror of guide.js simulateLoss: exponential decay + noise scaled by 1/sqrt(B)
    steps_per_epoch = max(1, n // batch_size)
    total_steps = steps_per_epoch * num_epochs
    rng = random.Random(seed)
    noise = 0.55 / math.sqrt(batch_size)
    pts = []
    for i in range(total_steps):
        t = i / max(1, total_steps - 1)
        base = 0.18 + 0.82 * math.exp(-2.6 * t)
        r = rng.random() - 0.5
        v = max(0.05, base + r * noise)
        pts.append((i, v, steps_per_epoch))
    return pts, steps_per_epoch, total_steps


class BatchSizeCompare(Scene):
    # T09 picture 2: three loss curves on the same axes (B=1 / B=4 / B=24)
    # over 3 epochs of N=24. Calls out the noise vs smoothness trade-off
    # and the step density per epoch.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Batch size: noise vs smoothness", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("same 3 epochs, three batch sizes, same x-axis is progress",
                        font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        # === Axes ===
        axes = Axes(
            x_range=[0, 1.0, 0.25],
            y_range=[0, 1.1, 0.25],
            width=10.0,
            height=4.6,
            axis_config={
                "stroke_color": MUTED,
                "stroke_width": 1.6,
                "include_tip": False,
                "include_ticks": True,
            },
        )
        axes.move_to(DOWN * 0.4)
        x_label = Text("progress through 3 epochs", font_size=18, weight=BOLD)
        x_label.set_color(MUTED)
        x_label.next_to(axes, DOWN, buff=0.18)
        y_label = Text("loss", font_size=18, weight=BOLD)
        y_label.set_color(MUTED)
        y_label.next_to(axes, LEFT, buff=0.18).rotate(PI / 2)

        stage_tag = self.make_stage_tag("Stage 1 / Same axes", BLUE_FORWARD)
        self.play(FadeIn(title, shift=DOWN * 0.1), FadeIn(subtitle, shift=DOWN * 0.1),
                  FadeIn(stage_tag), run_time=0.4)
        self.play(FadeIn(axes), FadeIn(x_label), FadeIn(y_label), run_time=0.5)

        # === Pre-compute the three series ===
        # 3 epochs total
        num_epochs = 3
        series = []
        for bs, color in [(1, B1_COLOR), (4, B4_COLOR), (24, B24_COLOR)]:
            pts, spe, total = simulate_loss(bs, num_epochs, seed=7 + bs)
            series.append({"B": bs, "color": color, "pts": pts, "spe": spe, "total": total})

        # === Stage 2: B=1 red noisy curve, dense steps ===
        new_stage = self.make_stage_tag("Stage 2 / B = 1   noisy, dense", B1_COLOR)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.2)
        stage_tag = new_stage
        self.draw_series(axes, series[0], label_offset=UP * 0.5)

        # === Stage 3: B=4 blue mid curve ===
        new_stage = self.make_stage_tag("Stage 3 / B = 4   middle ground", B4_COLOR)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.2)
        stage_tag = new_stage
        self.draw_series(axes, series[1], label_offset=UP * 0.0)

        # === Stage 4: B=24 green smooth, sparse steps ===
        new_stage = self.make_stage_tag("Stage 4 / B = 24  smooth, sparse", B24_COLOR)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.2)
        stage_tag = new_stage
        self.draw_series(axes, series[2], label_offset=DOWN * 0.5)

        # === Stage 5: caption ===
        new_stage = self.make_stage_tag("Stage 5 / Take the trade-off", INK)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.2)
        stage_tag = new_stage

        # legend chips
        legend_items = [
            ("B = 1   72 steps / 3 epochs", B1_COLOR),
            ("B = 4   18 steps / 3 epochs", B4_COLOR),
            ("B = 24   3 steps / 3 epochs", B24_COLOR),
        ]
        chips = VGroup()
        for text, color in legend_items:
            chips.add(self.legend_chip(text, color))
        chips.arrange(DOWN, buff=0.12, aligned_edge=LEFT)
        chips.to_corner(UR, buff=0.5).shift(DOWN * 1.0)
        self.play(LaggedStart(*[FadeIn(c, shift=LEFT * 0.1) for c in chips],
                              lag_ratio=0.18), run_time=0.6)

        closing = Text("small B = lively but noisy   |   large B = smooth but few updates",
                       font_size=22, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.3)
        self.play(FadeIn(closing, shift=UP * 0.1), run_time=0.4)
        self.wait(0.8)

    # ---------- helpers ----------

    def draw_series(self, axes, s, label_offset=ORIGIN):
        pts = s["pts"]
        color = s["color"]
        total = s["total"]
        # map step index -> x in [0, 1]
        points = [axes.c2p(i / max(1, total - 1), v) for (i, v, _spe) in pts]
        curve = VMobject()
        curve.set_points_as_corners(points)
        curve.set_stroke(color, width=3, opacity=0.95)
        # dots only when sparse enough to read
        dots = VGroup()
        if total <= 36:
            for p in points:
                dot = Dot(p, radius=0.05, color=color)
                dots.add(dot)
        # label at end of curve
        end_point = points[-1]
        label = Text(f"B = {s['B']}", font_size=20, weight=BOLD)
        label.set_color(color)
        label.move_to(end_point + RIGHT * 0.55 + label_offset)
        self.play(ShowCreation(curve, run_time=1.1))
        if len(dots) > 0:
            self.play(LaggedStart(*[FadeIn(d, scale=0.6) for d in dots],
                                  lag_ratio=0.05), run_time=0.5)
        self.play(FadeIn(label, shift=RIGHT * 0.1), run_time=0.3)

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=5.6, height=0.55, corner_radius=0.14,
            stroke_color=color, stroke_width=2.5,
            fill_color="#ffffff", fill_opacity=0.95,
        )
        label = Text(text, font_size=21, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        group = VGroup(bg, label)
        group.to_corner(UL, buff=0.36).shift(DOWN * 0.55)
        return group

    def legend_chip(self, text, color):
        bg = RoundedRectangle(
            width=3.6, height=0.5, corner_radius=0.12,
            stroke_color=color, stroke_width=2,
            fill_color="#ffffff", fill_opacity=1,
        )
        label = Text(text, font_size=16, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)
