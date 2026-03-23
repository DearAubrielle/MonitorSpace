import time
import ssl
import mysql.connector
import paho.mqtt.client as mqtt
import threading
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient
# from dotenv import load_dotenv


DB_HOST = "hopper.proxy.rlwy.net"
DB_USER = "root"
DB_PASS = "zymkADYOgYCCkZgSvtAJAnesOKlKivWN"
DB_NAME = "spacemonitor"
DB_PORT = 28173

# DB_HOST ="localhost"
# DB_USER ="root"
# DB_PASS =""
# DB_NAME ="spacemonitor"
# DB_PORT = "3306"

MQTT_HOST = "49ee04006403486ea360ca6114faf597.s2.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USER = "Vittapong"
MQTT_PASS = "HappyS7*"

LINE_TOKEN = "KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU="
LINE_USER_ID = "C51151f2b2a353530e69ab5c43c3fb026"

# === LINE แจ้งเตือน ===
def send_line_message(msg):
    try:
        config = Configuration(access_token=LINE_TOKEN)
        with ApiClient(config) as api_client:
            MessagingApi(api_client).push_message(
                PushMessageRequest(to=LINE_USER_ID, messages=[TextMessage(text=msg)])
            )
        print(f"✅ LINE แจ้งเตือน: {msg}")
    except Exception as e:
        print(f"LINE Error: {e}")

# === MQTT CALLBACKS ===
subscribed_topics = set()

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("🟢 MQTT Connected successfully")
        subscribe_from_db(client)
    else:
        print("❌ MQTT connection failed with code:", rc)

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode("utf-8")
    print(f"📩 {topic} => {payload}")

    try:
        db = mysql.connector.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, port=DB_PORT
        )
        cursor = db.cursor()

        # อัปเดตค่า sensor ล่าสุด
        cursor.execute("UPDATE devices SET latest_value = %s WHERE path_topic = %s", (payload, topic))
        db.commit()

        # ดึงข้อมูล device เพื่อตรวจสอบแจ้งเตือน
        topic_parts = topic.split('/')
        device_id = topic_parts[1] if len(topic_parts) > 1 else None

        if device_id:
            cursor.execute("""
                SELECT d.id, d.name, d.latest_value, d.min_alert, d.max_alert, 
                       dt.name AS device_type, f.name AS floorplan_name, d.alert
                FROM devices d
                JOIN floorplan f ON d.floorplan_id = f.id
                JOIN device_type dt ON d.device_type_id = dt.id
                WHERE d.id = %s
            """, (device_id,))
            data = cursor.fetchone()

            if data:
                device_type = data[5]
                value = float(data[2]) if data[2] else None
                min_alert = float(data[3]) if data[3] else None
                max_alert = float(data[4]) if data[4] else None
                floor = data[6]
                device_alert = data[7]

                    # ตรวจสอบการแจ้งเตือน
                if device_alert:
                    if device_type == "Gas":
                        if value and max_alert and value > max_alert:
                            send_line_message(f"ตรวจจับค่าแก๊ส {data[1]} : {value} ppm เกินกว่าค่าปลอดภัยที่ {floor}")
                        # elif value and min_alert and value < min_alert:
                        #     send_line_message(f"ตรวจจับค่าแก๊ส {value} ppm ที่ {floor} ({data[1]})")

                    elif device_type == "Temperature":
                        if value and max_alert and value > max_alert:
                            send_line_message(f"ตรวจจับอุณหภูมิ {data[1]} : {value} °C สูงเกินกว่าค่าปลอดภัยที่ {floor}")
                        elif value and min_alert and value < min_alert:
                            send_line_message(f"ตรวจจับอุณหภูมิ {data[1]} : {value} °C ต่ำกว่าค่าปลอดภัยที่ {floor}")

                    elif device_type == "Humidity":
                        if value and max_alert and value > max_alert:
                            send_line_message(f"ตรวจจับความชื้น {data[1]} : {value} % สูงเกินกว่าค่าปลอดภัยที่ {floor}")
                        elif value and min_alert and value < min_alert:
                            send_line_message(f"ตรวจจับความชื้น {data[1]} : {value} % ต่ำกว่าค่าปลอดภัยที่ {floor}")

        db.close()
    except Exception as e:
        print("Database update error:", e)

# === SUBSCRIBE TOPICS ===
def subscribe_from_db(client):
    global subscribed_topics
    try:
        db = mysql.connector.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME, port=DB_PORT
        )
        cursor = db.cursor()
        # cursor.execute("SELECT path_topic FROM devices")
        cursor.execute("SELECT devices.path_topic FROM devices JOIN device_type ON devices.device_type_id = device_type.id WHERE device_type.name != 'Camera';")
        topics = cursor.fetchall()
        for topic in topics:
            if topic[0] is not None and topic[0] != '':  # ตรวจสอบว่า topic ไม่เป็น null และไม่ว่างเปล่า
                client.subscribe(topic[0], qos=1)
                print("Subscribed to topic:", topic[0])
                time.sleep(0.05)
        db.close()
    except Exception as e:
        print("Database error:", e)

# === MQTT LOOP (Auto Reconnect) ===
def mqtt_loop():
    while True:
        try:
            print("🔄 Connecting to MQTT broker...")
            client.connect(MQTT_HOST, MQTT_PORT)
            client.loop_forever()
        except Exception as e:
            print(f"⚠️ MQTT error: {e}")
            time.sleep(5)

# === Refresh topics จากฐานข้อมูลทุก 5 นาที ===
def refresh_topics():
    while True:
        time.sleep(60)
        print("🔁 Refreshing topic list from DB...")
        subscribe_from_db(client)

# === MQTT CONFIG ===
client = mqtt.Client(protocol=mqtt.MQTTv5)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.on_connect = on_connect
client.on_message = on_message

# === MAIN ===
if __name__ == "__main__":
    threading.Thread(target=mqtt_loop, daemon=True).start()
    threading.Thread(target=refresh_topics, daemon=True).start()
    while True:
        time.sleep(1)
