import cv2
import time
import os
from dataclasses import dataclass
from pathlib import Path
import mysql.connector
from camera_alert_events import CameraAlertEvents, CameraAlertMonitor
from fall_pose import FallPoseDetector, best_torso_from_results
from dotenv import load_dotenv
from ultralytics import YOLO
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

# === โหลดค่า .env (ถ้ามี) ===
load_dotenv()

# === Database Config (local MySQL by default) ===
hostname = os.getenv("DB_HOST", "127.0.0.1")
username = os.getenv("DB_USER", "root")
password = os.getenv("DB_PASS", os.getenv("DB_PASSWORD", ""))
database = os.getenv("DB_NAME", "spacemonitor")
port = int(os.getenv("DB_PORT", "3306"))

# === LINE Config ===
CHANNEL_ACCESS_TOKEN = os.getenv("LINE_TOKEN", "")
USER_ID = os.getenv("LINE_USER_ID", "")

# === YOLO Config ===
MODEL_PATH = Path(__file__).with_name("yolov8n-pose.pt")
CHECK_INTERVAL_SECONDS = 4.3

# === LINE Function ===
def send_line_message(msg):
    try:
        configuration = Configuration(access_token=CHANNEL_ACCESS_TOKEN)
        with ApiClient(configuration) as api_client:
            MessagingApi(api_client).push_message(
                PushMessageRequest(to=USER_ID, messages=[TextMessage(text=msg)])
            )
    except Exception as e:
        print(f"LINE Error: {e}")

# === Database ===
def connect_database():
    return mysql.connector.connect(
        host=hostname, database=database,
        user=username, password=password, port=port,
        connection_timeout=10,
    )


def get_camera_list():
    conn = None
    cursor = None
    try:
        conn = connect_database()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT d.id AS device_id, d.name AS device_name,
                   d.path_topic, d.alert, f.name AS floor_name
            FROM devices d
            LEFT JOIN floorplan f ON d.floorplan_id = f.id
            JOIN device_type t ON d.device_type_id = t.id
            WHERE t.name = 'Camera';
        """)
        return cursor.fetchall()
    except Exception as error:
        print(f"Unable to load cameras: {error}")
        return None
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()


def read_fall_observation(camera, model, detector, capture=None):
    """Return None for missing footage; only a processed frame can clear a check."""
    camera_url = str(camera['path_topic'] if camera['path_topic'] is not None else '').strip()
    if not camera_url:
        return None

    owns_capture = capture is None
    cap = capture
    try:
        if owns_capture:
            cap = cv2.VideoCapture(int(camera_url) if camera_url.isdigit() else camera_url)
        if not cap.isOpened():
            detector.update(None, 0, 0, time.monotonic())
            return None

        success, frame = cap.read()
        if not success or frame is None:
            detector.update(None, 0, 0, time.monotonic())
            return None

        # Keep the source aspect ratio so body posture is not stretched.
        if frame.shape[1] > 960:
            frame = cv2.resize(frame, (960, round(frame.shape[0] * 960 / frame.shape[1])))
        results = model(frame, verbose=False)
        height, width = frame.shape[:2]
        pose = best_torso_from_results(results, width, height)
        return detector.update(pose, width, height, time.monotonic())
    except Exception as error:
        print(f"Camera {camera['device_id']} observation failed: {error}")
        detector.update(None, 0, 0, time.monotonic())
        return None
    finally:
        if owns_capture and cap is not None:
            cap.release()


@dataclass
class CameraSource:
    path: str
    capture: object
    detector: FallPoseDetector
    latest: bool | None = None
    pending_fall: bool = False

    def close(self):
        self.capture.release()


def notify_camera(camera):
    location = camera['floor_name'] or 'Unassigned'
    message = (
        f"🚨 ตรวจพบการล้มที่กล้อง: {camera['device_name']}\n"
        f"📍 ตำแหน่ง: {location}\n🌐 URL: {camera['path_topic']}"
    )
    send_line_message(message)


def main():
    # Ultralytics downloads the pose model on first use if it is absent.
    model_path = str(MODEL_PATH) if MODEL_PATH.exists() else MODEL_PATH.name
    model = YOLO(model_path)
    events = CameraAlertEvents(connect_database)
    monitor = CameraAlertMonitor(events, notify_camera)
    sources = {}
    cameras = []
    next_check = 0.0

    try:
        while True:
            if time.monotonic() >= next_check:
                cameras = get_camera_list()
                if not cameras:
                    # A database outage cannot count as clear footage.
                    events.reset_observations()
                    for source in sources.values():
                        source.close()
                    sources.clear()
                    time.sleep(5)
                    next_check = 0.0
                    continue

                active_paths = {
                    camera['device_id']: str(camera['path_topic']).strip()
                    for camera in cameras
                    if camera['alert'] and camera['path_topic'] is not None
                }
                for device_id, source in list(sources.items()):
                    if active_paths.get(device_id) != source.path or not source.capture.isOpened():
                        source.close()
                        del sources[device_id]

                for camera in cameras:
                    device_id = camera['device_id']
                    path = active_paths.get(device_id, '')
                    if path and device_id not in sources:
                        capture = cv2.VideoCapture(int(path) if path.isdigit() else path)
                        sources[device_id] = CameraSource(path, capture, FallPoseDetector())

                    source = sources.get(device_id)
                    detected = (True if source.pending_fall else source.latest) if source else None
                    try:
                        # The monitor rechecks the alert switch in the transaction.
                        monitor.observe(camera, detected if camera['alert'] else None)
                        if source is not None:
                            source.pending_fall = False
                    except Exception as error:
                        print(f"Camera {device_id} alert update failed: {error}")
                next_check = time.monotonic() + CHECK_INTERVAL_SECONDS

            # Keep sampling between database writes so a fast fall is visible.
            for camera in cameras:
                source = sources.get(camera['device_id'])
                if source is None:
                    continue
                source.latest = read_fall_observation(camera, model, source.detector, source.capture)
                if source.latest is True:
                    source.pending_fall = True
            time.sleep(0.01)
    finally:
        for source in sources.values():
            source.close()


if __name__ == '__main__':
    main()
