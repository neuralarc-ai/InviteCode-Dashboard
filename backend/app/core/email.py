"""
Email utilities for sending emails with templates and attachments.
"""
import os
import aiosmtplib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from pathlib import Path
from typing import Optional, List, Dict
from app.core.config import settings
from app.core.email_parser import parse_email_text
import logging

logger = logging.getLogger(__name__)

# Email image configuration
EMAIL_IMAGES: Dict[str, Dict[str, str]] = {
    "logo": {
        "filename": "email-logo.png",
        "cid": "email-logo",
        "content_type": "image/png",
    },
    "downtime_body": {
        "filename": "downtime-body.png",
        "cid": "downtime-body",
        "content_type": "image/png",
    },
    "uptime_body": {
        "filename": "uptime-body.png",
        "cid": "uptime-body",
        "content_type": "image/png",
    },
    "credits_body": {
        "filename": "1Kcredits.png",
        "cid": "credits-body",
        "content_type": "image/png",
    },
}


def get_image_path(image_name: str) -> Optional[Path]:
    """
    Find image file in common locations.
    
    Args:
        image_name: Name of the image file (e.g., 'email-logo.png')
        
    Returns:
        Path to image file or None if not found
    """
    possible_paths = [
        Path(__file__).parent.parent.parent / "static" / "images" / image_name,
        Path(__file__).parent.parent.parent.parent / "public" / "images" / image_name,
        Path.cwd() / "static" / "images" / image_name,
        Path.cwd() / "public" / "images" / image_name,
    ]
    
    # Special handling for logo: check both email-logo.png and Email.png
    if image_name == "email-logo.png":
        possible_paths.extend([
            Path(__file__).parent.parent.parent / "static" / "images" / "Email.png",
            Path(__file__).parent.parent.parent.parent / "public" / "images" / "Email.png",
            Path.cwd() / "static" / "images" / "Email.png",
            Path.cwd() / "public" / "images" / "Email.png",
        ])
    
    for path in possible_paths:
        if path.exists():
            logger.info(f"Image found: {path}")
            return path
    
    logger.warning(f"Image not found: {image_name} (checked {len(possible_paths)} paths)")
    return None


def get_image_base64(image_name: str) -> Optional[str]:
    """
    Convert image to base64 data URI.
    
    Args:
        image_name: Name of the image file
        
    Returns:
        Base64 data URI string or None if image not found
    """
    import base64
    
    image_path = get_image_path(image_name)
    if not image_path:
        return None
    
    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
            base64_data = base64.b64encode(image_data).decode("utf-8")
            
            # Determine MIME type
            if image_name.endswith(".png"):
                mime_type = "image/png"
            elif image_name.endswith(".jpg") or image_name.endswith(".jpeg"):
                mime_type = "image/jpeg"
            else:
                mime_type = "image/png"
            
            return f"data:{mime_type};base64,{base64_data}"
    except Exception as e:
        logger.error(f"Failed to read image {image_name}: {e}")
        return None


def create_email_attachments(image_keys: List[str]) -> List[MIMEImage]:
    """
    Create email attachments from image keys.
    
    Args:
        image_keys: List of image keys (e.g., ['logo', 'downtime_body'])
        
    Returns:
        List of MIMEImage attachments
    """
    attachments = []
    
    for key in image_keys:
        if key not in EMAIL_IMAGES:
            logger.warning(f"Unknown image key: {key}")
            continue
        
        image_config = EMAIL_IMAGES[key]
        image_path = get_image_path(image_config["filename"])
        
        if image_path:
            try:
                with open(image_path, "rb") as f:
                    image_data = f.read()
                    attachment = MIMEImage(image_data)
                    attachment.add_header("Content-ID", f"<{image_config['cid']}>")
                    attachment.add_header("Content-Disposition", "inline", filename=image_config["filename"])
                    attachments.append(attachment)
            except Exception as e:
                logger.error(f"Failed to create attachment for {key}: {e}")
    
    return attachments


