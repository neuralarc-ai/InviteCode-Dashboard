"""
Waitlist API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.schemas import (
    WaitlistUserResponse,
    ArchiveWaitlistUsersRequest,
    SuccessResponse,
)
from app.core.database import get_supabase_admin
from app.core.auth import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


def transform_waitlist_user(row: dict) -> WaitlistUserResponse:
    """Transform database row to WaitlistUserResponse."""
    return WaitlistUserResponse(
        id=row["id"],
        full_name=row["full_name"],
        email=row["email"],
        company=row.get("company"),
        phone_number=row["phone_number"],
        country_code=row["country_code"],
        reference=row.get("reference"),
        referral_source=row.get("referral_source"),
        referral_source_other=row.get("referral_source_other"),
        user_agent=row.get("user_agent"),
        ip_address=row.get("ip_address"),
        joined_at=datetime.fromisoformat(row["joined_at"]),
        notified_at=datetime.fromisoformat(row["notified_at"]) if row.get("notified_at") else None,
        is_notified=row["is_notified"],
        is_archived=row.get("is_archived", False),
    )


@router.get("", response_model=List[WaitlistUserResponse])
async def get_waitlist_users(user: dict = Depends(get_current_user)):
    """Get all waitlist users."""
    try:
        supabase = get_supabase_admin()
        response = supabase.table("waitlist").select("*").order("joined_at", desc=True).execute()
        
        if response.data:
            return [transform_waitlist_user(row) for row in response.data]
        return []
    except Exception as e:
        logger.error(f"Error getting waitlist users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch waitlist users",
        )


@router.post("/archive", response_model=SuccessResponse)
async def archive_waitlist_users(
    request: ArchiveWaitlistUsersRequest,
    user: dict = Depends(get_current_user),
):
    """Archive waitlist users."""
    try:
        supabase = get_supabase_admin()
        
        query = supabase.table("waitlist").update({"is_archived": True})
        
        if request.user_ids:
            query = query.in_("id", request.user_ids)
        else:
            # Archive all notified users
            query = query.eq("is_notified", True)
        
        query = query.eq("is_archived", False)
        response = query.execute()
        
        count = len(response.data) if response.data else 0
        
        return SuccessResponse(
            success=True,
            message=f"Successfully archived {count} waitlist users",
            data={"archived_count": count},
        )
    except Exception as e:
        logger.error(f"Error archiving waitlist users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive waitlist users",
        )

