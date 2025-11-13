"""
Email text parser utility to extract greeting, paragraphs, and signoff.
"""
import re
from typing import TypedDict


class ParsedEmailContent(TypedDict):
    """Parsed email content structure."""
    greeting: str
    paragraphs: list[str]
    signoff: str


def parse_email_text(text_content: str) -> ParsedEmailContent:
    """
    Parse text content into structured email parts.
    
    Args:
        text_content: Raw text content to parse
        
    Returns:
        Parsed email content with greeting, paragraphs, and signoff
    """
    default_greeting = "Greetings from Helium,"
    default_signoff = "Thanks,<br>The Helium Team"
    default_paragraphs: list[str] = []
    
    if not text_content or not text_content.strip():
        return {
            "greeting": default_greeting,
            "paragraphs": default_paragraphs,
            "signoff": default_signoff,
        }
    
    # Remove title line if it exists
    cleaned_content = re.sub(r'^[^:]+:.*?\n\n?', '', text_content, flags=re.IGNORECASE).strip()
    
    # Split by double newlines to get paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n\n+', cleaned_content) if p.strip()]
    
    # If no paragraphs found with double newlines, try splitting by single newlines
    if not paragraphs:
        paragraphs = [p.strip() for p in re.split(r'\n+', cleaned_content) if p.strip()]
    
    # Find greeting line
    greeting = default_greeting
    greeting_patterns = [
        r'^(greetings|dear|hello|hi)[\s,]',
        r'^(greetings from|dear|hello|hi)',
    ]
    
    greeting_line_index = -1
    for i, para in enumerate(paragraphs):
        if any(re.match(pattern, para, re.IGNORECASE) for pattern in greeting_patterns):
            greeting_line_index = i
            break
    
    if greeting_line_index != -1:
        greeting = paragraphs[greeting_line_index]
        greeting = re.sub(r'^greetings from ', 'Greetings from ', greeting, flags=re.IGNORECASE)
        paragraphs.pop(greeting_line_index)
    elif paragraphs:
        # If first paragraph looks like a greeting, use it
        first_para = paragraphs[0]
        if len(first_para) < 100 and not re.search(r'[.!?]\s', first_para):
            greeting = first_para
            paragraphs.pop(0)
    
    # Find signoff
    signoff = default_signoff
    signoff_patterns = [
        r'^(thanks|thank you|best regards|sincerely|regards|yours truly)',
    ]
    
    signoff_index = -1
    for i, para in enumerate(paragraphs):
        if any(re.match(pattern, para, re.IGNORECASE) for pattern in signoff_patterns):
            signoff_index = i
            break
    
    if signoff_index != -1:
        signoff_line = paragraphs[signoff_index]
        # Check if next line is "The Helium Team" or similar
        if signoff_index + 1 < len(paragraphs) and re.search(
            r'(helium team|team|helium)', paragraphs[signoff_index + 1], re.IGNORECASE
        ):
            signoff = f"{signoff_line}<br>{paragraphs[signoff_index + 1]}"
            paragraphs.pop(signoff_index)
            paragraphs.pop(signoff_index)  # Remove the team line too
        else:
            # Try to extract from the same line
            team_match = re.search(r'(thanks.*?)(the helium team)', signoff_line, re.IGNORECASE)
            if team_match:
                signoff = f"{team_match.group(1)}<br>{team_match.group(2)}"
                paragraphs.pop(signoff_index)
            else:
                signoff = signoff_line
                paragraphs.pop(signoff_index)
    elif paragraphs:
        # If last paragraph looks like a signoff, use it
        last_para = paragraphs[-1]
        if len(last_para) < 100 and (
            any(re.match(pattern, last_para, re.IGNORECASE) for pattern in signoff_patterns)
            or re.match(r'^[A-Z][a-z]+,\s*$', last_para)
        ):
            signoff = last_para
            paragraphs.pop()
    
    return {
        "greeting": greeting,
        "paragraphs": paragraphs if paragraphs else default_paragraphs,
        "signoff": signoff,
    }

