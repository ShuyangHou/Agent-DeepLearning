from manimlib import *

import math


BLUE_FORWARD = "#2563eb"
RED_LOSS = "#dc2626"
PURPLE_GRAD = "#7c3aed"
GREEN_UPDATE = "#16a34a"
ORANGE_LR = "#f97316"
INK = "#0f172a"
MUTED = "#64748b"
PANEL_BG = "#f8fafc"
PANEL_LINE = "#cbd5e1"


class LrValleyWalk(Scene):
    # T10 picture 1: drop a ball on a U-shaped Loss valley, then sweep through
    # four learning rates -- too small / good / too large / huge -- and watch
    # the trajectory go from slow but safe to oscillating to outright divergent.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Learning rate is the step length", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("same valley, four eta -- small / good / large / huge",
                        font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        # === Axes (the valley) ===
        axes = Axes(
            x_range=[-3.2, 3.2, 1.0],
            y_range=[0, 5.0, 1.0],
            width=10.2,
            height=4.4,
            axis_config={
                "stroke_color": MUTED,
                "stroke_width": 1.6,
                "include_tip": False,
                "include_ticks": True,
            },
        )
        axes.move_to(DOWN * 0.4)
        x_label = Text("w", font_size=20, weight=BOLD)
        x_label.set_color(MUTED)
        x_label.next_to(axes, DOWN, buff=0.16)
        y_label = Text("Loss", font_size=20, weight=BOLD)
        y_label.set_color(MUTED)
        y_label.next_to(axes, LEFT, buff=0.18).rotate(PI / 2)

        def loss(w):
            return 0.5 * w * w

        def grad(w):
            return w

        curve = axes.get_graph(loss, x_range=[-3.0, 3.0], color=BLUE_FORWARD)
        curve.set_stroke(width=3)
        target_ring = Circle(radius=0.12, color=GREEN_UPDATE, stroke_width=2.5)
        target_ring.move_to(axes.c2p(0, 0))
        target_label = Text("w* = 0", font_size=18, weight=BOLD)
        target_label.set_color(GREEN_UPDATE)
        target_label.next_to(target_ring, DOWN, buff=0.18)

        stage_tag = self.make_stage_tag("Stage 1 / The valley", BLUE_FORWARD)
        self.play(FadeIn(title, shift=DOWN * 0.1), FadeIn(subtitle, shift=DOWN * 0.1),
                  FadeIn(stage_tag), run_time=0.4)
        self.play(FadeIn(axes), FadeIn(x_label), FadeIn(y_label), run_time=0.4)
        self.play(ShowCreation(curve), run_time=0.8)
        self.play(FadeIn(target_ring, scale=0.6), FadeIn(target_label, shift=UP * 0.05),
                  run_time=0.4)

        # === Helper: simulate gradient descent and return point list ===
        def gd_points(w0, lr, steps, clamp=20.0):
            pts = [(w0, loss(w0))]
            w = w0
            for _ in range(steps):
                w = w - lr * grad(w)
                w = max(-clamp, min(clamp, w))
                pts.append((w, loss(w)))
            return pts

        # ---- helper to play one descent stage ----
        def play_stage(stage_name, lr, steps, color, w0=2.6, clamp_view=3.0, run_step=0.45):
            nonlocal stage_tag
            new_stage = self.make_stage_tag(stage_name, color)
            new_stage.move_to(stage_tag.get_center())
            self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
            stage_tag = new_stage

            ball = Dot(axes.c2p(w0, loss(w0)), color=ORANGE_LR, radius=0.11)
            ball.set_stroke("#ffffff", width=2)
            self.play(FadeIn(ball, scale=0.6), run_time=0.3)

            pts = gd_points(w0, lr, steps)
            trail_dots = VGroup()
            for k in range(1, len(pts)):
                w_prev, l_prev = pts[k - 1]
                w_now, l_now = pts[k]
                # clamp visually so the dot stays inside the axes box
                vw = max(-clamp_view, min(clamp_view, w_now))
                vl = min(5.0, loss(vw))
                # tiny trail marker at the previous point
                trail = Dot(axes.c2p(max(-clamp_view, min(clamp_view, w_prev)), min(5.0, loss(max(-clamp_view, min(clamp_view, w_prev))))),
                            color=color, radius=0.05)
                trail.set_opacity(0.7)
                trail_dots.add(trail)
                self.add(trail)
                self.play(ball.animate.move_to(axes.c2p(vw, vl)),
                          run_time=run_step)
            return ball, trail_dots

        # === Stage 2: tiny eta ===
        ball_a, trail_a = play_stage(
            "Stage 2 / eta = 0.05  (small, safe)", lr=0.05, steps=4,
            color=BLUE_FORWARD, w0=2.6, run_step=0.42,
        )
        small_caption = Text("ball barely moves", font_size=18, weight=BOLD)
        small_caption.set_color(BLUE_FORWARD)
        small_caption.next_to(axes, UP, buff=0.05).shift(LEFT * 3.2)
        self.play(FadeIn(small_caption, shift=DOWN * 0.05), run_time=0.3)
        self.wait(0.25)
        self.play(FadeOut(ball_a), FadeOut(trail_a), FadeOut(small_caption), run_time=0.3)

        # === Stage 3: good eta ===
        ball_b, trail_b = play_stage(
            "Stage 3 / eta = 0.4  (good, fast)", lr=0.4, steps=5,
            color=GREEN_UPDATE, w0=2.6, run_step=0.38,
        )
        good_caption = Text("smooth descent to the bottom", font_size=18, weight=BOLD)
        good_caption.set_color(GREEN_UPDATE)
        good_caption.next_to(axes, UP, buff=0.05).shift(LEFT * 2.6)
        self.play(FadeIn(good_caption, shift=DOWN * 0.05), run_time=0.3)
        self.wait(0.3)
        self.play(FadeOut(ball_b), FadeOut(trail_b), FadeOut(good_caption), run_time=0.3)

        # === Stage 4: large eta (zigzag) ===
        ball_c, trail_c = play_stage(
            "Stage 4 / eta = 1.5  (too large, zigzag)", lr=1.5, steps=5,
            color=ORANGE_LR, w0=2.6, run_step=0.36,
        )
        big_caption = Text("jumps across the bottom", font_size=18, weight=BOLD)
        big_caption.set_color(ORANGE_LR)
        big_caption.next_to(axes, UP, buff=0.05).shift(LEFT * 2.8)
        self.play(FadeIn(big_caption, shift=DOWN * 0.05), run_time=0.3)
        self.wait(0.3)
        self.play(FadeOut(ball_c), FadeOut(trail_c), FadeOut(big_caption), run_time=0.3)

        # === Stage 5: huge eta (divergent) ===
        new_stage = self.make_stage_tag("Stage 5 / eta = 2.1  (diverges)", RED_LOSS)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        ball = Dot(axes.c2p(2.6, loss(2.6)), color=RED_LOSS, radius=0.11)
        ball.set_stroke("#ffffff", width=2)
        self.play(FadeIn(ball, scale=0.6), run_time=0.3)

        pts = gd_points(2.6, 2.1, 3)
        trail = VGroup()
        for k in range(1, len(pts)):
            w_now, _ = pts[k]
            vw = max(-3.0, min(3.0, w_now))
            vl = min(5.0, loss(vw))
            dot = Dot(axes.c2p(vw, vl), color=RED_LOSS, radius=0.05)
            dot.set_opacity(0.7)
            trail.add(dot)
            self.add(dot)
            self.play(ball.animate.move_to(axes.c2p(vw, vl)), run_time=0.34)
        # the next step would fly off-screen; draw a red arrow up
        fly = Arrow(axes.c2p(-2.6, 4.3), axes.c2p(-2.6, 5.0),
                    buff=0.05, stroke_color=RED_LOSS, stroke_width=5)
        loss_up = Text("Loss flies up", font_size=20, weight=BOLD)
        loss_up.set_color(RED_LOSS)
        loss_up.next_to(fly, RIGHT, buff=0.18)
        self.play(GrowArrow(fly), FadeIn(loss_up, shift=UP * 0.05), run_time=0.45)
        self.wait(0.3)

        # === Stage 6: closing caption ===
        new_stage = self.make_stage_tag("Stage 6 / Pick eta with care", INK)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        legend_items = [
            ("eta = 0.05  slow but safe", BLUE_FORWARD),
            ("eta = 0.4   smooth descent", GREEN_UPDATE),
            ("eta = 1.5   zigzag around bottom", ORANGE_LR),
            ("eta = 2.1   diverges, Loss explodes", RED_LOSS),
        ]
        chips = VGroup()
        for text, color in legend_items:
            chips.add(self.legend_chip(text, color))
        chips.arrange(DOWN, buff=0.12, aligned_edge=LEFT)
        chips.to_corner(DR, buff=0.45).shift(UP * 0.0)
        self.play(LaggedStart(*[FadeIn(c, shift=LEFT * 0.1) for c in chips],
                              lag_ratio=0.15), run_time=0.6)

        closing = Text("direction comes from the gradient, step length comes from eta",
                       font_size=22, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.28)
        self.play(FadeIn(closing, shift=UP * 0.1), run_time=0.4)
        self.wait(0.9)

    # ---------- helpers ----------

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=6.2, height=0.55, corner_radius=0.14,
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
            width=4.2, height=0.46, corner_radius=0.12,
            stroke_color=color, stroke_width=2,
            fill_color="#ffffff", fill_opacity=1,
        )
        label = Text(text, font_size=15, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)
