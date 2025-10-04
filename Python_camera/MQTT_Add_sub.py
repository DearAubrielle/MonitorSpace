from flask import Flask, render_template, request
import paho.mqtt.client as mqtt
import mysql.connector
import time
from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

app = Flask(__name__)

hostname ="localhost"
username ="root"
password =""
database ="spacemonitor"
port = "3306"

CHANNEL_ACCESS_TOKEN = 'KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU='
USER_ID = 'C51151f2b2a353530e69ab5c43c3fb026'

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
        # รูปแบบ topic คือ sensortype + กับ sensorid
        # Topic[0] = sensortype
        # Topic[1] = sensorid
        Topic = msg.topic.split('/')
        mydb = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
        mycursor = mydb.cursor()

        sql = "UPDATE devices SET latest_value = %s WHERE path_topic = %s"
        # val = (msg.payload.decode("utf-8"),Topic[1],)
        # val = (2568,1,)
        val = (msg.payload.decode("utf-8"),msg.topic,)
        mycursor.execute(sql, val)

        print("msg.payload: ",msg.payload.decode("utf-8"))
        print("msg.topic.split :",Topic)
        # sql = "SELECT sensor_type FROM tb_zone WHERE id = %s"

        val = (Topic[1],)
        mycursor.execute("SELECT latest_value,min_alert,max_alert,name FROM devices WHERE id = %s",val)
        sensor_info = mycursor.fetchall()



        sql = "SELECT d.id AS device_id, d.name AS device_name, f.name AS floorplan_name FROM devices d JOIN floorplan f ON d.floorplan_id = f.id WHERE d.id = %s"
        mycursor.execute(sql,val)
        floorplan_name = mycursor.fetchall()
        print(floorplan_name)
        # for sensor in sensor_info:
        #     print(sensor)

        # sensor_info[0][0] = latest_value
        # sensor_info[0][1] = min_alert
        # sensor_info[0][2] = max_alert
        # sensor_info[0][3] = name

        print("sensor_info[0][2]",sensor_info[0][0])

        if(Topic[0] == "HumiditySensor"):
            if(float(sensor_info[0][0])>float(sensor_info[0][2])):
                send_line_message("มีความชื้นเกิน60%")
                send_line_message(sensor_info[0][2])
        if(Topic[0] == "TemperatureSensor"):
            # send_line_message("ทดสอบการแจ้งเตือน TemperatureSensor อุณหภูมิ:"+sensor_info[0][0]+"อยู่"+floorplan_name[0][2])
            if(float(sensor_info[0][0])>float(sensor_info[0][2])):
                send_line_message("ตรวจพบอุณหภูมิสูงเกิน 50 องศาเซลเซียส")
        if(Topic[0] == "GasSensor"):
            if(float(sensor_info[0][0])>float(sensor_info[0][2])):
                send_line_message("ตรวจจับGasอันตราย ที่ Sensor"+sensor_info[0][3]+"อยู่ที่"+floorplan_name[0][2])

        mydb.commit()
        mydb.close()

        # print("Topic:  ",Topic[1])
        # print("Successfully updated MySQL database")
        # print(sensor_info[0])

    except Exception as e:
        print("Error:", e)

client = mqtt.Client(client_id="", userdata=None, protocol=mqtt.MQTTv5)
client.on_connect = on_connect
client.on_publish = on_publish
client.on_subscribe = on_subscribe
client.on_message = on_message
client.tls_set(tls_version=mqtt.ssl.PROTOCOL_TLS)
client.username_pw_set("Vittapong", "HappyS7*")
client.connect("49ee04006403486ea360ca6114faf597.s2.eu.hivemq.cloud", 8883)
mydb = mysql.connector.connect(host=hostname, database=database, user=username, password=password, port=port)
mycursor = mydb.cursor()

# client.subscribe("layout_id21/70", qos=1)
# print("Subscribed to topic:layout_id21/70")

mycursor.execute("SELECT path_topic FROM devices")
topics = mycursor.fetchall()
for topic in topics:
    if topic[0] is not None and topic[0] != '':  # ตรวจสอบว่า topic ไม่เป็น null และไม่ว่างเปล่า
        client.subscribe(topic[0], qos=1)
        print("Subscribed to topic:", topic[0])
    else:
        print("Invalid topic:", topic[0])
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