#!/usr/bin/env python3
"""
Startup script for the PAC Calculation API
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5140,
        reload=True,
        log_level="info"
    )
