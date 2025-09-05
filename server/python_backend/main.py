"""
FastAPI application for PAC (Profit and Controllable) calculations
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import router

# Create FastAPI app
app = FastAPI(
    title="PAC Calculation API",
    description="API for calculating Profit and Controllable expenses",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PAC Calculation API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/pac/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5140,
        reload=True,
        log_level="info"
    )
