#!/bin/bash

echo "========================================"
echo "PAC Backend Server Startup"
echo "========================================"
echo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Change to backend directory
cd "$SCRIPT_DIR"
echo "Working directory: $(pwd)"
echo

# Set PROJECT_ROOT environment variable
export PROJECT_ROOT="$PROJECT_ROOT"
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo

echo "Starting Python backend server..."
echo

# Start the backend server
python3 main.py

echo
echo "Press any key to exit..."
read -n 1
