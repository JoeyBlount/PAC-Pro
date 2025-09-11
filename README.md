<a id="top"></a>

<br />

<!-- Project logo. -->
<div align="center">
  <a href="https://github.com/JoeyBlount/PAC-Pro">
    <img src="./readme_images/logo_with_background.png" width="500" />
  </a>
</div>

<br />

## About This Project

<!-- About this project text below --> 
<p>PAC Pro is a web program which aims replaces the analog way invoicing that our client is currently using with a digital system. This program will help streamline invoice processing and help automatically generate profits after controllables based on the data. No more needing to juggle stacks of paper looking for a specific invoice and long wait times to see how store performing. The custom program mirrors the familiar paper based process allowing minimal retraining and simplicity for non-tech savvy staff members.</p> 

### Built with 
<!-- List tools used for this project -->
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) &nbsp; ![Firebase](https://img.shields.io/badge/firebase-a08021?style=for-the-badge&logo=firebase&logoColor=ffcd34) &nbsp; ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) &nbsp; ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)

### Screenshots
<!-- Inset example Screens images -->

<img src="./readme_images/2025-04-26_21-09-46.png" width="250"/> &nbsp; <img src="./readme_images/2025-04-27_20-03-30.png" width="250"/> &nbsp; <img src="./readme_images/2025-04-27_20-08-47.png" width="250"/>

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## 🏗️ Architecture

- **Frontend**: React.js (Port 3000)
- **Backend**: Python FastAPI (Port 5140)
- **Database**: Firebase Firestore (Optional - falls back to mock data)
- **Platforms**: Windows (x86/ARM64), macOS (Intel/Apple Silicon), Linux (x86/ARM64)

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ (for frontend)
- **Python** 3.8+ (for backend)
- **Git** (for cloning)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PAC-Pro
```

## 📁 Project Structure

```
PAC-Pro/
├── client/                    # React frontend application
│   ├── src/                   # Source code
│   ├── public/                # Public assets
│   └── package.json           # Frontend dependencies
├── server/                    # Backend services
│   └── python_backend/        # Python FastAPI backend
│       ├── main.py            # Main backend application
│       ├── config/            # Configuration files
│       ├── services/          # Business logic services
│       └── scripts/           # Backend startup and setup scripts
│           ├── setup-*.sh/bat # Platform-specific setup scripts
│           └── start-server.* # Backend startup scripts
├── scripts/                   # 🆕 Organized startup scripts
│   ├── start-both-servers.bat     # Start both frontend and backend
│   ├── start-frontend.bat         # Start frontend only
│   ├── start-backend.bat          # Start backend only
│   └── start-frontend-powershell.bat # Alternative frontend startup
└── README.md                  # This file
```

## 🎯 Easy Startup Options

### Option 1: Start Both Servers (Recommended)
```bash
# From project root
scripts\start-both-servers.bat
```
This will:
- ✅ Start backend on `http://localhost:5140`
- ✅ Start frontend on `http://localhost:3000`
- ✅ Open both in separate windows
- ✅ Handle all PATH and dependency issues

### Option 2: Start Servers Individually

#### Frontend Only
```bash
scripts\start-frontend.bat
```

#### Backend Only
```bash
scripts\start-backend.bat
```

#### Alternative Frontend (PowerShell)
```bash
scripts\start-frontend-powershell.bat
```

## 🔧 Detailed Setup Instructions

### Backend Setup (Python FastAPI)

#### Prerequisites
- **Python** 3.8 or higher
- **pip** (Python package installer)

#### Environment Variables
The application uses the `PROJECT_ROOT` environment variable to locate Firebase configuration files:

**Windows:**
```cmd
set PROJECT_ROOT=C:\Users\jblou\OneDrive\Desktop\PAC-Pro
```

**macOS/Linux:**
```bash
export PROJECT_ROOT="/path/to/PAC-Pro"
```

#### Platform-Specific Setup

##### Windows (x86/ARM64)
1. **Navigate to backend directory:**
   ```cmd
   cd server\python_backend
   ```
2. **Run setup script:**
   ```cmd
   scripts\setup-windows.bat
   ```
3. **Start the server:**
   ```cmd
   scripts\start-server.bat
   ```

##### macOS (Intel/Apple Silicon)
1. **Navigate to backend directory:**
   ```bash
   cd server/python_backend
   ```
2. **Make setup script executable:**
   ```bash
   chmod +x scripts/setup-macos.sh
   ```
3. **Run setup script:**
   ```bash
   scripts/setup-macos.sh
   ```
4. **Start the server:**
   ```bash
   chmod +x scripts/start-server.sh
   scripts/start-server.sh
   ```

##### Linux (x86/ARM64)
1. **Navigate to backend directory:**
   ```bash
   cd server/python_backend
   ```
2. **Make setup script executable:**
   ```bash
   chmod +x scripts/setup-linux.sh
   ```
3. **Run setup script:**
   ```bash
   scripts/setup-linux.sh
   ```
4. **Start the server:**
   ```bash
   chmod +x scripts/start-server.sh
   scripts/start-server.sh
   ```

#### Manual Installation (If Setup Scripts Fail)

##### Core Dependencies (Required)
```bash
# Windows
python -m pip install fastapi uvicorn pydantic python-multipart python-dotenv httpx pytest pytest-asyncio

# macOS/Linux
python3 -m pip install fastapi uvicorn pydantic python-multipart python-dotenv httpx pytest pytest-asyncio
```

##### Firebase Dependencies (Optional)
```bash
# Windows
python -m pip install firebase-admin google-cloud-firestore

# macOS/Linux
python3 -m pip install firebase-admin google-cloud-firestore
```

**Note:** Firebase dependencies may fail to install on Windows ARM64 due to compilation issues. The application will automatically fall back to mock data mode.

### Frontend Setup (React.js)

#### Prerequisites
- **Node.js** 16 or higher
- **npm** (comes with Node.js)

#### Platform-Specific Node.js Installation

##### Windows
1. **Download Node.js:**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download LTS version for Windows
   - Run installer and ensure "Add to PATH" is checked

2. **Alternative - Using winget:**
   ```cmd
   winget install OpenJS.NodeJS.LTS
   ```

##### macOS
1. **Using Homebrew (Recommended):**
   ```bash
   brew install node
   ```

2. **Manual Installation:**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download LTS version for macOS
   - Run the installer

##### Linux
1. **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```

2. **CentOS/RHEL:**
   ```bash
   sudo yum install nodejs npm
   ```

3. **Using NodeSource repository:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

#### Frontend Setup Steps
1. **Navigate to frontend directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   
   # If you encounter peer dependency warnings
   npm install --legacy-peer-deps
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

The frontend will be available at: http://localhost:3000

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5140
- **API Documentation**: http://localhost:5140/docs

## 🖨️ Print Functionality

The application includes enhanced print functionality with:
- ✅ **Color-coded sections** matching the main interface
- ✅ **Complete projection data** for all expense categories
- ✅ **Accurate difference calculations** (Actual - Projected)
- ✅ **Professional formatting** suitable for business reports
- ✅ **Cross-browser compatibility** with proper color printing

### How to Print
1. Navigate to the PAC tab in the application
2. Click the "Print" button
3. The print dialog will show a formatted report with:
   - Sales section (light blue background)
   - Food & Paper section (light green background)
   - Labor section (light orange background)
   - Other Expenses section (light purple background)
   - Totals with proper calculations

## 🔧 Configuration

### Environment Variables
- `PROJECT_ROOT`: Set to your project directory path (automatically handled by startup scripts)

### Firebase Setup (Optional)

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
   - Save as `server/python_backend/config/firebase-service-account.json`
   - The app will automatically detect and use it

4. **Firebase Collections Structure:**
   - `stores` - Store information and metadata
   - `pac_input_data` - Input data for PAC calculations
   - `pac_calculations` - Calculated PAC results

The application will automatically use Firebase if available, otherwise falls back to mock data.

## 🐛 Comprehensive Troubleshooting

### Backend Issues

#### Python Not Found
- **Windows:** Ensure Python is added to PATH or use full path
- **macOS:** Use `python3` instead of `python`
- **Linux:** Install python3-pip package

#### Port Already in Use (Backend)
```bash
# Find process using port 5140
netstat -ano | findstr :5140  # Windows
lsof -i :5140                 # macOS/Linux

# Kill the process or use a different port
```

#### Firebase Installation Failed
- The app automatically falls back to mock data
- Check the health endpoint to confirm mock mode is active
- Install build tools if you need Firebase functionality

#### Permission Denied (Linux/macOS)
```bash
chmod +x setup-*.sh
sudo apt-get install python3-dev build-essential  # Ubuntu/Debian
```

#### Backend Dependencies Issues
```bash
# Clear pip cache and reinstall
pip cache purge
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Frontend Issues

#### "npm is not recognized"
- **Solution**: Use the PowerShell startup script: `scripts\start-frontend-powershell.bat`
- **Alternative**: Restart terminal after installing Node.js

#### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json  # macOS/Linux
rmdir /s node_modules & del package-lock.json  # Windows

# Reinstall
npm install
```

#### Port 3000 already in use
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# Kill the process or set different port
set PORT=3001 && npm start  # Windows
PORT=3001 npm start         # macOS/Linux
```

#### ESLint warnings
These are normal development warnings and don't prevent the app from running:
- Unused variables
- Missing dependencies in useEffect
- Deprecated packages

#### Build errors
```bash
# Try with legacy peer deps
npm install --legacy-peer-deps

# Or force install
npm install --force
```

#### PowerShell Execution Policy Issues (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Platform-Specific Issues

#### Windows ARM64
- Some packages may require compilation
- If Firebase installation fails, the app uses mock data
- Disable reload mode for better compatibility

#### Windows x86/x64
- Full compatibility with all packages
- Reload mode enabled for development

#### macOS (Intel/Apple Silicon)
- Full compatibility with all packages
- Reload mode enabled for development

#### Linux ARM64
- May require additional build tools
- Firebase dependencies should install successfully

#### Linux x86/x64
- Full compatibility with all packages
- Reload mode enabled for development

### Common Application Issues

#### "python is not recognized"
- **Solution**: The startup scripts use full paths to Python executables

#### Backend won't start
- **Solution**: Check that Python dependencies are installed using the setup scripts

#### Print report missing data
- **Solution**: Ensure backend is running and projections data is available

#### API Connection Issues
- Verify backend is running on port 5140
- Check CORS settings in backend
- Ensure firewall isn't blocking the connection

### Verification Steps

#### Backend Health Check
1. **Health Check:** http://localhost:5140/api/pac/health
2. **API Documentation:** http://localhost:5140/docs
3. **Root Endpoint:** http://localhost:5140/
4. **PAC Data (Mock):** http://localhost:5140/api/pac/store_001/202501

#### Expected Health Response
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

### Getting Help
- Check the console output in the terminal windows opened by the startup scripts
- Verify both servers are running on their respective ports
- Check the browser developer console for frontend errors
- Run the test script: `python test-server.py` (in backend directory)
- Check Node.js and npm versions: `node --version && npm --version`

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Root endpoint with system info
- `GET /api/pac/health` - Health check
- `GET /api/pac/{entity_id}/{year_month}` - Get PAC data
- `GET /api/pac/{entity_id}/{year_month}/input` - Get input data
- `GET /api/pac/{entity_id}/{year_month}/projections` - Get projections data

### Documentation
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

### Example API Calls
```bash
# Health check
curl http://localhost:5140/api/pac/health

# Get PAC data for store_001, January 2025
curl http://localhost:5140/api/pac/store_001/202501

# Get input data
curl http://localhost:5140/api/pac/store_001/202501/input
```

## 🚀 Development

### Adding New Features
1. **Frontend**: Add components in `client/src/pages/`
2. **Backend**: Add endpoints in `server/python_backend/main.py` or create new service files
3. **Database**: Configure Firebase or extend mock data generators

### Development Scripts

#### Frontend Development
```bash
cd client
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App (not recommended)
```

#### Backend Development
```bash
cd server/python_backend
python main.py                    # Development mode
python -m uvicorn main:app --reload  # Development with auto-reload
python -m pytest                 # Run tests
```

### Environment Variables
Create `.env` file in client directory:
```
REACT_APP_API_URL=http://localhost:5140
REACT_APP_ENVIRONMENT=development
```

### Testing
```bash
# Backend tests
cd server/python_backend
python -m pytest

# Frontend tests
cd client
npm test

# Test backend server
cd server/python_backend
python test-server.py
```

## 🏭 Production Deployment

### Backend Production
```bash
# Production mode
cd server/python_backend
python -m uvicorn main:app --host 0.0.0.0 --port 5140

# Using Gunicorn (Linux/macOS)
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5140
```

### Frontend Production
```bash
# Build the application
cd client
npm run build

# Serve the build
npm install -g serve
serve -s build -l 3000

# Using Python (if available)
cd build
python -m http.server 3000

# Using Node.js http-server
npm install -g http-server
http-server build -p 3000
```

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Internet Explorer: Not supported

### Security Notes
- Use HTTPS in production
- Implement proper authentication
- Validate all user inputs
- Use Content Security Policy (CSP)
- Never commit `.env` files with sensitive data
- Keep dependencies updated

## 📝 Recent Updates

### 🆕 Comprehensive Setup Documentation
- Merged detailed setup guides from `client/SETUP_GUIDE.md` and `server/python_backend/SETUP_GUIDE.md`
- Added platform-specific installation instructions for Windows, macOS, and Linux
- Comprehensive troubleshooting sections for both frontend and backend
- Detailed API endpoints documentation and examples
- Production deployment instructions and security notes

### 🆕 Enhanced Print Functionality
- Fixed missing projection numbers in print reports
- Added color-coded sections matching main interface
- Improved difference calculations and formatting
- Enhanced cross-browser print compatibility

### 🆕 Organized Startup Scripts
- Centralized all startup scripts in `scripts/` directory
- Simplified startup process with single commands
- Added multiple startup options for different use cases
- Fixed PATH and quoting issues for reliable execution

### 🆕 Cross-Platform Compatibility
- Windows (x86/ARM64) support
- macOS (Intel/Apple Silicon) support  
- Linux (x86/ARM64) support
- Platform-specific setup and startup scripts

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Project Timeline

<table>
  <thead>
    <tr>
      <th>Sprint</th>
      <th>Dates</th>
      <th>Goals / Deliverables</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Sprint 5</td>
      <td>Sep 29 – Oct 12</td>
      <td>Connect all PAC pages to database, finalize database, Invoice OCR/AI Scanner Feature, Finish implementing all P.A.C. Calculations, Rework Projections Page</td>
    </tr>
    <tr>
      <td>Sprint 6</td>
      <td>Oct 13 – Oct 26</td>
      <td>Complete Locking functionality for finalized Months, Connect Dashboard to Database, Complete Roles and Permissions, Rework Account Page</td>
    </tr>
    <tr>
      <td>Sprint 7</td>
      <td>Oct 27 – Nov 9</td>
      <td>Complete additional features (e.g., darkmode, announcements, deadlines, etc.); finalize styling, Complete Testing on all previous features, Website Security/Data protection</td>
    </tr>
    <tr>
      <td>Sprint 8</td>
      <td>Nov 10 – Nov 24</td>
      <td>Conduct final bug fixes, polish UI/UX, and prepare presentation/demo</td>
    </tr>
  </tbody>
</table>

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Testing

### Backend Testing
```bash
cd server/python_backend
python -m pytest
```

### Frontend Testing
```bash
cd client
npm test
```

### Integration Testing
```bash
# Test backend server
cd server/python_backend
python test-server.py
```

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Deployment

### Development Deployment
Use the startup scripts for local development:
```bash
scripts\start-both-servers.bat
```

### Production Deployment
See the Production Deployment section above for detailed instructions on deploying both frontend and backend to production environments.

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Developer Instructions

### Setting Up Development Environment
1. Follow the detailed setup instructions above
2. Use the organized startup scripts for easy development
3. Refer to the troubleshooting section for common issues
4. Check the API documentation at http://localhost:5140/docs

### Code Structure
- **Frontend**: React components in `client/src/pages/`
- **Backend**: FastAPI endpoints in `server/python_backend/`
- **Services**: Business logic in `server/python_backend/services/`
- **Configuration**: Environment and Firebase config in `server/python_backend/config/`

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Contributors

<h3>StackHats</h3>

<p><strong>Team Leader:</strong> Joseph Blount</p>

<p><strong>Developers:</strong></p>
<ul>
  <li>Joseph Blount</li>
  <li>Pavel Prokhorov</li>
  <li>Michelle Erickson</li>
  <li>Majd Hameed</li>
  <li>Chris Bozionelos</li>
  <li>Jamal Stanackzai</li>
  <li>Jason He</li>
  <li>Dylan Khon</li>
  <li>Kaden Bettencourt</li>
</ul>

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on your platform
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.