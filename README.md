# PAC-Pro: Profit and Controllable Expense Management

A full-stack web application for calculating and managing Profit and Controllable (PAC) expenses across multiple platforms.

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

## 🔧 Manual Setup (If Needed)

### Backend Setup

#### Windows
```cmd
cd server\python_backend
scripts\setup-windows.bat
```

#### macOS
```bash
cd server/python_backend
chmod +x scripts/setup-macos.sh
scripts/setup-macos.sh
```

#### Linux
```bash
cd server/python_backend
chmod +x scripts/setup-linux.sh
scripts/setup-linux.sh
```

### Frontend Setup
```bash
cd client
npm install
npm start
```

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
1. Copy your Firebase service account JSON to `server/python_backend/config/firebase-service-account.json`
2. The application will automatically use Firebase if available, otherwise falls back to mock data

## 🐛 Troubleshooting

### Common Issues

#### "npm is not recognized"
- **Solution**: Use the PowerShell startup script: `scripts\start-frontend-powershell.bat`

#### "python is not recognized"
- **Solution**: The startup scripts use full paths to Python executables

#### Backend won't start
- **Solution**: Check that Python dependencies are installed using the setup scripts

#### Print report missing data
- **Solution**: Ensure backend is running and projections data is available

### Getting Help
- Check the console output in the terminal windows opened by the startup scripts
- Verify both servers are running on their respective ports
- Check the browser developer console for frontend errors

## 🚀 Development

### Adding New Features
1. **Frontend**: Add components in `client/src/pages/`
2. **Backend**: Add endpoints in `server/python_backend/main.py` or create new service files
3. **Database**: Configure Firebase or extend mock data generators

### Testing
```bash
# Backend tests
cd server/python_backend
python -m pytest

# Frontend tests
cd client
npm test
```

## 📝 Recent Updates

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on your platform
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.