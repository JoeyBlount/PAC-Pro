"""
User Management Service for PAC-Pro
Handles user CRUD operations with Firebase Firestore
"""
import logging
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import firestore

logger = logging.getLogger(__name__)

class UserManagementService:
    """Service for managing users in Firebase Firestore"""
    
    def __init__(self):
        self.db = None
        self.users_collection = "users"
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase if available"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                print("Firebase not initialized - UserManagementService will not be available")
                self.db = None
                return
            
            self.db = firestore.client()
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None
    
    async def fetch_users(self) -> List[Dict[str, Any]]:
        """
        Fetch all users from the 'users' collection in Firestore.
        
        Returns:
            List[Dict[str, Any]]: List of user documents with their data
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot fetch users")
        
        try:
            logger.info("Fetching all users from Firestore")
            
            # Get all documents from the users collection
            users_ref = self.db.collection(self.users_collection)
            docs = users_ref.stream()
            
            users = []
            for doc in docs:
                user_data = doc.to_dict()
                # Add the document ID (email) as id for consistency
                user_data['id'] = doc.id  # doc.id is the email
                users.append(user_data)
            
            logger.info(f"Successfully fetched {len(users)} users")
            return users
            
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            raise RuntimeError(f"Failed to fetch users: {str(e)}")
    
    async def delete_user(self, user_email: str) -> bool:
        """
        Delete a user from the 'users' collection.
        
        Args:
            user_email (str): The email (document ID) of the user to delete
            
        Returns:
            bool: True if deletion was successful
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot delete user")
        
        try:
            logger.info(f"Deleting user with email: {user_email}")
            
            # Delete the user document (email is the document ID)
            user_ref = self.db.collection(self.users_collection).document(user_email)
            user_ref.delete()
            
            logger.info(f"Successfully deleted user with email: {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting user {user_email}: {e}")
            raise RuntimeError(f"Failed to delete user: {str(e)}")
    
    async def add_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a new user to the 'users' collection.
        
        Args:
            user_data (Dict[str, Any]): The user data to add
            
        Returns:
            Dict[str, Any]: The added user data with ID
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot add user")
        
        try:
            logger.info(f"Adding user with email: {user_data.get('email')}")
            
            # Use email as the document ID
            user_email = user_data.get('email')
            if not user_email:
                raise ValueError("Email is required for user creation")
            
            # Check if user already exists
            user_ref = self.db.collection(self.users_collection).document(user_email)
            if user_ref.get().exists:
                raise ValueError(f"User with email {user_email} already exists")
            
            # Ensure assignedStores is stored as an array of simple dicts
            assigned = user_data.get('assignedStores') or []
            if not isinstance(assigned, list):
                assigned = []
            clean_assigned: List[Dict[str, Any]] = []
            for s in assigned:
                try:
                    clean_assigned.append({
                        'id': str(s.get('id', '')),
                        'name': str(s.get('name', '')),
                        'address': str(s.get('address', '')),
                    })
                except Exception:
                    continue
            user_data['assignedStores'] = clean_assigned

            # Add the user document
            user_ref.set(user_data)
            
            # Add the document ID to the returned data
            user_data['id'] = user_email
            
            logger.info(f"Successfully added user with email: {user_email}")
            return user_data
            
        except Exception as e:
            logger.error(f"Error adding user: {e}")
            raise RuntimeError(f"Failed to add user: {str(e)}")

    async def edit_user(self, user_email: str, user_data: Dict[str, Any]) -> bool:
        """
        Edit a user in the 'users' collection.
        
        Args:
            user_email (str): The email (document ID) of the user to edit
            user_data (Dict[str, Any]): The updated user data
            
        Returns:
            bool: True if edit was successful
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot edit user")
        
        try:
            logger.info(f"Editing user with email: {user_email}")
            
            # Update the user document (email is the document ID)
            user_ref = self.db.collection(self.users_collection).document(user_email)

            # Load existing to determine role transition and validate assigned stores
            existing_doc = user_ref.get()
            if not existing_doc.exists:
                raise ValueError("User not found")
            existing = existing_doc.to_dict() or {}

            old_role = str(existing.get('role', '') or '')
            new_role = str(user_data.get('role', old_role) or '')

            # Helper to sanitize assigned stores
            def _sanitize_assigned(input_list) -> List[Dict[str, Any]]:
                clean: List[Dict[str, Any]] = []
                for s in input_list or []:
                    if not isinstance(s, dict):
                        continue
                    sid = s.get('id')
                    if not sid:
                        continue
                    clean.append({
                        'id': str(s.get('id', '')),
                        'name': str(s.get('name', '')),
                        'address': str(s.get('address', '')),
                    })
                return clean

            # Determine how to handle assignedStores based on role rules
            provided_assigned = user_data.get('assignedStores', None)
            if new_role.lower() == 'admin':
                # Admin implies access to all stores; clear assigned list
                user_data['assignedStores'] = []
            else:
                # Non-admins must have at least one assigned store
                if old_role.lower() == 'admin' and new_role.lower() != 'admin':
                    # Role demotion requires caller to provide stores
                    if not isinstance(provided_assigned, list) or len(provided_assigned) == 0:
                        raise ValueError('At least one assigned store is required when changing role from Admin to non-Admin')
                if provided_assigned is not None:
                    clean_assigned = _sanitize_assigned(provided_assigned)
                    if len(clean_assigned) == 0:
                        raise ValueError('assignedStores must include at least one valid store for non-Admin users')
                    user_data['assignedStores'] = clean_assigned
                # If not provided and staying non-admin, keep existing assigned stores as-is

            user_ref.update(user_data)
            
            logger.info(f"Successfully updated user with email: {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error editing user {user_email}: {e}")
            raise RuntimeError(f"Failed to edit user: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Firebase is available for user management operations"""
        return self.db is not None
