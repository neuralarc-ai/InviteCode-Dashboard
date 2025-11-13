"""
Credit balance service for business logic.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.database import get_supabase_admin
from app.models.schemas import CreditBalanceResponse
import logging

logger = logging.getLogger(__name__)


def transform_credit_balance(row: dict) -> CreditBalanceResponse:
    """Transform database row to CreditBalanceResponse."""
    return CreditBalanceResponse(
        user_id=row["user_id"],
        balance_dollars=float(row["balance_dollars"]),
        total_purchased=float(row["total_purchased"]),
        total_used=float(row["total_used"]),
        last_updated=datetime.fromisoformat(row["last_updated"]),
        metadata=row.get("metadata", {}),
    )


async def get_credit_balances(user_id: Optional[str] = None) -> List[CreditBalanceResponse]:
    """Get credit balances, optionally filtered by user_id."""
    try:
        supabase = get_supabase_admin()
        query = supabase.table("credit_balance").select("*").order("last_updated", desc=True)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        response = query.execute()
        
        if response.data:
            return [transform_credit_balance(row) for row in response.data]
        return []
    except Exception as e:
        logger.error(f"Error fetching credit balances: {e}")
        raise


async def assign_credits(
    user_id: str,
    credits_to_add: float,
    notes: Optional[str] = None,
) -> CreditBalanceResponse:
    """Assign credits to user."""
    try:
        supabase = get_supabase_admin()
        now = datetime.now().isoformat()
        
        # Check if user already has a credit balance record
        existing_response = supabase.table("credit_balance").select("*").eq("user_id", user_id).maybe_single().execute()
        
        if existing_response.data:
            # Update existing balance
            existing = existing_response.data
            new_balance = float(existing["balance_dollars"]) + credits_to_add
            new_total_purchased = float(existing["total_purchased"]) + credits_to_add
            
            updated_metadata = existing.get("metadata", {})
            updated_metadata["last_assignment"] = {
                "amount": credits_to_add,
                "timestamp": now,
                "notes": notes,
            }
            
            update_response = supabase.table("credit_balance").update({
                "balance_dollars": new_balance,
                "total_purchased": new_total_purchased,
                "last_updated": now,
                "metadata": updated_metadata,
            }).eq("user_id", user_id).select().single().execute()
            
            return transform_credit_balance(update_response.data)
        else:
            # Create new balance record
            insert_data = {
                "user_id": user_id,
                "balance_dollars": credits_to_add,
                "total_purchased": credits_to_add,
                "total_used": 0,
                "last_updated": now,
                "metadata": {
                    "initial_assignment": {
                        "amount": credits_to_add,
                        "timestamp": now,
                        "notes": notes,
                    }
                },
            }
            
            insert_response = supabase.table("credit_balance").insert(insert_data).select().single().execute()
            
            return transform_credit_balance(insert_response.data)
    except Exception as e:
        logger.error(f"Error assigning credits: {e}")
        raise

