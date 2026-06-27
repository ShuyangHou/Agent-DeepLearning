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

SMALL_COLOR = RED_LOSS       # small eta = slow, label red
GOOD_COLOR = BLUE_FORWARD    # good eta = mid blue
LARGE_COLOR = ORANGE_LR      # large eta = orange


def build_dataset(n=28, seed=7):
    # mirror of guide.js MLP dataset (deterministic LCG)
    s = seed
    xs, ys = [], []
    for i in range(n):
        x = -3.0 + 6.0 * i / (n - 1)
        s = (s * 1103515245 + 12345) & 0x7fffffff
        noise = (((s >> 8) & 0xffff) / 0xffff - 0.5) * 0.18
        y = 1.2 * math.sin(1.6 * x) + 0.1 * x + noise
        xs.append(x)
        ys.append(y)
    return xs, ys


def mlp_loss(theta, xs, ys):
    a, b, c = theta
    total = 0.0
    for i in range(len(xs)):
        d = a * math.sin(b * xs[i]) + c - ys[i]
        total += d * d
    return total / len(xs)


def mlp_grad(theta, xs, ys):
    a, b, c = theta
    n = len(xs)
    ga = gb = gc = 0.0
    for i in range(n):
        x = xs[i]; y = ys[i]
        s = math.sin(b * x)
        pred = a * s + c
        err = pred - y
        ga += 2 * err * s
        gb += 2 * err * a * x * math.cos(b * x)
        gc += 2 * err
    return ga / n, gb / n, gc / n


def mlp_step(theta, lr, xs, ys):
    g = mlp_grad(theta, xs, ys)
    out = [theta[i] - lr * g[i] for i in range(3)]
    for i in range(3):
        if not math.isfinite(out[i]):
            out[i] = theta[i]
        out[i] = max(-20.0, min(20.0, out[i]))
    return out


def simulate(lr, steps, xs, ys, init=(0.4, 0.7, 0.0)):
    theta = list(init)
    losses = [mlp_loss(theta, xs, ys)]
    for _ in range(steps):
        theta = mlp_step(theta, lr, xs, ys)
        losses.append(mlp_loss(theta, xs, ys))
    return losses


class LrMlpCompare(Scene):
    # T10 picture 2: three Loss curves for the same MLP fit problem
    # with eta = 0.005 / 0.05 / 0.4 over 30 steps.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Same MLP, three learning rates", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("y = a sin(b x) + c   fitting noisy points, 30 GD steps",
                        font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        xs, ys = build_dataset()

        steps = 30
        series = [
            ("eta = 0.005", 0.005, SMALL_COLOR, "slow, hardly moves"),
            ("eta = 0.05",  0.05,  GOOD_COLOR,  "smooth and effective"),
            ("eta = 0.4",   0.4,   LARGE_COLOR, "oscillates, may explode"),
        ]
        all_losses = []
        for _, lr, _, _ in series:
            all_losses.append(simulate(lr, steps, xs, ys))

        # clamp y axis for plotting
        flat = [v for arr in all_losses for v in arr if math.isfinite(v)]
        y_max = min(2.5, max(flat) * 1.05)

        axes = Axes(
            x_range=[0, steps, 5],
            y_range=[0, y_max, max(0.25, y_max / 5)],
            width=10.0,
            height=4.4,
            axis_config={
                "stroke_color": MUTED,
                "stroke_width": 1.6,
                "include_tip": False,
                "include_ticks": True,
            },
        )
        axes.move_to(DOWN * 0.4)
        x_label = Text("step", font_size=18, weight=BOLD)
        x_label.set_color(MUTED)
        x_label.next_to(axes, DOWN, buff=0.18)
        y_label = Text("Loss", font_size=18, weight=BOLD)
        y_label.set_color(MUTED)
        y_label.next_to(axes, LEFT, buff=0.18).rotate(PI / 2)

        stage_tag = self.make_stage_tag("Stage 1 / Same axes", BLUE_FORWARD)
        self.play(FadeIn(title, shift=DOWN * 0.1), FadeIn(subtitle, shift=DOWN * 0.1),
                  FadeIn(stage_tag), run_time=0.4)
        self.play(FadeIn(axes), FadeIn(x_label), FadeIn(y_label), run_time=0.5)

        # === Draw each series in turn ===
        for k, (name, lr, color, note) in enumerate(series):
            stage_name = f"Stage {k + 2} / {name}"
            new_stage = self.make_stage_tag(stage_name, color)
            new_stage.move_to(stage_tag.get_center())
            self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.2)
            stage_tag = new_stage

            losses = all_losses[k]
            pts = []
            for i, v in enumerate(losses):
                v_use = min(y_max, v) if math.isfinite(v) else y_max
                pts.append(axes.c2p(i, v_use))
            curve = VMobject()
            curve.set_points_as_corners(pts)
            curve.set_stroke(color, width=3, opacity=0.95)

            note_text = Text(note, font_size=18, weight=BOLD)
            note_text.set_color(color)
            note_text.next_to(axes, UP, buff=0.05).shift(LEFT * 2.6 + DOWN * 0.05 + UP * (0.55 - 0.32 * k))

            self.play(ShowCreation(curve), run_time=1.0)
            self.play(FadeIn(note_text, shift=DOWN * 0.05), run_time=0.3)
            self.wait(0.25)

        # === Closing legend + caption ===
        new_stage = self.make_stage_tag("Stage 5 / Take the trade-off", INK)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.2)
        stage_tag = new_stage

        chips = VGroup()
        for name, _, color, _ in series:
            chips.add(self.legend_chip(name, color))
        chips.arrange(DOWN, buff=0.12, aligned_edge=LEFT)
        chips.to_corner(UR, buff=0.5).shift(DOWN * 1.0)
        self.play(LaggedStart(*[FadeIn(c, shift=LEFT * 0.1) for c in chips],
                              lag_ratio=0.18), run_time=0.6)

        closing = Text("small eta = slow   |   good eta = fast and stable   |   large eta = noisy / divergent",
                       font_size=20, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.3)
        self.play(FadeIn(closing, shift=UP * 0.1), run_time=0.4)
        self.wait(0.9)

    # ---------- helpers ----------

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=5.4, height=0.55, corner_radius=0.14,
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
            width=3.0, height=0.5, corner_radius=0.12,
            stroke_color=color, stroke_width=2,
            fill_color="#ffffff", fill_opacity=1,
        )
        label = Text(text, font_size=16, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)
