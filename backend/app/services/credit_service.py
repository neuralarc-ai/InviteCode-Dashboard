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
    return CreditBalanceResponse(
        user_id=row["user_id"],
        balance_dollars=float(row["balance_dollars"]),
        total_purchased=float(row["total_purchased"]),
        total_used=float(row["total_used"]),
        last_updated=datetime.fromisoformat(row["last_updated"]),
        metadata=row.get("metadata", {}),
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
        
        # Validate inputs
        if not user_id or not isinstance(user_id, str):
            raise ValueError("user_id must be a non-empty string")
        if not isinstance(credits_to_add, (int, float)) or credits_to_add <= 0:
            raise ValueError("credits_to_add must be a positive number")
        
        # Check if user already has a credit balance record
        try:
            existing_response = supabase.table("credit_balance").select("*").eq("user_id", user_id).maybe_single().execute()
        except Exception as db_error:
            logger.error(f"Database error checking existing balance for user {user_id}: {db_error}")
            raise Exception(f"Failed to check existing balance: {str(db_error)}")
        
        # Check for Supabase errors in response
        if hasattr(existing_response, 'error') and existing_response.error:
            error_msg = str(existing_response.error)
            logger.error(f"Supabase error checking existing balance: {error_msg}")
            raise Exception(f"Database error: {error_msg}")
        
        if existing_response.data:
            # Update existing balance
            existing = existing_response.data
            new_balance = float(existing["balance_dollars"]) + credits_to_add
            new_total_purchased = float(existing["total_purchased"]) + credits_to_add
            
            # Ensure metadata is a dict
            existing_metadata = existing.get("metadata")
            if existing_metadata is None:
                updated_metadata = {}
            elif isinstance(existing_metadata, dict):
                updated_metadata = existing_metadata.copy()
            else:
                # If metadata is a string or other type, try to parse it or create new dict
                logger.warning(f"Metadata is not a dict for user {user_id}, type: {type(existing_metadata)}")
                updated_metadata = {}
            
            updated_metadata["last_assignment"] = {
                "amount": credits_to_add,
                "timestamp": now,
                "notes": notes,
            }
            
            # Update the balance (without select, as Supabase Python client doesn't support select after eq on updates)
            update_response = supabase.table("credit_balance").update({
                "balance_dollars": new_balance,
                "total_purchased": new_total_purchased,
                "last_updated": now,
                "metadata": updated_metadata,
            }).eq("user_id", user_id).execute()
            
            # Check for Supabase errors
            if hasattr(update_response, 'error') and update_response.error:
                error_msg = str(update_response.error)
                logger.error(f"Supabase error updating balance: {error_msg}")
                raise Exception(f"Database error updating balance: {error_msg}")
            
            # Fetch the updated record
            fetch_response = supabase.table("credit_balance").select("*").eq("user_id", user_id).single().execute()
            
            if hasattr(fetch_response, 'error') and fetch_response.error:
                error_msg = str(fetch_response.error)
                logger.error(f"Supabase error fetching updated balance: {error_msg}")
                raise Exception(f"Database error fetching updated balance: {error_msg}")
            
            if not fetch_response.data:
                raise Exception("Update succeeded but failed to fetch updated data")
            
            update_response = fetch_response
            
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
            except Exception:
                pass
            
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
            
            # Insert the balance (without select, as Supabase Python client doesn't support select after insert)
            insert_response = supabase.table("credit_balance").insert(insert_data).execute()
            
            # Check for Supabase errors
            if hasattr(insert_response, 'error') and insert_response.error:
                error_msg = str(insert_response.error)
                logger.error(f"Supabase error inserting balance: {error_msg}")
                raise Exception(f"Database error inserting balance: {error_msg}")
            
            # Fetch the created balance record
            fetch_response = supabase.table("credit_balance").select("*").eq("user_id", user_id).single().execute()
            
            if hasattr(fetch_response, 'error') and fetch_response.error:
                error_msg = str(fetch_response.error)
                logger.error(f"Supabase error fetching inserted balance: {error_msg}")
                raise Exception(f"Database error fetching inserted balance: {error_msg}")
            
            if not fetch_response.data:
                raise Exception("Insert succeeded but failed to fetch inserted data")
            
            insert_response = fetch_response
            
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
            except Exception:
                pass
            
            return transform_credit_balance(insert_response.data, user_email=user_email, user_name=user_name)
    except Exception as e:
        logger.error(f"Error assigning credits: {e}")
        raise


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

