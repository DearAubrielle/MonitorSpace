import cv2
import cvzone
import math
import time
import threading
import mysql.connector
from ultralytics import YOLO
from flask import Flask, request, jsonify
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

# =========================
# === LINE CONFIG (เดิม) ===
# =========================
CHANNEL_ACCESS_TOKEN = 'KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU='
USER_ID = 'C51151f2b2a353530e69ab5c43c3fb026'

# =========================
# === DB CONFIG (แก้ไขได้) ==
# =========================
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "spacemonitor",
    "port": 3306,
}

# =========================
# === PARAM CONFIG (เดิม) ===
# =========================
ALERT_MODE = 3            # 1=เรื่อยๆตาม cooldown, 2=จำกัดจำนวน, 3=ครั้งเดียว
ALERT_LIMIT = 3
ALERT_COOLDOWN = 10       # วินาที

FALL_ASPECT_RATIO = 1.2
CONFIDENCE_THRESHOLD = 80
PADDING = 20
SKIP_FRAMES = 3

FALL_HOLD_TIME = 2.0
RAPID_CHANGE_THRESHOLD = 0.5
RAPID_CHANGE_TIME = 1.0
FALL_Y_DROP_THRESHOLD = 100

MODEL_PATH = "yolov8s.pt"
CLASSES_PATH = "classes.txt"

# =========================
# === UTIL: ส่ง LINE =======
# =========================
def send_line_message(message_text: str):
    configuration = Configuration(access_token=CHANNEL_ACCESS_TOKEN)
    with ApiClient(configuration) as api_client:
        messaging_api = MessagingApi(api_client)
        messaging_api.push_message(
            PushMessageRequest(
                to=USER_ID,
                messages=[TextMessage(text=message_text)]
            )
        )
    print("✅ แจ้งเตือนผ่าน LINE แล้ว:", message_text)


