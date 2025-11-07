"""
Announcement Management Service for PAC-Pro
Handles announcement CRUD operations with Firebase Firestore
"""
import logging
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)

class AnnouncementService:
    """Service for managing announcements in Firebase Firestore"""
    
    def __init__(self):
        self.db = None
        self.announcements_collection = "announcements"
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Firestore if available"""
        try:
            if not firebase_admin._apps:
                print("Firebase not initialized - AnnouncementService will not be available")
                self.db = None
                return
            self.db = firestore.client()
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None

    def is_available(self) -> bool:
        """Check if Firestore is available"""
        return self.db is not None

    async def fetch_announcements(self, role: str = "All") -> List[Dict[str, Any]]:
        """
        Fetch all announcements visible to a given role.
        Args:
            role (str): The role filter ("All" or specific role)
        Returns:
            List[Dict[str, Any]]: List of announcement documents
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch announcements")

        try:
            logger.info(f"Fetching announcements for role: {role}")
            collection = self.db.collection(self.announcements_collection)
            docs = collection.stream()

            results = []
            for doc in docs:
                data = doc.to_dict()
                if not data:
                    continue
                if data.get("visible_to") == "All" or data.get("visible_to") == role:
                    data["id"] = doc.id
                    results.append(data)
            
            logger.info(f"Fetched {len(results)} announcements for role {role}")
            return results

        except Exception as e:
            logger.error(f"Error fetching announcements: {e}")
            raise RuntimeError(f"Failed to fetch announcements: {str(e)}")

    async def fetch_all_announcements(self) -> List[Dict[str, Any]]:
        """Fetch all announcements regardless of visibility"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch announcements")

        try:
            logger.info("Fetching all announcements")
            collection = self.db.collection(self.announcements_collection)
            docs = collection.stream()

            results = []
            for doc in docs:
                data = doc.to_dict()
                if not data:
                    continue
                data["id"] = doc.id
                results.append(data)

            logger.info(f"Fetched {len(results)} total announcements")
            return results

        except Exception as e:
            logger.error(f"Error fetching all announcements: {e}")
            raise RuntimeError(f"Failed to fetch all announcements: {str(e)}")

    async def add_announcement(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a new announcement document.
        Args:
            data (Dict[str, Any]): Announcement data
        Returns:
            Dict[str, Any]: Saved announcement with assigned ID
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot add announcement")

        try:
            logger.info(f"Adding new announcement: {data.get('title')}")
            collection = self.db.collection(self.announcements_collection)
            doc_ref = collection.document()
            doc_ref.set(data)
            data["id"] = doc_ref.id
            logger.info(f"Successfully added announcement with id {doc_ref.id}")
            return data
        except Exception as e:
            logger.error(f"Error adding announcement: {e}")
            raise RuntimeError(f"Failed to add announcement: {str(e)}")

    async def delete_announcement(self, announcement_id: str) -> bool:
        """
        Delete an announcement document.
        Args:
            announcement_id (str): The Firestore document ID
        Returns:
            bool: True if successfully deleted
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot delete announcement")

        try:
            logger.info(f"Deleting announcement with ID: {announcement_id}")
            doc_ref = self.db.collection(self.announcements_collection).document(announcement_id)
            if not doc_ref.get().exists:
                raise ValueError("Announcement not found")
            doc_ref.delete()
            logger.info(f"Successfully deleted announcement {announcement_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting announcement: {e}")
            raise RuntimeError(f"Failed to delete announcement: {str(e)}")