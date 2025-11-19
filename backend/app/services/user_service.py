"""
User service for business logic.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import HTTPException, status
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
    personal_references: Optional[str] = None,
    avatar_url: Optional[str] = None,
    referral_source: Optional[str] = None,
    consent_given: Optional[bool] = None,
    consent_date: Optional[str] = None,
    plan_type: Optional[str] = None,
    account_type: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> UserProfileResponse:
    """Create new user and profile."""
    try:
        supabase = get_supabase_admin()
        
        # Create auth user with user metadata
        try:
            auth_response = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": full_name,
                    "preferred_name": preferred_name or full_name,
                },
            })
        except Exception as auth_exception:
            # Supabase Python client may raise exceptions directly
            error_str = str(auth_exception).lower()
            logger.error(f"Exception creating auth user: {auth_exception}")
            
            # Check for duplicate email error patterns
            if any(keyword in error_str for keyword in ['already', 'duplicate', 'exists']) and \
               any(keyword in error_str for keyword in ['registered', 'exists', 'email', 'user']):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email address already exists"
                )
            raise Exception(f"Failed to create auth user: {str(auth_exception)}")
        
        # Debug logging
        logger.info(f"Auth response type: {type(auth_response)}")
        logger.info(f"Auth response has error attr: {hasattr(auth_response, 'error')}")
        if hasattr(auth_response, 'error'):
            logger.info(f"Auth response error: {auth_response.error}")
        logger.info(f"Auth response user: {auth_response.user if hasattr(auth_response, 'user') else 'N/A'}")
        
        # Check for errors in multiple possible formats
        error_message = None
        
        # Check if response has error attribute
        if hasattr(auth_response, 'error') and auth_response.error:
            if hasattr(auth_response.error, 'message'):
                error_message = str(auth_response.error.message)
            else:
                error_message = str(auth_response.error)
        
        # Also check if user is None (indicates failure)
        if not hasattr(auth_response, 'user') or not auth_response.user:
            if not error_message:
                # Try to get error from response data
                if hasattr(auth_response, 'data') and auth_response.data:
                    error_message = str(auth_response.data)
                else:
                    error_message = "No user data returned"
            
            # Check for duplicate email error
            error_lower = error_message.lower()
            if 'already' in error_lower and ('registered' in error_lower or 'exists' in error_lower):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user with this email address already exists"
                )
            
            raise Exception(f"Failed to create auth user: {error_message}")
        
        # If we got here but have an error message, log it but continue if user exists
        if error_message:
            logger.warning(f"Auth response has error but user was created: {error_message}")
        
        user_id = auth_response.user.id
        
        # Parse consent_date if provided (ISO date string)
        parsed_consent_date = None
        if consent_date:
            try:
                parsed_consent_date = datetime.fromisoformat(consent_date.replace('Z', '+00:00'))
            except Exception as e:
                logger.warning(f"Failed to parse consent_date: {e}")
        
        # Create user profile with all provided fields
        profile_data = {
            "user_id": user_id,
            "full_name": full_name,
            "preferred_name": preferred_name or full_name.split()[0] if full_name else "",
            "work_description": work_description or "",
            "personal_references": personal_references,
            "avatar_url": avatar_url,
            "referral_source": referral_source,
            "consent_given": consent_given,
            "consent_date": parsed_consent_date.isoformat() if parsed_consent_date else None,
            "plan_type": plan_type or "seed",
            "account_type": account_type or "individual",
            "metadata": metadata or {},
        }
        
        try:
            # Insert the profile (without select, as Supabase Python client doesn't support select after insert)
            insert_response = supabase.table("user_profiles").insert(profile_data).execute()
            
            # Check for Supabase errors
            if hasattr(insert_response, 'error') and insert_response.error:
                error_msg = str(insert_response.error)
                logger.error(f"Supabase error inserting profile: {error_msg}")
                raise Exception(f"Database error inserting profile: {error_msg}")
            
            # Fetch the created profile record
            profile_response = supabase.table("user_profiles").select("*").eq("user_id", user_id).single().execute()
        except Exception as profile_error:
            logger.error(f"Error creating user profile: {profile_error}")
            # Try to clean up the auth user if profile creation fails
            try:
                supabase.auth.admin.delete_user(user_id)
                logger.info(f"Cleaned up auth user {user_id} after profile creation failure")
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up auth user {user_id}: {cleanup_error}")
            
            error_str = str(profile_error).lower()
            if 'duplicate' in error_str or 'unique' in error_str or 'constraint' in error_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A user profile with this information already exists"
                )
            raise Exception(f"Failed to create user profile: {str(profile_error)}")
        
        # Check for Supabase errors in response
        if hasattr(profile_response, 'error') and profile_response.error:
            error_msg = str(profile_response.error)
            logger.error(f"Supabase error creating profile: {error_msg}")
            # Try to clean up the auth user
            try:
                supabase.auth.admin.delete_user(user_id)
                logger.info(f"Cleaned up auth user {user_id} after profile creation error")
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up auth user {user_id}: {cleanup_error}")
            raise Exception(f"Database error creating profile: {error_msg}")
        
        if not profile_response.data:
            # Try to clean up the auth user
            try:
                supabase.auth.admin.delete_user(user_id)
                logger.info(f"Cleaned up auth user {user_id} after profile creation returned no data")
            except Exception as cleanup_error:
                logger.error(f"Failed to clean up auth user {user_id}: {cleanup_error}")
            raise Exception("Profile creation succeeded but no data returned")
        
        return transform_user_profile(profile_response.data, email)
    except HTTPException:
        # Re-raise HTTPExceptions (like 409 for duplicate email) as-is
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        # Check if error message indicates duplicate email
        error_str = str(e).lower()
        # More comprehensive check for duplicate email patterns
        if any(keyword in error_str for keyword in ['already', 'duplicate', 'exists']) and \
           any(keyword in error_str for keyword in ['registered', 'exists', 'email', 'user']):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) if str(e) else "Failed to create user",
        )


async def delete_user(user_id: str) -> None:
    """Delete user and profile."""
    try:
        supabase = get_supabase_admin()
        
        # Validate user_id
        if not user_id or not isinstance(user_id, str):
            raise ValueError("user_id must be a non-empty string")
        
        # Delete user profile first (if cascade delete is not set up)
        try:
            profile_delete_response = supabase.table("user_profiles").delete().eq("user_id", user_id).execute()
            
            # Check for Supabase errors (only fail on actual errors, not if user doesn't exist)
            if hasattr(profile_delete_response, 'error') and profile_delete_response.error:
                error_msg = str(profile_delete_response.error)
                # Don't fail if user doesn't exist - that's okay
                if 'not found' not in error_msg.lower() and 'does not exist' not in error_msg.lower():
                    logger.error(f"Supabase error deleting profile: {error_msg}")
                    raise Exception(f"Database error deleting profile: {error_msg}")
                else:
                    logger.info(f"User profile not found for {user_id}, continuing with auth user deletion")
        except Exception as profile_error:
            error_str = str(profile_error).lower()
            # Don't fail if user doesn't exist
            if 'not found' not in error_str and 'does not exist' not in error_str:
                logger.warning(f"Error deleting user profile for user {user_id}: {profile_error}")
            # Continue to try deleting auth user even if profile delete fails
        
        # Delete auth user
        # Supabase delete_user may return None on success or raise an exception
        try:
            auth_delete_response = supabase.auth.admin.delete_user(user_id)
            
            # If response is None, deletion likely succeeded
            if auth_delete_response is None:
                logger.info(f"Auth user {user_id} deleted successfully (no response)")
            # Check for errors in auth delete response (if it returns a response object)
            elif hasattr(auth_delete_response, 'error') and auth_delete_response.error:
                error_msg = str(auth_delete_response.error)
                # Don't fail if user doesn't exist - that's okay
                if any(phrase in error_msg.lower() for phrase in ['not found', 'does not exist', 'user not found', 'no user found']):
                    logger.info(f"Auth user not found for {user_id}, deletion considered successful")
                else:
                    logger.error(f"Supabase error deleting auth user: {error_msg}")
                    raise Exception(f"Auth error deleting user: {error_msg}")
            else:
                # No error attribute or error is None/False - consider success
                logger.info(f"Auth user {user_id} deleted successfully")
        except Exception as auth_error:
            error_str = str(auth_error).lower()
            # Don't fail if user doesn't exist - that's okay
            # Check for various "not found" patterns
            not_found_patterns = [
                'not found', 'does not exist', 'user not found', 
                'no user found', 'user_id not found', 'cannot find user'
            ]
            if any(pattern in error_str for pattern in not_found_patterns):
                logger.info(f"Auth user {user_id} not found, deletion considered successful")
            else:
                # For other errors (including generic "Database error"), verify by checking if user still exists
                # This handles cases where Supabase returns a generic error even when deletion succeeds
                try:
                    check_user = supabase.auth.admin.get_user_by_id(user_id)
                    # Check if user still exists
                    user_still_exists = False
                    if check_user:
                        if hasattr(check_user, 'user') and check_user.user:
                            user_still_exists = True
                        elif hasattr(check_user, 'data') and check_user.data:
                            user_still_exists = True
                        elif isinstance(check_user, dict) and check_user.get('user'):
                            user_still_exists = True
                    
                    if user_still_exists:
                        # User still exists, so deletion actually failed
                        logger.error(f"Error deleting auth user {user_id}: {auth_error}")
                        raise Exception(f"Failed to delete auth user: {str(auth_error)}")
                    else:
                        # User doesn't exist, deletion succeeded despite the error message
                        logger.info(f"Auth user {user_id} deleted successfully (verified - user no longer exists)")
                except Exception as check_error:
                    # If we can't verify, check the error message
                    check_error_str = str(check_error).lower()
                    if any(pattern in check_error_str for pattern in not_found_patterns):
                        # User doesn't exist, deletion succeeded
                        logger.info(f"Auth user {user_id} not found, deletion considered successful")
                    else:
                        # Can't verify, but assume success since user might have been deleted
                        # This prevents false error messages when deletion actually succeeds
                        logger.info(f"Could not verify deletion of auth user {user_id}, but assuming success (user may have been deleted): {auth_error}")
        
        logger.info(f"Deleted user: {user_id}")
    except Exception as e:
        logger.error(f"Error deleting user {user_id}: {e}", exc_info=True)
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

