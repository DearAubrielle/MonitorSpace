import cv2
import time
import math
import cvzone
import os
from dotenv import load_dotenv
from ultralytics import YOLO
import mysql.connector
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

# โหลดค่า .env
load_dotenv()

# === ENV CONFIG ===
hostname = os.getenv("DB_HOST")
username = os.getenv("DB_USER")
password = os.getenv("DB_PASS")
database = os.getenv("DB_NAME")
port = int(os.getenv("DB_PORT", 28173))

CHANNEL_ACCESS_TOKEN = os.getenv("LINE_TOKEN")
USER_ID = os.getenv("LINE_USER_ID")

MODEL_PATH = os.getenv("MODEL_PATH", "yolov8s.pt")
CLASSES_PATH = os.getenv("CLASSES_PATH", "classes.txt")

# โหลดโมเดล YOLO
model = YOLO(MODEL_PATH)
with open(CLASSES_PATH) as f:
    classnames = f.read().splitlines()

# === LINE Message ===
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
def get_camera_list():
    conn = mysql.connector.connect(
        host=hostname,
        database=database,
        user=username,
        password=password,
        port=port
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
    SELECT 
        devices.id AS device_id,
        devices.name AS device_name,
        devices.latest_value,
        floorplan.name AS floor_name
    FROM devices
    JOIN floorplan ON devices.floorplan_id = floorplan.id
    JOIN device_type ON devices.device_type_id = device_type.id
    WHERE device_type.name = 'Camera';
    """)
    cameras = cursor.fetchall()
    conn.close()
    return cameras

# === Alert Config ===
alert_cooldown = 10
last_alert_time_map = {}
FALL_ASPECT_RATIO = 1.2

# 🔁 Loop หลัก
while True:
    cameras = get_camera_list()
    if not cameras:
        print("⚠️ ยังไม่มีกล้องที่ Active ในระบบ... รอ 5 วินาที")
        time.sleep(5)
        continue

    for cam in cameras:
        cam_id = cam['device_id']
        cam_name = cam['device_name']
        cam_url = cam['latest_value']
        cam_address = cam['floor_name']

        if not cam_url:
            print(f"⚠️ กล้อง {cam_name} ไม่มี URL หรือค่าผิดพลาดในฐานข้อมูล")
            continue

        print(f"🎥 Switching to {cam_name}")

        cap = cv2.VideoCapture(int(cam_url) if cam_url.isdigit() else cam_url)
        time.sleep(1)

        success, frame = cap.read()
        if not success:
            print(f"⚠️ กล้อง {cam_name} เปิดไม่สำเร็จ")
            cap.release()
            continue

        results = model(frame, verbose=False)
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                if classnames[cls] == "person" and conf > 0.7:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    aspect_ratio = (x2 - x1) / (y2 - y1 + 1)
                    if aspect_ratio > FALL_ASPECT_RATIO:
                        now = time.time()
                        if cam_id not in last_alert_time_map:
                            last_alert_time_map[cam_id] = 0
                        if now - last_alert_time_map[cam_id] > alert_cooldown:
                            send_line_message(f"🚨 [กล้อง: {cam_name}] ตรวจพบการล้ม!\nอยู่ที่ {cam_address}")
                            last_alert_time_map[cam_id] = now
                            print(f"🟥 ล้มที่กล้อง {cam_name}")

        cap.release()
        time.sleep(1)

    # ลดโหลด CPU
    time.sleep(0.2)
