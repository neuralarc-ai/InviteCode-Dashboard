"""
Email service for sending emails.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.email import (
    send_email,
    create_downtime_html_template,
    create_uptime_html_template,
    create_credits_html_template,
    create_email_attachments,
    get_image_base64,
    EMAIL_IMAGES,
)
from app.core.database import get_supabase_admin
from app.models.schemas import EmailContent
import logging

logger = logging.getLogger(__name__)


async def send_bulk_email(
    custom_email: Optional[EmailContent] = None,
    selected_user_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Send bulk email to users."""
    try:
        supabase = get_supabase_admin()
        
        # Fetch users from user_profiles
        query = supabase.table("user_profiles").select("user_id, full_name").not_.is_("user_id", "null")
        
        if selected_user_ids:
            query = query.in_("user_id", selected_user_ids)
        
        profiles_response = query.execute()
        
        if not profiles_response.data:
            raise ValueError("No users found to send emails to")
        
        # Get user IDs and fetch emails
        user_ids = [profile["user_id"] for profile in profiles_response.data]
        auth_users_response = supabase.auth.admin.list_users()
        user_id_to_email = {user.id: user.email for user in auth_users_response.users if user.email and user.id in user_ids}
        
        # Prepare email content
        if custom_email:
            subject = custom_email.subject
            html_content = custom_email.html_content
            text_content = custom_email.text_content
        else:
            subject = "Scheduled Downtime: Helium will be unavailable for 1 hour"
            text_content = """Scheduled Downtime: Helium will be unavailable for 1 hour

Greetings from Helium,

We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.

During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.

We appreciate your patience and understanding as we work to make Helium even better for you.

Thanks,
The Helium Team"""
            html_content = create_downtime_html_template(use_cid=True, text_content=text_content)
        
        # Get attachments based on content
        attachments = []
        if html_content and "cid:email-logo" in html_content:
            attachments.extend(create_email_attachments(["logo"]))
        if html_content and "cid:downtime-body" in html_content:
            attachments.extend(create_email_attachments(["downtime_body"]))
        if html_content and "cid:uptime-body" in html_content:
            attachments.extend(create_email_attachments(["uptime_body"]))
        if html_content and "cid:credits-body" in html_content:
            attachments.extend(create_email_attachments(["credits_body"]))
        
        # Send emails
        success_count = 0
        error_count = 0
        errors = []
        
        for profile in profiles_response.data:
            user_id = profile["user_id"]
            email = user_id_to_email.get(user_id)
            
            if not email:
                error_count += 1
                errors.append(f"User {user_id}: No email found")
                continue
            
            try:
                success = await send_email(
                    to_email=email,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content,
                    attachments=attachments if attachments else None,
                )
                
                if success:
                    success_count += 1
                else:
                    error_count += 1
                    errors.append(f"{email}: Failed to send")
            except Exception as e:
                error_count += 1
                errors.append(f"{email}: {str(e)}")
                logger.error(f"Error sending email to {email}: {e}")
        
        return {
            "total": len(profiles_response.data),
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors if errors else None,
        }
    except Exception as e:
        logger.error(f"Error sending bulk email: {e}")
        raise


async def send_individual_email(
    individual_email: str,
    subject: str,
    text_content: str,
    html_content: str,
) -> bool:
    """Send individual email."""
    try:
        # Get attachments based on content
        attachments = []
        if "cid:email-logo" in html_content:
            attachments.extend(create_email_attachments(["logo"]))
        if "cid:downtime-body" in html_content:
            attachments.extend(create_email_attachments(["downtime_body"]))
        if "cid:uptime-body" in html_content:
            attachments.extend(create_email_attachments(["uptime_body"]))
        if "cid:credits-body" in html_content:
            attachments.extend(create_email_attachments(["credits_body"]))
        
        return await send_email(
            to_email=individual_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            attachments=attachments if attachments else None,
        )
    except Exception as e:
        logger.error(f"Error sending individual email: {e}")
        raise


async def send_credits_email(user_id: str, credits_amount: float) -> bool:
    """Send credits added email to user."""
    try:
        supabase = get_supabase_admin()
        
        # Get user email
        auth_user_response = supabase.auth.admin.get_user_by_id(user_id)
        if not auth_user_response.user or not auth_user_response.user.email:
            raise ValueError(f"User {user_id} not found or has no email")
        
        email = auth_user_response.user.email
        
        # Default credits email content
        subject = "Credits Added to Your Account"
        text_content = """Credits Added to Your Account

Greetings from Helium,

We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.

You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.

Thank you for being a valued member of the Helium community.

Thanks,
The Helium Team"""
        
        # Get images for template
        logo_base64 = get_image_base64("email-logo.png")
        credits_body_base64 = get_image_base64("1Kcredits.png")
        
        html_content = create_credits_html_template(
            logo_base64=logo_base64,
            credits_body_base64=credits_body_base64,
            use_cid=True,
        )
        
        # Get attachments
        attachments = create_email_attachments(["logo", "credits_body"])
        
        # Send email
        success = await send_email(
            to_email=email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            attachments=attachments,
        )
        
        if success:
            # Mark user as credits email sent
            now = datetime.now().isoformat()
            profile_response = supabase.table("user_profiles").select("user_id, metadata").eq("user_id", user_id).maybe_single().execute()
            
            if profile_response.data:
                updated_metadata = profile_response.data.get("metadata", {})
                updated_metadata["credits_email_sent_at"] = now
                updated_metadata["credits_assigned"] = True
                
                supabase.table("user_profiles").update({
                    "metadata": updated_metadata,
                    "updated_at": now,
                }).eq("user_id", user_id).execute()
        
        return success
    except Exception as e:
        logger.error(f"Error sending credits email: {e}")
        raise

