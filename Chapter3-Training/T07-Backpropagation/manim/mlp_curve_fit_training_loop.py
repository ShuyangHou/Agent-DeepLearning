import math

from manimlib import *


BLUE_FORWARD = "#2563eb"
RED_LOSS = "#dc2626"
PURPLE_GRAD = "#7c3aed"
GREEN_UPDATE = "#16a34a"
INK = "#0f172a"
MUTED = "#64748b"
PANEL_BG = "#f8fafc"
PANEL_LINE = "#cbd5e1"


SAMPLE_XS = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0]
TRUE_FN = lambda x: math.sin(2.4 * x) * 0.55
SAMPLE_YS = [TRUE_FN(x) for x in SAMPLE_XS]

STEP_LINES = [
    [-0.05, -0.05, -0.04, -0.02, 0.0, 0.02],
    [-0.32, -0.22, -0.12, 0.04, 0.18, 0.28],
    [-0.50, -0.32, -0.15, 0.18, 0.34, 0.46],
    [-0.55, -0.36, -0.14, 0.20, 0.40, 0.52],
]
STEP_LOSS = [0.42, 0.18, 0.06, 0.02]


class MLPCurveFitTrainingLoop(Scene):
    # T07 picture 8-10: training loop - fit curve converges toward the target.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Training loop: update weights, curve gets closer", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("forward / loss / backward / update   ->   repeat", font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)
        axes = Axes(
            x_range=[-1.1, 1.1, 0.5],
            y_range=[-0.8, 0.8, 0.4],
            width=6.4,
            height=4.0,
            axis_config={
                "stroke_color": PANEL_LINE,
                "stroke_width": 1.5,
                "include_tip": False,
            },
        )
        axes.move_to(LEFT * 3.4 + DOWN * 0.3)
        axes_label_x = Text("x", font_size=18, weight=BOLD).set_color(MUTED)
        axes_label_y = Text("y", font_size=18, weight=BOLD).set_color(MUTED)
        axes_label_x.next_to(axes.x_axis.get_right(), DOWN, buff=0.12)
        axes_label_y.next_to(axes.y_axis.get_top(), LEFT, buff=0.12)
        true_curve = axes.get_graph(TRUE_FN, color="#94a3b8", x_range=[-1.05, 1.05])
        true_curve.set_stroke(width=2.5, opacity=0.9)
        true_curve = DashedVMobject(true_curve, num_dashes=24)
        true_label = Text("target y", font_size=16, weight=BOLD)
        true_label.set_color(MUTED)
        true_label.next_to(true_curve.point_from_proportion(0.95), UR, buff=0.1)
        sample_dots = VGroup()
        for x, y in zip(SAMPLE_XS, SAMPLE_YS):
            dot = Dot(axes.c2p(x, y), radius=0.07, color=INK)
            sample_dots.add(dot)
        panel_bg = RoundedRectangle(
            width=5.0, height=4.5, corner_radius=0.18,
            stroke_color=PANEL_LINE, stroke_width=2,
            fill_color="#ffffff", fill_opacity=1,
        )
        panel_bg.move_to(RIGHT * 3.3 + DOWN * 0.3)
        panel_title = Text("Training state", font_size=20, weight=BOLD)
        panel_title.set_color(INK)
        panel_title.move_to(panel_bg.get_top() + DOWN * 0.32)
        epoch_label = self.kv_row("Epoch", "0 / 4", BLUE_FORWARD)
        loss_label = self.kv_row("Loss", "--", RED_LOSS)
        grad_label = self.kv_row("Avg grad", "--", PURPLE_GRAD)
        update_label = self.kv_row("Last update", "waiting", GREEN_UPDATE)
        info_stack = VGroup(epoch_label, loss_label, grad_label, update_label)
        info_stack.arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        info_stack.next_to(panel_title, DOWN, buff=0.32)
        info_stack.align_to(panel_bg.get_left(), LEFT).shift(RIGHT * 0.32)
        bar_title = Text("Loss per epoch", font_size=18, weight=BOLD).set_color(MUTED)
        bar_title.next_to(info_stack, DOWN, buff=0.32).align_to(info_stack, LEFT)
        bars = VGroup()
        bar_axes_y = bar_title.get_bottom() + DOWN * 0.15
        max_bar_h = 1.2
        bar_width = 0.62
        bar_gap = 0.18
        start_x = bar_title.get_left()[0] + 0.18
        for i in range(4):
            bg = Rectangle(
                width=bar_width, height=max_bar_h,
                stroke_color=PANEL_LINE, stroke_width=1.2,
                fill_color="#f1f5f9", fill_opacity=1,
            )
            bg.move_to([start_x + i * (bar_width + bar_gap) + bar_width / 2,
                        bar_axes_y[1] - max_bar_h / 2, 0])
            cap = Text(f"E{i + 1}", font_size=13, weight=BOLD).set_color(MUTED)
            cap.next_to(bg, DOWN, buff=0.06)
            bars.add(VGroup(bg, cap))
        panel = VGroup(panel_bg, panel_title, info_stack, bar_title, bars)
        self.play(
            FadeIn(title, shift=DOWN * 0.1),
            FadeIn(subtitle, shift=DOWN * 0.1),
            ShowCreation(axes),
            FadeIn(VGroup(axes_label_x, axes_label_y)),
            ShowCreation(true_curve),
            FadeIn(true_label),
            LaggedStart(*[FadeIn(d, scale=0.6) for d in sample_dots], lag_ratio=0.08),
            FadeIn(panel),
            run_time=1.4,
        )
        current_line = self.line_through(axes, STEP_LINES[0])
        self.play(ShowCreation(current_line), run_time=0.5)
        for epoch in range(4):
            new_epoch = self.kv_row("Epoch", f"{epoch + 1} / 4", BLUE_FORWARD)
            new_epoch.move_to(epoch_label.get_center()).align_to(epoch_label, LEFT)
            self.play(Transform(epoch_label, new_epoch), run_time=0.25)
            forward_pulses = []
            for dot in sample_dots:
                pulse = Dot(dot.get_center(), radius=0.12, color=BLUE_FORWARD).set_opacity(0.6)
                forward_pulses.append(pulse)
            self.play(LaggedStart(*[FadeIn(p, scale=2.2, run_time=0.4) for p in forward_pulses],
                                  lag_ratio=0.04), run_time=0.5)
            self.play(*[FadeOut(p) for p in forward_pulses], run_time=0.2)
            loss_val = STEP_LOSS[epoch]
            new_loss = self.kv_row("Loss", f"{loss_val:.2f}", RED_LOSS)
            new_loss.move_to(loss_label.get_center()).align_to(loss_label, LEFT)
            self.play(Transform(loss_label, new_loss), run_time=0.25)
            bar_bg = bars[epoch][0]
            fill_height = max_bar_h * (loss_val / STEP_LOSS[0])
            fill = Rectangle(
                width=bar_bg.get_width(), height=fill_height,
                stroke_color=RED_LOSS, stroke_width=1.5,
                fill_color=RED_LOSS, fill_opacity=0.85,
            )
            fill.move_to([bar_bg.get_center()[0],
                          bar_bg.get_bottom()[1] + fill_height / 2, 0])
            self.play(GrowFromEdge(fill, DOWN), run_time=0.35)
            grad_text = f"-{abs(0.45 - epoch * 0.12):.2f}"
            new_grad = self.kv_row("Avg grad", grad_text, PURPLE_GRAD)
            new_grad.move_to(grad_label.get_center()).align_to(grad_label, LEFT)
            self.play(Transform(grad_label, new_grad),
                      Flash(current_line.get_center(), color=PURPLE_GRAD, flash_radius=0.6),
                      run_time=0.4)
            new_update = self.kv_row("Last update", "w <- w - lr * grad", GREEN_UPDATE)
            new_update.move_to(update_label.get_center()).align_to(update_label, LEFT)
            self.play(Transform(update_label, new_update), run_time=0.25)
            if epoch + 1 < len(STEP_LINES):
                next_line = self.line_through(axes, STEP_LINES[epoch + 1])
                self.play(Transform(current_line, next_line), run_time=0.7)
            else:
                self.play(Indicate(current_line, color=GREEN_UPDATE, scale_factor=1.04), run_time=0.5)
        final_note = Text("Each epoch: prediction curve moves closer to the truth", font_size=22, weight=BOLD)
        final_note.set_color(GREEN_UPDATE)
        final_note.to_edge(DOWN, buff=0.3)
        self.play(FadeIn(final_note, shift=UP * 0.1),
                  Flash(current_line.point_from_proportion(0.5), color=GREEN_UPDATE, flash_radius=0.8),
                  run_time=0.7)
        self.wait(0.9)

    def kv_row(self, key, value, color):
        k = Text(key, font_size=17, weight=BOLD)
        k.set_color(MUTED)
        v = Text(value, font_size=19, weight=BOLD)
        v.set_color(color)
        v.next_to(k, RIGHT, buff=0.3)
        return VGroup(k, v)

    def line_through(self, axes, ys):
        points = [axes.c2p(x, y) for x, y in zip(SAMPLE_XS, ys)]
        line = VMobject()
        line.set_points_smoothly(points)
        line.set_stroke(BLUE_FORWARD, width=4)
        return line
