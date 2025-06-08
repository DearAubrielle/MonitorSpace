import tensorflow as tf
import numpy as np
import cv2

# โหลดโมเดล MoveNet
model = tf.saved_model.load("C:/Users/vittapong/Desktop/SpecialProject/MonitorSpace/Python_camera") # ใส่ path ที่มี saved_model.pb

# สร้างฟังก์ชันแปลงภาพ
def preprocess_frame(frame):
    img = tf.image.resize_with_pad(tf.expand_dims(frame, axis=0), 256, 256)
    return tf.cast(img, dtype=tf.int32)

# เปิดกล้อง
cap = cv2.VideoCapture(0)  # 0 = กล้องในโน้ตบุ๊ก

while True:
    ret, frame = cap.read()
    if not ret:
        break

    input_img = preprocess_frame(frame)
    outputs = model.signatures['serving_default'](input_img)

    keypoints = outputs['output_0'].numpy()  # [1,1,17,3] → keypoints 17 จุด
    print(keypoints[0][0])  # พิมพ์ keypoints แต่ละจุด

    # แสดงภาพ
    cv2.imshow("MoveNet Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
