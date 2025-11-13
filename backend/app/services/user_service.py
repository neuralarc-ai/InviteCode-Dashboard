"""
User service for business logic.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.database import get_supabase_admin
from app.models.schemas import UserProfileResponse
import logging

logger = logging.getLogger(__name__)


def transform_user_profile(row: dict, email: Optional[str] = None) -> UserProfileResponse:
    """Transform database row to UserProfileResponse."""
    return UserProfileResponse(
        id=row["id"],
        user_id=row["user_id"],
        full_name=row["full_name"],
        preferred_name=row["preferred_name"],
        work_description=row["work_description"],
        personal_references=row.get("personal_references"),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
        avatar_url=row.get("avatar_url"),
        referral_source=row.get("referral_source"),
        consent_given=row.get("consent_given"),
        consent_date=datetime.fromisoformat(row["consent_date"]) if row.get("consent_date") else None,
        email=email or "Email not available",
        metadata=row.get("metadata"),
        plan_type=row.get("plan_type", "seed"),
        account_type=row.get("account_type", "individual"),
    )


async def get_user_profiles() -> List[UserProfileResponse]:
    """Get all user profiles."""
    try:
        supabase = get_supabase_admin()
        
        # Get user profiles
        profiles_response = supabase.table("user_profiles").select("*").order("created_at", desc=True).execute()
        
        if not profiles_response.data:
            return []
        
        # Get user IDs
        user_ids = [profile["user_id"] for profile in profiles_response.data]
        
        # Get emails from auth.users
        auth_users_response = supabase.auth.admin.list_users()
        user_id_to_email = {user.id: user.email for user in auth_users_response.users if user.email}
        
        # Transform profiles with emails
        profiles = []
        for profile in profiles_response.data:
            email = user_id_to_email.get(profile["user_id"])
            profiles.append(transform_user_profile(profile, email))
        
        return profiles
    except Exception as e:
        logger.error(f"Error fetching user profiles: {e}")
        raise


async def create_user(
    email: str,
    password: str,
    full_name: str,
    preferred_name: Optional[str] = None,
    work_description: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> UserProfileResponse:
    """Create new user and profile."""
    try:
        supabase = get_supabase_admin()
        
        # Create auth user
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        
        if not auth_response.user:
            raise Exception("Failed to create auth user")
        
        user_id = auth_response.user.id
        
        # Create user profile
        profile_data = {
            "user_id": user_id,
            "full_name": full_name,
            "preferred_name": preferred_name or full_name.split()[0] if full_name else "",
            "work_description": work_description or "",
            "metadata": metadata or {},
            "plan_type": "seed",
            "account_type": "individual",
        }
        
        profile_response = supabase.table("user_profiles").insert(profile_data).select().single().execute()
        
        return transform_user_profile(profile_response.data, email)
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise


async def delete_user(user_id: str) -> None:
    """Delete user and profile."""
    try:
        supabase = get_supabase_admin()
        
        # Delete user profile first (if cascade delete is not set up)
        supabase.table("user_profiles").delete().eq("user_id", user_id).execute()
        
        # Delete auth user
        supabase.auth.admin.delete_user(user_id)
        
        logger.info(f"Deleted user: {user_id}")
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise


async def bulk_delete_users(user_ids: List[str]) -> int:
    """Bulk delete users."""
    try:
        supabase = get_supabase_admin()
        
        # Delete profiles
        for user_id in user_ids:
            supabase.table("user_profiles").delete().eq("user_id", user_id).execute()
            supabase.auth.admin.delete_user(user_id)
        
        logger.info(f"Bulk deleted {len(user_ids)} users")
        return len(user_ids)
    except Exception as e:
        logger.error(f"Error bulk deleting users: {e}")
        raise


async def get_user_emails(user_ids: List[str]) -> List[Dict[str, str]]:
    """Get user emails by user IDs."""
    try:
        supabase = get_supabase_admin()
        auth_users_response = supabase.auth.admin.list_users()
        
        result = []
        for user in auth_users_response.users:
            if user.id in user_ids and user.email:
                result.append({
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.user_metadata.get("full_name", "") if user.user_metadata else "",
                })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching user emails: {e}")
        raise

