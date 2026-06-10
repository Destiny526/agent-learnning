from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

app = FastAPI(
    title="AI Travel Assistant - Notification Service",
    version="1.0.0",
    description="Notification Service"
)

# 使用内存存储替代 Redis（方便演示）
notifications_store = {}
reminders_store = {}

class NotificationRequest(BaseModel):
    user_id: int
    title: str
    content: str
    type: str = "system"

class EmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str

class SmsRequest(BaseModel):
    phone: str
    message: str

class ReminderRequest(BaseModel):
    user_id: int
    trip_id: int
    reminder_time: str
    message: str

class NotificationResponse(BaseModel):
    id: str
    user_id: int
    title: str
    content: str
    type: str
    created_at: datetime

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "notification-service"}

@app.post("/api/notifications")
async def send_notification(request: NotificationRequest):
    notification_id = f"notif_{datetime.now().strftime('%Y%m%d%H%M%S')}_{request.user_id}"

    notification = {
        "id": notification_id,
        "user_id": request.user_id,
        "title": request.title,
        "content": request.content,
        "type": request.type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }

    # 存储到内存
    if request.user_id not in notifications_store:
        notifications_store[request.user_id] = []
    notifications_store[request.user_id].append(notification)

    return {"message": "Notification sent", "notification_id": notification_id}

@app.get("/api/notifications/{user_id}")
async def get_notifications(user_id: int, limit: int = 20):
    user_notifications = notifications_store.get(user_id, [])
    return {"notifications": user_notifications[:limit]}

@app.post("/api/notifications/email")
async def send_email(request: EmailRequest):
    return {"message": f"Email queued to {request.to}", "subject": request.subject}

@app.post("/api/notifications/sms")
async def send_sms(request: SmsRequest):
    return {"message": f"SMS queued to {request.phone}"}

@app.post("/api/notifications/reminder")
async def set_reminder(request: ReminderRequest):
    reminder_id = f"reminder_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    reminder = {
        "id": reminder_id,
        "user_id": request.user_id,
        "trip_id": request.trip_id,
        "reminder_time": request.reminder_time,
        "message": request.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    reminders_store[reminder_id] = reminder

    return {"message": "Reminder set", "reminder_id": reminder_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)