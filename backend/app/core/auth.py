"""
Supabase Auth JWT token verification and user authentication.
"""
from typing import Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from supabase import Client
from app.core.database import get_supabase_admin
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()


async def verify_token(credentials: HTTPAuthorizationCredentials) -> dict:
    """
    Verify Supabase JWT token and return user information.
    
    Args:
        credentials: HTTP authorization credentials containing the JWT token
        
    Returns:
        Dictionary containing user information from the token
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    
    try:
        # Get Supabase admin client to verify token
        supabase = get_supabase_admin()
        
        # Verify token with Supabase
        # Supabase uses JWT tokens that can be verified using the JWT secret
        # For now, we'll use Supabase's built-in verification
        try:
            # Use Supabase auth to get user from token
            response = supabase.auth.get_user(token)
            user = response.user
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata or {},
                "app_metadata": user.app_metadata or {},
            }
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except JWTError as e:
        logger.error(f"JWT error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = security) -> dict:
    """
    Dependency function for FastAPI routes to get current authenticated user.
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user_id": user["id"]}
    """
    return await verify_token(credentials)

