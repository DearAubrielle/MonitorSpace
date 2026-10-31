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
        self.cap.read.return_value = (True, object())
        self.model = Mock(return_value=[SimpleNamespace(boxes=[])])

    def read(self):
        return self.worker.read_fall_observation(self.camera, self.model, ['person', 'chair'])

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

    def test_multiple_boxes_result_in_one_positive_observation(self):
        standing = SimpleNamespace(cls=[0], conf=[0.95], xyxy=[[0, 0, 50, 200]])
        falling = SimpleNamespace(cls=[0], conf=[0.95], xyxy=[[0, 0, 200, 50]])
        self.model.return_value = [SimpleNamespace(boxes=[standing, falling, falling])]
        self.assertIs(self.read(), True)
        self.cap.release.assert_called_once()


if __name__ == '__main__':
    unittest.main()
