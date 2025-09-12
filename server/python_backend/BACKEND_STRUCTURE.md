# Backend Structure

This document describes the reorganized structure of the PAC Pro Python backend.

## Directory Structure

```
python_backend/
├── main.py                    # FastAPI application entry point
├── models.py                  # Pydantic data models
├── routers.py                 # API route definitions
├── requirements.txt           # Python dependencies
├── firebase_requirements.txt  # Firebase-specific dependencies
├── pytest.ini               # Test configuration
├── sample_pac_data.json     # Sample data file
│
├── services/                 # Business logic services
│   ├── __init__.py
│   ├── pac_calculation_service.py    # Core PAC calculation logic
│   ├── data_ingestion_service.py     # Data retrieval from Firebase
│   ├── account_mapping_service.py    # Account mapping logic
│   └── services.py                   # Legacy services (to be refactored)
│
├── data_generators/          # Test data generation scripts
│   ├── __init__.py
│   ├── firebase_data_generator.py    # Generate test stores and PAC data
│   ├── generate_projections_data.py  # Generate projections data
│   ├── generate_sample_data.py       # Generate sample data
│   └── add_difference_columns.py     # Helper for data processing
│
├── tests/                    # Test files
│   ├── __init__.py
│   ├── test_account_mapping_service.py
│   ├── test_data_ingestion_service.py
│   ├── test_pac_calculation_service.py
│   └── test_pac_calculations.py
│
├── main_helpers/             # Utility scripts and setup
│   ├── __init__.py
│   ├── run.py                # Alternative server runner
│   ├── setup_firebase.py     # Firebase setup helper
│   └── verify_firebase_data.py # Data verification script
│
├── config/                   # Configuration files
│   ├── __init__.py
│   ├── firebase_structure.json      # Firebase data structure
│   └── firebase-service-account.json # Firebase credentials (gitignored)
│
└── docs/                     # Documentation
    ├── __init__.py
    ├── README.md
    ├── FIREBASE_DATA_SUMMARY.md
    ├── FIREBASE_INTEGRATION.md
    └── FIREBASE_SETUP.md
```

## Key Changes Made

### 1. **Services Directory**
- Moved all business logic services to `services/`
- Each service handles a specific domain (PAC calculations, data ingestion, account mapping)
- Added proper `__init__.py` with exports for clean imports

### 2. **Data Generators Directory**
- Moved all data generation scripts to `data_generators/`
- Includes test data generators and sample data creators
- Updated Firebase service account paths to use `../config/`

### 3. **Tests Directory**
- Moved all test files to `tests/`
- Maintains test organization and structure

### 4. **Main Helpers Directory**
- Moved utility scripts to `main_helpers/`
- Includes setup scripts and alternative runners
- Updated Firebase service account paths

### 5. **Config Directory**
- Moved configuration files to `config/`
- Includes Firebase service account and structure files
- Centralizes all configuration in one place

### 6. **Docs Directory**
- Moved all documentation to `docs/`
- Keeps documentation organized and separate from code

## Import Updates

All import statements have been updated to reflect the new structure:

```python
# Old imports
from services import PacCalculationService, DataIngestionService

# New imports
from services.pac_calculation_service import PacCalculationService
from services.data_ingestion_service import DataIngestionService
```

## Firebase Service Account

The Firebase service account file is now located at:
```
config/firebase-service-account.json
```

All scripts have been updated to reference this new location.

## Benefits of This Structure

1. **Clear Separation of Concerns**: Each directory has a specific purpose
2. **Easier Navigation**: Developers can quickly find what they need
3. **Better Maintainability**: Related files are grouped together
4. **Scalability**: Easy to add new services, tests, or utilities
5. **Professional Structure**: Follows Python best practices

## Running the Backend

The backend can still be started the same way:

```bash
# From python_backend directory
python main.py

# Or using the helper script
python main_helpers/run.py

# Or using the batch file from server directory
start_backend.bat
```

## Adding New Features

When adding new features:

1. **New Services**: Add to `services/` directory
2. **New Tests**: Add to `tests/` directory  
3. **New Data Generators**: Add to `data_generators/` directory
4. **New Utilities**: Add to `main_helpers/` directory
5. **New Configuration**: Add to `config/` directory

This structure makes the backend much more intuitive and easier to understand!
