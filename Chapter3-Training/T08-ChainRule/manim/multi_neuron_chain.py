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


class MultiNeuronChain(Scene):
    # T08 picture 4-5: multi-neuron view of the chain rule.
    # Three hidden neurons share the downstream output -> loss path,
    # each carries its own local segment back to its own weight.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Shared downstream, private upstream", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("each w_i shares dL/dy' but keeps its own dz_i/dw_i",
                        font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        # === Network: x -> h1/h2/h3 -> y' -> L ===
        x_node, x_label = self.make_node("x", BLUE_FORWARD, "#dbeafe")
        hidden_nodes = []
        hidden_labels = []
        for i in range(3):
            node, label = self.make_node(f"h{i + 1}", BLUE_FORWARD, "#e0e7ff")
            hidden_nodes.append(node)
            hidden_labels.append(label)
        y_node, y_label = self.make_node("y'", BLUE_FORWARD, "#dbeafe")
        l_node, l_label = self.make_node("L", RED_LOSS, "#fee2e2")

        x_node.move_to(LEFT * 5.2 + DOWN * 0.2)
        for i, node in enumerate(hidden_nodes):
            node.move_to(LEFT * 1.6 + UP * (1.6 - i * 1.6))
        y_node.move_to(RIGHT * 2.4 + DOWN * 0.2)
        l_node.move_to(RIGHT * 5.2 + DOWN * 0.2)

        for label, node in zip(
            [x_label, *hidden_labels, y_label, l_label],
            [x_node, *hidden_nodes, y_node, l_node],
        ):
            label.move_to(node.get_center())

        edges_in = [self.make_edge(x_node, h) for h in hidden_nodes]
        edges_out = [self.make_edge(h, y_node) for h in hidden_nodes]
        edge_yl = self.make_edge(y_node, l_node)

        w_labels = []
        for i, arrow in enumerate(edges_in):
            label = Text(f"w{i + 1}", font_size=18, weight=BOLD)
            label.set_color(ORANGE_PARAM)
            label.next_to(arrow.get_center(), UP * 0.18 + RIGHT * 0.05, buff=0.06)
            w_labels.append(label)

        network = VGroup(
            *edges_in, *edges_out, edge_yl,
            x_node, *hidden_nodes, y_node, l_node,
            x_label, *hidden_labels, y_label, l_label,
            *w_labels,
        )

        self.play(
            FadeIn(title, shift=DOWN * 0.1),
            FadeIn(subtitle, shift=DOWN * 0.1),
            FadeIn(network, lag_ratio=0.02),
            run_time=0.9,
        )

        # === Stage 1: forward flow (blue) ===
        stage_tag = self.make_stage_tag("Stage 1 / Forward", BLUE_FORWARD)
        self.play(FadeIn(stage_tag), run_time=0.3)
        forward_pulses = [arrow.copy().set_stroke(BLUE_FORWARD, width=6, opacity=0.85)
                          for arrow in edges_in + edges_out + [edge_yl]]
        self.play(LaggedStart(*[ShowPassingFlash(p, time_width=0.5, run_time=0.65)
                                for p in forward_pulses], lag_ratio=0.12))

        # === Stage 2: loss flashes, downstream segment lights ===
        new_stage = self.make_stage_tag("Stage 2 / Loss + shared trunk", RED_LOSS)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        loss_flash = Flash(l_node.get_center(), color=RED_LOSS, flash_radius=0.6)
        shared_pulse = edge_yl.copy().set_stroke(PURPLE_GRAD, width=6, opacity=0.95)
        shared_chip = self.shared_chip("dL/dy'", PURPLE_GRAD)
        shared_chip.next_to(edge_yl.get_center(), UP, buff=0.2)
        self.play(loss_flash, run_time=0.4)
        self.play(ShowPassingFlash(shared_pulse, time_width=0.6, run_time=0.7),
                  FadeIn(shared_chip, shift=DOWN * 0.1), run_time=0.7)

        # === Stage 3: purple splits back into each hidden neuron ===
        new_stage = self.make_stage_tag("Stage 3 / Split per neuron", PURPLE_GRAD)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        split_pulses = []
        for arrow in edges_out:
            split_pulses.append(arrow.copy().set_stroke(PURPLE_GRAD, width=6, opacity=0.9))
        self.play(LaggedStart(*[ShowPassingFlash(p, time_width=0.55, run_time=0.7)
                                for p in split_pulses], lag_ratio=0.15))

        # === Stage 4: each w_i collects its full chain into dL/dw_i ===
        new_stage = self.make_stage_tag("Stage 4 / Per-weight gradients", GREEN_UPDATE)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        chips = []
        formulas = [
            "dL/dw1 = dL/dy' * dy'/dh1 * dh1/dz1 * dz1/dw1",
            "dL/dw2 = dL/dy' * dy'/dh2 * dh2/dz2 * dz2/dw2",
            "dL/dw3 = dL/dy' * dy'/dh3 * dh3/dz3 * dz3/dw3",
        ]
        for i, (h_node, w_label, text) in enumerate(zip(hidden_nodes, w_labels, formulas)):
            local_in = edges_in[i].copy().set_stroke(PURPLE_GRAD, width=6, opacity=0.9)
            chip = self.grad_chip(text, GREEN_UPDATE)
            chip.next_to(h_node, LEFT, buff=0.55)
            chip.shift(LEFT * 0.6)
            self.play(
                ShowPassingFlash(local_in, time_width=0.6, run_time=0.55),
                Indicate(w_label, color=GREEN_UPDATE, scale_factor=1.3),
                FadeIn(chip, shift=RIGHT * 0.1),
                run_time=0.6,
            )
            chips.append(chip)

        # === Stage 5: closing caption ===
        new_stage = self.make_stage_tag("Stage 5 / Share + private", INK)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        closing = Text("downstream shared,  upstream private",
                       font_size=24, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.35)
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
        return Arrow(
            a.get_center(), b.get_center(),
            buff=0.5,
            stroke_color=PANEL_LINE,
            stroke_width=2.2,
        )

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=5.0, height=0.55, corner_radius=0.14,
            stroke_color=color, stroke_width=2.5,
            fill_color="#ffffff", fill_opacity=0.95,
        )
        label = Text(text, font_size=21, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        group = VGroup(bg, label)
        group.to_corner(UL, buff=0.36).shift(DOWN * 0.55)
        return group

    def shared_chip(self, text, color):
        bg = RoundedRectangle(
            width=1.6, height=0.5, corner_radius=0.12,
            stroke_color=color, stroke_width=2,
            fill_color="#f5f3ff", fill_opacity=1,
        )
        label = Text(text, font_size=18, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)

    def grad_chip(self, text, color):
        bg = RoundedRectangle(
            width=4.4, height=0.42, corner_radius=0.1,
            stroke_color=color, stroke_width=1.8,
            fill_color="#dcfce7", fill_opacity=1,
        )
        label = Text(text, font_size=14, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)
