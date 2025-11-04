// Simple email template generator for sections that don't need special HTML structure
export function convertTextToHtml(textContent: string): string {
  // Split by double newlines to separate the heading from the content
  const parts = textContent.split(/\n\n+/);
  const firstLine = parts[0]?.trim() || '';
  const restOfContent = parts.slice(1).join('\n\n');
  
  // Convert the rest of the content: double newlines become paragraph breaks, single newlines become line breaks
  let htmlContent = '';
  if (restOfContent.trim()) {
    htmlContent = restOfContent
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }
  
  return `<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #CFEBD5;">
    <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #1a1a1a;">${firstLine}</h2>
    ${htmlContent ? `<p>${htmlContent}</p>` : ''}
  </body>
</html>`;
}

