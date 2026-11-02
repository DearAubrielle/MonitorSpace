"""Test the camera-to-observation boundary without loading YOLO or contacting services."""

import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import Mock, patch


class CameraWorkerTests(unittest.TestCase):
    def setUp(self):
        self.cv2 = Mock()
        mysql = ModuleType('mysql')
        mysql.connector = Mock()
        modules = {
            'cv2': self.cv2,
            'mysql': mysql,
            'mysql.connector': mysql.connector,
            'dotenv': Mock(),
            'ultralytics': Mock(),
            'linebot': ModuleType('linebot'),
            'linebot.v3': ModuleType('linebot.v3'),
            'linebot.v3.messaging': Mock(),
            'linebot.v3.messaging.configuration': Mock(),
            'linebot.v3.messaging.api_client': Mock(),
        }
        spec = importlib.util.spec_from_file_location('camera_worker_test', Path(__file__).parents[1] / 'Camera.py')
        self.worker = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules):
            spec.loader.exec_module(self.worker)
        # Importing for tests must not load a model or start the worker loop.
        modules['ultralytics'].YOLO.assert_not_called()
        sleeper = patch.object(self.worker.time, 'sleep')
        sleeper.start()
        self.addCleanup(sleeper.stop)
        self.camera = {'device_id': 7, 'path_topic': '0'}
        self.cap = self.cv2.VideoCapture.return_value
        self.cap.isOpened.return_value = True
        self.cap.read.return_value = (True, SimpleNamespace(shape=(480, 640, 3)))
        self.model = Mock(return_value=[SimpleNamespace(keypoints=None)])
        self.detector = Mock()
        self.detector.update.return_value = False
        pose = patch.object(self.worker, 'best_torso_from_results', return_value=object())
        pose.start()
        self.addCleanup(pose.stop)

    def read(self):
        return self.worker.read_fall_observation(self.camera, self.model, self.detector)

    def test_missing_url_is_unknown(self):
        self.camera['path_topic'] = None
        self.assertIsNone(self.read())
        self.cv2.VideoCapture.assert_not_called()

    def test_closed_camera_is_unknown_and_released(self):
        self.cap.isOpened.return_value = False
        self.assertIsNone(self.read())
        self.model.assert_not_called()
        self.cap.release.assert_called_once()

    def test_failed_frame_is_unknown_and_released(self):
        self.cap.read.return_value = (False, None)
        self.assertIsNone(self.read())
        self.model.assert_not_called()
        self.cap.release.assert_called_once()

    def test_inference_error_is_unknown_not_a_clear_check(self):
        self.model.side_effect = RuntimeError('test inference failure')
        with patch('builtins.print'):
            self.assertIsNone(self.read())
        self.cap.release.assert_called_once()

    def test_successful_frame_without_fall_is_a_clear_check(self):
        self.assertIs(self.read(), False)
        self.model.assert_called_once()
        self.cv2.VideoCapture.assert_called_once_with(0)
        self.cap.release.assert_called_once()

    def test_pose_detector_controls_positive_observation(self):
        self.detector.update.return_value = True
        self.assertIs(self.read(), True)
        self.detector.update.assert_called_once()
        self.cap.release.assert_called_once()

    def test_reused_capture_stays_open_between_frames(self):
        self.assertIs(self.worker.read_fall_observation(
            self.camera, self.model, self.detector, self.cap), False)
        self.cv2.VideoCapture.assert_not_called()
        self.cap.release.assert_not_called()

    def test_main_samples_between_alert_updates(self):
        self.camera['alert'] = 1
        self.worker.get_camera_list = Mock(return_value=[self.camera])
        self.worker.read_fall_observation = Mock(side_effect=[True, False])
        self.worker.YOLO = Mock(return_value=self.model)
        monitor = Mock()
        self.worker.CameraAlertMonitor = Mock(return_value=monitor)
        self.worker.CameraAlertEvents = Mock()

        with patch.object(self.worker.time, 'monotonic', side_effect=[0, 0, 5, 5]), \
             patch.object(self.worker.time, 'sleep', side_effect=[None, KeyboardInterrupt]):
            with self.assertRaises(KeyboardInterrupt):
                self.worker.main()

        self.assertEqual(monitor.observe.call_args_list[0].args[1], None)
        self.assertEqual(monitor.observe.call_args_list[1].args[1], True)
        self.assertEqual(self.worker.read_fall_observation.call_count, 2)
        self.cap.release.assert_called_once()


if __name__ == '__main__':
    unittest.main()
