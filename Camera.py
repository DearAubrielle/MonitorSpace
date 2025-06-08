import tensorflow as tf
import cv2
import numpy as np

# โหลดโมเดลจาก SavedModel
model = tf.saved_model.load("path/to/saved_model_directory")  # ชี้ไปที่โฟลเดอร์ที่มี saved_model.pb และ variables

# เชื่อมต่อกล้อง
cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # ปรับขนาดภาพ (MoveNet Thunder ใช้ 256x256)
    input_frame = cv2.resize(frame, (256, 256))
    input_frame = np.expand_dims(input_frame, axis=0)
    input_frame = tf.cast(input_frame, dtype=tf.float32)

    # ตรวจจับท่าทาง
    outputs = model.signatures["serving_default"](input_frame)
    keypoints = outputs['output_0'].numpy()[0][0]

    # วาดจุด关键点
    for y, x, conf in keypoints:
        if conf > 0.3:
            cv2.circle(frame, (int(x * frame.shape[1]), int(y * frame.shape[0])), 5, (0, 255, 0), -1)

    cv2.imshow("MoveNet Thunder", frame)
    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()