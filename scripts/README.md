# PAC-Pro Startup Scripts

This directory contains organized startup scripts for the PAC-Pro application.

## 🚀 Available Scripts

### `start-both-servers.bat` (Recommended)
**Purpose**: Starts both frontend and backend servers
**Usage**: `scripts\start-both-servers.bat`
**What it does**:
- ✅ Starts backend server on port 5140
- ✅ Starts frontend server on port 3000
- ✅ Opens both in separate windows
- ✅ Handles all PATH and dependency issues
- ✅ Sets proper environment variables

### `start-frontend.bat`
**Purpose**: Starts only the frontend server
**Usage**: `scripts\start-frontend.bat`
**What it does**:
- ✅ Navigates to client directory
- ✅ Uses direct npm path to avoid PATH issues
- ✅ Starts React development server
- ✅ Shows working directory and command being executed

### `start-backend.bat`
**Purpose**: Starts only the backend server
**Usage**: `scripts\start-backend.bat`
**What it does**:
- ✅ Navigates to backend directory
- ✅ Sets PROJECT_ROOT environment variable
- ✅ Uses direct Python path
- ✅ Starts FastAPI server with uvicorn

### `start-frontend-powershell.bat`
**Purpose**: Alternative frontend startup using PowerShell
**Usage**: `scripts\start-frontend-powershell.bat`
**What it does**:
- ✅ Uses PowerShell to execute npm start
- ✅ Handles paths with spaces properly
- ✅ Good fallback if direct batch approach fails

## 🔧 Technical Details

### Path Resolution
All scripts use `%~dp0..` to resolve the project root directory, making them portable regardless of where the scripts directory is located.

### Environment Variables
- `PROJECT_ROOT`: Set to the project root directory
- `NPM_PATH`: Direct path to npm.cmd to avoid PATH issues
- `SCRIPT_DIR`: Directory where the script is located

### Error Handling
- All scripts include error handling for missing executables
- Clear error messages and pause statements for debugging
- Fallback options for different execution environments

## 🐛 Troubleshooting

### "npm is not recognized"
**Solution**: Use `start-frontend-powershell.bat` instead

### "python is not recognized"
**Solution**: The scripts use full paths to Python executables, so this should not occur

### Scripts not working
**Solution**: 
1. Ensure you're running from the project root
2. Check that Node.js and Python are installed
3. Try the PowerShell alternative for frontend

### Port conflicts
**Solution**: 
- Backend (5140): Stop any other services using this port
- Frontend (3000): React will automatically suggest an alternative port

## 📝 Usage Examples

### Quick Start (Recommended)
```cmd
# From project root
scripts\start-both-servers.bat
```

### Development Workflow
```cmd
# Start backend first
scripts\start-backend.bat

# In another terminal, start frontend
scripts\start-frontend.bat
```

### Troubleshooting Frontend Issues
```cmd
# Try PowerShell version
scripts\start-frontend-powershell.bat
```

## 🔄 Script Maintenance

### Adding New Scripts
1. Create the script in this directory
2. Use `%~dp0..` for project root resolution
3. Include proper error handling
4. Document in this README
5. Test on target platforms

### Updating Existing Scripts
1. Maintain backward compatibility
2. Update documentation
3. Test all affected platforms
4. Update main README if needed

## 🌐 Platform Support

- ✅ **Windows x86**: Full support
- ✅ **Windows ARM64**: Full support  
- ✅ **macOS Intel**: Use .sh scripts in server/python_backend/
- ✅ **macOS Apple Silicon**: Use .sh scripts in server/python_backend/
- ✅ **Linux x86**: Use .sh scripts in server/python_backend/
- ✅ **Linux ARM64**: Use .sh scripts in server/python_backend/

## 📞 Support

If you encounter issues with these scripts:
1. Check the console output for error messages
2. Verify your Node.js and Python installations
3. Try alternative scripts (PowerShell versions)
4. Check the main README.md for additional troubleshooting
