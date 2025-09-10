"""
Verify Firebase Data Script
This script helps verify that all PAC data was uploaded correctly to Firebase
"""
import firebase_admin
from firebase_admin import credentials, firestore
import os

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        app = firebase_admin.get_app()
        print("Using existing Firebase app")
    except ValueError:
        cred_path = "../config/firebase-service-account.json"
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred)
            print("Firebase initialized with service account key")
        else:
            print("Error: Firebase service account key not found")
            return None
    return firestore.client()

def verify_firebase_data():
    """Verify that all PAC data is in Firebase"""
    print("Firebase Data Verification")
    print("=" * 40)
    
    db = initialize_firebase()
    if not db:
        return
    
    # Check collections
    collections = [c.id for c in db.collections()]
    print(f"Collections found: {collections}")
    
    # Verify stores collection
    stores_ref = db.collection('stores')
    stores = list(stores_ref.stream())
    print(f"\nStores collection: {len(stores)} documents")
    for store in stores:
        store_data = store.to_dict()
        print(f"  - {store.id}: {store_data.get('name', 'Unknown')} ({store_data.get('city', 'Unknown')}, {store_data.get('state', 'Unknown')})")
    
    # Verify pac_input_data collection
    pac_ref = db.collection('pac_input_data')
    pac_docs = list(pac_ref.stream())
    print(f"\nPAC Input Data collection: {len(pac_docs)} documents")
    
    # Group by store
    store_counts = {}
    for doc in pac_docs:
        doc_id = doc.id
        store_id = doc_id.split('_')[0] + '_' + doc_id.split('_')[1]  # e.g., store_001
        store_counts[store_id] = store_counts.get(store_id, 0) + 1
    
    print("\nPAC data by store:")
    for store_id in sorted(store_counts.keys()):
        count = store_counts[store_id]
        print(f"  - {store_id}: {count} months of data")
    
    # Show sample data
    if pac_docs:
        sample_doc = pac_docs[0]
        sample_data = sample_doc.to_dict()
        print(f"\nSample PAC data ({sample_doc.id}):")
        print(f"  - Product Net Sales: ${sample_data.get('product_net_sales', 0):,}")
        print(f"  - Crew Labor %: {sample_data.get('crew_labor_percent', 0)}%")
        print(f"  - Total Labor %: {sample_data.get('total_labor_percent', 0)}%")
        print(f"  - Food Purchases: ${sample_data.get('purchases', {}).get('food', 0):,}")
    
    print("\n" + "=" * 40)
    print("Verification complete!")
    
    if len(pac_docs) == 96:
        print("✅ All 96 PAC data records are present!")
    else:
        print(f"⚠️  Expected 96 records, found {len(pac_docs)}")

if __name__ == "__main__":
    verify_firebase_data()
