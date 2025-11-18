"""
Invite codes API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.schemas import (
    GenerateInviteCodeRequest,
    InviteCodeResponse,
    BulkDeleteInviteCodesRequest,
    ArchiveInviteCodeRequest,
    UnarchiveInviteCodeRequest,
    SuccessResponse,
    ErrorResponse,
)
from app.services import invite_code_service
from app.core.auth import verify_admin_password
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invite-codes", tags=["invite-codes"])


@router.get("", response_model=List[InviteCodeResponse])
async def get_invite_codes(_: None = Depends(verify_admin_password)):
    """Get all invite codes."""
    try:
        return await invite_code_service.get_invite_codes()
    except Exception as e:
        logger.error(f"Error getting invite codes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch invite codes",
        )


@router.post("/generate", response_model=SuccessResponse)
async def generate_invite_code(
    request: GenerateInviteCodeRequest,
    _: None = Depends(verify_admin_password),
):
    """Generate a single invite code."""
    try:
        codes = await invite_code_service.generate_invite_codes(
            count=1,
            max_uses=request.max_uses,
            expires_in_days=request.expires_in_days,
        )
        return SuccessResponse(
            success=True,
            message="Invite code generated successfully",
            data={"code": codes[0] if codes else None},
        )
    except Exception as e:
        logger.error(f"Error generating invite code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate invite code",
        )


@router.delete("/{code_id}", response_model=SuccessResponse)
async def delete_invite_code(
    code_id: str,
    _: None = Depends(verify_admin_password),
):
    """Delete invite code by ID."""
    try:
        await invite_code_service.delete_invite_code(code_id)
        return SuccessResponse(
            success=True,
            message="Invite code deleted successfully",
        )
    except Exception as e:
        logger.error(f"Error deleting invite code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete invite code",
        )


@router.post("/bulk-delete", response_model=SuccessResponse)
async def bulk_delete_invite_codes(
    request: BulkDeleteInviteCodesRequest,
    _: None = Depends(verify_admin_password),
):
    """Bulk delete invite codes."""
    try:
        count = await invite_code_service.bulk_delete_invite_codes(request.code_ids)
        return SuccessResponse(
            success=True,
            message=f"Successfully deleted {count} invite codes",
            data={"deleted_count": count},
        )
    except Exception as e:
        logger.error(f"Error bulk deleting invite codes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk delete invite codes",
        )


@router.post("/archive", response_model=SuccessResponse)
async def archive_invite_code(
    request: ArchiveInviteCodeRequest,
    _: None = Depends(verify_admin_password),
):
    """Archive invite code."""
    try:
        await invite_code_service.archive_invite_code(request.code_id)
        return SuccessResponse(
            success=True,
            message="Invite code archived successfully",
        )
    except Exception as e:
        logger.error(f"Error archiving invite code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive invite code",
        )


@router.post("/unarchive", response_model=SuccessResponse)
async def unarchive_invite_code(
    request: UnarchiveInviteCodeRequest,
    _: None = Depends(verify_admin_password),
):
    """Unarchive invite code."""
    try:
        await invite_code_service.unarchive_invite_code(request.code_id)
        return SuccessResponse(
            success=True,
            message="Invite code unarchived successfully",
        )
    except Exception as e:
        logger.error(f"Error unarchiving invite code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unarchive invite code",
        )


@router.post("/bulk-archive-used", response_model=SuccessResponse)
async def bulk_archive_used_codes(_: None = Depends(verify_admin_password)):
    """Bulk archive used invite codes."""
    try:
        count = await invite_code_service.bulk_archive_used_codes()
        return SuccessResponse(
            success=True,
            message=f"Successfully archived {count} used invite codes",
            data={"archived_count": count},
        )
    except Exception as e:
        logger.error(f"Error bulk archiving used codes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk archive used codes",
        )

