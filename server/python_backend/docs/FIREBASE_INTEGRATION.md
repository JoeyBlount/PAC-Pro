# Firebase Integration for PAC System

This document explains how to set up Firebase Firestore for the PAC (Profit and Controllable) calculation system and generate comprehensive test data.

## 🏗️ Firebase Structure

### Collections Overview

```
firestore/
├── stores/                    # Store information
│   ├── store_001/            # Downtown Location
│   ├── store_002/            # Mall Branch
│   └── ...
└── pac-projections/          # Projections and structured fields
    ├── store_001_202501/     # January 2025 data
    ├── store_001_202502/     # February 2025 data
    └── ...
```

### Store Collection (`stores`)

**Document ID**: `{store_id}` (e.g., `store_001`)

```json
{
  "id": "store_001",
  "name": "Downtown Location",
  "city": "New York",
  "state": "NY"
}
```

### Projections Collection (`pac-projections`)

**Document ID**: `{store_id}_{year_month}` (e.g., `store_001_202501`)

```json
{
  "store_id": "store_001",
  "year_month": "202501",
  "product_net_sales": 120000,
  "cash_adjustments": 500,
  "promotions": 2000,
  "manager_meals": 300,
  "crew_labor_percent": 25.5,
  "total_labor_percent": 35.0,
  "payroll_tax_rate": 8.5,
  "complete_waste_percent": 2.5,
  "raw_waste_percent": 1.8,
  "condiment_percent": 3.2,
  "beginning_inventory": {
    "food": 15000,
    "condiment": 2000,
    "paper": 3000,
    "non_product": 1000,
    "op_supplies": 500
  },
  "ending_inventory": {
    "food": 12000,
    "condiment": 1800,
    "paper": 2500,
    "non_product": 800,
    "op_supplies": 500
  },
  "purchases": {
    "food": 45000,
    "condiment": 3000,
    "paper": 2000,
    "non_product": 1500,
    "travel": 800,
    "advertising_other": 1200,
    "promotion": 1000,
    "outside_services": 600,
    "linen": 400,
    "operating_supply": 300,
    "maintenance_repair": 500,
    "small_equipment": 200,
    "utilities": 1200,
    "office": 150,
    "training": 300,
    "crew_relations": 200
  },
  "advertising_percent": 2.0,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

## 📊 Generated Test Data

### Stores (8 locations)

- **store_001**: Downtown Location (New York, NY) - High volume
- **store_002**: Mall Branch (Los Angeles, CA) - Medium-high volume
- **store_003**: Airport Terminal (Chicago, IL) - High volume
- **store_004**: University Campus (Boston, MA) - Medium volume
- **store_005**: Suburban Plaza (Houston, TX) - Medium volume
- **store_006**: Beachfront Store (Miami, FL) - Seasonal volume
- **store_007**: Tech District (Seattle, WA) - Medium-high volume
- **store_008**: Historic District (Philadelphia, PA) - Lower volume

### Time Period

- **Year**: 2025
- **Months**: January through December (12 months)
- **Total Records**: 96 PAC data records (8 stores × 12 months)

### Data Characteristics

#### Seasonal Variations

- **January**: 85% of base (post-holiday slump)
- **February**: 90% of base (Valentine's boost)
- **March**: 105% of base (spring pickup)
- **April**: 110% of base (spring peak)
- **May**: 115% of base (graduation season)
- **June**: 120% of base (summer start)
- **July**: 125% of base (summer peak)
- **August**: 120% of base (summer)
- **September**: 105% of base (back to school)
- **October**: 110% of base (fall)
- **November**: 115% of base (pre-holiday)
- **December**: 130% of base (holiday peak)

#### Realistic Variations

- **Sales Data**: ±5% random variation
- **Labor Percentages**: 22-28% crew, 30-40% total
- **Waste Percentages**: 2-3.5% complete, 1.5-2.5% raw
- **Inventory Levels**: Scaled by store size
- **Purchase Data**: Proportional to sales volume

## 🚀 Quick Start

### 1. Generate Sample Data (No Firebase Required)

```bash
cd server/python_backend
python generate_sample_data.py
```

This creates `sample_pac_data.json` with all test data.

### 2. Set Up Firebase (Optional)

```bash
# Install dependencies
pip install firebase-admin google-cloud-firestore

# Run setup check
python setup_firebase.py

# Follow instructions in FIREBASE_SETUP.md
```

### 3. Upload to Firebase

```bash
# After setting up Firebase service account key
python firebase_data_generator.py
```

## 📁 Files Created

- `firebase_data_generator.py` - Main Firebase data generator
- `generate_sample_data.py` - Sample data generator (no Firebase)
- `setup_firebase.py` - Firebase setup helper
- `firebase_requirements.txt` - Firebase dependencies
- `firebase-service-account-template.json` - Service account template
- `FIREBASE_SETUP.md` - Detailed setup instructions
- `sample_pac_data.json` - Generated sample data
- `firebase_structure.json` - Firebase structure documentation

## 🔧 Integration with PAC API

The generated data is compatible with the existing PAC calculation API:

```bash
# Test with generated data
curl http://localhost:5140/api/pac/store_001/202501
curl http://localhost:5140/api/pac/store_002/202507
```

## 📈 Data Validation

The generated data includes:

- ✅ Realistic seasonal patterns
- ✅ Store-specific variations
- ✅ Proper data types and ranges
- ✅ Complete inventory tracking
- ✅ Comprehensive purchase categories
- ✅ Labor and waste percentages
- ✅ All required fields for PAC calculations

## 🎯 Use Cases

1. **Development Testing**: Use sample data for API testing
2. **Demo Purposes**: Show realistic PAC calculations
3. **Performance Testing**: Test with large datasets
4. **UI Development**: Populate frontend with realistic data
5. **Training**: Demonstrate system capabilities

## 🔒 Security Notes

- Service account keys should be kept secure
- Use Firebase security rules for production
- Consider using Firebase Authentication for user access
- Implement proper data validation and sanitization

## 📞 Support

For issues with Firebase integration:

1. Check `FIREBASE_SETUP.md` for setup instructions
2. Verify service account key configuration
3. Ensure Firestore is enabled in Firebase Console
4. Check Firebase project permissions and billing
