"""Run the Camera.py alert workflow for device 26 using a configured stream.

Run locally with: python Camera_local.py
Press Q or Esc to close the preview.
"""

from pathlib import Path
import os
import time

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

from Camera import connect_database, get_camera_list, notify_camera
from camera_alert_events import CameraAlertEvents, CameraAlertMonitor
from fall_pose import FallPoseDetector, best_torso_from_results


load_dotenv(Path(__file__).with_name(".env"))
CAMERA_STREAM_URL = os.getenv("CAMERA_STREAM_URL", "").strip()
DEVICE_ID = 32
POSE_MODEL_PATH = Path(__file__).with_name("yolov8n-pose.pt")
CHECK_INTERVAL_SECONDS = 4.3
WINDOW_NAME = "Detectfall IP camera"


def draw_detections(frame, results, detector, now):
    """Draw pose keypoints and classify the current temporal observation."""
    result = results[0]
    annotated = result.plot()
    height, width = frame.shape[:2]
    best_pose = best_torso_from_results(results, width, height)
    detected = detector.update(best_pose, width, height, now)
    status = "POSSIBLE FALL" if detected else "Upright / no fall" if detected is False else "Pose unavailable"
    color = (0, 0, 255) if detected else (0, 200, 0) if detected is False else (0, 180, 255)
    cv2.putText(annotated, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    cv2.putText(annotated, "Q / Esc: exit", (10, height - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return annotated, detected


def get_target_camera():
    """Get the database record that Camera.py would process for device 26."""
    cameras = get_camera_list()
    if cameras is None:
        return None

    camera = next((item for item in cameras if item["device_id"] == DEVICE_ID), None)
    if camera is None:
        raise RuntimeError(f"Camera device {DEVICE_ID} was not found in the database.")
    return camera


def main():
    if not CAMERA_STREAM_URL:
        raise RuntimeError("Set CAMERA_STREAM_URL in Python-dep/.env.")

    # Ultralytics downloads the pose weights on first use if they are absent.
    model_path = str(POSE_MODEL_PATH) if POSE_MODEL_PATH.exists() else POSE_MODEL_PATH.name
    model = YOLO(model_path)
    detector = FallPoseDetector()
    events = CameraAlertEvents(connect_database)
    monitor = CameraAlertMonitor(events, notify_camera)

    camera = cv2.VideoCapture(CAMERA_STREAM_URL)
    if not camera.isOpened():
        camera.release()
        raise RuntimeError("Cannot open the configured camera stream. Check its URL and network connection.")

    window_open = False
    try:
        try:
            cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
            window_open = True
        except cv2.error as error:
            raise RuntimeError(
                "OpenCV cannot open a window. Install opencv-python instead of opencv-python-headless."
            ) from error

        next_check = time.monotonic()
        database_status = "Checking database"
        while True:
            ok, frame = camera.read()
            if not ok or frame is None:
                events.observation_failed(DEVICE_ID)
                raise RuntimeError("The configured camera stream stopped returning frames.")

            # Preserve the stream's aspect ratio; stretching can distort posture.
            if frame.shape[1] > 960:
                frame = cv2.resize(frame, (960, round(frame.shape[0] * 960 / frame.shape[1])))
            try:
                results = model(frame, verbose=False)
                frame, detected = draw_detections(frame, results, detector, time.monotonic())
            except Exception as error:
                detected = None
                database_status = "Detection failed"
                print(f"Camera {DEVICE_ID} observation failed: {error}")

            if time.monotonic() >= next_check:
                camera_record = get_target_camera()
                if camera_record is None:
                    # An outage must reset the clear-check streak, as in Camera.py.
                    events.reset_observations()
                    database_status = "Database unavailable"
                else:
                    database_status = "Alert ON" if camera_record["alert"] else "Alert OFF"
                    try:
                        # The monitor rechecks the alert switch and writes the event
                        # before attempting the same LINE notification as Camera.py.
                        monitor.observe(camera_record, detected if camera_record["alert"] else None)
                    except Exception as error:
                        database_status = "Alert update failed"
                        print(f"Camera {DEVICE_ID} alert update failed: {error}")
                next_check = time.monotonic() + CHECK_INTERVAL_SECONDS

            cv2.putText(frame, database_status, (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.imshow(WINDOW_NAME, frame)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
    finally:
        camera.release()
        if window_open:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
