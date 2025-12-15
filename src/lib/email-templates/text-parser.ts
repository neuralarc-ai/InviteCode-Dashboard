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

  // Remove title line only if it explicitly looks like a known system template title
  // Avoid broad regex that might eat user content like "Here's what's new:"
  let cleanedContent = textContent;
  if (/^(System Uptime|Scheduled Downtime|Credits Added|Activity Update):/i.test(cleanedContent)) {
     cleanedContent = textContent.replace(/^[^:]+:.*?\n\n?/i, '').trim();
  }
  
  // Split by double newlines to get paragraphs, or single newlines if no double newlines exist
  const paragraphs = cleanedContent.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  
  // Logic to handle single-newline formatted text or text with no double newlines
  let processedParagraphs = paragraphs;
  // If we have very few paragraphs but the text is long, try splitting by single newlines
  // This handles cases where user pastes text with single line breaks
  if ((paragraphs.length <= 1 && cleanedContent.length > 150) || paragraphs.length === 0) {
    const singleSplit = cleanedContent.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    if (singleSplit.length > paragraphs.length) {
      processedParagraphs = singleSplit;
    }
  }
  
  // Find greeting line - look for common greeting patterns or sale announcements
  let greeting = defaultGreeting;
  const greetingPatterns = [
    /^(greetings|dear|hello|hi)[\s,]/i,
    /^(greetings from|dear|hello|hi)/i,
    /^(grand black friday sale|black friday|sale!)/i,
  ];
  
  const greetingLineIndex = processedParagraphs.findIndex(p => 
    // Ensure the line is short enough to be a greeting (prevent consuming long paragraphs starting with Hi)
    greetingPatterns.some(pattern => pattern.test(p)) && p.length < 100
  );
  
  if (greetingLineIndex !== -1) {
    greeting = processedParagraphs[greetingLineIndex];
    // Ensure proper capitalization
    greeting = greeting.replace(/^greetings from /i, 'Greetings from ');
    greeting = greeting.replace(/^grand black friday sale!/i, 'Grand Black Friday Sale!');
    processedParagraphs.splice(greetingLineIndex, 1);
  } else if (processedParagraphs.length > 0) {
    // If first paragraph looks like a greeting or short announcement, use it
    const firstPara = processedParagraphs[0];
    if ((firstPara.length < 100 && !/[.!?]\s/.test(firstPara)) || /^(grand black friday|sale!)/i.test(firstPara)) {
      greeting = firstPara;
      processedParagraphs.shift();
    }
  }
  
  // Find signoff (Thanks, Best regards, Sincerely, etc.)
  let signoff = defaultSignoff;
  const signoffPatterns = [
    /^(thanks|thank you|best regards|sincerely|regards|yours truly|take care|with .* regards)/i,
  ];
  
  const signoffIndex = processedParagraphs.findIndex(p => 
    // Ensure signoff is reasonably short or at the end
    signoffPatterns.some(pattern => pattern.test(p)) && p.length < 100
  );
  
  if (signoffIndex !== -1) {
    // If signoff is found, take it and everything after it (if it's not the last line)
    // But usually signoff is the last distinct block.
    // If "With warm regards" is its own line, and "The Helium Team" is next.
    
    // Check if there are lines after the detected signoff
    const linesAfter = processedParagraphs.slice(signoffIndex);
    if (linesAfter.length > 0) {
       signoff = linesAfter.join('<br>');
       // Remove signoff and subsequent lines from paragraphs
       processedParagraphs.splice(signoffIndex, linesAfter.length);
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

