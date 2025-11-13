"""
Invite code service for business logic.
"""
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_supabase_admin
from app.models.schemas import InviteCodeResponse
import logging

logger = logging.getLogger(__name__)


def transform_invite_code(row: dict) -> InviteCodeResponse:
    """Transform database row to InviteCodeResponse."""
    return InviteCodeResponse(
        id=row["id"],
        code=row["code"],
        is_used=row["is_used"],
        used_by=row.get("used_by"),
        used_at=datetime.fromisoformat(row["used_at"]) if row.get("used_at") else None,
        created_at=datetime.fromisoformat(row["created_at"]),
        expires_at=datetime.fromisoformat(row["expires_at"]) if row.get("expires_at") else None,
        max_uses=row["max_uses"],
        current_uses=row["current_uses"],
        email_sent_to=row.get("email_sent_to", []),
        reminder_sent_at=datetime.fromisoformat(row["reminder_sent_at"]) if row.get("reminder_sent_at") else None,
        is_archived=row.get("is_archived", False),
    )


async def get_invite_codes() -> List[InviteCodeResponse]:
    """Get all invite codes."""
    try:
        supabase = get_supabase_admin()
        response = supabase.table("invite_codes").select("*").order("created_at", desc=True).execute()
        
        if response.data:
            return [transform_invite_code(row) for row in response.data]
        return []
    except Exception as e:
        logger.error(f"Error fetching invite codes: {e}")
        raise


async def generate_invite_codes(count: int, max_uses: int = 1, expires_in_days: int = 30) -> List[str]:
    """Generate invite codes and save to database."""
    try:
        codes: List[str] = []
        code_data: List[dict] = []
        
        import random
        import string
        
        for _ in range(count):
            # Generate code: NA + 5 random uppercase letters/numbers
            code = f"NA{''.join(random.choices(string.ascii_uppercase + string.digits, k=5))}"
            codes.append(code)
            
            expires_at = (datetime.now() + timedelta(days=expires_in_days)).isoformat()
            code_data.append({
                "code": code,
                "is_used": False,
                "max_uses": max_uses,
                "current_uses": 0,
                "expires_at": expires_at,
                "email_sent_to": [],
            })
        
        supabase = get_supabase_admin()
        supabase.table("invite_codes").insert(code_data).execute()
        
        logger.info(f"Generated {len(codes)} invite codes")
        return codes
    except Exception as e:
        logger.error(f"Error generating invite codes: {e}")
        raise


async def delete_invite_code(code_id: str) -> None:
    """Delete invite code by ID."""
    try:
        supabase = get_supabase_admin()
        supabase.table("invite_codes").delete().eq("id", code_id).execute()
        logger.info(f"Deleted invite code: {code_id}")
    except Exception as e:
        logger.error(f"Error deleting invite code: {e}")
        raise


async def bulk_delete_invite_codes(code_ids: List[str]) -> int:
    """Bulk delete invite codes."""
    try:
        supabase = get_supabase_admin()
        for code_id in code_ids:
            supabase.table("invite_codes").delete().eq("id", code_id).execute()
        logger.info(f"Bulk deleted {len(code_ids)} invite codes")
        return len(code_ids)
    except Exception as e:
        logger.error(f"Error bulk deleting invite codes: {e}")
        raise


async def archive_invite_code(code_id: str) -> None:
    """Archive invite code."""
    try:
        supabase = get_supabase_admin()
        supabase.table("invite_codes").update({"is_archived": True}).eq("id", code_id).execute()
        logger.info(f"Archived invite code: {code_id}")
    except Exception as e:
        logger.error(f"Error archiving invite code: {e}")
        raise


async def unarchive_invite_code(code_id: str) -> None:
    """Unarchive invite code."""
    try:
        supabase = get_supabase_admin()
        supabase.table("invite_codes").update({"is_archived": False}).eq("id", code_id).execute()
        logger.info(f"Unarchived invite code: {code_id}")
    except Exception as e:
        logger.error(f"Error unarchiving invite code: {e}")
        raise


async def bulk_archive_used_codes() -> int:
    """Bulk archive used invite codes."""
    try:
        supabase = get_supabase_admin()
        response = supabase.table("invite_codes").update({"is_archived": True}).eq("is_used", True).eq("is_archived", False).execute()
        count = len(response.data) if response.data else 0
        logger.info(f"Bulk archived {count} used invite codes")
        return count
    except Exception as e:
        logger.error(f"Error bulk archiving used codes: {e}")
        raise

