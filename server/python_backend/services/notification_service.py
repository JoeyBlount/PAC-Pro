"""
Notification Service for PAC-Pro
Handles notification retrieval and update operations with Firebase Firestore
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications and notification settings in Firestore"""

    def __init__(self):
        self.db = None
        self.notifications_collection = "notifications"
        self.settings_collection = "settings"
        self._initialize_firebase()

    def _initialize_firebase(self):
        """Initialize Firebase Firestore"""
        try:
            if not firebase_admin._apps:
                print("Firebase not initialized - NotificationService unavailable")
                self.db = None
                return
            self.db = firestore.client()
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None

    def is_available(self) -> bool:
        """Check if Firebase is available"""
        return self.db is not None

    # -----------------------
    # Notification Settings
    # -----------------------
    async def fetch_notification_settings(self) -> List[Dict[str, Any]]:
        """Fetch all notification settings"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch notification settings")

        try:
            doc_ref = self.db.collection(self.settings_collection).document("notifications")
            doc = doc_ref.get()
            settings = []

            if doc.exists:
                data = doc.to_dict()
                for t, v in data.items():
                    settings.append({
                        "type": t,
                        "enabled": v.get("enabled", True),
                        "roles": v.get("roles", ["Admin"]),
                    })

            logger.info(f"Fetched {len(settings)} notification settings")
            return settings

        except Exception as e:
            logger.error(f"Error fetching notification settings: {e}")
            raise RuntimeError(f"Failed to fetch notification settings: {str(e)}")

    async def update_notification_settings(self, payload: Dict[str, Dict[str, Any]]) -> bool:
        """Update notification settings"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot update notification settings")

        try:
            doc_ref = self.db.collection(self.settings_collection).document("notifications")
            doc_ref.set(payload)
            logger.info("Notification settings updated successfully")
            return True
        except Exception as e:
            logger.error(f"Error updating notification settings: {e}")
            raise RuntimeError(f"Failed to update notification settings: {str(e)}")

    # -----------------------
    # Notifications
    # -----------------------
    async def fetch_notifications(self, to_email: str) -> List[Dict[str, Any]]:
        """Fetch notifications for a given user"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch notifications")

        try:
            ref = (
                self.db.collection(self.notifications_collection)
                .where("toEmail", "==", to_email)
                .order_by("createdAt", direction=firestore.Query.DESCENDING)
            )
            docs = ref.stream()
            notifications = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                notifications.append(data)

            logger.info(f"Fetched {len(notifications)} notifications for {to_email}")
            return notifications
        except Exception as e:
            logger.error(f"Error fetching notifications: {e}")
            raise RuntimeError(f"Failed to fetch notifications: {str(e)}")

    async def mark_notification_as_read(self, notif_id: str) -> bool:
        """Mark a single notification as read"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot mark notification")

        try:
            doc_ref = self.db.collection(self.notifications_collection).document(notif_id)
            if not doc_ref.get().exists:
                raise ValueError("Notification not found")

            doc_ref.update({"read": True, "readAt": datetime.now()})
            logger.info(f"Notification {notif_id} marked as read")
            return True
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            raise RuntimeError(f"Failed to mark notification as read: {str(e)}")

    async def mark_all_as_read(self, to_email: str) -> bool:
        """Mark all notifications as read for a user"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot mark notifications")

        try:
            query = self.db.collection(self.notifications_collection).where("toEmail", "==", to_email)
            batch = self.db.batch()
            for doc in query.stream():
                data = doc.to_dict()
                if not data.get("read", False):
                    batch.update(doc.reference, {"read": True, "readAt": datetime.now()})
            batch.commit()
            logger.info(f"Marked all notifications as read for {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error marking notifications as read: {e}")
            raise RuntimeError(f"Failed to mark notifications as read: {str(e)}")