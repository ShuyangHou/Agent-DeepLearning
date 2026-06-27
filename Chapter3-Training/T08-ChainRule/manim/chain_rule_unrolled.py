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


class ChainRuleUnrolled(Scene):
    # T08 picture 1-3: unroll the single chain w -> z -> h -> y' -> L,
    # surface every local derivative, then multiply them into dL/dw.

    default_camera_config = {
        "background_color": PANEL_BG,
    }

    def construct(self):
        title = Text("Chain rule: stack local effects into one gradient", font_size=32, weight=BOLD)
        title.set_color(INK)
        title.to_edge(UP, buff=0.28)
        subtitle = Text("w -> z -> h -> y' -> L,  multiply every step", font_size=20, weight=BOLD)
        subtitle.set_color(MUTED)
        subtitle.next_to(title, DOWN, buff=0.1)

        # === Stage 1: unroll the chain left to right ===
        nodes_data = [
            ("w",  ORANGE_PARAM, "#fed7aa"),
            ("z",  BLUE_FORWARD, "#dbeafe"),
            ("h",  BLUE_FORWARD, "#dbeafe"),
            ("y'", BLUE_FORWARD, "#dbeafe"),
            ("L",  RED_LOSS,     "#fee2e2"),
        ]
        nodes = []
        labels = []
        xs = [-5.2, -2.6, 0.0, 2.6, 5.2]
        for (text, stroke, fill), x in zip(nodes_data, xs):
            node, label = self.make_node(text, stroke, fill)
            node.move_to(RIGHT * x + UP * 0.4)
            label.move_to(node.get_center())
            nodes.append(node)
            labels.append(label)

        edges = []
        for a, b in zip(nodes, nodes[1:]):
            edges.append(self.make_edge(a, b))

        stage_tag = self.make_stage_tag("Stage 1 / Unroll the chain", BLUE_FORWARD)
        self.play(FadeIn(title, shift=DOWN * 0.1), FadeIn(subtitle, shift=DOWN * 0.1),
                  FadeIn(stage_tag), run_time=0.5)
        self.play(
            LaggedStart(*[FadeIn(node, scale=0.9) for node in nodes], lag_ratio=0.18),
            LaggedStart(*[FadeIn(label) for label in labels], lag_ratio=0.18),
            run_time=1.0,
        )
        self.play(LaggedStart(*[GrowArrow(arrow) for arrow in edges], lag_ratio=0.18), run_time=0.9)

        # === Stage 2: light up each local derivative on its edge ===
        new_stage = self.make_stage_tag("Stage 2 / Local effects", PURPLE_GRAD)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        local_labels = [
            "dz/dw",
            "dh/dz",
            "dy'/dh",
            "dL/dy'",
        ]
        local_chips = []
        for arrow, text in zip(edges, local_labels):
            chip = self.local_chip(text, PURPLE_GRAD)
            chip.next_to(arrow.get_center(), UP, buff=0.18)
            local_chips.append(chip)

        for arrow, chip, downstream in zip(edges, local_chips, nodes[1:]):
            pulse = arrow.copy().set_stroke(PURPLE_GRAD, width=6, opacity=0.9)
            self.play(
                ShowPassingFlash(pulse, time_width=0.55, run_time=0.55),
                Indicate(downstream, color=PURPLE_GRAD, scale_factor=1.15),
                FadeIn(chip, shift=DOWN * 0.1),
                run_time=0.6,
            )

        # === Stage 3: collect chips into a single product ===
        new_stage = self.make_stage_tag("Stage 3 / Multiply them", GREEN_UPDATE)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        lane = RoundedRectangle(
            width=12.4, height=1.5, corner_radius=0.18,
            stroke_color=PANEL_LINE, stroke_width=1.5,
            fill_color="#ffffff", fill_opacity=1,
        )
        lane.move_to(DOWN * 2.0)
        lane_caption = Text("dL/dw  =  dL/dy'  *  dy'/dh  *  dh/dz  *  dz/dw",
                            font_size=24, weight=BOLD)
        lane_caption.set_color(INK)
        lane_caption.move_to(lane.get_center() + UP * 0.05)
        self.play(FadeIn(lane, shift=UP * 0.1), run_time=0.4)

        ordered_chips = list(reversed(local_chips))
        chip_targets = []
        slot_xs = [-4.2, -1.4, 1.4, 4.2]
        for chip, x in zip(ordered_chips, slot_xs):
            target = chip.copy()
            target.move_to(lane.get_center() + RIGHT * x + DOWN * 0.05)
            target.scale(0.95)
            chip_targets.append(target)

        self.play(
            *[Transform(chip, target) for chip, target in zip(ordered_chips, chip_targets)],
            run_time=0.9,
        )

        multiply_marks = []
        for x in [-2.8, 0.0, 2.8]:
            cross = Text("x", font_size=28, weight=BOLD).set_color(MUTED)
            cross.move_to(lane.get_center() + RIGHT * x + DOWN * 0.05)
            multiply_marks.append(cross)
        self.play(LaggedStart(*[FadeIn(mark, scale=0.7) for mark in multiply_marks],
                              lag_ratio=0.18), run_time=0.45)

        # === Stage 4: total gradient lights up green ===
        new_stage = self.make_stage_tag("Stage 4 / Total gradient", GREEN_UPDATE)
        new_stage.move_to(stage_tag.get_center())
        self.play(FadeOut(stage_tag), FadeIn(new_stage), run_time=0.25)
        stage_tag = new_stage

        total_box = self.value_box("dL/dw  =  -0.18", GREEN_UPDATE, "#dcfce7")
        total_box.next_to(lane, UP, buff=0.32)
        self.play(
            FadeOut(VGroup(*ordered_chips), shift=DOWN * 0.1),
            FadeOut(VGroup(*multiply_marks)),
            FadeIn(lane_caption, shift=UP * 0.05),
            run_time=0.5,
        )
        self.play(FadeIn(total_box, scale=0.95),
                  Flash(total_box.get_center(), color=GREEN_UPDATE, flash_radius=0.6),
                  run_time=0.6)

        closing = Text("one upstream weight  =  product of all downstream slopes",
                       font_size=22, weight=BOLD)
        closing.set_color(INK)
        closing.to_edge(DOWN, buff=0.3)
        self.play(FadeIn(closing, shift=UP * 0.1), run_time=0.4)
        self.wait(0.8)

    # ---------- helpers ----------

    def make_node(self, text, stroke, fill):
        circle = Circle(radius=0.5, stroke_color=stroke, stroke_width=3,
                        fill_color=fill, fill_opacity=1)
        label = Text(text, font_size=24, weight=BOLD)
        label.set_color(INK)
        return circle, label

    def make_edge(self, a, b):
        return Arrow(
            a.get_center(), b.get_center(),
            buff=0.55,
            stroke_color=PANEL_LINE,
            stroke_width=2.4,
        )

    def make_stage_tag(self, text, color):
        bg = RoundedRectangle(
            width=4.8, height=0.55, corner_radius=0.14,
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
            width=3.6, height=0.6, corner_radius=0.12,
            stroke_color=color, stroke_width=2.5,
            fill_color=fill, fill_opacity=1,
        )
        label = Text(text, font_size=22, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)

    def local_chip(self, text, color):
        bg = RoundedRectangle(
            width=1.6, height=0.5, corner_radius=0.12,
            stroke_color=color, stroke_width=2,
            fill_color="#f5f3ff", fill_opacity=1,
        )
        label = Text(text, font_size=18, weight=BOLD)
        label.set_color(color)
        label.move_to(bg.get_center())
        return VGroup(bg, label)
