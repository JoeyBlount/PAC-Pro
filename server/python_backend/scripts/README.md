# PAC Backend Scripts

This directory contains organized startup and setup scripts for the PAC backend server.

## 🚀 Available Scripts

### Setup Scripts

#### `setup-windows.bat`
**Purpose**: Install Python dependencies on Windows
**Usage**: `scripts\setup-windows.bat`
**What it does**:
- ✅ Installs cross-platform requirements
- ✅ Uses Python 3.12 ARM64 path
- ✅ Sets up all necessary dependencies

#### `setup-macos.sh`
**Purpose**: Install Python dependencies on macOS
**Usage**: `chmod +x scripts/setup-macos.sh && scripts/setup-macos.sh`
**What it does**:
- ✅ Installs cross-platform requirements
- ✅ Works on both Intel and Apple Silicon Macs
- ✅ Uses pip3 for Python 3

#### `setup-linux.sh`
**Purpose**: Install Python dependencies on Linux
**Usage**: `chmod +x scripts/setup-linux.sh && scripts/setup-linux.sh`
**What it does**:
- ✅ Installs cross-platform requirements
- ✅ Works on x86 and ARM64 Linux
- ✅ Uses pip3 for Python 3

### Startup Scripts

#### `start-server.bat` (Windows)
**Purpose**: Start the PAC backend server on Windows
**Usage**: `scripts\start-server.bat`
**What it does**:
- ✅ Sets PROJECT_ROOT environment variable
- ✅ Uses direct Python path (Python 3.12 ARM64)
- ✅ Starts FastAPI server with uvicorn
- ✅ Runs from correct directory

#### `start-server.sh` (macOS/Linux)
**Purpose**: Start the PAC backend server on macOS/Linux
**Usage**: `chmod +x scripts/start-server.sh && scripts/start-server.sh`
**What it does**:
- ✅ Sets PROJECT_ROOT environment variable
- ✅ Uses system Python 3
- ✅ Starts FastAPI server with uvicorn
- ✅ Works on all Unix-like systems

## 🔧 Technical Details

### Environment Variables
- `PROJECT_ROOT`: Automatically set to project root directory
- `SCRIPT_DIR`: Directory where the script is located

### Python Paths
- **Windows**: `C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312-arm64\python.exe`
- **macOS/Linux**: `python3` (uses system PATH)

### Dependencies
All scripts use `requirements-cross-platform.txt` which includes:
- FastAPI
- Uvicorn
- Firebase Admin SDK
- Pydantic
- Cross-platform compatible packages

## 📋 Setup and Usage Workflow

### First Time Setup
```bash
# Windows
scripts\setup-windows.bat

# macOS
chmod +x scripts/setup-macos.sh
scripts/setup-macos.sh

# Linux
chmod +x scripts/setup-linux.sh
scripts/setup-linux.sh
```

### Starting the Server
```bash
# Windows
scripts\start-server.bat

# macOS/Linux
chmod +x scripts/start-server.sh
scripts/start-server.sh
```

## 🌐 Server Information

### Default Configuration
- **Host**: 127.0.0.1 (localhost)
- **Port**: 5140
- **API Documentation**: http://localhost:5140/docs
- **Health Check**: http://localhost:5140/api/pac/health

### Features
- ✅ Cross-platform compatibility
- ✅ Firebase integration (optional)
- ✅ Mock data fallback
- ✅ Automatic CORS configuration
- ✅ Comprehensive API documentation

## 🐛 Troubleshooting

### Common Issues

#### "python is not recognized"
**Solution**: The Windows script uses the full Python path, so this should not occur

#### "pip is not recognized"
**Solution**: The setup scripts use the same Python executable for pip

#### Port 5140 already in use
**Solution**: 
- Stop any other services using port 5140
- Or modify the port in `main.py`

#### Firebase connection issues
**Solution**: 
- The server will automatically fall back to mock data
- Check `config/firebase-service-account.json` if you want Firebase integration

### Getting Help
- Check the console output for error messages
- Verify Python and pip are installed
- Check the main `SETUP_GUIDE.md` in the backend directory
- Ensure all dependencies are installed using the setup scripts

## 🔄 Script Maintenance

### Adding New Scripts
1. Create the script in this directory
2. Use proper path resolution (`%~dp0..` for Windows, `$SCRIPT_DIR` for Unix)
3. Include proper error handling
4. Document in this README
5. Test on target platforms

### Updating Existing Scripts
1. Maintain backward compatibility
2. Update documentation
3. Test all affected platforms
4. Update main documentation if needed

## 🌐 Platform Support

- ✅ **Windows x86**: Full support
- ✅ **Windows ARM64**: Full support (primary target)
- ✅ **macOS Intel**: Full support
- ✅ **macOS Apple Silicon**: Full support
- ✅ **Linux x86**: Full support
- ✅ **Linux ARM64**: Full support

## 📞 Support

If you encounter issues with these scripts:
1. Check the console output for error messages
2. Verify your Python installation
3. Try running the setup scripts again
4. Check the main backend `SETUP_GUIDE.md` for additional troubleshooting
5. Ensure you're running from the correct directory
