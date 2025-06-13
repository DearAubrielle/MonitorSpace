import cv2
import cvzone
import math
from ultralytics import YOLO

cap = cv2.VideoCapture(0)
# cap = cv2.VideoCapture("http://192.168.100.101/videostream.cgi?user=user&pwd=pasword")  # หรือ IP camera URL

model = YOLO('yolov8s.pt')

classnames = []
with open('classes.txt', 'r') as f:
    classnames = f.read().splitlines()


while True:
    ret, frame = cap.read()
    frame = cv2.resize(frame, (980,740))

    results = model(frame)

    for info in results:
        parameters = info.boxes
        for box in parameters:
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            confidence = box.conf[0]
            class_detect = box.cls[0]
            class_detect = int(class_detect)
            class_detect = classnames[class_detect]
            conf = math.ceil(confidence * 100)


            # implement fall detection using the coordinates x1,y1,x2
            height = y2 - y1
            width = x2 - x1
            threshold  = height - width

            if conf > 80 and class_detect == 'person':
                cvzone.cornerRect(frame, [x1, y1, width, height], l=30, rt=6)
                cvzone.putTextRect(frame, f'{class_detect}', [x1 + 8, y1 - 12], thickness=2, scale=2)
            
            if threshold < 0:
                cvzone.putTextRect(frame, 'Fall Detected', [height, width], thickness=2, scale=2)
            
            else:pass


    cv2.imshow('frame', frame)
    if cv2.waitKey(1) & 0xFF == ord('t'):
        break


cap.release()
cv2.destroyAllWindows()

# import cv2
# import numpy as np
# import tensorflow as tf
# import requests

# LINE_NOTIFY_TOKEN = 'YOUR_LINE_NOTIFY_TOKEN'  # ใส่ Token ของคุณที่นี่
# NOTIFY_MODE = 'once'      # เลือกได้: 'once', 'repeat', 'limit'
# NOTIFY_LIMIT = 3          # ถ้า mode = 'limit', ใส่จำนวนสูงสุด

# fall_detected = False
# notify_count = 0

# def send_line_notify_image(message, frame):
#     url = "https://notify-api.line.me/api/notify"
#     _, img_encoded = cv2.imencode('.jpg', frame)
#     headers = {
#         "Authorization": "Bearer " + LINE_NOTIFY_TOKEN
#     }
#     files = {'imageFile': ('image.jpg', img_encoded.tobytes(), 'image/jpeg')}
#     payload = {'message': message}
#     requests.post(url, headers=headers, data=payload, files=files)

# def detect_fall(keypoints):
#     left_hip = keypoints[11]
#     right_hip = keypoints[12]
#     left_knee = keypoints[13]
#     right_knee = keypoints[14]

#     avg_hip_y = (left_hip[0] + right_hip[0]) / 2
#     avg_knee_y = (left_knee[0] + right_knee[0]) / 2

#     if avg_hip_y > avg_knee_y:
#         return True
#     return False

# def draw_bbox_from_keypoints(frame, keypoints):
#     h, w, _ = frame.shape
#     x_coords = [pt[1] * w for pt in keypoints if pt[2] > 0.3]
#     y_coords = [pt[0] * h for pt in keypoints if pt[2] > 0.3]
#     if x_coords and y_coords:
#         x1, y1 = int(min(x_coords)), int(min(y_coords))
#         x2, y2 = int(max(x_coords)), int(max(y_coords))
#         cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

# # โหลดโมเดล
# model = tf.saved_model.load("MonitorSpace/Python_camera") # file path to your saved model
# # cap = cv2.VideoCapture("http://192.168.100.101/videostream.cgi?user=user&pwd=pasword")  # หรือ IP camera URL
# cap = cv2.VideoCapture(0) 

# while True:
#     ret, frame = cap.read()
#     if not ret:
#         break

#     img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     resized = tf.image.resize_with_pad(tf.expand_dims(img_rgb, axis=0), 256, 256)
#     input_tensor = tf.cast(resized, dtype=tf.int32)

#     outputs = model.signatures['serving_default'](input_tensor)
#     keypoints = outputs['output_0'].numpy()[0][0]

#     is_fall = detect_fall(keypoints)

#     if is_fall:
#         draw_bbox_from_keypoints(frame, keypoints)

#         if NOTIFY_MODE == 'once' and not fall_detected:
#             print("🚨 ล้ม detected!")
#             # send_line_notify_image("🚨 ตรวจพบว่ามีการล้ม!", frame)
#             fall_detected = True

#         elif NOTIFY_MODE == 'repeat':
#             print("🚨 ล้ม detected!")
#             # send_line_notify_image("🚨 ล้มอยู่ในกรอบกล้อง", frame)

#         elif NOTIFY_MODE == 'limit' and notify_count < NOTIFY_LIMIT:
#             print(f"🚨 การล้มครั้งที่ ..  detected!")
#             # send_line_notify_image(f"🚨 การล้มครั้งที่ {notify_count+1}", frame)
#             notify_count += 1

#     else:
#         if NOTIFY_MODE == 'once':
#             fall_detected = False

#     cv2.imshow("Fall Detection", frame)
#     if cv2.waitKey(1) & 0xFF == 27:
#         break

# cap.release()
# cv2.destroyAllWindows()
