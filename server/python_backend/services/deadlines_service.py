from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


class DeadlinesService:
    """Service for managing deadlines in Firestore.
    
    Handles CRUD operations for deadlines including:
    - Fetching all deadlines or upcoming deadlines
    - Creating new deadlines
    - Updating existing deadlines
    - Deleting deadlines
    """

    def __init__(self) -> None:
        self._db = None
        self._init_firestore()

    def _init_firestore(self) -> None:
        try:
            import firebase_admin  # type: ignore
            from firebase_admin import firestore  # type: ignore
            if not firebase_admin._apps:
                self._db = None
                return
            self._db = firestore.client()
        except Exception:
            self._db = None

    def is_available(self) -> bool:
        return self._db is not None

    def _deadlines_collection(self):
        if self._db is None:
            raise RuntimeError("Firebase not initialized")
        return self._db.collection("deadlines")

    def _serialize_ts(self, value):
        """Convert Firestore timestamp to ISO string."""
        try:
            # Firestore Timestamp has .isoformat via to_datetime()
            return value.to_datetime().isoformat()  # type: ignore[attr-defined]
        except Exception:
            try:
                return value.isoformat()  # python datetime
            except Exception:
                return None

    def _serialize_deadline(self, doc_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize a deadline document with proper timestamp handling."""
        result = {
            "id": doc_id,
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "dueDate": data.get("dueDate", ""),
            "type": data.get("type", "pac"),
            "recurring": data.get("recurring", False),
            "dayOfMonth": data.get("dayOfMonth"),
        }
        
        # Handle timestamps
        created_at = data.get("createdAt")
        updated_at = data.get("updatedAt")
        
        if created_at:
            result["createdAt"] = self._serialize_ts(created_at)
        if updated_at:
            result["updatedAt"] = self._serialize_ts(updated_at)
            
        return result

    async def get_all_deadlines(self) -> List[Dict[str, Any]]:
        """Fetch all deadlines ordered by due date."""
        from firebase_admin import firestore  # type: ignore
        
        col = self._deadlines_collection()
        query = col.order_by("dueDate", direction=firestore.Query.ASCENDING)
        
        results: List[Dict[str, Any]] = []
        for doc in query.stream():
            data = doc.to_dict() or {}
            results.append(self._serialize_deadline(doc.id, data))
        
        return results

    async def get_upcoming_deadlines(self, days_ahead: int = 30, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch upcoming deadlines within the next N days, limited to a max count."""
        from firebase_admin import firestore  # type: ignore
        
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today.strftime("%Y-%m-%d")
        
        # Calculate end date
        end_date = today + timedelta(days=days_ahead)
        
        col = self._deadlines_collection()
        query = (
            col.where("dueDate", ">=", today_str)
            .order_by("dueDate", direction=firestore.Query.ASCENDING)
        )
        
        results: List[Dict[str, Any]] = []
        for doc in query.stream():
            data = doc.to_dict() or {}
            due_date_str = data.get("dueDate", "")
            
            if due_date_str:
                try:
                    due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
                    if due_date <= end_date:
                        results.append(self._serialize_deadline(doc.id, data))
                except ValueError:
                    # Skip invalid date formats
                    continue
            
            # Stop if we've reached the limit
            if len(results) >= limit:
                break
        
        return results

    async def create_deadline(self, deadline_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new deadline."""
        from firebase_admin import firestore  # type: ignore
        
        # Validate required fields
        if not deadline_data.get("title"):
            raise ValueError("title is required")
        if not deadline_data.get("dueDate"):
            raise ValueError("dueDate is required")
        
        col = self._deadlines_collection()
        
        # Prepare document data
        doc_data = {
            "title": deadline_data.get("title"),
            "description": deadline_data.get("description", ""),
            "dueDate": deadline_data.get("dueDate"),
            "type": deadline_data.get("type", "pac"),
            "recurring": deadline_data.get("recurring", False),
            "dayOfMonth": deadline_data.get("dayOfMonth") if deadline_data.get("recurring") else None,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        
        # Add the document
        doc_ref = col.document()
        doc_ref.set(doc_data)
        
        # Re-read to get the generated ID and timestamps
        snap = doc_ref.get()
        if snap.exists:
            data = snap.to_dict() or {}
            return self._serialize_deadline(doc_ref.id, data)
        else:
            # Fallback if re-read fails
            return self._serialize_deadline(doc_ref.id, doc_data)

    async def update_deadline(self, deadline_id: str, deadline_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing deadline."""
        from firebase_admin import firestore  # type: ignore
        
        if not deadline_id:
            raise ValueError("deadline_id is required")
        
        col = self._deadlines_collection()
        doc_ref = col.document(deadline_id)
        
        # Check if document exists
        if not doc_ref.get().exists:
            raise ValueError(f"Deadline with id {deadline_id} not found")
        
        # Prepare update data
        update_data = {
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        
        if "title" in deadline_data:
            update_data["title"] = deadline_data["title"]
        if "description" in deadline_data:
            update_data["description"] = deadline_data.get("description", "")
        if "dueDate" in deadline_data:
            update_data["dueDate"] = deadline_data["dueDate"]
        if "type" in deadline_data:
            update_data["type"] = deadline_data["type"]
        if "recurring" in deadline_data:
            update_data["recurring"] = deadline_data["recurring"]
        if "dayOfMonth" in deadline_data:
            update_data["dayOfMonth"] = deadline_data["dayOfMonth"] if deadline_data.get("recurring") else None
        
        # Update the document
        doc_ref.update(update_data)
        
        # Re-read to get updated data
        snap = doc_ref.get()
        if snap.exists:
            data = snap.to_dict() or {}
            return self._serialize_deadline(doc_ref.id, data)
        else:
            raise RuntimeError(f"Failed to read updated deadline {deadline_id}")

    async def delete_deadline(self, deadline_id: str) -> bool:
        """Delete a deadline."""
        if not deadline_id:
            raise ValueError("deadline_id is required")
        
        col = self._deadlines_collection()
        doc_ref = col.document(deadline_id)
        
        # Check if document exists
        if not doc_ref.get().exists:
            raise ValueError(f"Deadline with id {deadline_id} not found")
        
        # Delete the document
        doc_ref.delete()
        return True

