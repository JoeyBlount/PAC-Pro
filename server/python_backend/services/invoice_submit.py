"""
Invoice submission service for handling Firebase operations
"""
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import uuid

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import firestore, storage, credentials


class InvoiceSubmitService:
    """Service for submitting invoices to Firebase"""
    
    def __init__(self):
        self.db = None
        self.bucket = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase if available"""
        try:
            load_dotenv()
            self.db = firestore.client()
            bucket_name = os.environ.get("REACT_APP_FIREBASE_STORAGE_BUCKET") or os.environ.get("FIREBASE_STORAGE_BUCKET")
            if not bucket_name:
                raise RuntimeError(
                    "Missing Firebase storage bucket. Set REACT_APP_FIREBASE_STORAGE_BUCKET (or FIREBASE_STORAGE_BUCKET) in your environment/.env"
                )
            self.bucket = storage.bucket(bucket_name)
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None
            self.bucket = None
    
    async def submit_invoice(
        self,
        invoice_data: Dict[str, Any],
        image_file: Optional[bytes] = None,
        image_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submit invoice data and image to Firebase
        
        Args:
            invoice_data: Dictionary containing invoice information
            image_file: Image file bytes (optional for recurring invoices)
            image_filename: Original filename of the image (optional for recurring invoices)
            
        Returns:
            Dictionary with submission result
        """
        if not self.db or not self.bucket:
            raise RuntimeError("Firebase not initialized - cannot submit invoice")
        
        try:
            # Check if this is a recurring invoice
            is_recurring = invoice_data.get('isRecurring', False)
            
            # Upload image if provided
            image_url = None
            if image_file and image_filename:
                image_url = await self._upload_image(image_file, image_filename)
            
            if is_recurring:
                # Handle recurring invoice submission
                result = await self._submit_recurring_invoice(invoice_data, image_url)
                return result
            else:
                # Handle regular invoice submission
                if not image_url:
                    raise RuntimeError("Image is required for non-recurring invoices")
                invoice_id = await self._save_invoice_data(invoice_data, image_url)
                print(f"Invoice submitted successfully with ID: {invoice_id}")
                
                return {
                    "success": True,
                    "invoice_id": invoice_id,
                    "image_url": image_url,
                    "message": "Invoice submitted successfully"
                }
            
        except Exception as e:
            print(f"Error submitting invoice: {e}")
            raise RuntimeError(f"Failed to submit invoice: {str(e)}")
    
    async def _submit_recurring_invoice(
        self,
        invoice_data: Dict[str, Any],
        image_url: Optional[str]
    ) -> Dict[str, Any]:
        """
        Submit a recurring invoice, generating multiple invoice entries
        
        Args:
            invoice_data: Dictionary containing invoice information with recurring settings
            image_url: Optional image URL
            
        Returns:
            Dictionary with submission result including all generated invoice IDs
        """
        recurring_interval = int(invoice_data.get('recurringInterval', 1))
        recurring_end_date = invoice_data.get('recurringEndDate', 'forever')
        
        # Generate a unique group ID to link all recurring invoice instances
        recurring_group_id = str(uuid.uuid4())
        
        # Calculate the list of months to generate invoices for
        start_month = int(invoice_data.get('targetMonth', datetime.now().month))
        start_year = int(invoice_data.get('targetYear', datetime.now().year))
        
        # Determine end date
        if recurring_end_date == 'forever':
            # For "forever", limit to 1 year ahead (will auto-extend)
            end_date = datetime(start_year, start_month, 1) + relativedelta(years=1)
        else:
            # Parse the specific end date (format: "YYYY-MM")
            end_year, end_month = map(int, recurring_end_date.split('-'))
            end_date = datetime(end_year, end_month, 1)
        
        # Generate invoice entries
        invoice_ids = []
        current_date = datetime(start_year, start_month, 1)
        is_first = True
        
        while current_date <= end_date:
            # Create invoice data for this month
            month_invoice_data = invoice_data.copy()
            month_invoice_data['targetMonth'] = current_date.month
            month_invoice_data['targetYear'] = current_date.year
            month_invoice_data['isRecurring'] = True
            month_invoice_data['recurringInterval'] = recurring_interval
            month_invoice_data['recurringEndDate'] = recurring_end_date
            month_invoice_data['recurringGroupId'] = recurring_group_id
            month_invoice_data['invoiceNumber'] = 'Re-Occurring'
            
            # Save the invoice
            invoice_id = await self._save_recurring_invoice_data(
                month_invoice_data, 
                image_url,
                is_parent=is_first
            )
            invoice_ids.append(invoice_id)
            
            if is_first:
                # Store the parent invoice ID for reference
                parent_invoice_id = invoice_id
                is_first = False
            
            # Move to next interval
            current_date += relativedelta(months=recurring_interval)
        
        print(f"Recurring invoice created with {len(invoice_ids)} entries, group ID: {recurring_group_id}")
        
        return {
            "success": True,
            "invoice_ids": invoice_ids,
            "recurring_group_id": recurring_group_id,
            "image_url": image_url,
            "message": f"Recurring invoice created with {len(invoice_ids)} entries"
        }
    
    async def delete_recurring_group(
        self,
        recurring_group_id: str,
        delete_from_month: Optional[int] = None,
        delete_from_year: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Delete all invoices in a recurring group, optionally from a specific month onwards
        
        Args:
            recurring_group_id: The group ID linking recurring invoices
            delete_from_month: If provided, only delete invoices from this month onwards
            delete_from_year: If provided, only delete invoices from this year onwards
            
        Returns:
            Dictionary with deletion result
        """
        if not self.db:
            raise RuntimeError("Firebase not initialized - cannot delete invoices")
        
        try:
            # Query all invoices with this recurring group ID
            invoices_ref = self.db.collection('invoices')
            query = invoices_ref.where('recurringGroupId', '==', recurring_group_id)
            docs = query.stream()
            
            deleted_count = 0
            moved_to_deleted_count = 0
            
            for doc in docs:
                invoice_data = doc.to_dict()
                invoice_month = int(invoice_data.get('targetMonth', 0))
                invoice_year = int(invoice_data.get('targetYear', 0))
                
                # Check if we should delete this invoice based on date filter
                should_delete = True
                if delete_from_month is not None and delete_from_year is not None:
                    invoice_date = datetime(invoice_year, invoice_month, 1)
                    filter_date = datetime(delete_from_year, delete_from_month, 1)
                    should_delete = invoice_date >= filter_date
                
                if should_delete:
                    # Move to recentlyDeleted collection
                    deleted_ref = self.db.collection('recentlyDeleted').document(doc.id)
                    deleted_ref.set(invoice_data)
                    moved_to_deleted_count += 1
                    
                    # Delete from invoices collection
                    doc.reference.delete()
                    deleted_count += 1
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "message": f"Deleted {deleted_count} recurring invoice(s)"
            }
            
        except Exception as e:
            print(f"Error deleting recurring group: {e}")
            raise RuntimeError(f"Failed to delete recurring invoices: {str(e)}")
    
    async def _save_recurring_invoice_data(
        self,
        invoice_data: Dict[str, Any],
        image_url: Optional[str],
        is_parent: bool = False
    ) -> str:
        """Save recurring invoice data to Firestore and return document ID"""
        try:
            invoice_ref = self.db.collection('invoices').document()
            invoice_id = invoice_ref.id
            
            doc_data = {
                'categories': invoice_data.get('categories', {}),
                'companyName': invoice_data.get('companyName', ''),
                'dateSubmitted': invoice_data.get('dateSubmitted', ''),
                'imageURL': image_url or '',
                'invoiceDate': invoice_data.get('invoiceDate', ''),
                'invoiceNumber': 'Re-Occurring',
                'targetMonth': invoice_data.get('targetMonth', ''),
                'targetYear': invoice_data.get('targetYear', ''),
                'storeID': invoice_data.get('storeID', ''),
                'user_email': invoice_data.get('user_email', ''),
                # Recurring invoice fields
                'isRecurring': True,
                'recurringInterval': invoice_data.get('recurringInterval', 1),
                'recurringEndDate': invoice_data.get('recurringEndDate', 'forever'),
                'recurringGroupId': invoice_data.get('recurringGroupId', ''),
                'isParentInvoice': is_parent
            }
            
            invoice_ref.set(doc_data)
            
            return invoice_id
            
        except Exception as e:
            print(f"Error saving recurring invoice data: {e}")
            raise RuntimeError(f"Failed to save recurring invoice data: {str(e)}")
    
    async def _upload_image(self, image_file: bytes, image_filename: str) -> str:
        """Upload image to Firebase Storage and return permanent private download URL"""
        try:
            # Generate unique filename
            unique_filename = f"{image_filename}_{uuid.uuid4()}"
            blob_name = f"images/{unique_filename}"
            
            # Upload to Firebase Storage
            blob = self.bucket.blob(blob_name)
            blob.upload_from_string(image_file, content_type='image/jpeg')
            
            # Generate a signed URL that expires in 10 years (effectively permanent)
            # This keeps the file private but provides a long-term accessible URL
            download_url = blob.generate_signed_url(
                expiration=datetime.utcnow() + timedelta(days=3650),  # 10 years
                method='GET'
            )
            
            return download_url
            
        except Exception as e:
            print(f"Error uploading image: {e}")
            raise RuntimeError(f"Failed to upload image: {str(e)}")
    
    async def _save_invoice_data(self, invoice_data: Dict[str, Any], image_url: str) -> str:
        """Save invoice data to Firestore and return document ID"""
        try:
            invoice_ref = self.db.collection('invoices').document()
            invoice_id = invoice_ref.id
            
            doc_data = {
                'categories': invoice_data.get('categories', {}),
                'companyName': invoice_data.get('companyName', ''),
                'dateSubmitted': invoice_data.get('dateSubmitted', ''),
                'imageURL': image_url,  # Store the signed URL for direct use in frontend
                'invoiceDate': invoice_data.get('invoiceDate', ''),
                'invoiceNumber': invoice_data.get('invoiceNumber', ''),
                'targetMonth': invoice_data.get('targetMonth', ''),
                'targetYear': invoice_data.get('targetYear', ''),
                'storeID': invoice_data.get('storeID', ''),
                'user_email': invoice_data.get('user_email', '')
            }
            
            invoice_ref.set(doc_data)
            
            return invoice_id
            
        except Exception as e:
            print(f"Error saving invoice data: {e}")
            raise RuntimeError(f"Failed to save invoice data: {str(e)}")
    
    def is_available(self) -> bool:
        """Check if Firebase is available for invoice submission"""
        return self.db is not None and self.bucket is not None
