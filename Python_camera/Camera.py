import cv2
import time
import math
import cvzone
from ultralytics import YOLO
import mysql.connector
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

hostname ="localhost"
username ="root"
password =""
database ="spacemonitor"
port = "3306"

CHANNEL_ACCESS_TOKEN = 'KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU='
USER_ID = 'C51151f2b2a353530e69ab5c43c3fb026'

# โหลดชื่อคลาส
model = YOLO('yolov8s.pt')
with open("classes.txt") as f:
    classnames = f.read().splitlines()

def send_line_message(msg):
    configuration = Configuration(access_token=CHANNEL_ACCESS_TOKEN)
    with ApiClient(configuration) as api_client:
        MessagingApi(api_client).push_message(
            PushMessageRequest(to=USER_ID, messages=[TextMessage(text=msg)])
        )

def get_camera_list():
    conn = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
    cursor = conn.cursor(dictionary=True)
    # cursor.execute("SELECT * FROM cameras WHERE status='active'")
    # cursor.execute("SELECT * FROM devices JOIN floorplan ON devices.floorplan_id = floorplan.id WHERE device_type_id = 2 ")
    cursor.execute("SELECT devices.id AS device_id,devices.name AS device_name,devices.latest_value,floorplan.name AS floor_name FROM devices JOIN floorplan ON devices.floorplan_id = floorplan.id WHERE devices.device_type_id = 2")
    cameras = cursor.fetchall()
    conn.close()
    return cameras

# ตัวแปรสำหรับควบคุมแจ้งเตือน
alert_cooldown = 10
last_alert_time_map = {}  # แยกตาม camera id

FALL_ASPECT_RATIO = 1.2

# 🔁 loop ตลอดเวลา
while True:
    cameras = get_camera_list()
    # ✅ ถ้ายังไม่มีกล้องเลย
    if not cameras:
        print("⚠️ ยังไม่มีกล้องที่ Active ในระบบ... รอ 5 วินาที")
        time.sleep(5)
        continue  # วนใหม่

    # ✅ ถ้ามีกล้อง ให้วนเช็คทีละตัว
    for cam in cameras:
        cam_id = cam['device_id']
        cam_name = cam['device_name']
        cam_url = cam['latest_value']
        cam_address = cam['floor_name']
        print(f"🎥 Switching to {cam_name}")

        cap = cv2.VideoCapture(int(cam_url) if cam_url.isdigit() else cam_url)
        time.sleep(1)

        success, frame = cap.read()
        if not success:
            print(f"⚠️ กล้อง {cam_name} เปิดไม่สำเร็จ")
            cap.release()
            continue

        # === ตรวจจับการล้ม (เหมือนเดิม) ===
        results = model(frame)
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