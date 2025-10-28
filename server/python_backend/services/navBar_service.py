from typing import List, Dict, Any, Optional

import firebase_admin
from firebase_admin import firestore


class NavBarService:
    def __init__(self) -> None:
        self.db = None
        self._initialize_firebase()

    def _initialize_firebase(self) -> None:
        try:
            if not firebase_admin._apps:
                # Service unavailable when Firebase is not initialized
                self.db = None
                return
            self.db = firestore.client()
        except Exception:
            self.db = None

    def is_available(self) -> bool:
        return self.db is not None

    def _get_user_doc_by_email(self, email: str):
        # Prefer direct document lookup where docId == email
        user_ref = self.db.collection("users").document(email)
        doc = user_ref.get()
        if doc.exists:
            return doc

        # Fallback: query by email field
        q = self.db.collection("users").where("email", "==", email).limit(1).stream()
        doc = next(q, None)
        if not doc:
            return None
        return doc

    def _shape_store(self, doc) -> Dict[str, Any]:
        data = doc.to_dict() or {}
        shaped = {
            "id": str(doc.id),
            # Prefer existing fields used by UI; fall back to reasonable defaults
            "storeID": data.get("storeID") or data.get("id") or str(doc.id),
            "subName": data.get("subName") or data.get("name") or "",
        }
        # Include optional fields for broader compatibility
        if "name" in data:
            shaped["name"] = data.get("name")
        if "address" in data:
            shaped["address"] = data.get("address")
        return shaped

    def _get_stores_by_ids(self, ids: List[str]) -> List[Dict[str, Any]]:
        stores: List[Dict[str, Any]] = []
        for sid in ids:
            try:
                doc = self.db.collection("stores").document(str(sid)).get()
                if doc.exists:
                    stores.append(self._shape_store(doc))
            except Exception:
                continue
        return stores

    def fetch_allowed_stores(self, email: str) -> List[Dict[str, Any]]:
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch allowed stores")

        user_doc = self._get_user_doc_by_email(email)
        if not user_doc:
            raise ValueError("User not found")

        user_data = user_doc.to_dict() or {}
        role = str(user_data.get("role", "") or "")

        # Admins: all stores
        if role.lower() == "admin":
            snaps = self.db.collection("stores").stream()
            return [self._shape_store(d) for d in snaps]

        # Non-admins: assigned stores only
        assigned = user_data.get("assignedStores", []) or []

        # Collect candidate ids (support both dicts and DocumentReferences)
        candidate_ids: List[str] = []
        for s in assigned:
            try:
                # DocumentReference
                if hasattr(s, "id"):
                    candidate_ids.append(str(s.id))
                else:
                    sid = s.get("id")
                    if sid:
                        candidate_ids.append(str(sid))
            except Exception:
                continue

        if not candidate_ids:
            return []

        return self._get_stores_by_ids(candidate_ids)


