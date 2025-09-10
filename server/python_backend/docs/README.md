# PAC (Profit and Controllable) Calculation API - Python FastAPI

A complete Python FastAPI backend for calculating Profit and Controllable expenses, converted from the original C# .NET implementation. This backend provides all the functionality of the original .NET backend with modern Python tooling.

## Features

- **FastAPI Framework**: Modern, fast, and automatically documented API
- **Pydantic Models**: Type-safe data validation and serialization
- **Decimal Precision**: Accurate financial calculations using Python's Decimal type
- **CORS Support**: Configured for React frontend integration
- **Auto Documentation**: Interactive API docs at `/docs` and `/redoc`
- **Invoice Reading**: OpenAI Vision API integration for invoice processing
- **Comprehensive Testing**: pytest-based test suite with full coverage
- **Complete Conversion**: All C# .NET functionality ported to Python

## Installation

1. **Install Python Dependencies**:

   ```bash
   cd server/python_backend
   pip install -r requirements.txt
   ```

2. **Run the Server**:

   **Option 1: From the python_backend directory:**
   ```bash
   cd server/python_backend
   uvicorn main:app --host 127.0.0.1 --port 5140 --reload
   ```

   **Option 2: Using the convenience script (from server directory):**
   ```bash
   cd server
   python start_backend.py
   ```

   **Option 3: Using the batch file (Windows, from server directory):**
   ```bash
   cd server
   start_backend.bat
   ```

   Or directly with uvicorn:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 5140 --reload
   ```

## API Endpoints

### Main Endpoints

- **GET** `/api/pac/{entity_id}/{year_month}` - Get PAC calculations
- **GET** `/api/pac/{entity_id}/{year_month}/input` - Get input data used for calculations
- **GET** `/api/pac/health` - Health check endpoint
- **POST** `/api/pac/invoice/read` - Read invoice image using OpenAI Vision API

### Documentation

- **Swagger UI**: http://localhost:5140/docs
- **ReDoc**: http://localhost:5140/redoc

## Example Usage

```bash
# Get PAC calculations for store "test-store" for December 2024
curl http://localhost:5140/api/pac/test-store/202412

# Get input data
curl http://localhost:5140/api/pac/test-store/202412/input

# Health check
curl http://localhost:5140/api/pac/health

# Read invoice (requires image file)
curl -X POST "http://localhost:5140/api/pac/invoice/read" \
     -H "Content-Type: multipart/form-data" \
     -F "image=@invoice.jpg"
```

## Project Structure

```
python_backend/
├── __init__.py                    # Package initialization
├── main.py                        # FastAPI application setup
├── models.py                      # Pydantic data models
├── services.py                    # Business logic services
├── routers.py                     # API route handlers
├── test_pac_calculations.py       # Comprehensive test suite
├── pytest.ini                    # Test configuration
├── run.py                         # Startup script
├── requirements.txt               # Python dependencies
└── README.md                     # This file
```

## Key Differences from .NET Version

1. **Framework**: FastAPI instead of ASP.NET Core
2. **Models**: Pydantic models instead of C# classes
3. **Dependency Injection**: FastAPI's built-in DI system
4. **Decimal Handling**: Python's Decimal type for financial precision
5. **Async/Await**: Native Python async support
6. **Auto Documentation**: Built-in OpenAPI/Swagger generation

## Configuration

### Server Configuration

The API runs on `http://localhost:5140` by default. To change the port or host, modify the `run.py` file or use uvicorn directly with different parameters.

### Environment Variables

Create a `.env` file in the project root for configuration:

```env
# OpenAI API Key for invoice reading functionality (optional)
OPENAI_API_KEY=your_openai_api_key_here
```

The invoice reading endpoint requires an OpenAI API key. If not provided, the endpoint will return an error when called.

## CORS Configuration

CORS is configured to allow requests from:

- `http://localhost:3000` (React dev server)
- `http://127.0.0.1:3000` (React dev server alternative)

To add more origins, modify the `allow_origins` list in `main.py`.

## Development

For development with auto-reload:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5140
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run specific test file
pytest test_pac_calculations.py

# Run tests with coverage
pytest --cov=.
```

### Test Coverage

The test suite includes comprehensive coverage of:

- PAC calculation validation
- Amount used calculations
- Controllable expense calculations
- Individual expense line validations
- Total calculations
- Mock services for isolated testing

### API Testing

You can test the API using:

1. **Swagger UI**: Visit http://localhost:5140/docs
2. **curl**: Use the example commands above
3. **Postman**: Import the OpenAPI spec from http://localhost:5140/openapi.json
4. **Frontend**: Your React app should now be able to connect to this backend
