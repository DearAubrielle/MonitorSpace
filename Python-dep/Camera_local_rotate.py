"""Preview and monitor one enabled database camera at a time.

Run from Python-dep with: python Camera_local_rotate.py
Set CAMERA_SWITCH_SECONDS in .env to change the default 30-second turn.
Press Q or Esc in the preview window to stop.
"""

import os
import time
from pathlib import Path

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

load_dotenv(Path(__file__).with_name(".env"))

from Camera import connect_database, get_camera_list, notify_camera
from Camera_local import CAMERA_STREAM_URL, DEVICE_ID, draw_detections
from camera_alert_events import CameraAlertEvents, CameraAlertMonitor
from fall_pose import FallPoseDetector


POSE_MODEL_PATH = Path(__file__).with_name("yolov8n-pose.pt")
CHECK_INTERVAL_SECONDS = 4.3
SWITCH_SECONDS = float(os.getenv("CAMERA_SWITCH_SECONDS", "30"))
WINDOW_NAME = "Detectfall - rotating cameras"


def stream_source(camera):
    if camera["device_id"] == DEVICE_ID and CAMERA_STREAM_URL:
        return CAMERA_STREAM_URL
    path = str(camera["path_topic"] if camera["path_topic"] is not None else "").strip()
    if not path:
        return None
    return int(path) if path.isdigit() else path


def run_camera_turn(camera_record, model, events, monitor):
    """Run one camera turn; return False when the user asks to exit."""
    device_id = camera_record["device_id"]
    source = stream_source(camera_record)
    if source is None:
        print("Camera {} has no stream path; skipping.".format(device_id))
        events.observation_failed(device_id)
        time.sleep(3)
        return True

    capture = cv2.VideoCapture(source)
    if not capture.isOpened():
        capture.release()
        events.observation_failed(device_id)
        print("Camera {} could not be opened; skipping.".format(device_id))
        time.sleep(3)
        return True

    print("Monitoring camera {}: {}".format(device_id, camera_record["device_name"]))
    detector = FallPoseDetector()
    deadline = time.monotonic() + SWITCH_SECONDS
    next_check = 0.0
    latest = None
    pending_fall = False
    try:
        while time.monotonic() < deadline:
            ok, frame = capture.read()
            if not ok or frame is None:
                print("Camera {} stopped returning frames; switching.".format(device_id))
                break

            if frame.shape[1] > 960:
                frame = cv2.resize(frame, (960, round(frame.shape[0] * 960 / frame.shape[1])))

            try:
                was_fall = latest is True
                results = model(frame, verbose=False)
                frame, latest = draw_detections(frame, results, detector, time.monotonic())
                if latest is True:
                    pending_fall = True
                    if not was_fall:
                        next_check = 0.0
            except Exception as error:
                latest = None
                print("Camera {} observation failed: {}".format(device_id, error))

            now = time.monotonic()
            status = "Checking database"
            if now >= next_check:
                cameras = get_camera_list()
                if cameras is None:
                    events.reset_observations()
                    status = "Database unavailable"
                else:
                    current = next((item for item in cameras if item["device_id"] == device_id), None)
                    if current is None:
                        events.observation_failed(device_id)
                        break
                    status = "Alert ON" if current["alert"] else "Alert OFF"
                    try:
                        monitor.observe(current, (True if pending_fall else latest) if current["alert"] else None)
                        pending_fall = False
                    except Exception as error:
                        status = "Alert update failed"
                        print("Camera {} alert update failed: {}".format(device_id, error))
                    if not current["alert"]:
                        break
                next_check = now + CHECK_INTERVAL_SECONDS

            cv2.putText(frame, "Camera {} - {}".format(device_id, status), (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.imshow(WINDOW_NAME, frame)
            if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                return False
    finally:
        capture.release()
        # Footage from another camera must not count toward this camera's recovery.
        events.observation_failed(device_id)
    return True


def main():
    if SWITCH_SECONDS <= 0:
        raise ValueError("CAMERA_SWITCH_SECONDS must be greater than zero.")

    model_path = str(POSE_MODEL_PATH) if POSE_MODEL_PATH.exists() else POSE_MODEL_PATH.name
    model = YOLO(model_path)
    events = CameraAlertEvents(connect_database)
    monitor = CameraAlertMonitor(events, notify_camera)

    try:
        cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    except cv2.error as error:
        raise RuntimeError("OpenCV needs opencv-python for the preview window.") from error

    try:
        while True:
            cameras = get_camera_list()
            if cameras is None:
                events.reset_observations()
                time.sleep(3)
                continue

            for camera in cameras:
                if not camera["alert"]:
                    try:
                        monitor.observe(camera, None)
                    except Exception as error:
                        print("Camera {} alert update failed: {}".format(camera["device_id"], error))

            enabled = [camera for camera in cameras if camera["alert"]]
            if not enabled:
                print("No cameras have Alert enabled; checking again in 3 seconds.")
                time.sleep(3)
                continue

            for camera in enabled:
                if not run_camera_turn(camera, model, events, monitor):
                    return
    finally:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
