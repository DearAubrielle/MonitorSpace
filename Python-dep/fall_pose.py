"""Conservative, temporal fall heuristic for COCO 17-keypoint pose output.

This is a test heuristic, not a trained fall classifier. Missing or cropped
poses are unknown so they cannot clear a stored camera incident.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TorsoPose:
    shoulder_x: float
    shoulder_y: float
    hip_x: float
    hip_y: float

    @property
    def center_x(self):
        return (self.shoulder_x + self.hip_x) / 2

    @property
    def center_y(self):
        return (self.shoulder_y + self.hip_y) / 2

    @property
    def horizontal(self):
        return abs(self.hip_x - self.shoulder_x) > 1.2 * abs(self.hip_y - self.shoulder_y)

    @property
    def upright(self):
        return abs(self.hip_y - self.shoulder_y) > 1.2 * abs(self.hip_x - self.shoulder_x)


def torso_from_keypoints(points, confidences, box, width, height):
    """Return a usable torso, or None when the body is cropped or uncertain."""
    x1, y1, x2, y2 = box
    margin = 5
    if x1 <= margin or y1 <= margin or x2 >= width - margin or y2 >= height - margin:
        return None

    def midpoint(left, right):
        if confidences is not None and (confidences[left] < 0.35 or confidences[right] < 0.35):
            return None
        a, b = points[left], points[right]
        if a[0] <= 0 or a[1] <= 0 or b[0] <= 0 or b[1] <= 0:
            return None
        return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

    shoulders = midpoint(5, 6)
    hips = midpoint(11, 12)
    if shoulders is None or hips is None:
        return None
    return TorsoPose(*shoulders, *hips)


class FallPoseDetector:
    """Require a recent upright pose, downward motion, then a horizontal torso."""

    def __init__(self):
        self.last_upright = None
        self.fall_active = False
        self.upright_since = None

    def update(self, pose, width, height, now):
        """Return True (fall), False (clear), or None (pose unavailable)."""
        if pose is None:
            # Keep a short pre-fall history through brief occlusion/motion blur.
            if self.last_upright is not None and now - self.last_upright[0] > 2.5:
                self.last_upright = None
            self.upright_since = None
            return None

        if self.fall_active:
            if pose.upright:
                if self.upright_since is None:
                    self.upright_since = now
                elif now - self.upright_since >= 2.0:
                    self.fall_active = False
                    self.last_upright = (now, pose.center_x, pose.center_y)
                    return False
            else:
                self.upright_since = None
            return True

        if pose.upright:
            self.last_upright = (now, pose.center_x, pose.center_y)
            return False

        if pose.horizontal and self.last_upright is not None:
            previous_time, previous_x, previous_y = self.last_upright
            if (
                now - previous_time <= 2.5
                and pose.center_y - previous_y >= 0.12 * height
                and abs(pose.center_x - previous_x) <= 0.35 * width
            ):
                self.fall_active = True
                self.last_upright = None
                return True

        # A horizontal pose without a visible transition is not proof of a fall
        # or of recovery from an earlier incident.
        return None
