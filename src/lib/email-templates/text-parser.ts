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

  if (!textContent || !textContent.trim()) {
    return {
      greeting: defaultGreeting,
      paragraphs: defaultParagraphs,
      signoff: defaultSignoff,
    };
  }

  // Remove title line if it exists (e.g., "System Uptime: Helium is back online")
  let cleanedContent = textContent.replace(/^[^:]+:.*?\n\n?/i, '').trim();
  
  // Split by double newlines to get paragraphs, or single newlines if no double newlines exist
  const paragraphs = cleanedContent.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  
  // If no paragraphs found with double newlines, try splitting by single newlines
  let processedParagraphs = paragraphs.length > 0 ? paragraphs : cleanedContent.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  
  // Find greeting line - look for common greeting patterns
  let greeting = defaultGreeting;
  const greetingPatterns = [
    /^(greetings|dear|hello|hi)[\s,]/i,
    /^(greetings from|dear|hello|hi)/i,
  ];
  
  const greetingLineIndex = processedParagraphs.findIndex(p => 
    greetingPatterns.some(pattern => pattern.test(p))
  );
  
  if (greetingLineIndex !== -1) {
    greeting = processedParagraphs[greetingLineIndex];
    // Ensure proper capitalization
    greeting = greeting.replace(/^greetings from /i, 'Greetings from ');
    processedParagraphs.splice(greetingLineIndex, 1);
  } else if (processedParagraphs.length > 0) {
    // If first paragraph looks like a greeting, use it
    const firstPara = processedParagraphs[0];
    if (firstPara.length < 100 && !/[.!?]\s/.test(firstPara)) {
      greeting = firstPara;
      processedParagraphs.shift();
    }
  }
  
  // Find signoff (Thanks, Best regards, Sincerely, etc.)
  let signoff = defaultSignoff;
  const signoffPatterns = [
    /^(thanks|thank you|best regards|sincerely|regards|yours truly)/i,
  ];
  
  const signoffIndex = processedParagraphs.findIndex(p => 
    signoffPatterns.some(pattern => pattern.test(p))
  );
  
  if (signoffIndex !== -1) {
    const signoffLine = processedParagraphs[signoffIndex];
    // Check if next line is "The Helium Team" or similar
    if (processedParagraphs[signoffIndex + 1] && /(helium team|team|helium)/i.test(processedParagraphs[signoffIndex + 1])) {
      signoff = `${signoffLine}<br>${processedParagraphs[signoffIndex + 1]}`;
      processedParagraphs.splice(signoffIndex, 2);
    } else {
      // Try to extract from the same line
      const teamMatch = signoffLine.match(/(thanks.*?)(the helium team)/i);
      if (teamMatch) {
        signoff = `${teamMatch[1]}<br>${teamMatch[2]}`;
        processedParagraphs.splice(signoffIndex, 1);
      } else {
        signoff = signoffLine;
        processedParagraphs.splice(signoffIndex, 1);
      }
    }
  } else if (processedParagraphs.length > 0) {
    // If last paragraph looks like a signoff, use it
    const lastPara = processedParagraphs[processedParagraphs.length - 1];
    if (lastPara.length < 100 && (signoffPatterns.some(pattern => pattern.test(lastPara)) || /^[A-Z][a-z]+,\s*$/.test(lastPara))) {
      signoff = lastPara;
      processedParagraphs.pop();
    }
  }

  // Return remaining paragraphs (all content between greeting and signoff)
  return {
    greeting,
    paragraphs: processedParagraphs.length > 0 ? processedParagraphs : defaultParagraphs,
    signoff,
  };
}

