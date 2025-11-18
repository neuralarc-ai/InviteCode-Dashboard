"""
Vercel serverless function entry point for FastAPI application.
This file is used by Vercel to deploy the FastAPI app as serverless functions.
"""
from app.main import app

# Export the FastAPI app for Vercel
# Vercel's Python runtime will automatically handle the ASGI application
__all__ = ["app"]

