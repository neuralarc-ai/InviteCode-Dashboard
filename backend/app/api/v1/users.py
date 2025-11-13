"""
Users API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.schemas import (
    UserProfileResponse,
    CreateUserRequest,
    DeleteUserRequest,
    BulkDeleteUsersRequest,
    SuccessResponse,
)
from app.services import user_service
from app.core.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserProfileResponse])
async def get_users(user: dict = Depends(get_current_user)):
    """Get all user profiles."""
    try:
        return await user_service.get_user_profiles()
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users",
        )


@router.post("", response_model=UserProfileResponse)
async def create_user(
    request: CreateUserRequest,
    user: dict = Depends(get_current_user),
):
    """Create new user and profile."""
    try:
        return await user_service.create_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            preferred_name=request.preferred_name,
            work_description=request.work_description,
            metadata=request.metadata,
        )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete user and profile."""
    try:
        await user_service.delete_user(user_id)
        return SuccessResponse(
            success=True,
            message="User deleted successfully",
        )
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user",
        )


@router.post("/bulk-delete", response_model=SuccessResponse)
async def bulk_delete_users(
    request: BulkDeleteUsersRequest,
    user: dict = Depends(get_current_user),
):
    """Bulk delete users."""
    try:
        count = await user_service.bulk_delete_users(request.user_ids)
        return SuccessResponse(
            success=True,
            message=f"Successfully deleted {count} users",
            data={"deleted_count": count},
        )
    except Exception as e:
        logger.error(f"Error bulk deleting users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk delete users",
        )


@router.post("/fetch-emails", response_model=List[dict])
async def fetch_user_emails(
    request: dict,  # {"userIds": List[str]}
    user: dict = Depends(get_current_user),
):
    """Fetch user emails by user IDs."""
    try:
        user_ids = request.get("userIds", [])
        return await user_service.get_user_emails(user_ids)
    except Exception as e:
        logger.error(f"Error fetching user emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user emails",
        )

