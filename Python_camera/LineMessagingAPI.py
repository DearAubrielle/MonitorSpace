# from flask import Flask, request, abort
# from linebot.v3 import WebhookHandler
# from linebot.v3.messaging import (
#     Configuration, ApiClient, MessagingApi,
#     ReplyMessageRequest, TextMessage
# )
# from linebot.v3.webhooks import (
#     MessageEvent, TextMessageContent
# )
# from linebot.v3.exceptions import InvalidSignatureError

# app = Flask(__name__)

# # ตั้งค่าด้วยข้อมูลจาก LINE Developer Console
# ACCESS_TOKEN = 'KwOqh2ygwm/ZEELgTi8wcHx1ZTOnjkddJA1rzjBKRan7OezkRaJtstVGsgTYgtjD2KijQCS6aGsea7ivdDyQ+GX2uvE+pjqubAyokDi3VtPyN3KgFTmIFySsPMDiiKOmshW43V8evvJHx/ZWAw/j2wdB04t89/1O/w1cDnyilFU='
# CHANNEL_SECRET = '60b52a19ff41f94dde3df82e39789686'

# handler = WebhookHandler(CHANNEL_SECRET)
# configuration = Configuration(access_token=ACCESS_TOKEN)

# @app.route("/webhook", methods=['POST'])
# def callback():
#     signature = request.headers['X-Line-Signature']
#     body = request.get_data(as_text=True)

#     try:
#         handler.handle(body, signature)
#     except InvalidSignatureError:
#         abort(400)
#     return 'OK'

# @handler.add(MessageEvent, message=TextMessageContent)
# def handle_message(event):
#     with ApiClient(configuration) as api_client:
#         line_bot_api = MessagingApi(api_client)

#         # เช็คว่าเป็นข้อความจากกลุ่ม
#         if event.source.type == "group":
#             group_id = event.source.group_id
#             text = f"✅ groupId ของกลุ่มนี้คือ:\n{group_id}"
#         else:
#             text = "❌ โปรดเชิญ Bot เข้ากลุ่มก่อน แล้วพิมพ์ข้อความใดๆ ในกลุ่ม"

#         line_bot_api.reply_message(
#             ReplyMessageRequest(
#                 reply_token=event.reply_token,
#                 messages=[TextMessage(text=text)]
#             )
#         )

# if __name__ == "__main__":
#     app.run(port=8000)




from linebot.v3.messaging import MessagingApi, PushMessageRequest, TextMessage
from linebot.v3.messaging.configuration import Configuration
from linebot.v3.messaging.api_client import ApiClient

# ✅ ใส่ Channel Access Token และ User ID ให้ถูกต้อง
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
        print("✅ ส่งข้อความเรียบร้อยแล้ว!")

# 🔹 ทดสอบส่งข้อความ
if __name__ == "__main__":
    send_line_message("📢 แจ้งเตือน: ตรวจจับการล้ม กรุณาตรวจสอบด่วน!")
