"""
Invoice submission service for handling Firebase operations
"""
import os
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid

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
            self.db = firestore.client()
            self.bucket = storage.bucket('pacpro-ef499.firebasestorage.app')
        except Exception as e:
            print(f"Failed to initialize Firebase: {e}")
            self.db = None
            self.bucket = None
    
    async def submit_invoice(
        self,
        invoice_data: Dict[str, Any],
        image_file: bytes,
        image_filename: str
    ) -> Dict[str, Any]:
        """
        Submit invoice data and image to Firebase
        
        Args:
            invoice_data: Dictionary containing invoice information
            image_file: Image file bytes
            image_filename: Original filename of the image
            
        Returns:
            Dictionary with submission result
        """
        if not self.db or not self.bucket:
            raise RuntimeError("Firebase not initialized - cannot submit invoice")
        
        try:
            image_url = await self._upload_image(image_file, image_filename)
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
