import cv2
import cvzone
import time
import math
import os
import mysql.connector
from dotenv import load_dotenv
from ultralytics import YOLO
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

# === โหลดค่า .env (ถ้ามี) ===
load_dotenv()

# === Database Config ===
hostname = "hopper.proxy.rlwy.net"
username = "root"
password = "zymkADYOgYCCkZgSvtAJAnesOKlKivWN"
database = "spacemonitor"
port = 28173

# hostname = "localhost"
# username = "root"
# password = ""
# database = "spacemonitor"
# port = 3306

# === LINE Config ===
CHANNEL_ACCESS_TOKEN = 'KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU='
USER_ID = 'C51151f2b2a353530e69ab5c43c3fb026'

# === YOLO Config ===
MODEL_PATH = "yolov8s.pt"
CLASSES_PATH = "classes.txt"
model = YOLO(MODEL_PATH)
with open(CLASSES_PATH) as f:
    classnames = f.read().splitlines()

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
def get_camera_list():
    try:
        conn = mysql.connector.connect(
            host=hostname, database=database,
            user=username, password=password, port=port
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT d.id AS device_id, d.name AS device_name,
                   d.path_topic,d.alert,f.name AS floor_name
            FROM devices d
            JOIN floorplan f ON d.floorplan_id = f.id
            JOIN device_type t ON d.device_type_id = t.id
            WHERE t.name = 'Camera';
        """)
        cameras = cursor.fetchall()
        conn.close()
        return cameras
    except Exception as e:
        print(f"Database Error: {e}")
        return []

# === Alert Config ===
alert_cooldown = 10
last_alert_time_map = {}
FALL_ASPECT_RATIO = 1.2

# === Loop หลัก ===
while True:
    cameras = get_camera_list()
    if not cameras:
        print("⚠️ ยังไม่มีกล้องในระบบ รอ 5 วินาที...")
        time.sleep(5)
        continue

    for cam in cameras:
        cam_id = cam['device_id']
        cam_name = cam['device_name']
        cam_url = cam['path_topic']
        cam_address = cam['floor_name']
        cam_alert = cam['alert']

        print(f"🎥 เปิดกล้อง: {cam_name} ({cam_url})")

        cap = cv2.VideoCapture(int(cam_url) if cam_url.isdigit() else cam_url)
        if not cap.isOpened():
            print(f"❌ เปิดกล้อง {cam_name} ไม่ได้")
            continue

        # 🔹 Flush buffer กันภาพค้าง
        for _ in range(5):
            cap.read()
            time.sleep(0.05)

        success, frame = cap.read()
        if not success or frame is None:
            print(f"⚠️ กล้อง {cam_name} อ่าน frame ไม่ได้")
            cap.release()
            continue

        # ตรวจจับการล้ม1
        # frame = cv2.resize(frame, (980,740))
        # results = model(frame)
        # for info in results:
        #     parameters = info.boxes
        #     for box in parameters:
        #          x1, y1, x2, y2 = box.xyxy[0]
        #          x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        #          confidence = box.conf[0]
        #          class_detect = box.cls[0]
        #          class_detect = int(class_detect)
        #          class_detect = classnames[class_detect]
        #          conf = math.ceil(confidence * 100)
 
 
        #          # implement fall detection using the coordinates x1,y1,x2
        #          height = y2 - y1
        #          width = x2 - x1
        #          threshold  = height - width

        #          if conf > 80 and class_detect == 'person':
        #              cvzone.cornerRect(frame, [x1, y1, width, height], l=30, rt=6)
        #              cvzone.putTextRect(frame, f'{class_detect}', [x1 + 8, y1 - 12], thickness=2, scale=2)
                
        #          if threshold < 0:
        #              print(f"🟥 แจ้งเตือนกล้อง {cam_name}")
        #              msg = f"🚨 ตรวจพบการล้มที่กล้อง: {cam_name}\n📍 ตำแหน่ง: {cam_address}\n🌐 URL: {cam_url}"
        #              send_line_message(msg)
        #              cvzone.putTextRect(frame, 'Fall Detected', [height, width], thickness=2, scale=2)

        # ตรวจจับการล้ม2
        # resize freame 
        frame = cv2.resize(frame, (640,360))

        results = model(frame, verbose=False)
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                if classnames[cls] == "person" and conf > 0.7:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    aspect_ratio = (x2 - x1) / (y2 - y1 + 1)
                    # cv2.imshow("Preview", frame.copy())
                    if aspect_ratio > FALL_ASPECT_RATIO:
                        now = time.time()
                        if cam_id not in last_alert_time_map:
                            last_alert_time_map[cam_id] = 0
                        if now - last_alert_time_map[cam_id] > alert_cooldown and cam_alert:
                            msg = f"🚨 ตรวจพบการล้มที่กล้อง: {cam_name}\n📍 ตำแหน่ง: {cam_address}\n🌐 URL: {cam_url}"
                            send_line_message(msg)
                            last_alert_time_map[cam_id] = now
                            print(f"🟥 แจ้งเตือนกล้อง {cam_name}")
                            preview_frame = frame.copy()
                            cv2.rectangle(preview_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                            cv2.putText(preview_frame, f"FALL DETECTED ({cam_name})", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                            cv2.putText(preview_frame, f"Location: {cam_address}", (x1, y2 + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                            # cv2.imshow("Preview - Fall Detection", preview_frame)
                            cv2.waitKey(1)

        cap.release()
        time.sleep(1)
        time.sleep(3)

    time.sleep(0.3)
