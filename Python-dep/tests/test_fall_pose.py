"""Behavior checks for the local pose-based fall experiment."""

import unittest
from types import SimpleNamespace

from fall_pose import FallPoseDetector, TorsoPose, best_torso_from_results, torso_from_keypoints


class ListTensor:
    def __init__(self, values):
        self.values = values

    def tolist(self):
        return self.values


class FallPoseTests(unittest.TestCase):
    def test_cropped_person_like_screenshot_is_unknown(self):
        points = [(0, 0)] * 17
        points[5], points[6] = (240, 180), (400, 180)
        points[11], points[12] = (260, 350), (420, 350)
        self.assertIsNone(torso_from_keypoints(points, [0.9] * 17,
                                                 (195, 110, 640, 480), 640, 480))

    def test_sitting_upright_does_not_trigger(self):
        detector = FallPoseDetector()
        standing = TorsoPose(300, 130, 310, 260)
        sitting = TorsoPose(300, 160, 310, 290)
        self.assertIs(detector.update(standing, 640, 480, 0), False)
        self.assertIs(detector.update(sitting, 640, 480, 1), False)

    def test_recent_drop_to_horizontal_triggers_then_recovers(self):
        detector = FallPoseDetector()
        upright = TorsoPose(300, 130, 310, 260)
        lying = TorsoPose(270, 350, 430, 360)
        self.assertIs(detector.update(upright, 640, 480, 0), False)
        self.assertIs(detector.update(lying, 640, 480, 1), True)
        self.assertIs(detector.update(lying, 640, 480, 2), True)
        self.assertIs(detector.update(upright, 640, 480, 3), True)
        self.assertIs(detector.update(upright, 640, 480, 5.1), False)

    def test_lying_without_visible_transition_is_unknown(self):
        detector = FallPoseDetector()
        lying = TorsoPose(270, 350, 430, 360)
        self.assertIsNone(detector.update(lying, 640, 480, 0))

    def test_pose_result_ignores_cropped_person(self):
        points = [[0, 0] for _ in range(17)]
        points[5], points[6] = [240, 180], [400, 180]
        points[11], points[12] = [260, 350], [420, 350]
        result = SimpleNamespace(
            keypoints=SimpleNamespace(xy=ListTensor([points]), conf=ListTensor([[0.9] * 17])),
            boxes=[SimpleNamespace(xyxy=[ListTensor([195, 110, 640, 480])])],
        )
        self.assertIsNone(best_torso_from_results([result], 640, 480))

    def test_pose_result_reads_visible_torso(self):
        points = [[0, 0] for _ in range(17)]
        points[5], points[6] = [240, 150], [280, 150]
        points[11], points[12] = [245, 280], [285, 280]
        result = SimpleNamespace(
            keypoints=SimpleNamespace(xy=ListTensor([points]), conf=ListTensor([[0.9] * 17])),
            boxes=[SimpleNamespace(xyxy=[ListTensor([200, 100, 320, 380])])],
        )
        self.assertTrue(best_torso_from_results([result], 640, 480).upright)


if __name__ == "__main__":
    unittest.main()