# =========================
# === CORE DETECTOR =======
# =========================
class FallDetector:
    def __init__(self):
        # สถานะ/ตัวแปรระบบ
        self.cap = None
        self.source = None
        self.running = False
        self.thread = None
        self.lock = threading.Lock()

        # สถานะการแจ้งเตือน
        self.alert_mode = ALERT_MODE
        self.alert_limit = ALERT_LIMIT
        self.alert_count = 0
        self.alert_sent = False
        self.alert_cooldown = ALERT_COOLDOWN
        self.last_alert_time = 0.0

        # ตัวแปรเชิงเวลา/ตรวจจับ
        self.prev_aspect_ratio = 0.0
        self.ratio_change_time = 0.0
        self.fall_start_time = None
        self.falling_detected = False
        self.prev_box_y1 = 0

        # โหลดโมเดลและคลาส
        self.model = YOLO(MODEL_PATH)
        with open(CLASSES_PATH, 'r', encoding="utf-8") as f:
            self.classnames = f.read().splitlines()

        # ตัวนับ
        self.frame_count = 0

    # -------------- กล้อง/ซอร์ส --------------
    def _open_cap(self, new_source):
        """เปิด/สลับ VideoCapture อย่างปลอดภัย"""
        with self.lock:
            # ปิดตัวเก่า
            if self.cap is not None:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None

            # แปลงเลขเป็น int หากเป็นเลข index
            src = new_source
            if isinstance(src, str) and src.isdigit():
                src = int(src)

            self.cap = cv2.VideoCapture(src)
            if not self.cap or not self.cap.isOpened():
                self.source = None
                raise RuntimeError(f"ไม่สามารถเปิดกล้องจากซอร์ส: {new_source}")

            self.source = new_source
            print(f"🎥 เปิดกล้องจากซอร์ส: {self.source}")

    def set_camera_url(self, url_or_index: str):
        """เปลี่ยนกล้องด้วย URL/RTSP/ไฟล์/เลข index"""
        self._open_cap(url_or_index)

    def set_camera_by_device_id(self, device_id: int):
        """ดึง path_topic จาก MySQL แล้วเปิดกล้อง"""
        conn = mysql.connector.connect(**DB_CONFIG)
        try:
            cur = conn.cursor()
            cur.execute("SELECT path_topic FROM devices WHERE id = %s", (device_id,))
            row = cur.fetchone()
            if not row:
                raise ValueError(f"ไม่พบ device_id={device_id} ในตาราง devices")
            path = row[0]
            if not path:
                raise ValueError(f"device_id={device_id} ไม่มี path_topic")
            self._open_cap(path)
        finally:
            cur.close()
            conn.close()

    # -------------- ควบคุมวงวน --------------
    def start(self):
        if self.running:
            return
        if self.cap is None or self.source is None:
            raise RuntimeError("ยังไม่ได้ตั้งค่าซอร์สกล้อง ใช้ set_camera_url หรือ set_camera_by_device_id ก่อน")
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        print("▶️ เริ่มตรวจจับการล้มแล้ว")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
        print("⏹️ หยุดตรวจจับแล้ว")

    # -------------- วงวนตรวจจับหลัก --------------
    def _loop(self):
        # reset ตัวนับ/สถานะเตือนทุกครั้งที่เริ่ม
        self.alert_count = 0
        self.alert_sent = False
        self.last_alert_time = 0.0
        self.prev_aspect_ratio = 0.0
        self.ratio_change_time = 0.0
        self.fall_start_time = None
        self.falling_detected = False
        self.prev_box_y1 = 0
        self.frame_count = 0

        while self.running:
            with self.lock:
                cap_ok = (self.cap is not None and self.cap.isOpened())
            if not cap_ok:
                print("⚠️ กล้องปิด/หายไป หยุดวงวน")
                break

            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.05)
                continue

            self.frame_count += 1
            if self.frame_count % SKIP_FRAMES != 0:
                # แสดงผลหน้าต่างเพื่อให้ปิดได้ด้วย 't' ถ้าต้องการ
                cv2.imshow('Fall Detection', frame)
                if cv2.waitKey(1) & 0xFF == ord('t'):
                    self.running = False
                    break
                continue

            frame_h, frame_w = frame.shape[:2]
            results = self.model(frame, verbose=False)

            for info in results:
                for box in info.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    confidence = float(box.conf[0])
                    class_idx = int(box.cls[0])
                    class_name = self.classnames[class_idx] if class_idx < len(self.classnames) else str(class_idx)
                    conf_percent = math.ceil(confidence * 100)

                    if conf_percent > CONFIDENCE_THRESHOLD and class_name == 'person':
                        x1_pad = max(x1 - PADDING, 0)
                        y1_pad = max(y1 - PADDING, 0)
                        x2_pad = min(x2 + PADDING, frame_w - 1)
                        y2_pad = min(y2 + PADDING, frame_h - 1)

                        width = x2_pad - x1_pad
                        height = y2_pad - y1_pad
                        aspect_ratio = (width / height) if height > 0 else 0

                        cvzone.cornerRect(frame, [x1_pad, y1_pad, width, height], l=30, rt=6)
                        cvzone.putTextRect(frame, f'{class_name} {conf_percent}%', [x1_pad + 8, y1_pad - 12], thickness=2, scale=2)

                        current_time = time.time()
                        should_alert = False

                        # [1] เปลี่ยน ratio เร็ว
                        if self.prev_aspect_ratio < 1.0 and aspect_ratio > FALL_ASPECT_RATIO:
                            if current_time - self.ratio_change_time < RAPID_CHANGE_TIME and abs(aspect_ratio - self.prev_aspect_ratio) > RAPID_CHANGE_THRESHOLD:
                                cvzone.putTextRect(frame, 'Fall Detected (Rapid Change)', [x1_pad, y2_pad + 30], thickness=2, scale=2, colorR=(0, 0, 255))
                                should_alert = True

                        # [2] ล้มแล้วนิ่งเกิน HOLD time
                        if aspect_ratio > FALL_ASPECT_RATIO:
                            if not self.falling_detected:
                                self.fall_start_time = current_time
                                self.falling_detected = True
                            elif current_time - self.fall_start_time > FALL_HOLD_TIME:
                                cvzone.putTextRect(frame, 'Fall Detected (Hold)', [x1_pad, y2_pad + 60], thickness=2, scale=2, colorR=(0, 0, 255))
                                should_alert = True
                        else:
                            self.fall_start_time = None
                            self.falling_detected = False

                        # [3] ตกลงเร็ว (drop)
                        if abs(self.prev_box_y1 - y1) > FALL_Y_DROP_THRESHOLD:
                            cvzone.putTextRect(frame, 'Fall Detected (Drop)', [x1_pad, y2_pad + 90], thickness=2, scale=2, colorR=(0, 0, 255))
                            should_alert = True

                        # === ควบคุมการแจ้งเตือน ===
                        if should_alert:
                            if self.alert_mode == 1 and (current_time - self.last_alert_time >= self.alert_cooldown):
                                send_line_message("🚨 ตรวจพบการล้ม! (Rapid/Hold/Drop)")
                                self.last_alert_time = current_time
                                self.alert_count += 1

                            elif self.alert_mode == 2 and self.alert_count < self.alert_limit and (current_time - self.last_alert_time >= self.alert_cooldown):
                                send_line_message("🚨 ตรวจพบการล้ม! (แจ้งตามจำนวนจำกัด)")
                                self.last_alert_time = current_time
                                self.alert_count += 1

                            elif self.alert_mode == 3 and not self.alert_sent:
                                send_line_message("🚨 ตรวจพบการล้ม! (แจ้งครั้งเดียว)")
                                self.alert_sent = True

                        # อัปเดตค่า state
                        self.prev_aspect_ratio = aspect_ratio
                        self.ratio_change_time = current_time
                        self.prev_box_y1 = y1

            # แสดงผล/ปิดได้ด้วยปุ่ม t
            cv2.imshow('Fall Detection', frame)
            if cv2.waitKey(1) & 0xFF == ord('t'):
                self.running = False
                break

        # ปิดหน้าต่างเมื่อหยุด
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass

    # -------------- สถานะสำหรับ API --------------
    def get_status(self):
        return {
            "running": self.running,
            "source": self.source,
            "alert_mode": self.alert_mode,
            "alert_limit": self.alert_limit,
            "alert_count": self.alert_count,
            "alert_sent": self.alert_sent,
            "cooldown": self.alert_cooldown,
        }


