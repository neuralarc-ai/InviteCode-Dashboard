"""
Supabase database client initialization and management.
"""
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Global Supabase clients
_supabase_admin: Optional[Client] = None
_supabase_anon: Optional[Client] = None


def get_supabase_admin() -> Client:
    """
    Get or create Supabase admin client with service role key.
    This client has full database access and bypasses RLS.
    """
    global _supabase_admin
    
    if _supabase_admin is None:
        try:
            _supabase_admin = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
            logger.info("Supabase admin client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase admin client: {e}")
            raise
    
    return _supabase_admin


def get_supabase_anon() -> Client:
    """
    Get or create Supabase anonymous client.
    This client respects RLS policies.
    """
    global _supabase_anon
    
    if _supabase_anon is None:
        try:
            _supabase_anon = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            logger.info("Supabase anonymous client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase anonymous client: {e}")
            raise
    
    return _supabase_anon


# Note: We don't initialize clients at module level to avoid errors during import
# Always use get_supabase_admin() or get_supabase_anon() functions instead

