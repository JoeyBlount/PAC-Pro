#!/bin/bash

echo "========================================"
echo "PAC Backend Setup - Linux"
echo "========================================"
echo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to backend directory
cd "$SCRIPT_DIR"
echo "Working directory: $(pwd)"
echo

echo "Installing Python dependencies..."
echo

# Install cross-platform requirements
pip3 install -r requirements-cross-platform.txt

echo
echo "Setup complete!"
echo
echo "To start the server, run:"
echo "  scripts/start-server.sh"
echo
echo "Press any key to exit..."
read -n 1
