"""
Email API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import (
    SendBulkEmailRequest,
    SendIndividualEmailRequest,
    SuccessResponse,
)
from app.services import email_service
from app.core.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails", tags=["emails"])


@router.post("/bulk", response_model=SuccessResponse)
async def send_bulk_email(
    request: SendBulkEmailRequest,
    user: dict = Depends(get_current_user),
):
    """Send bulk email to users."""
    try:
        result = await email_service.send_bulk_email(
            custom_email=request.custom_email,
            selected_user_ids=request.selected_user_ids,
        )
        return SuccessResponse(
            success=True,
            message=f"Emails processed: {result['success_count']} sent successfully, {result['error_count']} failed",
            data=result,
        )
    except Exception as e:
        logger.error(f"Error sending bulk email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send bulk emails",
        )


@router.post("/individual", response_model=SuccessResponse)
async def send_individual_email(
    request: SendIndividualEmailRequest,
    user: dict = Depends(get_current_user),
):
    """Send individual email."""
    try:
        success = await email_service.send_individual_email(
            individual_email=request.individual_email,
            subject=request.subject,
            text_content=request.text_content,
            html_content=request.html_content,
        )
        
        if success:
            return SuccessResponse(
                success=True,
                message=f"Email sent successfully to {request.individual_email}",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email",
            )
    except Exception as e:
        logger.error(f"Error sending individual email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email",
        )


@router.get("/images", response_model=dict)
async def get_email_images(user: dict = Depends(get_current_user)):
    """Get email images as base64."""
    try:
        from app.core.email import get_image_base64
        
        return {
            "success": True,
            "images": {
                "logo": get_image_base64("email-logo.png"),
                "downtimeBody": get_image_base64("downtime-body.png"),
                "uptimeBody": get_image_base64("uptime-body.png"),
                "creditsBody": get_image_base64("1Kcredits.png"),
            },
        }
    except Exception as e:
        logger.error(f"Error getting email images: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get email images",
        )

