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
        plan_type=row.get("plan_type") or "seed",
        account_type=row.get("account_type") or "individual",
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
        
        # Get emails from auth.users with pagination (like web app)
        all_auth_users = []
        page = 1
        per_page = 1000  # Supabase default is 1000
        
        while True:
            logger.info(f"Fetching auth users page {page}...")
            try:
                auth_users_response = supabase.auth.admin.list_users(page=page, per_page=per_page)
            except Exception as e:
                logger.error(f"Error fetching auth users page {page}: {e}")
                # Fallback: try without pagination parameters
                if page == 1:
                    auth_users_response = supabase.auth.admin.list_users()
                else:
                    break
            
            # Handle both response object with .users attribute and direct list
            users_list = auth_users_response.users if hasattr(auth_users_response, 'users') else auth_users_response
            
            if not users_list or len(users_list) == 0:
                logger.info(f"No more users found on page {page}")
                break
            
            all_auth_users.extend(users_list)
            logger.info(f"Fetched {len(users_list)} users on page {page}, total so far: {len(all_auth_users)}")
            
            # If we got fewer users than per_page, we've reached the end
            if len(users_list) < per_page:
                logger.info("Reached end of users list")
                break
            
            page += 1
        
        logger.info(f"Total auth users found: {len(all_auth_users)}")
        
        # Handle both user objects and dictionaries
        user_id_to_email = {}
        for user in all_auth_users:
            user_id = user.id if hasattr(user, 'id') else user.get('id')
            user_email = user.email if hasattr(user, 'email') else user.get('email')
            if user_id and user_email:
                user_id_to_email[user_id] = user_email
        
        logger.info(f"Mapped {len(user_id_to_email)} emails from {len(all_auth_users)} auth users")
        
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
        
        # Validate email format
        if not email or not email.strip():
            raise ValueError("Email is required")
        
        email_clean = email.strip().lower()
        
        # Validate password
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        
        # Create auth user
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email_clean,
                "password": password,
                "email_confirm": True,
            })
        except Exception as auth_error:
            error_msg = str(auth_error)
            logger.error(f"Supabase auth error: {error_msg}")
            # Handle duplicate email error
            if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                raise ValueError("A user with this email address already exists")
            raise Exception(f"Failed to create auth user: {error_msg}")
        
        # Check for errors in the response (Supabase Python client may return error objects)
        if hasattr(auth_response, 'error') and auth_response.error:
            error_msg = str(auth_response.error)
            logger.error(f"Error in auth response: {error_msg}")
            # Handle duplicate email error
            if 'already registered' in error_msg.lower() or 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                raise ValueError("A user with this email address already exists")
            raise Exception(f"Failed to create auth user: {error_msg}")
        
        # Check if user was created successfully
        # Supabase Python client returns different structures, handle both
        user = None
        if hasattr(auth_response, 'user'):
            user = auth_response.user
        elif hasattr(auth_response, 'data') and hasattr(auth_response.data, 'user'):
            user = auth_response.data.user
        elif isinstance(auth_response, dict) and 'user' in auth_response:
            user = auth_response['user']
        
        if not user:
            logger.error("Auth user creation failed: No user data returned")
            logger.error(f"Auth response structure: {type(auth_response)}, attributes: {dir(auth_response) if hasattr(auth_response, '__dict__') else 'N/A'}")
            raise Exception("Failed to create auth user: No user data returned")
        
        # Extract user ID
        if hasattr(user, 'id'):
            user_id = user.id
        elif isinstance(user, dict) and 'id' in user:
            user_id = user['id']
        else:
            logger.error(f"Could not extract user ID from user object: {type(user)}")
            raise Exception("Failed to extract user ID from auth response")
        
        logger.info(f"Auth user created successfully: {user_id}")
        
        # Create user profile
        profile_data = {
            "user_id": user_id,
            "full_name": full_name.strip() if full_name else "",
            "preferred_name": (preferred_name or full_name or "").strip() or (full_name.split()[0] if full_name and full_name.split() else ""),
            "work_description": (work_description or "").strip(),
            "metadata": metadata or {},
            "plan_type": "seed",
            "account_type": "individual",
        }
        
        profile_response = supabase.table("user_profiles").insert(profile_data).select().single().execute()
        
        if not profile_response.data:
            logger.error("Failed to create user profile: No data returned")
            raise Exception("Failed to create user profile")
        
        return transform_user_profile(profile_response.data, email_clean)
    except ValueError as e:
        # Re-raise ValueError (e.g., duplicate email) as-is
        logger.error(f"Validation error creating user: {e}")
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}", exc_info=True)
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
        # Handle both response object with .users attribute and direct list
        users_list = auth_users_response.users if hasattr(auth_users_response, 'users') else auth_users_response
        
        result = []
        for user in users_list:
            # Handle both user objects and dictionaries
            user_id = user.id if hasattr(user, 'id') else user.get('id')
            user_email = user.email if hasattr(user, 'email') else user.get('email')
            user_metadata = user.user_metadata if hasattr(user, 'user_metadata') else user.get('user_metadata', {})
            
            if user_id and user_id in user_ids and user_email:
                full_name = user_metadata.get("full_name", "") if user_metadata else ""
                result.append({
                    "id": user_id,
                    "email": user_email,
                    "full_name": full_name,
                })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching user emails: {e}")
        raise

