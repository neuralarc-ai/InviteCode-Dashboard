"""
Credits API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.models.schemas import (
    CreditBalanceResponse,
    AssignCreditsRequest,
    SuccessResponse,
    CreditPurchaseResponse,
)
from app.services import credit_service, email_service
from app.core.auth import verify_admin_password
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balances", response_model=List[CreditBalanceResponse])
async def get_credit_balances(
    user_id: Optional[str] = Query(None),
    _: None = Depends(verify_admin_password),
):
    """Get credit balances, optionally filtered by user_id."""
    try:
        return await credit_service.get_credit_balances(user_id=user_id)
    except Exception as e:
        logger.error(f"Error getting credit balances: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch credit balances",
        )


@router.post("/assign", response_model=SuccessResponse)
async def assign_credits(
    request: AssignCreditsRequest,
    _: None = Depends(verify_admin_password),
):
    """Assign credits to user."""
    try:
        balance = await credit_service.assign_credits(
            user_id=request.user_id,
            credits_to_add=request.credits_to_add,
            notes=request.notes,
        )
        
        # Send credits email
        try:
            await email_service.send_credits_email(request.user_id, request.credits_to_add)
        except Exception as email_error:
            logger.warning(f"Failed to send credits email: {email_error}")
            # Don't fail the entire operation if email fails
        
        return SuccessResponse(
            success=True,
            message=f"Successfully assigned {request.credits_to_add} credits to user",
            data={
                "userId": balance.user_id,
                "balanceDollars": balance.balance_dollars,
                "totalPurchased": balance.total_purchased,
                "totalUsed": balance.total_used,
            },
        )
    except Exception as e:
        logger.error(f"Error assigning credits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign credits",
        )


@router.get("/purchases", response_model=List[CreditPurchaseResponse])
async def get_credit_purchases(
    status: Optional[str] = Query(None, description="Filter by status (e.g., 'completed', 'pending', 'failed', 'refunded')"),
    _: None = Depends(verify_admin_password),
):
    """Get credit purchases, optionally filtered by status."""
    try:
        return await credit_service.get_credit_purchases(status=status)
    except Exception as e:
        logger.error(f"Error getting credit purchases: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch credit purchases",
        )

