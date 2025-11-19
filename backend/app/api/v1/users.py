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
from app.core.auth import verify_admin_password
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserProfileResponse])
async def get_users(_: None = Depends(verify_admin_password)):
    """Get all s."""
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
    _: None = Depends(verify_admin_password),
):
    """Create new user and profile."""
    try:
        return await user_service.create_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            preferred_name=request.preferred_name,
            work_description=request.work_description,
            personal_references=request.personal_references,
            avatar_url=request.avatar_url,
            referral_source=request.referral_source,
            consent_given=request.consent_given,
            consent_date=request.consent_date,
            plan_type=request.plan_type,
            account_type=request.account_type,
            metadata=request.metadata,
        )
    except HTTPException:
        # Re-raise HTTPExceptions (like 409 for duplicate email) as-is
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        # Check if error message indicates duplicate email
        error_str = str(e).lower()
        # More comprehensive check for duplicate email patterns
        if any(keyword in error_str for keyword in ['already', 'duplicate', 'exists']) and \
           any(keyword in error_str for keyword in ['registered', 'exists', 'email', 'user']):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) if str(e) else "Failed to create user",
        )


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: str,
    _: None = Depends(verify_admin_password),
):
    """Delete user and profile."""
    try:
        await user_service.delete_user(user_id)
        return SuccessResponse(
            success=True,
            message="User deleted successfully",
        )
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}", exc_info=True)
        error_detail = str(e) if str(e) else "Failed to delete user"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail,
        )


@router.post("/bulk-delete", response_model=SuccessResponse)
async def bulk_delete_users(
    request: BulkDeleteUsersRequest,
    _: None = Depends(verify_admin_password),
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
    _: None = Depends(verify_admin_password),
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

