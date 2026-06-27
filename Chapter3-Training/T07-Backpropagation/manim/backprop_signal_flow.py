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


class BackpropSignalFlow(Scene):
    # T07 picture 1-5 and 8-10: forward / loss / backward / update signal flow.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Backprop: how a loss reaches every weight", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)

        subtitle = Text("forward -> compare with truth -> send blame back to each weight", font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        # === Network structure: x -> h (3 units) -> y_hat ===
        input_node, input_label = self.make_node("x", BLUE_FORWARD, "#dbeafe")
        hidden_nodes = []
        hidden_labels = []
        for i in range(3):
            node, label = self.make_node(f"h{i + 1}", BLUE_FORWARD, "#e0e7ff")
            hidden_nodes.append(node)
            hidden_labels.append(label)
        output_node, output_label = self.make_node("y'", BLUE_FORWARD, "#dbeafe")

        # Layout
        input_node.move_to(LEFT * 4.6 + DOWN * 0.4)
        for i, node in enumerate(hidden_nodes):
            node.move_to(LEFT * 0.4 + UP * (1.4 - i * 1.4))
        output_node.move_to(RIGHT * 4.0 + DOWN * 0.4)

        for label, node in zip([input_label] + hidden_labels + [output_label],
                               [input_node] + hidden_nodes + [output_node]):
            label.move_to(node.get_center())

        # Edges
        edges_in = []
        edges_out = []
        edge_labels_in = []
        edge_labels_out = []
        for i, node in enumerate(hidden_nodes):
            arrow = self.make_edge(input_node, node)
            edges_in.append(arrow)
            w_label = Text(f"w1{i + 1}", font_size=16, weight=BOLD)
            w_label.set_color(ORANGE_PARAM)
            w_label.next_to(arrow.get_center(), UP * 0.2 + RIGHT * 0.08, buff=0.05)
            edge_labels_in.append(w_label)
        for i, node in enumerate(hidden_nodes):
            arrow = self.make_edge(node, output_node)
            edges_out.append(arrow)
            w_label = Text(f"w2{i + 1}", font_size=16, weight=BOLD)
            w_label.set_color(ORANGE_PARAM)
            w_label.next_to(arrow.get_center(), UP * 0.2 + LEFT * 0.08, buff=0.05)
            edge_labels_out.append(w_label)

        network = VGroup(
            *edges_in, *edges_out,
            input_node, *hidden_nodes, output_node,
            input_label, *hidden_labels, output_label,
            *edge_labels_in, *edge_labels_out,
        )

        self.play(
            FadeIn(title, shift=DOWN * 0.1),
            FadeIn(subtitle, shift=DOWN * 0.1),
            FadeIn(network, lag_ratio=0.02),
            run_time=0.9,
        )

        # === Stage 1: forward (blue flow) ===
        stage_tag = self.make_stage_tag("Stage 1 / Forward", BLUE_FORWARD)
        self.play(FadeIn(stage_tag), run_time=0.3)

        forward_pulses = []
        for arrow in edges_in + edges_out:
            pulse = arrow.copy().set_stroke(BLUE_FORWARD, width=6, opacity=0.85)
            forward_pulses.append(pulse)
        self.play(LaggedStart(*[ShowPassingFlash(p, time_width=0.5, run_time=0.7) for p in forward_pulses],
                              lag_ratio=0.12))

        # Show prediction
        y_hat_box = self.value_box("y' = 0.42", BLUE_FORWARD, "#dbeafe")
        y_hat_box.next_to(output_node, RIGHT, buff=0.25)
        self.play(FadeIn(y_hat_box, scale=0.95), run_time=0.35)

        # === Stage 2: compute loss (red) ===
        new_stage = self.make_stage_tag("Stage 2 / Loss", RED_LOSS)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        y_true_box = self.value_box("y = 1.00", INK, "#e2e8f0")
        y_true_box.next_to(y_hat_box, DOWN, buff=0.18)
        loss_box = self.value_box("L = (1.00 - 0.42)^2 = 0.34", RED_LOSS, "#fee2e2")
        loss_box.next_to(y_true_box, DOWN, buff=0.18)

        self.play(FadeIn(y_true_box, shift=UP * 0.1), run_time=0.3)
        self.play(FadeIn(loss_box, scale=0.95),
                  Flash(loss_box.get_center(), color=RED_LOSS, flash_radius=0.6),
                  run_time=0.5)

        # === Stage 3: backward (purple flow back through the net) ===
        new_stage = self.make_stage_tag("Stage 3 / Backward", PURPLE_GRAD)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        grad_label = Text("Send blame for L back through the network", font_size=20, weight=BOLD)
        grad_label.set_color(PURPLE_GRAD)
        grad_label.next_to(loss_box, DOWN, buff=0.18)
        self.play(FadeIn(grad_label, shift=UP * 0.1), run_time=0.25)

        back_pulses = []
        for arrow in (edges_out + edges_in)[::-1]:
            pulse = arrow.copy().set_stroke(PURPLE_GRAD, width=6, opacity=0.9)
            back_pulses.append(pulse)
        self.play(LaggedStart(*[ShowPassingFlash(p, time_width=0.55, run_time=0.7) for p in back_pulses],
                              lag_ratio=0.12))

        grad_examples = VGroup(
            self.grad_chip("dL/dw23 = -0.21", PURPLE_GRAD),
            self.grad_chip("dL/dw13 = +0.08", PURPLE_GRAD),
            self.grad_chip("dL/dw11 = -0.12", PURPLE_GRAD),
        )
        grad_examples.arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        grad_examples.next_to(grad_label, DOWN, buff=0.18)
        self.play(LaggedStart(*[FadeIn(chip, shift=UP * 0.05) for chip in grad_examples], lag_ratio=0.18))

        # === Stage 4: parameter update (green wiggle on every weight) ===
        new_stage = self.make_stage_tag("Stage 4 / Update", GREEN_UPDATE)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        update_rule = Text("w  <-  w  -  lr  *  dL/dw", font_size=22, weight=BOLD)
        update_rule.set_color(GREEN_UPDATE)
        update_rule.move_to(grad_label.get_center())
        self.play(FadeOut(grad_label), FadeIn(update_rule), run_time=0.3)

        wiggle = []
        for w_label in edge_labels_in + edge_labels_out:
            wiggle.append(Indicate(w_label, color=GREEN_UPDATE, scale_factor=1.25))
        self.play(LaggedStart(*wiggle, lag_ratio=0.06), run_time=1.2)

        # === Stage 5: rerun forward, loss drops ===
        new_stage = self.make_stage_tag("Stage 5 / Predict again", BLUE_FORWARD)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        self.play(LaggedStart(*[ShowPassingFlash(p.copy().set_stroke(BLUE_FORWARD, width=6),
                                                 time_width=0.5, run_time=0.6) for p in forward_pulses],
                              lag_ratio=0.12))

        new_yhat = self.value_box("y' = 0.71", BLUE_FORWARD, "#dbeafe")
        new_yhat.move_to(y_hat_box.get_center())
        new_loss = self.value_box("L = (1.00 - 0.71)^2 = 0.08", GREEN_UPDATE, "#dcfce7")
        new_loss.move_to(loss_box.get_center())
        self.play(
            Transform(y_hat_box, new_yhat),
            Transform(loss_box, new_loss),
            FadeOut(grad_examples),
            FadeOut(update_rule),
            run_time=0.6,
        )
        self.play(Flash(loss_box.get_center(), color=GREEN_UPDATE, flash_radius=0.6), run_time=0.4)

        closing = Text("forward / backward / update  =  one round of backprop", font_size=22, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.3)
        self.play(FadeIn(closing, shift=UP * 0.1), run_time=0.4)
        self.wait(0.8)

    # ---------- helpers ----------

    def make_node(self, text, stroke, fill):
        circle = Circle(radius=0.45, stroke_color=stroke, stroke_width=3,
                        fill_color=fill, fill_opacity=1)
        label = Text(text, font_size=22, weight=BOLD)
        label.set_color(INK)
        return circle, label

    def make_edge(self, a, b):
        arrow = Arrow(
            a.get_center(), b.get_center(),
            buff=0.5,
            stroke_color=PANEL_LINE,
            stroke_width=2.2,
        )
        return arrow

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=4.4, height=0.55, corner_radius=0.14,
            stroke_color=color, stroke_width=2.5,
            fill_color="#ffffff", fill_opacity=0.95,
        )
        label = Text(text, font_size=21, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        group = VGroup(bg, label)
        group.to_corner(UL, buff=0.36).shift(DOWN * 0.55)
        return group

    def value_box(self, text, color, fill):
        bg = RoundedRectangle(
            width=3.4, height=0.55, corner_radius=0.12,
            stroke_color=color, stroke_width=2.5,
            fill_color=fill, fill_opacity=1,
        )
        label = Text(text, font_size=20, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)

    def grad_chip(self, text, color):
        bg = RoundedRectangle(
            width=3.1, height=0.42, corner_radius=0.1,
            stroke_color=color, stroke_width=1.8,
            fill_color="#f5f3ff", fill_opacity=1,
        )
        label = Text(text, font_size=17, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)
