"""Lying-posture heuristic for COCO 17-keypoint pose output.

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


def best_torso_from_results(results, width, height):
    """Choose the largest fully visible person from one YOLO pose prediction."""
    def as_list(value):
        return value.cpu().tolist() if hasattr(value, "cpu") else value.tolist()

    best_pose = None
    best_area = 0

    for result in results:
        if result.keypoints is None:
            continue
        points_by_person = as_list(result.keypoints.xy)
        confidence_tensor = result.keypoints.conf
        confidence_by_person = as_list(confidence_tensor) if confidence_tensor is not None else None
        for index, box in enumerate(result.boxes):
            if index >= len(points_by_person):
                break
            coords = as_list(box.xyxy[0])
            confidences = confidence_by_person[index] if confidence_by_person is not None else None
            pose = torso_from_keypoints(points_by_person[index], confidences, coords, width, height)
            area = (coords[2] - coords[0]) * (coords[3] - coords[1])
            if pose is not None and area > best_area:
                best_pose, best_area = pose, area

    return best_pose


class FallPoseDetector:
    """Treat a visible horizontal torso as a possible fall or lying person."""

    def __init__(self):
        self.fall_active = False
        self.upright_since = None

    def update(self, pose, width, height, now):
        """Return True (fall), False (clear), or None (pose unavailable)."""
        if pose is None:
            self.upright_since = None
            return None

        if self.fall_active:
            if pose.upright:
                if self.upright_since is None:
                    self.upright_since = now
                elif now - self.upright_since >= 2.0:
                    self.fall_active = False
                    return False
            else:
                self.upright_since = None
            return True

        if pose.upright:
            return False

        if pose.horizontal:
            self.fall_active = True
            return True

        # Diagonal or uncertain poses cannot confirm lying or recovery.
        return None
