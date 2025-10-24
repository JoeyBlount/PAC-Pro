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

- Document ID: {store*id}*{year_month} (e.g., "store_001_202501")
- Fields: rows (raw projections), pacGoal, product_net_sales, cash_adjustments, purchases, updatedAt

### pac_calculations (optional)

- Document ID: {store*id}*{year_month}
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
