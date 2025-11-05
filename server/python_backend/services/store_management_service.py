"""
Store Management Service for PAC-Pro
Handles CRUD operations for store and deleted store management
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)


class StoreManagementService:
    """Service for managing stores and deleted stores in Firestore"""

    def __init__(self):
        self.db = None
        self.stores_collection = "stores"
        self.deleted_collection = "deletedStores"
        self._initialize_firebase()

    def _initialize_firebase(self):
        """Initialize Firebase Firestore"""
        try:
            if not firebase_admin._apps:
                print("Firebase not initialized - StoreManagementService unavailable")
                self.db = None
                return
            self.db = firestore.client()
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None

    def is_available(self) -> bool:
        """Check if Firebase is available"""
        return self.db is not None

    # -----------------------------
    # Active Stores
    # -----------------------------
    async def fetch_active_stores(self) -> List[Dict[str, Any]]:
        """Fetch all active stores"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch stores")

        try:
            docs = self.db.collection(self.stores_collection).stream()
            stores = [{**doc.to_dict(), "id": doc.id} for doc in docs]
            logger.info(f"Fetched {len(stores)} active stores")
            return stores
        except Exception as e:
            logger.error(f"Error fetching stores: {e}")
            raise RuntimeError(f"Failed to fetch stores: {str(e)}")

    async def add_store(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new store"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot add store")

        try:
            # Clean None values
            for k, v in store_data.items():
                if v is None:
                    store_data[k] = ""

            if not store_data.get("id"):
                store_data["id"] = f"store_{store_data.get('storeID', '')}"

            doc_ref = self.db.collection(self.stores_collection).document(store_data["id"])
            doc_ref.set(store_data)
            logger.info(f"Added new store: {store_data['id']}")
            return store_data
        except Exception as e:
            logger.error(f"Error adding store: {e}")
            raise RuntimeError(f"Failed to add store: {str(e)}")

    async def update_stores(self, stores: List[Dict[str, Any]]) -> bool:
        """Batch update multiple stores"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot update stores")

        try:
            batch = self.db.batch()
            for s in stores:
                sid = s.get("id")
                if not sid:
                    continue
                ref = self.db.collection(self.stores_collection).document(sid)
                batch.update(ref, {k: v for k, v in s.items() if k != "id"})
            batch.commit()
            logger.info(f"Updated {len(stores)} stores")
            return True
        except Exception as e:
            logger.error(f"Error updating stores: {e}")
            raise RuntimeError(f"Failed to update stores: {str(e)}")

    # -----------------------------
    # Deleted Stores
    # -----------------------------
    async def fetch_deleted_stores(self) -> List[Dict[str, Any]]:
        """Fetch all deleted (soft-deleted) stores"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch deleted stores")

        try:
            now = datetime.now()
            query = self.db.collection(self.deleted_collection).where("expireAt", ">", now)
            docs = query.stream()
            deleted_stores = []
            for doc in docs:
                data = doc.to_dict()
                data["deletedRefId"] = doc.id
                data["id"] = data.get("originalId")
                deleted_stores.append(data)

            logger.info(f"Fetched {len(deleted_stores)} deleted stores")
            return deleted_stores
        except Exception as e:
            logger.error(f"Error fetching deleted stores: {e}")
            raise RuntimeError(f"Failed to fetch deleted stores: {str(e)}")

    async def delete_store(self, store_id: str, deleted_by_role: Optional[str] = None) -> Dict[str, Any]:
        """Soft delete a store"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot delete store")

        try:
            ref = self.db.collection(self.stores_collection).document(store_id)
            doc = ref.get()
            if not doc.exists:
                raise ValueError("Store not found")

            store_data = doc.to_dict()
            expire_at = datetime.now() + timedelta(days=1)
            deleted_payload = {
                "originalId": store_id,
                "subName": store_data.get("subName", ""),
                "address": store_data.get("address", ""),
                "entity": store_data.get("entity", ""),
                "storeID": store_data.get("storeID", ""),
                "startMonth": store_data.get("startMonth", ""),
                "deletedAt": datetime.now(),
                "expireAt": expire_at,
                "deletedByRole": deleted_by_role or "",
            }

            deleted_ref = self.db.collection(self.deleted_collection).add(deleted_payload)
            ref.delete()
            logger.info(f"Moved store {store_id} to deletedStores")
            return {"deletedRefId": deleted_ref[1].id}
        except Exception as e:
            logger.error(f"Error deleting store: {e}")
            raise RuntimeError(f"Failed to delete store: {str(e)}")

    async def restore_store(self, deleted_ref_id: str) -> Dict[str, Any]:
        """Restore a previously deleted store"""
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot restore store")

        try:
            deleted_ref = self.db.collection(self.deleted_collection).document(deleted_ref_id)
            deleted_doc = deleted_ref.get()
            if not deleted_doc.exists:
                raise ValueError("Deleted store not found")

            data = deleted_doc.to_dict()
            target_id = data.get("originalId")
            if not target_id:
                raise ValueError("Missing originalId in deleted store document")

            store_data = {
                "id": target_id,
                "subName": data.get("subName", ""),
                "address": data.get("address", ""),
                "entity": data.get("entity", ""),
                "storeID": data.get("storeID", ""),
                "startMonth": data.get("startMonth", ""),
            }

            self.db.collection(self.stores_collection).document(target_id).set(store_data)
            deleted_ref.delete()

            logger.info(f"Restored store {target_id}")
            return {"restoredId": target_id}
        except Exception as e:
            logger.error(f"Error restoring store: {e}")
            raise RuntimeError(f"Failed to restore store: {str(e)}")