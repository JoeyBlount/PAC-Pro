"""
Service for determining the earliest year with data for year dropdown ranges.
"""
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class YearRangeService:
    """Service to determine the earliest year with data for a store."""

    def __init__(self):
        self._db = None

    def _get_db(self):
        """Lazy initialization of Firestore client."""
        if self._db is None:
            try:
                import firebase_admin
                from firebase_admin import firestore
                if firebase_admin._apps:
                    self._db = firestore.client()
            except Exception as e:
                logger.warning(f"Could not initialize Firestore: {e}")
        return self._db

    def is_available(self) -> bool:
        """Check if the service can connect to Firestore."""
        return self._get_db() is not None

    async def get_earliest_year(self, store_id: str) -> int:
        """
        Find the earliest year with data for a given store.
        
        Checks multiple collections:
        - generate_input (PAC data)
        - pac-projections (projections data)
        - invoices (invoice data)
        - pac_actual (actual PAC data)
        
        Returns the minimum of 10 years back from current year or the earliest data year found.
        """
        db = self._get_db()
        if not db:
            # Default to 10 years back if no database
            return datetime.now().year - 10

        current_year = datetime.now().year
        default_earliest = current_year - 10
        earliest_found = current_year

        # Normalize store_id (handle different formats)
        normalized_store_id = self._normalize_store_id(store_id)

        # Collections to check for data
        collections_to_check = [
            "generate_input",
            "pac-projections", 
            "invoices",
            "pac_actual",
            "invoice_log_totals"
        ]

        for collection_name in collections_to_check:
            try:
                year = await self._find_earliest_in_collection(
                    db, collection_name, normalized_store_id
                )
                if year and year < earliest_found:
                    earliest_found = year
            except Exception as e:
                logger.warning(f"Error checking collection {collection_name}: {e}")
                continue

        # Return the earlier of: found data or default (10 years back)
        result = min(earliest_found, default_earliest)
        
        logger.info(f"Earliest year for store {store_id}: {result} (found data from: {earliest_found})")
        return result

    def _normalize_store_id(self, store_id: str) -> str:
        """Normalize store ID to match document ID format."""
        # Handle formats like "store_123" or just "123"
        if not store_id:
            return ""
        
        # If already has store_ prefix, keep it
        if store_id.startswith("store_"):
            return store_id
        
        # Add store_ prefix if it's just a number
        if store_id.isdigit():
            return f"store_{store_id}"
        
        return store_id

    async def _find_earliest_in_collection(
        self, db, collection_name: str, store_id: str
    ) -> Optional[int]:
        """
        Find the earliest year in a specific collection for the given store.
        
        Document IDs are typically formatted as: {store_id}_{YYYYMM}
        """
        try:
            collection_ref = db.collection(collection_name)
            
            # Query documents that start with the store_id prefix
            # Documents are named like "store_123_202501"
            start_prefix = f"{store_id}_"
            end_prefix = f"{store_id}_~"  # ~ comes after digits in ASCII
            
            query = (
                collection_ref
                .where("__name__", ">=", start_prefix)
                .where("__name__", "<", end_prefix)
                .order_by("__name__")
                .limit(1)
            )
            
            docs = list(query.stream())
            
            if docs:
                doc_id = docs[0].id
                # Extract year from document ID (format: store_123_YYYYMM)
                year = self._extract_year_from_doc_id(doc_id, store_id)
                if year:
                    return year
            
            # Alternative: check for storeID field in documents
            query_by_field = (
                collection_ref
                .where("storeID", "==", store_id)
                .order_by("year")
                .limit(1)
            )
            
            docs_by_field = list(query_by_field.stream())
            if docs_by_field:
                data = docs_by_field[0].to_dict()
                year = data.get("year")
                if isinstance(year, int) and 2000 <= year <= 2100:
                    return year
                    
        except Exception as e:
            # If query fails (e.g., index not available), try alternate approach
            logger.debug(f"Query failed for {collection_name}, trying fallback: {e}")
            return await self._find_earliest_fallback(db, collection_name, store_id)
        
        return None

    async def _find_earliest_fallback(
        self, db, collection_name: str, store_id: str
    ) -> Optional[int]:
        """
        Fallback method to find earliest year by scanning documents.
        Used when indexed queries aren't available.
        """
        try:
            collection_ref = db.collection(collection_name)
            earliest_year = None
            
            # Scan documents (limit to avoid performance issues)
            for doc in collection_ref.limit(500).stream():
                doc_id = doc.id
                
                # Check if document belongs to this store
                if not doc_id.startswith(f"{store_id}_"):
                    continue
                
                year = self._extract_year_from_doc_id(doc_id, store_id)
                if year and (earliest_year is None or year < earliest_year):
                    earliest_year = year
            
            return earliest_year
            
        except Exception as e:
            logger.warning(f"Fallback scan failed for {collection_name}: {e}")
            return None

    def _extract_year_from_doc_id(self, doc_id: str, store_id: str) -> Optional[int]:
        """
        Extract year from document ID.
        Expected format: {store_id}_{YYYYMM}
        """
        try:
            # Remove store_id prefix
            suffix = doc_id.replace(f"{store_id}_", "")
            
            # Should be YYYYMM format
            if len(suffix) >= 4 and suffix[:4].isdigit():
                year = int(suffix[:4])
                if 2000 <= year <= 2100:
                    return year
        except Exception:
            pass
        
        return None


# Singleton instance
_year_range_service = None


def get_year_range_service() -> YearRangeService:
    """Get or create the YearRangeService singleton."""
    global _year_range_service
    if _year_range_service is None:
        _year_range_service = YearRangeService()
    return _year_range_service

