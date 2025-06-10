import cv2
import numpy as np
import tensorflow as tf
import requests

LINE_NOTIFY_TOKEN = 'ใส่โทเคนของคุณที่นี่'

def send_line_notify(message):
    url = "https://notify-api.line.me/api/notify"
    headers = {"Authorization": "Bearer " + LINE_NOTIFY_TOKEN}
    payload = {"message": message}
    requests.post(url, headers=headers, data=payload)

def detect_fall(keypoints):
    # จุดสำคัญ: 11 (left_hip), 12 (right_hip), 13 (left_knee), 14 (right_knee)
    left_hip = keypoints[11]
    right_hip = keypoints[12]
    left_knee = keypoints[13]
    right_knee = keypoints[14]

    avg_hip_y = (left_hip[0] + right_hip[0]) / 2
    avg_knee_y = (left_knee[0] + right_knee[0]) / 2

    # ถ้าสะโพกอยู่ต่ำกว่าหัวเข่า = มีแนวโน้มจะล้ม
    if avg_hip_y > avg_knee_y:
        return True
    return False

# โหลด MoveNet Thunder
model = tf.saved_model.load("C:/Users/vittapong/Desktop/SpecialProject/MonitorSpace/Python_camera")
# cap = cv2.VideoCapture("rtsp://user:pass@IP_ADDRESS:PORT/stream")  # หรือ 0 ถ้าใช้ webcam
cap = cv2.VideoCapture(0) 

fall_detected = False
while True:
    ret, frame = cap.read()
    if not ret:
        break

    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    resized = tf.image.resize_with_pad(tf.expand_dims(img_rgb, axis=0), 256, 256)
    input_tensor = tf.cast(resized, dtype=tf.int32)

    outputs = model.signatures['serving_default'](input_tensor)
    keypoints = outputs['output_0'].numpy()[0][0]

    if detect_fall(keypoints) and not fall_detected:

        print("มีคนล้มครับบบบบบบบบบบบบบบบบบบบ")
        # send_line_notify("🚨 ตรวจพบว่ามีการล้ม!")
        fall_detected = True  # ป้องกันการส่งซ้ำ

    # แสดงกล้อง
    cv2.imshow("Fall Detection", frame)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
