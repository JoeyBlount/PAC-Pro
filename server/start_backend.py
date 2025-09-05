#!/usr/bin/env python3
"""
Simple script to start the Python FastAPI backend
This can be run from the server directory or project root
"""
import os
import sys
import subprocess

def main():
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, "python_backend")
    
    # Check if the backend directory exists
    if not os.path.exists(backend_dir):
        print(f"Error: Backend directory not found at {backend_dir}")
        sys.exit(1)
    
    # Change to the backend directory
    os.chdir(backend_dir)
    
    print(f"Starting Python FastAPI backend from: {backend_dir}")
    print("Server will be available at: http://localhost:5140")
    print("API Documentation: http://localhost:5140/docs")
    print("Health Check: http://localhost:5140/api/pac/health")
    print("\nPress Ctrl+C to stop the server\n")
    
    # Start the server
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "127.0.0.1", 
            "--port", "5140", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    main()
