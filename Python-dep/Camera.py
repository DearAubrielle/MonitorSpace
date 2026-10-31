import cv2
import time
import os
import mysql.connector
from camera_alert_events import CameraAlertEvents, CameraAlertMonitor
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
CHANNEL_ACCESS_TOKEN = 'KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU='
USER_ID = 'C51151f2b2a353530e69ab5c43c3fb026'

# === YOLO Config ===
MODEL_PATH = "yolov8s.pt"
CLASSES_PATH = "classes.txt"

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


FALL_ASPECT_RATIO = 1.2


def read_fall_observation(camera, model, classnames):
    """Return None for missing footage; only a processed frame can clear a check."""
    camera_url = str(camera['path_topic'] or '').strip()
    if not camera_url:
        return None

    cap = None
    try:
        cap = cv2.VideoCapture(int(camera_url) if camera_url.isdigit() else camera_url)
        if not cap.isOpened():
            return None

        # Discard buffered frames before inspecting the latest available image.
        for _ in range(5):
            cap.read()
            time.sleep(0.05)

        success, frame = cap.read()
        if not success or frame is None:
            return None

        frame = cv2.resize(frame, (640, 360))
        results = model(frame, verbose=False)
        for result in results:
            for box in result.boxes:
                cls = int(box.cls[0])
                confidence = float(box.conf[0])
                if classnames[cls] == 'person' and confidence > 0.7:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    aspect_ratio = (x2 - x1) / (y2 - y1 + 1)
                    if aspect_ratio > FALL_ASPECT_RATIO:
                        return True
        return False
    except Exception as error:
        print(f"Camera {camera['device_id']} observation failed: {error}")
        return None
    finally:
        if cap is not None:
            cap.release()


def notify_camera(camera):
    location = camera['floor_name'] or 'Unassigned'
    message = (
        f"🚨 ตรวจพบการล้มที่กล้อง: {camera['device_name']}\n"
        f"📍 ตำแหน่ง: {location}\n🌐 URL: {camera['path_topic']}"
    )
    send_line_message(message)


def main():
    model = YOLO(MODEL_PATH)
    with open(CLASSES_PATH) as classes_file:
        classnames = classes_file.read().splitlines()
    events = CameraAlertEvents(connect_database)
    monitor = CameraAlertMonitor(events, notify_camera)

    while True:
        cameras = get_camera_list()
        if not cameras:
            # A database outage must not count as uninterrupted clear footage.
            events.reset_observations()
            time.sleep(5)
            continue

        for camera in cameras:
            detected = read_fall_observation(camera, model, classnames) if camera['alert'] else None
            try:
                # Rechecks the alert switch in the transaction, and closes disabled incidents.
                monitor.observe(camera, detected)
            except Exception as error:
                print(f"Camera {camera['device_id']} alert update failed: {error}")
            time.sleep(4)
        time.sleep(0.3)


if __name__ == '__main__':
    main()
