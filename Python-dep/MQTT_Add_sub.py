from flask import Flask, request
import paho.mqtt.client as mqtt
import mysql.connector
import time
import os
import ssl
from dotenv import load_dotenv
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

# โหลดค่า .env
load_dotenv()

app = Flask(__name__)

# === ENV CONFIG ===
hostname = os.getenv("DB_HOST")
username = os.getenv("DB_USER")
password = os.getenv("DB_PASS")
database = os.getenv("DB_NAME")
port = int(os.getenv("DB_PORT", 3306))

CHANNEL_ACCESS_TOKEN = os.getenv("LINE_TOKEN")
USER_ID = os.getenv("LINE_USER_ID")

MQTT_HOST = os.getenv("MQTT_HOST")
MQTT_PORT = int(os.getenv("MQTT_PORT", 8883))
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASS = os.getenv("MQTT_PASS")

# === LINE MESSAGE ===
def send_line_message(message_text):
    try:
        configuration = Configuration(access_token=CHANNEL_ACCESS_TOKEN)
        with ApiClient(configuration) as api_client:
            messaging_api = MessagingApi(api_client)
            messaging_api.push_message(
                PushMessageRequest(
                    to=USER_ID,
                    messages=[TextMessage(text=message_text)]
                )
            )
            print("✅ แจ้งเตือนผ่าน LINE แล้ว")
    except Exception as e:
        print(f"LINE Error: {e}")

# === MQTT CALLBACK ===
def on_connect(client, userdata, flags, rc, properties=None):
    print("CONNACK received with code %s." % rc)

def on_message(client, userdata, msg):
    print(msg.topic + " " + str(msg.qos) + " " + msg.payload.decode("utf-8"))
    try:
        Topic = msg.topic.split('/')
        mydb = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
        mycursor = mydb.cursor()

        sql = "UPDATE devices SET latest_value = %s WHERE path_topic = %s"
        val = (msg.payload.decode("utf-8"), msg.topic)
        mycursor.execute(sql, val)
        mydb.commit()

        val = (Topic[1],)
        mycursor.execute("SELECT latest_value, min_alert, max_alert, name FROM devices WHERE id = %s", val)
        sensor_info = mycursor.fetchall()

        mycursor.execute("""
            SELECT d.id AS device_id, d.name AS device_name, f.name AS floorplan_name
            FROM devices d
            JOIN floorplan f ON d.floorplan_id = f.id
            WHERE d.id = %s
        """, val)
        floorplan_name = mycursor.fetchall()

        try:
            value = float(sensor_info[0][0])
        except ValueError:
            print(f"⚠️ ข้อมูลจาก {sensor_info[0][3]} ไม่ใช่ตัวเลข: {sensor_info[0][0]}")
            mydb.close()
            return

        if Topic[0] == "HumiditySensor":
            if value > float(sensor_info[0][2]) or value < float(sensor_info[0][1]):
                send_line_message(f"ความชื้นเกิน {sensor_info[0][2]} ที่ {floorplan_name[0][2]}")
        elif Topic[0] == "TemperatureSensor":
            if value > float(sensor_info[0][2]) or value < float(sensor_info[0][1]):
                send_line_message(f"อุณหภูมิเกิน {sensor_info[0][2]} °C ที่ {floorplan_name[0][2]}")
        elif Topic[0] == "GasSensor":
            if value > float(sensor_info[0][2]) or value < float(sensor_info[0][1]):
                send_line_message(f"ตรวจจับแก๊สอันตรายที่ {sensor_info[0][3]} ({floorplan_name[0][2]})")

        mydb.commit()
        mydb.close()

    except Exception as e:
        print("Error:", e)

# === MQTT SETUP ===
client = mqtt.Client(client_id="", userdata=None, protocol=mqtt.MQTTv5)
client.on_connect = on_connect
client.on_message = on_message
client.tls_set(tls_version=ssl.PROTOCOL_TLS)
client.username_pw_set(MQTT_USER, MQTT_PASS)

try:
    client.connect(MQTT_HOST, MQTT_PORT)
    client.loop_start()
except Exception as e:
    print(f"MQTT Connection Error: {e}")

# === Subscribe topics ===
try:
    mydb = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
    mycursor = mydb.cursor()
    mycursor.execute("SELECT path_topic FROM devices")
    topics = mycursor.fetchall()
    for topic in topics:
        if topic[0]:
            client.subscribe(topic[0], qos=1)
            print("Subscribed to topic:", topic[0])
    mydb.close()
except Exception as e:
    print(f"MySQL Error: {e}")

# === ROUTES ===
@app.route('/')
def index():
    return "MQTT Flask API is running on Render!"

@app.route('/add_topic', methods=['POST'])
def add_topic():
    topic = request.form.get('topic')
    if not topic:
        return "Missing topic", 400
    client.subscribe(topic, qos=0)
    return f"Subscribed to topic: {topic}"

# === Run App ===
if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    app.run(debug=False, host="0.0.0.0", port=port)
