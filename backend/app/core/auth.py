"""
Simple password-based authentication for admin API access.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def verify_admin_password(credentials: HTTPAuthorizationCredentials = Depends(security)) -> None:
    """
    Verify admin password from Authorization header.
    
    Args:
        credentials: HTTP authorization credentials containing the password
        
    Raises:
        HTTPException: If password is invalid or missing
    """
    password = credentials.credentials
    
    if not password:
        logger.warning("Authentication attempt with empty password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if password != settings.admin_password:
        logger.warning("Authentication attempt with invalid password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Password is valid, allow request to proceed
    return None
