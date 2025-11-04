from typing import List, Dict, Any


class InvoiceSettingsService:
    """Service for managing invoice category settings in Firestore.

    Ensures the canonical set of categories exist and supports updating
    a category's bank account number.
    """

    # Canonical category order (mirrors client InvoiceSettings.js)
    DEFAULT_INVOICE_CATEGORIES: List[str] = [
        "FOOD",
        "CONDIMENT",
        "PAPER",
        "NONPRODUCT",
        "TRAVEL",
        "ADV-OTHER",
        "PROMO",
        "OUTSIDE SVC",
        "LINEN",
        "OP. SUPPLY",
        "M+R",
        "SML EQUIP",
        "UTILITIES",
        "OFFICE",
        "TRAINING",
        "CREW RELATIONS",
    ]

    def __init__(self) -> None:
        self._db = None
        self._init_firestore()

    def _init_firestore(self) -> None:
        try:
            import firebase_admin  # type: ignore
            from firebase_admin import firestore  # type: ignore
            if not firebase_admin._apps:
                # If Firebase not initialized by app startup, do not initialize here.
                # The routers guard ensures availability; we only set client when available.
                self._db = None
                return
            self._db = firestore.client()
        except Exception:
            self._db = None

    def is_available(self) -> bool:
        return self._db is not None

    def _categories_collection(self):
        if self._db is None:
            raise RuntimeError("Firebase not initialized")
        return self._db.collection("invoiceCategories")

    def _serialize_ts(self, value):
        try:
            # Firestore Timestamp has .isoformat via to_datetime()
            return value.to_datetime().isoformat()  # type: ignore[attr-defined]
        except Exception:
            try:
                return value.isoformat()  # python datetime
            except Exception:
                return None

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Ensure default docs exist and return ordered category list."""
        from firebase_admin import firestore  # type: ignore

        col = self._categories_collection()
        results: List[Dict[str, Any]] = []

        for cat_id in self.DEFAULT_INVOICE_CATEGORIES:
            doc_ref = col.document(cat_id)
            snap = doc_ref.get()

            if snap.exists:
                data = snap.to_dict() or {}
            else:
                # Create missing doc with defaults
                data = {
                    "bankAccountNum": "0000",
                    "name": cat_id,
                    "description": f"Account settings for {cat_id} category",
                    "createdAt": firestore.SERVER_TIMESTAMP,
                }
                doc_ref.set(data)
                # After set, re-read to capture server timestamp if available
                try:
                    snap = doc_ref.get()
                    data = snap.to_dict() or data
                except Exception:
                    pass

            created_at = data.get("createdAt")
            results.append({
                "id": cat_id,
                "name": data.get("name", cat_id),
                "bankAccountNum": str(data.get("bankAccountNum", "")),
                "description": data.get("description"),
                "createdAt": self._serialize_ts(created_at) if created_at else None,
            })

        return results

    async def update_category(self, category_id: str, bank_account_num: str) -> Dict[str, Any]:
        from firebase_admin import firestore  # type: ignore

        if not category_id:
            raise ValueError("category_id is required")
        if not isinstance(bank_account_num, str) or not bank_account_num.strip():
            raise ValueError("bankAccountNum must be a non-empty string")

        col = self._categories_collection()
        doc_ref = col.document(category_id)
        snap = doc_ref.get()

        update_data = {"bankAccountNum": bank_account_num}

        if snap.exists:
            doc_ref.update(update_data)
            merged = {**(snap.to_dict() or {}), **update_data}
        else:
            # Create new doc with defaults + provided account number
            default_data = {
                "bankAccountNum": bank_account_num,
                "name": category_id,
                "description": f"Account settings for {category_id} category",
                "createdAt": firestore.SERVER_TIMESTAMP,
            }
            doc_ref.set(default_data)
            merged = default_data

        # Re-read to reflect latest stored values
        try:
            snap = doc_ref.get()
            if snap.exists:
                merged = snap.to_dict() or merged
        except Exception:
            pass

        created_at = merged.get("createdAt")
        return {
            "id": category_id,
            "name": merged.get("name", category_id),
            "bankAccountNum": str(merged.get("bankAccountNum", "")),
            "description": merged.get("description"),
            "createdAt": self._serialize_ts(created_at) if created_at else None,
        }


