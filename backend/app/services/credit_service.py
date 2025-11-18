"""
Credit balance service for business logic.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.database import get_supabase_admin
from app.models.schemas import CreditBalanceResponse, CreditPurchaseResponse
import logging

logger = logging.getLogger(__name__)


def transform_credit_balance(row: dict, user_email: Optional[str] = None, user_name: Optional[str] = None) -> CreditBalanceResponse:
    """Transform database row to CreditBalanceResponse."""
    # Handle last_updated - can be datetime object or ISO string
    last_updated = row["last_updated"]
    if isinstance(last_updated, str):
        last_updated_dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00") if last_updated.endswith("Z") else last_updated)
    elif isinstance(last_updated, datetime):
        last_updated_dt = last_updated
    else:
        raise ValueError(f"Invalid last_updated format: {type(last_updated)}")
    
    # Handle metadata - ensure it's a dict
    metadata = row.get("metadata", {})
    if not isinstance(metadata, dict):
        metadata = {}
    
    return CreditBalanceResponse(
        user_id=row["user_id"],
        balance_dollars=float(row["balance_dollars"]),
        total_purchased=float(row["total_purchased"]),
        total_used=float(row["total_used"]),
        last_updated=last_updated_dt,
        metadata=metadata,
        user_email=user_email,
        user_name=user_name,
    )


async def get_credit_balances(user_id: Optional[str] = None) -> List[CreditBalanceResponse]:
    """Get credit balances, optionally filtered by user_id."""
    try:
        supabase = get_supabase_admin()
        query = supabase.table("credit_balance").select("*").order("last_updated", desc=True)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Get user IDs to fetch emails and names
        user_ids = [row["user_id"] for row in response.data]
        user_id_to_email: Dict[str, str] = {}
        user_id_to_name: Dict[str, str] = {}
        
        # Try to fetch user emails from auth.users
        try:
            # Use admin client to list users with pagination
            all_auth_users = []
            page = 1
            per_page = 1000
            
            while True:
                auth_response = supabase.auth.admin.list_users(page=page, per_page=per_page)
                # Handle both response object with .users attribute and direct list
                users_list = auth_response.users if hasattr(auth_response, 'users') else auth_response
                
                if not users_list or len(users_list) == 0:
                    break
                
                all_auth_users.extend(users_list)
                
                if len(users_list) < per_page:
                    break
                
                page += 1
            
            # Process users
            for user in all_auth_users:
                # Handle both user objects and dictionaries
                user_id = user.id if hasattr(user, 'id') else user.get('id')
                if user_id and user_id in user_ids:
                    # Get email
                    email = user.email if hasattr(user, 'email') else user.get('email')
                    if email:
                        user_id_to_email[user_id] = email
                    
                    # Try to get name from user_metadata
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("preferred_name") or
                            user_metadata.get("display_name")
                        )
                        if name:
                            user_id_to_name[user_id] = name
        except Exception as auth_error:
            logger.warning(f"Failed to fetch user emails from auth: {auth_error}")
        
        # Try to fetch user names from user_profiles table
        try:
            profiles_response = supabase.table("user_profiles").select("user_id, full_name, preferred_name").in_("user_id", user_ids).execute()
            if profiles_response.data:
                for profile in profiles_response.data:
                    user_id = profile["user_id"]
                    name = profile.get("preferred_name") or profile.get("full_name")
                    if name:
                        user_id_to_name[user_id] = name
        except Exception as profile_error:
            logger.warning(f"Failed to fetch user profiles: {profile_error}")
        
        # Transform balances with user data
        balances = []
        for row in response.data:
            user_id = row["user_id"]
            balance = transform_credit_balance(
                row,
                user_email=user_id_to_email.get(user_id),
                user_name=user_id_to_name.get(user_id),
            )
            balances.append(balance)
        
        return balances
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
        
        # Validate user_id
        if not user_id or not isinstance(user_id, str):
            raise ValueError(f"Invalid user_id: {user_id}")
        
        # Validate credits_to_add
        if credits_to_add <= 0:
            raise ValueError(f"credits_to_add must be positive, got: {credits_to_add}")
        
        # Check if user already has a credit balance record
        existing_response = supabase.table("credit_balance").select("*").eq("user_id", user_id).maybe_single().execute()
        
        if existing_response.data:
            # Update existing balance
            existing = existing_response.data
            try:
                new_balance = float(existing["balance_dollars"]) + credits_to_add
                new_total_purchased = float(existing["total_purchased"]) + credits_to_add
            except (KeyError, ValueError, TypeError) as e:
                error_msg = f"Error parsing existing balance data: {e}. Data: {existing}"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Handle metadata - ensure it's a dict
            updated_metadata = existing.get("metadata", {})
            if not isinstance(updated_metadata, dict):
                updated_metadata = {}
            
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
            
            if not update_response.data:
                error_msg = f"No data returned after updating balance for user {user_id}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Fetch user email and name for response
            user_email = None
            user_name = None
            try:
                auth_user = supabase.auth.admin.get_user_by_id(user_id)
                if hasattr(auth_user, 'user'):
                    user = auth_user.user
                else:
                    user = auth_user
                
                if user:
                    user_email = user.email if hasattr(user, 'email') else user.get('email')
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        user_name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("preferred_name") or
                            user_metadata.get("display_name")
                        )
            except Exception as auth_err:
                logger.warning(f"Failed to fetch user info for {user_id}: {auth_err}")
                # Don't fail the operation if we can't get user info
            
            return transform_credit_balance(update_response.data, user_email=user_email, user_name=user_name)
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
            
            if not insert_response.data:
                error_msg = f"No data returned after inserting balance for user {user_id}"
                logger.error(error_msg)
                raise Exception(error_msg)
            
            # Fetch user email and name for response
            user_email = None
            user_name = None
            try:
                auth_user = supabase.auth.admin.get_user_by_id(user_id)
                if hasattr(auth_user, 'user'):
                    user = auth_user.user
                else:
                    user = auth_user
                
                if user:
                    user_email = user.email if hasattr(user, 'email') else user.get('email')
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        user_name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("preferred_name") or
                            user_metadata.get("display_name")
                        )
            except Exception as auth_err:
                logger.warning(f"Failed to fetch user info for {user_id}: {auth_err}")
                # Don't fail the operation if we can't get user info
            
            return transform_credit_balance(insert_response.data, user_email=user_email, user_name=user_name)
    except ValueError as e:
        # Re-raise validation errors as-is
        logger.error(f"Validation error assigning credits: {e}")
        raise
    except Exception as e:
        error_msg = f"Error assigning credits to user {user_id}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg) from e


def transform_credit_purchase(row: dict, user_email: Optional[str] = None, user_name: Optional[str] = None) -> CreditPurchaseResponse:
    """Transform database row to CreditPurchaseResponse."""
    # Helper function to parse datetime strings
    def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
        if not dt_str:
            return None
        if isinstance(dt_str, datetime):
            return dt_str
        # Handle ISO format with or without Z
        dt_str = dt_str.replace("Z", "+00:00") if dt_str.endswith("Z") else dt_str
        return datetime.fromisoformat(dt_str)
    
    return CreditPurchaseResponse(
        id=row["id"],
        user_id=row["user_id"],
        amount_dollars=float(row["amount_dollars"]),
        stripe_payment_intent_id=row.get("stripe_payment_intent_id"),
        stripe_charge_id=row.get("stripe_charge_id"),
        status=row["status"],
        description=row.get("description"),
        metadata=row.get("metadata", {}),
        created_at=parse_datetime(row["created_at"]),
        completed_at=parse_datetime(row.get("completed_at")),
        expires_at=parse_datetime(row.get("expires_at")),
        user_email=user_email,
        user_name=user_name,
    )


async def get_credit_purchases(status: Optional[str] = None) -> List[CreditPurchaseResponse]:
    """Get credit purchases, optionally filtered by status."""
    try:
        supabase = get_supabase_admin()
        query = supabase.table("credit_purchases").select("*").order("created_at", desc=True)
        
        if status:
            query = query.eq("status", status)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Get user IDs to fetch emails and names
        user_ids = [row["user_id"] for row in response.data]
        user_id_to_email: Dict[str, str] = {}
        user_id_to_name: Dict[str, str] = {}
        
        # Try to fetch user emails from auth.users
        try:
            # Use admin client to list users with pagination
            all_auth_users = []
            page = 1
            per_page = 1000
            
            while True:
                auth_response = supabase.auth.admin.list_users(page=page, per_page=per_page)
                # Handle both response object with .users attribute and direct list
                users_list = auth_response.users if hasattr(auth_response, 'users') else auth_response
                
                if not users_list or len(users_list) == 0:
                    break
                
                all_auth_users.extend(users_list)
                
                if len(users_list) < per_page:
                    break
                
                page += 1
            
            # Process users
            for user in all_auth_users:
                # Handle both user objects and dictionaries
                user_id = user.id if hasattr(user, 'id') else user.get('id')
                if user_id and user_id in user_ids:
                    # Get email
                    email = user.email if hasattr(user, 'email') else user.get('email')
                    if email:
                        user_id_to_email[user_id] = email
                    
                    # Try to get name from user_metadata
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("preferred_name") or
                            user_metadata.get("display_name")
                        )
                        if name:
                            user_id_to_name[user_id] = name
        except Exception as auth_error:
            logger.warning(f"Failed to fetch user emails from auth: {auth_error}")
        
        # Try to fetch user names from user_profiles table
        try:
            profiles_response = supabase.table("user_profiles").select("user_id, full_name, preferred_name").in_("user_id", user_ids).execute()
            if profiles_response.data:
                for profile in profiles_response.data:
                    user_id = profile["user_id"]
                    name = profile.get("preferred_name") or profile.get("full_name")
                    if name:
                        user_id_to_name[user_id] = name
        except Exception as profile_error:
            logger.warning(f"Failed to fetch user profiles: {profile_error}")
        
        # Transform purchases with user data
        purchases = []
        for row in response.data:
            user_id = row["user_id"]
            purchase = transform_credit_purchase(
                row,
                user_email=user_id_to_email.get(user_id),
                user_name=user_id_to_name.get(user_id),
            )
            purchases.append(purchase)
        
        return purchases
    except Exception as e:
        logger.error(f"Error fetching credit purchases: {e}")
        raise

