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
<p>PAC Pro is a web program which aims to replace the analog way of invoicing that our client is currently using with a digital system. This program will help streamline invoice processing and help automatically generate profits after controllables based on the data. No more needing to juggle stacks of paper looking for a specific invoice and long wait times to see how stores are performing. The custom program mirrors the familiar paper based process allowing minimal retraining and simplicity for non-tech savvy staff members.</p> 

### Built with 
<!-- List tools used for this project -->
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) &nbsp; ![Firebase](https://img.shields.io/badge/firebase-a08021?style=for-the-badge&logo=firebase&logoColor=ffcd34) &nbsp; ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) &nbsp; ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)

### Screenshots
<!-- Inset example Screens images -->

<img src="./readme_images/2025-04-26_21-09-46.png" width="250"/> &nbsp; <img src="./readme_images/2025-04-27_20-03-30.png" width="250"/> &nbsp; <img src="./readme_images/2025-04-27_20-08-47.png" width="250"/>

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Architecture

- **Frontend**: React.js (Port 3000)
- **Backend**: Python FastAPI (Port 5140)
- **Database**: Firebase Firestore (Optional - falls back to mock data)
- **Platforms**: Windows (x86/ARM64), macOS (Intel/Apple Silicon), Linux (x86/ARM64)

### Code Structure
- **Frontend**: React components in `client/src/pages/`
- **Backend**: FastAPI endpoints in `server/python_backend/`
- **Services**: Business logic in `server/python_backend/services/`
- **Configuration**: Environment and Firebase config in `server/python_backend/config/`

<p align="right"> (<a href="#top">Back to Top</a>) </p>

##  Development Setup

### Prerequisites
- **Node.js** 16+ (for frontend)
- **Python** 3.8+ (for backend)
- **Git** (for cloning)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PAC-Pro
```

### 2. Install Dependencies (Important!)
**Frontend Dependencies:**
```bash
cd client
npm install
npm install xlsx file-saver
cd ..
```
If you encounter peer dependency warnings when using npm install, use the following install command instead.
```
npm install --legacy-peer-deps
```

**Backend Dependencies:**
```bash
cd server/python_backend
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
python -m pip install msal PyJWT itsdangerous httpx
cd ../..
```

### <ins>Backend Setup (Python FastAPI)</ins>

#### Environment Variables
The application uses the `PROJECT_ROOT` environment variable to locate Firebase configuration files:

**Windows:**
```cmd
set PROJECT_ROOT=C:\path\to\your\PAC-Pro
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
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# macOS/Linux
python3 -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

##### Firebase Dependencies (Optional)
```bash
# Windows
python -m pip install firebase-admin google-cloud-firestore

# macOS/Linux
python3 -m pip install firebase-admin google-cloud-firestore
```

**Note:** Firebase dependencies may fail to install on Windows ARM64 due to compilation issues. The application will automatically fall back to mock data mode.

## Configuration

### Environment Variables

#### System Environment Variables

- `PROJECT_ROOT`: Set to your project directory path (automatically handled by startup scripts)

#### Back-end Environment Variables
Create a `.env` file at `PAC_Pro/server/python_backend/`:
```
AUTH_SECRET=replace-with-long-random-string
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-client-id
AZURE_CLIENT_SECRET=your-client-secret-value
AZURE_REDIRECT_URI=http://localhost:5140/api/auth/microsoft/callback
FRONTEND_BASE_URL=http://localhost:3000
GOOGLE_APPLICATION_CREDENTIALS=server/python_backend/config/firebase-service-account.json
REACT_APP_FIREBASE_STORAGE_BUCKET=pacpro-ef499.firebasestorage.app
```
Notes:
- Client secret must be the Secret Value (not the Secret ID)
- Redirect URI must be listed under Azure App Registration → Authentication → Web

#### Front-end Environment Variables
Create `.env` file at `PAC_Pro/client/`:
```
REACT_APP_API_URL=http://localhost:5140
REACT_APP_ENVIRONMENT=development
```

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

The application will automatically use Firebase if available, otherwise falls back to mock data.

### Microsoft Login Setup (Summary)
- Azure App Registration → Authentication:
  - Platform: Web
  - Redirect URIs: `http://localhost:5140/api/auth/microsoft/callback`
  - Front-channel logout URL (optional): `http://localhost:3000/`
  - Implicit grant and hybrid flows: leave unchecked (no Access/ID tokens)
- Certificates & secrets: create a client secret (use the Value in `.env`)
- API permissions: Microsoft Graph → Delegated → User.Read
- Start backend:
  ```bash
  cd server/python_backend
  python -m uvicorn main:app --host 127.0.0.1 --port 5140 --reload
  ```

### <ins>Startup Options</ins>

### Option 1: Start Both Servers (Recommended)
```bash
# From project root
scripts\start-both-servers.bat
```

**Note**: If you encounter "Failed to fetch" errors, the backend CORS configuration has been updated to handle all localhost variations automatically.

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
<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5140
- **API Documentation**: http://localhost:5140/docs

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Platform-Specific Issues

#### Windows ARM64
- Some packages may require compilation (Pillow, httptools)
- If Firebase installation fails, the app uses mock data automatically
- Core functionality works perfectly with essential dependencies only
- CORS configuration updated to handle IPv6 localhost variations

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

<p align="right"> (<a href="#top">Back to Top</a>) </p>

## Testing

Playwright and Pytest are used for code testing. Playwright handles end-to-end testing while pytest handles unit testing of the backend code.

If Playwright is not installed, run the following while in the source folder
```
cd client
npm install playwright@latest
cd ..
```

If Pytest is not installed, run the following while in the source folder
```
cd server/python_backend
pip install -U pytest
cd ../..
```

### How To Run Playwright Tests.

- Starting off in the source directory, run the command “cd client” in the terminal to change to the client folder. 

- After changing the directory, run the command “npx playwright test”. This command will run all the available playwright tests in the tests/e2e/ folder.

- After running the test run command, you will be prompted to log in. Login with google and click on the resume testing once login is successful. 

- All the Playwright tests will automatically run one after another. Once finished, the results will be printed on the terminal.

- If you wish to run a specific test, run the command “npx playwright test tests/e2e/(test filename)” where (test filename) is where you put the filename of the test you wish to run. You will also need to manually login for each time you run a single test.


### How To Run Pytest Tests

- Starting off in the source directory, run the command “cd server/python_backend” to change to the python_backend folder.

- After changing the directory, run the command “python -m pytest tests\(test filename)” where (test filename) is the filename of the test you wish to run.

- The Pytest test will start running and the results of the test will be outputted in the terminal.


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

<p>Contact developer through developer's GitHub.<p>

<p align="right"> (<a href="#top">Back to Top</a>) </p>
