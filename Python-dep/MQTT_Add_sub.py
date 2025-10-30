import os
import time
import mysql.connector
from flask import Flask, request, jsonify
from paho.mqtt import client as mqtt
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient
from dotenv import load_dotenv

# โหลด environment variables
load_dotenv()

# === LINE CONFIG ===
CHANNEL_ACCESS_TOKEN = os.getenv('LINE_TOKEN')
USER_ID = os.getenv('LINE_USER_ID')

# === MQTT CONFIG ===
MQTT_HOST = os.getenv('MQTT_HOST')
MQTT_PORT = int(os.getenv('MQTT_PORT', 8883))
MQTT_USER = os.getenv('MQTT_USER')
MQTT_PASS = os.getenv('MQTT_PASS')

# === DATABASE CONFIG ===
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASS')
DB_NAME = os.getenv('DB_NAME')
DB_PORT = int(os.getenv('DB_PORT', 3306))

# === LINE SETUP ===
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
    except Exception as e:
        print(f"LINE Error: {e}")

# === DATABASE CONNECTION ===
def get_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        port=DB_PORT
    )

# === MQTT SETUP ===
def on_connect(client, userdata, flags, rc, properties=None):
    print("CONNACK received with code %s." % rc)
    try:
        db = get_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT MQTT_Topic FROM devices WHERE MQTT_Topic IS NOT NULL")
        topics = cursor.fetchall()
        for row in topics:
            topic = row["MQTT_Topic"]
            if topic:
                client.subscribe(topic)
                print(f"Subscribed to topic: {topic}")
        cursor.close()
        db.close()
    except Exception as e:
        print(f"Database Error on connect: {e}")

def on_message(client, userdata, msg):
    print(f"📩 Message from {msg.topic}: {msg.payload.decode()}")
    try:
        db = get_connection()
        cursor = db.cursor()
        sql = "UPDATE devices SET latest_value = %s WHERE MQTT_Topic = %s"
        cursor.execute(sql, (msg.payload.decode(), msg.topic))
        db.commit()
        cursor.close()
        db.close()
    except Exception as e:
        print(f"Database update error: {e}")

# === MQTT CLIENT ===
client = mqtt.Client(client_id="", userdata=None, protocol=mqtt.MQTTv5)
client.username_pw_set(MQTT_USER, MQTT_PASS)
client.on_connect = on_connect
client.on_message = on_message
client.loop_start()
client.connect(MQTT_HOST, MQTT_PORT)

# === FLASK APP ===
app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({"status": "API running", "message": "MQTT + Flask OK"})

@app.route('/add_topic', methods=['POST'])
def add_topic():
    topic = request.json.get('topic')
    if not topic:
        return jsonify({"error": "Missing topic"}), 400
    client.subscribe(topic)
    print(f"Subscribed to topic: {topic}")
    return jsonify({"message": f"Subscribed to topic: {topic}"})

@app.route('/send_line', methods=['POST'])
def send_line():
    msg = request.json.get('message')
    if not msg:
        return jsonify({"error": "Missing message"}), 400
    send_line_message(msg)
    return jsonify({"message": "Line message sent successfully"})

# === RUN APP (Render-friendly) ===
if __name__ == '__main__':
    port = int(os.getenv("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)
