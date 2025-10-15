from google.cloud import firestore
from datetime import datetime

db = firestore.Client()

def send_role_based_notification(event_key: str, title: str, message_template: str, context: dict):
    """Send Firestore notifications to users based on role settings in /settings/notifications."""
    settings_ref = db.collection("settings").document("notifications")
    settings_doc = settings_ref.get()
    if not settings_doc.exists:
        print("⚠️ No notification settings found.")
        return

    settings = settings_doc.to_dict()
    event = settings.get(event_key)
    if not event or not event.get("enabled"):
        print(f"⚙️ Notification {event_key} disabled or missing.")
        return

    roles = event.get("roles", [])
    if not roles:
        print(f"⚙️ No roles configured for {event_key}.")
        return

    users_ref = db.collection("users").where("role", "in", roles)
    users = users_ref.stream()

    for user in users:
        data = user.to_dict()
        message = message_template.format(**context)
        db.collection("notifications").add({
            "title": title,
            "message": message,
            "toEmail": data.get("email"),
            "type": event_key.lower().replace(" ", "_"),
            "createdAt": datetime.utcnow(),
            "read": False,
        })

    print(f"✅ Sent {event_key} notifications successfully.")
