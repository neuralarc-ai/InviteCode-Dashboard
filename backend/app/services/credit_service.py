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
    """Get credit balances, optionally filtered by user_id. Matches web version sorting and data format."""
    try:
        supabase = get_supabase_admin()
        query = supabase.table("credit_balance").select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Get user IDs to fetch emails and names
        user_ids = [row["user_id"] for row in response.data]
        
        # Fetch most recent purchase dates for each user (for sorting like web version)
        from datetime import datetime
        userIdToLatestPurchase: Dict[str, datetime] = {}
        
        try:
            purchases_response = supabase.table("credit_purchases").select("user_id, completed_at, created_at").eq("status", "completed").in_("user_id", user_ids).order("completed_at", desc=True).execute()
            
            if purchases_response.data:
                for purchase in purchases_response.data:
                    purchase_user_id = purchase["user_id"]
                    purchase_date_str = purchase.get("completed_at") or purchase.get("created_at")
                    
                    if purchase_date_str:
                        try:
                            purchase_date = datetime.fromisoformat(purchase_date_str.replace("Z", "+00:00") if purchase_date_str.endswith("Z") else purchase_date_str)
                            existing_date = userIdToLatestPurchase.get(purchase_user_id)
                            
                            # Keep the most recent purchase date
                            if not existing_date or purchase_date > existing_date:
                                userIdToLatestPurchase[purchase_user_id] = purchase_date
                        except Exception as date_error:
                            logger.warning(f"Failed to parse purchase date: {date_error}")
        except Exception as purchase_error:
            logger.warning(f"Failed to fetch purchase dates: {purchase_error}")
        
        # Sort balances by most recent purchase date (then by last_updated as fallback) - matching web version
        def sort_key(row: dict) -> tuple:
            uid = row["user_id"]
            purchase_date = userIdToLatestPurchase.get(uid)
            
            # Parse last_updated
            last_updated_str = row.get("last_updated")
            last_updated_ts = 0
            if last_updated_str:
                try:
                    last_updated_dt = datetime.fromisoformat(last_updated_str.replace("Z", "+00:00") if last_updated_str.endswith("Z") else last_updated_str)
                    last_updated_ts = last_updated_dt.timestamp()
                except Exception:
                    pass
            
            # Return tuple for sorting: (has_purchase_date, -purchase_timestamp, -last_updated_timestamp)
            # Users with purchase dates come first, sorted by most recent purchase
            # Then users without purchase dates, sorted by most recent last_updated
            if purchase_date:
                return (0, -purchase_date.timestamp(), -last_updated_ts)
            else:
                return (1, 0, -last_updated_ts)
        
        sorted_data = sorted(response.data, key=sort_key)
        
        user_id_to_email: Dict[str, str] = {}
        user_id_to_name: Dict[str, str] = {}
        
        # Step 1: Fetch user emails from auth.users
        try:
            auth_response = supabase.auth.admin.list_users()
            users_list = auth_response.users if hasattr(auth_response, 'users') else (auth_response if isinstance(auth_response, list) else [])
            
            for user in users_list:
                # Handle both user objects and dictionaries
                uid = user.id if hasattr(user, 'id') else user.get('id')
                if uid and uid in user_ids:
                    # Get email
                    email = user.email if hasattr(user, 'email') else user.get('email')
                    if email:
                        user_id_to_email[uid] = email
                    
                    # Try to get name from user_metadata (fallback, will be overridden by user_profiles)
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        auth_name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("display_name") or
                            (f"{user_metadata.get('first_name', '')} {user_metadata.get('last_name', '')}".strip() if (user_metadata.get('first_name') or user_metadata.get('last_name')) else None) or
                            user_metadata.get("first_name") or
                            user_metadata.get("last_name")
                        )
                        if auth_name:
                            user_id_to_name[uid] = auth_name
        except Exception as auth_error:
            logger.warning(f"Failed to fetch user emails from auth: {auth_error}")
        
        # Step 2: Fetch user names from user_profiles table (highest priority)
        try:
            profiles_response = supabase.table("user_profiles").select("user_id, full_name, preferred_name").in_("user_id", user_ids).execute()
            if profiles_response.data:
                for profile in profiles_response.data:
                    uid = profile["user_id"]
                    name = profile.get("preferred_name") or profile.get("full_name")
                    if name:
                        user_id_to_name[uid] = name
        except Exception as profile_error:
            logger.warning(f"Failed to fetch user profiles: {profile_error}")
        
        # Step 3: Fallback to waitlist table for names (if email matches) - matching web version
        if len(user_id_to_name) < len(user_ids) and user_id_to_email:
            try:
                emails = list(user_id_to_email.values())
                waitlist_response = supabase.table("waitlist").select("email, full_name").in_("email", emails).execute()
                
                if waitlist_response.data:
                    email_to_name = {item["email"]: item["full_name"] for item in waitlist_response.data if item.get("full_name")}
                    
                    # Map names back to user IDs
                    for uid, email in user_id_to_email.items():
                        name = email_to_name.get(email)
                        if name and uid not in user_id_to_name:
                            user_id_to_name[uid] = name
            except Exception as waitlist_error:
                logger.warning(f"Failed to fetch waitlist names: {waitlist_error}")
        
        # Transform balances with user data (matching web version format)
        balances = []
        for row in sorted_data:
            uid = row["user_id"]
            email = user_id_to_email.get(uid) or None
            name = user_id_to_name.get(uid)
            
            # If no name found, try to extract from email (matching web version)
            if not name and email:
                email_name = email.split('@')[0]
                # If email name looks reasonable (not too short, starts with letter)
                if len(email_name) > 2 and email_name[0].isalpha():
                    name = email_name[0].upper() + email_name[1:].replace('.', ' ').replace('_', ' ').replace('-', ' ')
            
            # Final fallback
            if not name:
                name = f"User {uid[:8]}"
            
            balance = transform_credit_balance(
                row,
                user_email=email,
                user_name=name,
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
            
            # Fetch user email and name for response
            user_email = None
            user_name = None
            try:
                # Try to get email from auth
                auth_user = supabase.auth.admin.get_user_by_id(user_id)
                if hasattr(auth_user, 'user') and auth_user.user:
                    user = auth_user.user
                    user_email = user.email if hasattr(user, 'email') else user.get('email')
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        user_name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("preferred_name") or
                            user_metadata.get("display_name")
                        )
                
                # Try to get name from user_profiles
                if not user_name:
                    profile_response = supabase.table("user_profiles").select("full_name, preferred_name").eq("user_id", user_id).maybe_single().execute()
                    if profile_response.data:
                        user_name = profile_response.data.get("preferred_name") or profile_response.data.get("full_name")
            except Exception as user_error:
                logger.warning(f"Failed to fetch user info: {user_error}")
            
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
            
            # Fetch user email and name for response
            user_email = None
            user_name = None
            try:
                # Try to get email from auth
                auth_user = supabase.auth.admin.get_user_by_id(user_id)
                if hasattr(auth_user, 'user') and auth_user.user:
                    user = auth_user.user
                    user_email = user.email if hasattr(user, 'email') else user.get('email')
                    user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
                    if user_metadata:
                        user_name = (
                            user_metadata.get("full_name") or
                            user_metadata.get("name") or
                            user_metadata.get("preferred_name") or
                            user_metadata.get("display_name")
                        )
                
                # Try to get name from user_profiles
                if not user_name:
                    profile_response = supabase.table("user_profiles").select("full_name, preferred_name").eq("user_id", user_id).maybe_single().execute()
                    if profile_response.data:
                        user_name = profile_response.data.get("preferred_name") or profile_response.data.get("full_name")
            except Exception as user_error:
                logger.warning(f"Failed to fetch user info: {user_error}")
            
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

