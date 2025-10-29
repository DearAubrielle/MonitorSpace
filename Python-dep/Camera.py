from flask import Flask, render_template, request
import paho.mqtt.client as mqtt
import mysql.connector
import time
import os
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

def send_line_message(message_text):
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

def on_connect(client, userdata, flags, rc, properties=None):
    print("CONNACK received with code %s." % rc)

def on_publish(client, userdata, mid, properties=None):
    print("mid: " + str(mid))

def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    print("Subscribed: " + str(mid) + " " + str(granted_qos))

def on_message(client, userdata, msg):
    print(msg.topic + " " + str(msg.qos) + " " + msg.payload.decode("utf-8"))
    try:
        Topic = msg.topic.split('/')
        mydb = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
        mycursor = mydb.cursor()

        sql = "UPDATE devices SET latest_value = %s WHERE path_topic = %s"
        val = (msg.payload.decode("utf-8"), msg.topic)
        mycursor.execute(sql, val)

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

        if Topic[0] == "HumiditySensor":
            if float(sensor_info[0][0]) > float(sensor_info[0][2]) or float(sensor_info[0][0]) < float(sensor_info[0][1]):
                send_line_message(f"💧 ความชื้นเกิน {sensor_info[0][2]} ที่ {floorplan_name[0][2]}")
        elif Topic[0] == "TemperatureSensor":
            if float(sensor_info[0][0]) > float(sensor_info[0][2]) or float(sensor_info[0][0]) < float(sensor_info[0][1]):
                send_line_message(f"🌡️ อุณหภูมิสูงเกิน {sensor_info[0][2]} °C ที่ {floorplan_name[0][2]}")
        elif Topic[0] == "GasSensor":
            if float(sensor_info[0][0]) > float(sensor_info[0][2]):
                send_line_message(f"🔥 ตรวจจับแก๊สอันตรายที่ {sensor_info[0][3]} ({floorplan_name[0][2]})")

        mydb.commit()
        mydb.close()

    except Exception as e:
        print("Error:", e)

# === MQTT Setup ===
client = mqtt.Client(client_id="", userdata=None, protocol=mqtt.MQTTv5)
client.on_connect = on_connect
client.on_publish = on_publish
client.on_subscribe = on_subscribe
client.on_message = on_message
client.tls_set(tls_version=mqtt.ssl.PROTOCOL_TLS)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.connect(MQTT_HOST, MQTT_PORT)

# === Subscribe topics ===
mydb = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
mycursor = mydb.cursor()
mycursor.execute("SELECT path_topic FROM devices")
topics = mycursor.fetchall()
for topic in topics:
    if topic[0]:
        client.subscribe(topic[0], qos=1)
        print("Subscribed to topic:", topic[0])
client.loop_start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add_topic', methods=['POST'])
def add_topic():
    topic = request.form['topic']
    client.subscribe(topic, qos=0)
    return "Subscribed to topic: " + request.form['topic']

if __name__ == "__main__":
    app.run(debug=True)
