"""Check camera handoff without opening streams or contacting services."""

import importlib.util
from itertools import count
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import Mock, patch


class CameraRotateTests(unittest.TestCase):
    def test_each_turn_releases_its_capture_before_the_next(self):
        cv2 = Mock()
        cv2.waitKey.return_value = -1
        camera_module = ModuleType("Camera")
        camera_module.connect_database = Mock()
        camera_module.get_camera_list = Mock()
        camera_module.notify_camera = Mock()
        local_module = ModuleType("Camera_local")
        local_module.CAMERA_STREAM_URL = "http://example.test/stream"
        local_module.DEVICE_ID = 32
        local_module.draw_detections = Mock()
        alerts_module = ModuleType("camera_alert_events")
        alerts_module.CameraAlertEvents = Mock()
        alerts_module.CameraAlertMonitor = Mock()
        pose_module = ModuleType("fall_pose")
        pose_module.FallPoseDetector = Mock()

        modules = {
            "cv2": cv2,
            "dotenv": Mock(),
            "ultralytics": Mock(),
            "Camera": camera_module,
            "Camera_local": local_module,
            "camera_alert_events": alerts_module,
            "fall_pose": pose_module,
        }
        spec = importlib.util.spec_from_file_location(
            "camera_local_rotate_test", Path(__file__).parents[1] / "Camera_local_rotate.py"
        )
        worker = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules), patch.dict("os.environ", {"CAMERA_SWITCH_SECONDS": "10"}):
            spec.loader.exec_module(worker)

        cameras = [
            {"device_id": 32, "device_name": "A", "path_topic": "0", "alert": 1},
            {"device_id": 33, "device_name": "B", "path_topic": "1", "alert": 1},
        ]
        camera_module.get_camera_list.side_effect = lambda: cameras
        frame = SimpleNamespace(shape=(480, 640, 3))
        local_module.draw_detections.side_effect = lambda image, *_: (image, False)
        captures = []

        def open_capture(source):
            if captures:
                self.assertTrue(captures[-1].release.called)
            capture = Mock()
            capture.isOpened.return_value = True
            capture.read.return_value = (True, frame)
            captures.append(capture)
            return capture

        cv2.VideoCapture.side_effect = open_capture
        events = Mock()
        monitor = Mock()
        ticks = count().__next__
        with patch.object(worker.time, "monotonic", side_effect=ticks), patch("builtins.print"):
            for camera in cameras:
                self.assertTrue(worker.run_camera_turn(camera, Mock(), events, monitor))

        self.assertEqual([call.args[0] for call in cv2.VideoCapture.call_args_list],
                         ["http://example.test/stream", 1])
        self.assertTrue(all(capture.release.call_count == 1 for capture in captures))
        self.assertEqual({call.args[0]["device_id"] for call in monitor.observe.call_args_list},
                         {32, 33})


if __name__ == "__main__":
    unittest.main()
