# PAC Backend Setup Guide

Cross-platform setup instructions for PAC (Profit and Controllable) Backend API.

## Prerequisites

### All Platforms
- Python 3.8 or higher
- pip (Python package installer)

### Environment Variables
The application uses the `PROJECT_ROOT` environment variable to locate Firebase configuration files. This allows the server to be run from any directory.

**Windows:**
```cmd
set PROJECT_ROOT=C:\Users\jblou\OneDrive\Desktop\PAC-Pro
```

**macOS/Linux:**
```bash
export PROJECT_ROOT="/path/to/PAC-Pro"
```

If `PROJECT_ROOT` is not set, the application will use relative paths from the current working directory.

### Windows
- Windows 10/11
- PowerShell or Command Prompt

### macOS
- macOS 10.15 or higher
- Terminal.app or iTerm2

### Linux
- Ubuntu 18.04+, CentOS 7+, or equivalent
- Terminal access

## Quick Start

### Windows (x86/ARM64)

1. **Open PowerShell or Command Prompt**
2. **Navigate to backend directory:**
   ```cmd
   cd server\python_backend
   ```
3. **Run setup script:**
   ```cmd
   scripts\setup-windows.bat
   ```
4. **Start the server using the startup script:**
   ```cmd
   scripts\start-server.bat
   ```
   
   **Or manually:**
   ```cmd
   set PROJECT_ROOT=C:\Users\jblou\OneDrive\Desktop\PAC-Pro
   python main.py
   ```

### macOS (Intel/Apple Silicon)

1. **Open Terminal**
2. **Navigate to backend directory:**
   ```bash
   cd server/python_backend
   ```
3. **Make setup script executable:**
   ```bash
   chmod +x scripts/setup-macos.sh
   ```
4. **Run setup script:**
   ```bash
   scripts/setup-macos.sh
   ```
5. **Start the server using the startup script:**
   ```bash
   chmod +x scripts/start-server.sh
   scripts/start-server.sh
   ```
   
   **Or manually:**
   ```bash
   export PROJECT_ROOT="/path/to/PAC-Pro"
   python3 main.py
   ```

### Linux (x86/ARM64)

1. **Open Terminal**
2. **Navigate to backend directory:**
   ```bash
   cd server/python_backend
   ```
3. **Make setup script executable:**
   ```bash
   chmod +x scripts/setup-linux.sh
   ```
4. **Run setup script:**
   ```bash
   scripts/setup-linux.sh
   ```
5. **Start the server using the startup script:**
   ```bash
   chmod +x scripts/start-server.sh
   scripts/start-server.sh
   ```
   
   **Or manually:**
   ```bash
   export PROJECT_ROOT="/path/to/PAC-Pro"
   python3 main.py
   ```

## Manual Installation

If the setup scripts don't work, install dependencies manually:

### Core Dependencies (Required)
```bash
# Windows
python -m pip install fastapi uvicorn pydantic python-multipart python-dotenv httpx pytest pytest-asyncio

# macOS/Linux
python3 -m pip install fastapi uvicorn pydantic python-multipart python-dotenv httpx pytest pytest-asyncio
```

### Firebase Dependencies (Optional)
```bash
# Windows
python -m pip install firebase-admin google-cloud-firestore

# macOS/Linux
python3 -m pip install firebase-admin google-cloud-firestore
```

**Note:** Firebase dependencies may fail to install on Windows ARM64 due to compilation issues. The application will automatically fall back to mock data mode.

## Platform-Specific Notes

### Windows ARM64
- Some packages may require compilation
- If Firebase installation fails, the app uses mock data
- Disable reload mode for better compatibility

### Windows x86/x64
- Full compatibility with all packages
- Reload mode enabled for development

### macOS (Intel)
- Full compatibility with all packages
- Reload mode enabled for development

### macOS (Apple Silicon)
- Full compatibility with all packages
- Reload mode enabled for development

### Linux ARM64
- May require additional build tools
- Firebase dependencies should install successfully

### Linux x86/x64
- Full compatibility with all packages
- Reload mode enabled for development

## Firebase Setup (Optional)

If you want to use Firebase instead of mock data:

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database

2. **Download Service Account Key:**
   - Go to Project Settings → Service accounts
   - Click "Generate new private key"
   - Download the JSON file

3. **Place Service Account File:**
   - Save as `config/firebase-service-account.json`
   - The app will automatically detect and use it

## Running the Server

### Development Mode
```bash
# Windows
python main.py

# macOS/Linux
python3 main.py
```

### Production Mode
```bash
# Windows
python -m uvicorn main:app --host 0.0.0.0 --port 5140

# macOS/Linux
python3 -m uvicorn main:app --host 0.0.0.0 --port 5140
```

## Verification

Once the server is running, verify it's working:

### Quick Test
Run the test script:
```bash
python test-server.py
```

### Manual Testing
1. **Health Check:** http://localhost:5140/api/pac/health
2. **API Documentation:** http://localhost:5140/docs
3. **Root Endpoint:** http://localhost:5140/
4. **PAC Data (Mock):** http://localhost:5140/api/pac/store_001/202501

### Expected Health Response
```json
{
  "status": "healthy",
  "message": "PAC API is running",
  "platform": {
    "system": "Windows",
    "architecture": "ARM64",
    "python_version": "3.12.10",
    "project_root": "C:\\Users\\jblou\\OneDrive\\Desktop\\PAC-Pro"
  },
  "firebase": {
    "available": true,
    "initialized": false,
    "mode": "mock"
  }
}
```

## Troubleshooting

### Python Not Found
- **Windows:** Ensure Python is added to PATH or use full path
- **macOS:** Use `python3` instead of `python`
- **Linux:** Install python3-pip package

### Port Already in Use
```bash
# Find process using port 5140
netstat -ano | findstr :5140  # Windows
lsof -i :5140                 # macOS/Linux

# Kill the process or use a different port
```

### Firebase Installation Failed
- The app automatically falls back to mock data
- Check the health endpoint to confirm mock mode is active
- Install build tools if you need Firebase functionality

### Permission Denied (Linux/macOS)
```bash
chmod +x setup-*.sh
sudo apt-get install python3-dev build-essential  # Ubuntu/Debian
```

## API Endpoints

### Core Endpoints
- `GET /` - Root endpoint with system info
- `GET /api/pac/health` - Health check
- `GET /api/pac/{entity_id}/{year_month}` - Get PAC data
- `GET /api/pac/{entity_id}/{year_month}/input` - Get input data

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

## Support

For issues specific to your platform:
- **Windows ARM64:** Use mock data mode if Firebase fails
- **Cross-platform:** All core functionality works on all platforms
- **Firebase issues:** Check Firebase Console and service account setup
