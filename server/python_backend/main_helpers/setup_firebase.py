"""
Firebase Setup Script for PAC System
This script helps set up Firebase configuration and provides instructions
"""
import os
import json

def create_firebase_setup_instructions():
    """Create detailed setup instructions for Firebase"""
    instructions = """
# Firebase Setup Instructions for PAC System

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: "pac-calculation-system" (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database (choose closest to your users)
5. Click "Done"

## 3. Generate Service Account Key

1. Go to Project Settings (gear icon) → "Service accounts"
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in the `server/python_backend/` directory

## 4. Install Dependencies

```bash
cd server/python_backend
pip install -r firebase_requirements.txt
```

## 5. Set Up Firestore Security Rules (Optional)

For production, update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 6. Run Data Generator

```bash
cd server/python_backend
python firebase_data_generator.py
```

## Firebase Collections Structure

### stores
- Document ID: store_id (e.g., "store_001")
- Fields: id, name, city, state

### pac-projections
- Document ID: {store_id}_{year_month} (e.g., "store_001_202501")
- Fields: rows, pacGoal, product_net_sales, cash_adjustments, purchases, updatedAt

### pac_calculations (optional)
- Document ID: {store_id}_{year_month}
- Fields: Calculated PAC results

## Data Generated

The script will generate:
- 8 stores across different cities
- 12 months of data for 2025 (January - December)
- Realistic seasonal variations
- 96 total PAC data records
- Complete input data for all calculations

## Verification

After saving projections:
1. Check Firebase Console → Firestore Database
2. Verify collections: `stores` and `pac-projections`
3. Check document counts and sample data
"""
    
    with open("FIREBASE_SETUP.md", "w", encoding="utf-8") as f:
        f.write(instructions)
    
    print("Firebase setup instructions saved to FIREBASE_SETUP.md")

def check_firebase_setup():
    """Check if Firebase is properly set up"""
    print("Checking Firebase setup...")
    
    # Check for service account key
    service_account_path = "../config/firebase-service-account.json"
    if os.path.exists(service_account_path):
        print("✅ Service account key found")
        try:
            with open(service_account_path, 'r') as f:
                key_data = json.load(f)
                required_fields = ['type', 'project_id', 'private_key', 'client_email']
                if all(field in key_data for field in required_fields):
                    print("✅ Service account key is valid")
                    print(f"   Project ID: {key_data.get('project_id', 'Unknown')}")
                else:
                    print("❌ Service account key is missing required fields")
        except json.JSONDecodeError:
            print("❌ Service account key is not valid JSON")
    else:
        print("❌ Service account key not found")
        print("   Please download from Firebase Console and save as 'firebase-service-account.json'")
    
    # Check for Firebase Admin SDK
    try:
        import firebase_admin
        print("✅ Firebase Admin SDK is installed")
    except ImportError:
        print("❌ Firebase Admin SDK not installed")
        print("   Run: pip install firebase-admin")
    
    # Check for Firestore
    try:
        from google.cloud import firestore
        print("✅ Google Cloud Firestore is available")
    except ImportError:
        print("❌ Google Cloud Firestore not installed")
        print("   Run: pip install google-cloud-firestore")

def main():
    """Main setup function"""
    print("Firebase Setup for PAC System")
    print("=" * 40)
    
    create_firebase_setup_instructions()
    check_firebase_setup()
    
    print("\n" + "=" * 40)
    print("Setup check complete!")
    print("See FIREBASE_SETUP.md for detailed instructions.")

if __name__ == "__main__":
    main()