def create_downtime_html_template(
    logo_base64: Optional[str] = None,
    downtime_body_base64: Optional[str] = None,
    use_cid: bool = True,
    text_content: Optional[str] = None,
    default_greeting: str = "Greetings from Helium,",
    default_paragraphs: Optional[List[str]] = None,
    default_signoff: str = "Thanks,<br>The Helium Team",
) -> str:
    """Create downtime email HTML template."""
    if default_paragraphs is None:
        default_paragraphs = [
            "We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.",
            "During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.",
            "We appreciate your patience and understanding as we work to make Helium even better for you.",
        ]
    
    # Use CID references for SMTP (default), or base64 data URIs
    logo_img = (
        '<img src="cid:email-logo" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">'
        if use_cid
        else (f'<img src="{logo_base64}" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">' if logo_base64 else "")
    )
    
    downtime_body_img = (
        '<img src="cid:downtime-body" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="Downtime Notice">'
        if use_cid
        else (f'<img src="{downtime_body_base64}" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="Downtime Notice">' if downtime_body_base64 else "")
    )
    
    # Parse text content
    parsed = parse_email_text(text_content or "")
    greeting_text = parsed["greeting"] or default_greeting
    paragraphs = parsed["paragraphs"] if parsed["paragraphs"] else default_paragraphs
    signoff_text = parsed["signoff"] or default_signoff
    
    main_text = paragraphs[0] if paragraphs else ""
    secondary_text = paragraphs[1] if len(paragraphs) > 1 else ""
    closing_text = "<br>".join(paragraphs[2:]) if len(paragraphs) > 2 else ""
    
    spacing = '<tr><td style="font-size:0;height:2px" height="2">&nbsp;</td></tr>' if closing_text else ""
    
    # This is a simplified version - you can expand with the full HTML template from the TypeScript version
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
@media (max-width: 450px) {{
  .layout-0 {{ display: none !important; }}
}}
</style>
</head>
<body style="width:100%;background-color:#f0f1f5;margin:0;padding:0">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5">
<tr>
<td style="background-color:#f0f1f5">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff">
<tr>
<td style="padding:10px 0px 0px 0px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:10px 0 10px 0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="color:#000;font-family:Arial, Helvetica, sans-serif">
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:56px">
<tr>
<td style="width:100%;padding:20 0">
{logo_img}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
<tr>
<td style="width:100%;padding:0">
{downtime_body_img}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">{greeting_text.replace("Greetings from Helium,", 'Greetings from <span style="font-weight:700">Helium</span>,')}</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">{main_text}</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
{secondary_text}<br>
</td>
</tr>
{spacing}
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
{closing_text}<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
{signoff_text}<br>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>"""


def create_uptime_html_template(
    logo_base64: Optional[str] = None,
    uptime_body_base64: Optional[str] = None,
    use_cid: bool = True,
    text_content: Optional[str] = None,
    default_greeting: str = "Greetings from Helium,",
    default_paragraphs: Optional[List[str]] = None,
    default_signoff: str = "Thanks,<br>The Helium Team",
) -> str:
    """Create uptime email HTML template."""
    if default_paragraphs is None:
        default_paragraphs = [
            "We're pleased to inform you that Helium is now back online and fully operational after scheduled maintenance.",
            "All systems are running smoothly, and you can now access all features and services as usual. We appreciate your patience during the brief maintenance window.",
            "If you experience any issues, please don't hesitate to reach out to our support team.",
        ]
    
    logo_img = (
        '<img src="cid:email-logo" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">'
        if use_cid
        else (f'<img src="{logo_base64}" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">' if logo_base64 else "")
    )
    
    uptime_body_img = (
        '<img src="cid:uptime-body" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="System Back Online">'
        if use_cid
        else (f'<img src="{uptime_body_base64}" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="System Back Online">' if uptime_body_base64 else "")
    )
    
    parsed = parse_email_text(text_content or "")
    greeting_text = parsed["greeting"] or default_greeting
    paragraphs = parsed["paragraphs"] if parsed["paragraphs"] else default_paragraphs
    signoff_text = parsed["signoff"] or default_signoff
    
    main_text = paragraphs[0] if paragraphs else ""
    secondary_text = paragraphs[1] if len(paragraphs) > 1 else ""
    closing_text = paragraphs[2] if len(paragraphs) > 2 else ""
    
    # Similar structure to downtime template
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
@media (max-width: 450px) {{
  .layout-0 {{ display: none !important; }}
}}
</style>
</head>
<body style="width:100%;background-color:#f0f1f5;margin:0;padding:0">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5">
<tr>
<td style="background-color:#f0f1f5">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff">
<tr>
<td style="padding:10px 0px 0px 0px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:10px 0 10px 0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="color:#000;font-family:Arial, Helvetica, sans-serif">
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:56px">
<tr>
<td style="width:100%;padding:20 0">
{logo_img}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
<tr>
<td style="width:100%;padding:0">
{uptime_body_img}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">{greeting_text.replace("Greetings from Helium,", 'Greetings from <span style="font-weight:700">Helium</span>,')}</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">{main_text}</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
{secondary_text}<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
{closing_text}<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
{signoff_text}<br>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>"""