# =========================
# === Flask API ===========
# =========================
app = Flask(__name__)
detector = FallDetector()

@app.route("/start", methods=["POST"])
def api_start():
    try:
        detector.start()
        return jsonify({"ok": True, "status": detector.get_status()})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

@app.route("/stop", methods=["POST"])
def api_stop():
    try:
        detector.stop()
        return jsonify({"ok": True, "status": detector.get_status()})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

@app.route("/set_camera_id", methods=["POST"])
def api_set_camera_id():
    data = request.get_json(silent=True) or {}
    device_id = data.get("id")
    if device_id is None:
        return jsonify({"ok": False, "error": "ต้องมีฟิลด์ 'id' (int)"}), 400
    try:
        detector.set_camera_by_device_id(int(device_id))
        return jsonify({"ok": True, "source": detector.source})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

@app.route("/set_camera_url", methods=["POST"])
def api_set_camera_url():
    data = request.get_json(silent=True) or {}
    url = data.get("url")
    if not url:
        return jsonify({"ok": False, "error": "ต้องมีฟิลด์ 'url' (str) เช่น '0' หรือ 'rtsp://...' หรือ 'http://...' หรือพาธไฟล์"}), 400
    try:
        detector.set_camera_url(url)
        return jsonify({"ok": True, "source": detector.source})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

@app.route("/status", methods=["GET"])
def api_status():
    return jsonify({"ok": True, "status": detector.get_status()})


# =========================
# === ตัวอย่างการใช้แบบฟังก์ชัน ===
# =========================
def run_detector_with_device_id(device_id: int):
    """
    ตัวอย่างฟังก์ชันที่สามารถเรียกใช้ตรงๆ (นอกเหนือจาก API)
    """
    detector.set_camera_by_device_id(device_id)
    detector.start()

def run_detector_with_url(url_or_index: str):
    """
    ตัวอย่างฟังก์ชันที่สามารถเรียกใช้ตรงๆ (นอกเหนือจาก API)
    เช่น '0' หรือ 'rtsp://...' หรือ 'http://...' หรือพาธไฟล์
    """
    detector.set_camera_url(url_or_index)
    detector.start()


# =========================
# === MAIN ================
# =========================
if __name__ == "__main__":
    # --- เลือกอย่างใดอย่างหนึ่ง ---
    # 1) ถ้าจะเริ่มจาก device_id = 2
    # run_detector_with_device_id(2)

    # 2) หรือเริ่มจากกล้องเว็บแคม index 0
    run_detector_with_url("0")

    # 3) หรือรันเป็นเว็บ API อย่างเดียว แล้วค่อยยิง API set_camera & start/stop
    app.run(host="0.0.0.0", port=5000, debug=True)
