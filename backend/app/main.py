"""
FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1 import invite_codes, users, credits, emails, usage_logs, waitlist
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Invite Code Dashboard API",
    description="Backend API for Invite Code Dashboard",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(invite_codes.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(credits.router, prefix=settings.api_prefix)
app.include_router(emails.router, prefix=settings.api_prefix)
app.include_router(usage_logs.router, prefix=settings.api_prefix)
app.include_router(waitlist.router, prefix=settings.api_prefix)

# Note: Health and root endpoints don't require authentication


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse(
        content={
            "status": "healthy",
            "environment": settings.environment,
        }
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return JSONResponse(
        content={
            "message": "Invite Code Dashboard API",
            "version": "1.0.0",
            "docs": "/docs",
        }
    )


@app.on_event("startup")
async def startup_event():
    """Startup event handler."""
    logger.info("Starting up Invite Code Dashboard API...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"CORS origins: {settings.cors_origins_list}")
    logger.info("API started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    logger.info("Shutting down Invite Code Dashboard API...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
    )