def create_credits_html_template(
    logo_base64: Optional[str] = None,
    credits_body_base64: Optional[str] = None,
    use_cid: bool = True,
) -> str:
    """Create credits email HTML template."""
    logo_img = (
        '<img src="cid:email-logo" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">'
        if use_cid
        else (f'<img src="{logo_base64}" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">' if logo_base64 else "")
    )
    
    credits_body_img = (
        '<img src="cid:credits-body" width="600" height="auto" style="display:block;width:100%;height:auto;max-width:100%;border-radius:8px" alt="Credits Added">'
        if use_cid
        else (f'<img src="{credits_body_base64}" width="600" height="auto" style="display:block;width:100%;height:auto;max-width:100%;border-radius:8px" alt="Credits Added">' if credits_body_base64 else "")
    )
    
    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
@media (max-width: 450px) {{
  .layout-0 {{ display: none !important; }}
}}
</style>
</head>
<body style="width:100%;background-color:#ffffff;margin:0;padding:0">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#ffffff">
<tr>
<td style="background-color:#ffffff;padding:20px 0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff">
<tr>
<td style="padding:0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" style="color:#000;font-family:Arial, Helvetica, sans-serif">
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:56px">
<tr>
<td style="width:100%;padding:20 0">
{logo_img}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:24px" height="24">&nbsp;</td>
</tr>
<tr>
<td style="padding:0">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tr>
<td align="center" style="padding:0">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr>
<td style="width:100%;padding:0">
{credits_body_img}
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:24px" height="24">&nbsp;</td>
</tr>
<tr>
<td style="padding:0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:0">
<a href="http://he2.ai" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#4ade80;color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:600;text-decoration:none;text-align:center;padding:14px 32px;border-radius:8px;line-height:1.2;letter-spacing:0.01em">Get Started</a>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>"""


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    attachments: Optional[List[MIMEImage]] = None,
) -> bool:
    """
    Send email using SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email content
        text_content: Plain text email content (optional)
        attachments: List of MIMEImage attachments (optional)
        
    Returns:
        True if email sent successfully
        
    Raises:
        ValueError: If SMTP configuration is missing or invalid
        ConnectionError: If unable to connect to SMTP server
        Exception: For other SMTP-related errors with detailed messages
    """
    # Validate SMTP configuration
    if not settings.smtp_host:
        error_msg = "SMTP host is not configured"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if not settings.sender_email:
        error_msg = "Sender email is not configured"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["From"] = f'"{settings.smtp_from}" <{settings.sender_email}>'
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Add text content
        if text_content:
            text_part = MIMEText(text_content, "plain")
            msg.attach(text_part)
        
        # Add HTML content
        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)
        
        # Add attachments
        if attachments:
            for attachment in attachments:
                msg.attach(attachment)
        
        # Send email
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_pass,
            use_tls=settings.smtp_port == 587,
        )
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPException as e:
        error_msg = f"SMTP error: {str(e)}"
        logger.error(f"Failed to send email to {to_email}: {error_msg}")
        raise Exception(error_msg) from e
    except (ConnectionError, OSError, TimeoutError) as e:
        error_msg = f"Unable to connect to SMTP server at {settings.smtp_host}:{settings.smtp_port}. {str(e)}"
        logger.error(f"Failed to send email to {to_email}: {error_msg}")
        raise ConnectionError(error_msg) from e
    except Exception as e:
        error_msg = f"Failed to send email: {str(e)}"
        logger.error(f"Failed to send email to {to_email}: {error_msg}")
        raise Exception(error_msg) from e

