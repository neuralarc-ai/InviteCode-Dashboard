// Utility function to parse text content into structured email parts
export interface ParsedEmailContent {
  greeting: string;
  paragraphs: string[];
  signoff: string;
}

export function parseEmailText(textContent: string): ParsedEmailContent {
  const defaultGreeting = "Greetings from Helium,";
  const defaultSignoff = "Thanks,<br>The Helium Team";
  const defaultParagraphs: string[] = [];

  if (!textContent) {
    return {
      greeting: defaultGreeting,
      paragraphs: defaultParagraphs,
      signoff: defaultSignoff,
    };
  }

  // Remove title line if it exists (e.g., "System Uptime: Helium is back online")
  let cleanedContent = textContent.replace(/^[^:]+:.*?\n\n?/i, '').trim();
  
  // Split by double newlines to get paragraphs
  const paragraphs = cleanedContent.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  
  // Find greeting line
  let greeting = defaultGreeting;
  const greetingLineIndex = paragraphs.findIndex(p => /greetings from helium/i.test(p));
  if (greetingLineIndex !== -1) {
    greeting = paragraphs[greetingLineIndex].replace(/^greetings from /i, 'Greetings from ');
    paragraphs.splice(greetingLineIndex, 1);
  }
  
  // Find signoff (Thanks/The Helium Team)
  let signoff = defaultSignoff;
  const signoffIndex = paragraphs.findIndex(p => /^(thanks|thank you)/i.test(p));
  if (signoffIndex !== -1) {
    const signoffLine = paragraphs[signoffIndex];
    // Check if next line is "The Helium Team"
    if (paragraphs[signoffIndex + 1] && /helium team/i.test(paragraphs[signoffIndex + 1])) {
      signoff = `${signoffLine}<br>${paragraphs[signoffIndex + 1]}`;
      paragraphs.splice(signoffIndex, 2);
    } else {
      // Try to extract from the same line
      const teamMatch = signoffLine.match(/(thanks.*?)(the helium team)/i);
      if (teamMatch) {
        signoff = `${teamMatch[1]}<br>${teamMatch[2]}`;
        paragraphs.splice(signoffIndex, 1);
      } else {
        signoff = signoffLine;
        paragraphs.splice(signoffIndex, 1);
      }
    }
  }

  return {
    greeting,
    paragraphs: paragraphs.length > 0 ? paragraphs : defaultParagraphs,
    signoff,
  };
}

