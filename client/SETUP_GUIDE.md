# PAC Frontend Setup Guide

Cross-platform setup instructions for PAC (Profit and Controllable) React Frontend.

## Prerequisites

### All Platforms
- Node.js 16 or higher
- npm (comes with Node.js)

### Installation by Platform

#### Windows
1. **Download Node.js:**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download LTS version for Windows
   - Run installer and ensure "Add to PATH" is checked

2. **Alternative - Using winget:**
   ```cmd
   winget install OpenJS.NodeJS.LTS
   ```

#### macOS
1. **Using Homebrew (Recommended):**
   ```bash
   brew install node
   ```

2. **Manual Installation:**
   - Go to [nodejs.org](https://nodejs.org/)
   - Download LTS version for macOS
   - Run the installer

#### Linux
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

## Setup Instructions

### 1. Navigate to Frontend Directory
```bash
cd client
```

### 2. Install Dependencies
```bash
# All platforms
npm install

# If you encounter peer dependency warnings
npm install --legacy-peer-deps
```

### 3. Start Development Server
```bash
npm start
```

The frontend will be available at: http://localhost:3000

## Platform-Specific Notes

### Windows
- **PowerShell Execution Policy:** If npm commands fail, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- **Path Issues:** Restart terminal after installing Node.js

### macOS
- **Permission Issues:** Use `sudo` only if necessary
- **Homebrew:** Recommended for easier updates

### Linux
- **Build Tools:** May need additional packages:
  ```bash
  sudo apt-get install build-essential  # Ubuntu/Debian
  sudo yum groupinstall "Development Tools"  # CentOS/RHEL
  ```

## Troubleshooting

### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json  # macOS/Linux
rmdir /s node_modules & del package-lock.json  # Windows

# Reinstall
npm install
```

### Port 3000 already in use
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# Kill the process or set different port
set PORT=3001 && npm start  # Windows
PORT=3001 npm start         # macOS/Linux
```

### ESLint warnings
These are normal development warnings and don't prevent the app from running:
- Unused variables
- Missing dependencies in useEffect
- Deprecated packages

### Build errors
```bash
# Try with legacy peer deps
npm install --legacy-peer-deps

# Or force install
npm install --force
```

## Development Scripts

### Available Commands
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App (not recommended)
```

### Environment Variables
Create `.env` file in client directory:
```
REACT_APP_API_URL=http://localhost:5140
REACT_APP_ENVIRONMENT=development
```

## Production Build

### Build the Application
```bash
npm run build
```

### Serve the Build
```bash
# Using serve (install globally first)
npm install -g serve
serve -s build -l 3000

# Using Python (if available)
cd build
python -m http.server 3000  # Python 3
python -m SimpleHTTPServer 3000  # Python 2

# Using Node.js http-server
npm install -g http-server
http-server build -p 3000
```

## Integration with Backend

### API Configuration
The frontend is configured to connect to the backend at:
- Development: `http://localhost:5140`
- Production: Configure `REACT_APP_API_URL`

### CORS
The backend is configured to allow requests from:
- `http://localhost:3000` (development)
- `http://127.0.0.1:3000` (alternative localhost)

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Internet Explorer
Not supported. Use a modern browser.

## Performance Optimization

### Development
- Use React Developer Tools browser extension
- Enable "Highlight updates" in React DevTools
- Monitor Network tab for API calls

### Production
- Run `npm run build` to create optimized build
- Use browser DevTools to analyze bundle size
- Consider code splitting for large applications

## Security Notes

### Development
- Never commit `.env` files with sensitive data
- Use environment variables for API keys
- Keep dependencies updated

### Production
- Use HTTPS in production
- Implement proper authentication
- Validate all user inputs
- Use Content Security Policy (CSP)

## Support

### Common Issues
1. **Node.js version:** Ensure you're using Node.js 16+
2. **npm version:** Update npm with `npm install -g npm@latest`
3. **Cache issues:** Clear npm cache and reinstall
4. **Permission issues:** Use appropriate user permissions

### Getting Help
- Check browser console for JavaScript errors
- Check Network tab for failed API requests
- Verify backend is running on port 5140
- Check Node.js and npm versions
