import { parseEmailText } from "./text-parser";

interface UpdatesTemplateOptions {
  logoBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  updatesBodyBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  useCid?: boolean; // If true, use CID references (for SMTP). Default: true
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
}

export function createUpdatesHtmlTemplate(
  options: UpdatesTemplateOptions
): string {
  const {
    logoBase64,
    updatesBodyBase64,
    useCid = true, // Default to CID for SMTP compatibility
    textContent,
    defaultGreeting = "Grand Black Friday Sale!",
    defaultParagraphs = [
      "Thank you for being a part of the Helium AI community. Your trust and continued usage mean a great deal to us, and we are committed to delivering even more value to you in the coming months.",
      "We are pleased to extend an exclusive annual offer for our current users.",
      "For USD 149.99 per year, you will receive:\n\n• 5000 credits every month\n• 24,000 bonus credits for the year\n• Full access to Helium AI, including A.I.M, Helix, Orbit, Vault, workflow automation, content generation, and more",
      "This plan is designed to give you a full year of uninterrupted access to Helium AI, with sufficient credits to run your day to day work, experiments, and projects without worrying about frequent top-ups.",
      "If you would like to activate this annual plan, please click the link below or log in to your Helium account and proceed to the billing section:",
      "If you have any questions regarding the plan, credits, or your existing account, simply reply to this email and our team will be happy to assist you.",
      "Thank you once again for choosing Helium AI.<br>We look forward to supporting you as you scale your work with a single, intelligent AI platform.",
    ],
    defaultSignoff = "Warm regards,<br>The Helium Team",
  } = options;

  // Parse text content
  const parsed = parseEmailText(textContent || "");
  let greetingText = parsed.greeting || defaultGreeting;
  
  // Ensure "Grand Black Friday Sale!" is used if it's in the content, and remove any "Greetings from Helium"
  if (greetingText.includes('Grand Black Friday Sale')) {
    greetingText = 'Grand Black Friday Sale!';
  } else if (greetingText.includes('Greetings from Helium')) {
    greetingText = defaultGreeting; // Use default which is "Grand Black Friday Sale!"
  }
  const paragraphs =
    parsed.paragraphs.length > 0 ? parsed.paragraphs : defaultParagraphs;
  const signoffText = parsed.signoff || defaultSignoff;

  // Distribute paragraphs - use first paragraph as main text, second as secondary, rest as closing
  // Preserve <br> tags when joining paragraphs
  const mainText = paragraphs[0] || "";
  const secondaryText = paragraphs[1] || "";
  // Join closing paragraphs, preserving any <br> tags that exist
  const closingText = paragraphs.slice(2).map(p => p.trim()).join("\n\n") || "";

  // Function to add bold formatting to specific terms
  const addBoldFormatting = (text: string): string => {
    if (!text) return text;
    let formatted = text;
    // Make "5000" bold (but not "50000" or other numbers)
    formatted = formatted.replace(/\b5000\b/g, '<span style="font-weight:700">5000</span>');
    // Make "24,000" or "24000" bold
    formatted = formatted.replace(/\b24,?000\b/g, '<span style="font-weight:700">24,000</span>');
    // Make "Helium AI" bold (case insensitive)
    formatted = formatted.replace(/\bHelium AI\b/gi, '<span style="font-weight:700">Helium AI</span>');
    // Make "USD 149.99 Annual Plan" bold
    formatted = formatted.replace(/\bUSD 149\.99 Annual Plan\b/gi, '<span style="font-weight:700">USD 149.99 Annual Plan</span>');
    // Make "The Helium Team" bold
    formatted = formatted.replace(/\bThe Helium Team\b/gi, '<span style="font-weight:700">The Helium Team</span>');
    return formatted;
  };

  // Apply bold formatting to text content
  const formattedMainText = addBoldFormatting(mainText);
  const formattedSecondaryText = addBoldFormatting(secondaryText);
  
  // Helper function to preserve <br> tags and convert newlines
  const preserveBrAndConvertNewlines = (text: string): string => {
    if (!text) return text;
    // First, preserve existing <br> tags by temporarily replacing them
    const brPlaceholder = '___BR_TAG___';
    let processed = text.replace(/<br\s*\/?>/gi, brPlaceholder);
    // Convert newlines to <br>
    processed = processed.replace(/\n/g, '<br>');
    // Restore original <br> tags
    processed = processed.replace(new RegExp(brPlaceholder, 'g'), '<br>');
    return processed;
  };
  
  // Process secondary text: add extra space after "frequent top-ups" if present
  let processedSecondaryText = secondaryText;
  if (processedSecondaryText.includes('frequent top-ups') || processedSecondaryText.includes('frequent top ups')) {
    processedSecondaryText = processedSecondaryText.replace(
      /(frequent top-?ups\.?)/gi,
      '$1<br><br>'
    );
  }
  const finalFormattedSecondaryText = addBoldFormatting(processedSecondaryText);
  
  // Process closing text: preserve existing <br> tags and add spacing between paragraphs
  let processedClosingText = closingText;
  
  // First, ensure line break after "Helium AI." if not already present (check for <br> or newline)
  if (processedClosingText.includes('Helium AI.') && processedClosingText.includes('We look forward')) {
    // Check if there's already a <br> or newline after "Helium AI."
    if (!processedClosingText.match(/Helium AI\.\s*(<br>|\n)/i)) {
      processedClosingText = processedClosingText.replace(
        /(Helium AI\.)\s*(We look forward)/gi,
        '$1<br>$2'
      );
    }
  }
  
  // Add spacing between "If you have any questions" and "Thank you once again" if not already present
  if (processedClosingText.includes('If you have any questions') && processedClosingText.includes('Thank you once again')) {
    // Check if there's already spacing (double <br> or paragraph break)
    if (!processedClosingText.match(/If you have any questions[^<]*?\.\s*(<br>\s*){2,}/i) && 
        !processedClosingText.match(/If you have any questions[^<]*?\.\s*\n\n/i)) {
      processedClosingText = processedClosingText.replace(
        /(If you have any questions[^<]*?\.)\s*(Thank you once again)/gi,
        '$1<br><br>$2'
      );
    }
  }
  
  const formattedClosingText = addBoldFormatting(processedClosingText);

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">`
    : "";

  const updatesBodyImg = useCid
    ? `<img src="cid:updates-body" width="560" height="220" style="display:block;width:100%;height:auto;max-width:100%" alt="Updates">`
    : updatesBodyBase64
    ? `<img src="${updatesBodyBase64}" width="560" height="220" style="display:block;width:100%;height:auto;max-width:100%" alt="Updates">`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="x-apple-disable-message-reformatting">
<style>
@media (max-width: 450px) {
  .layout-0 {
    display: none !important;
  }
}
@media (max-width: 450px) and (min-width: 0px) {
  .layout-0-under-450 {
    display: table !important;
  }
}
</style>
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f0f1f5;margin:0;padding:0">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f0f1f5" style="background-color:#f0f1f5">
<tbody>
<tr>
<td style="background-color:#f0f1f5">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff">
<tbody>
<tr>
<td style="padding:10px 0px 0px 0px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
<tbody>
<tr>
<td style="padding:10px 0 10px 0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word">
<tbody>
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tbody>
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:56px">
<tbody>
<tr>
<td style="width:100%;padding:12 0">
${logoImg}
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:6px" height="6">&nbsp;</td>
</tr>
<tr>
<td style="padding:0px 20px">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%">
<tbody>
<tr>
<td align="center">
<table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
<tbody>
<tr>
<td style="width:100%;padding:0">
${updatesBodyImg}
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td style="font-size:0;height:2px" height="2">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:22px;line-height:1.4;font-weight:700;text-align:center;padding:0px 20px">
<span style="white-space:pre-wrap">${greetingText}</span>
</td>
</tr>
<tr>
<td style="font-size:0;height:4px" height="4">&nbsp;</td>
</tr>
${mainText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:16px;line-height:1.6;text-align:left;padding:0px 20px">
${preserveBrAndConvertNewlines(formattedMainText)}
</td>
</tr>
<tr>
<td style="font-size:0;height:6px" height="6">&nbsp;</td>
</tr>` : ''}
${secondaryText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:16px;line-height:1.6;text-align:left;padding:0px 20px">
${preserveBrAndConvertNewlines(finalFormattedSecondaryText)}
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>` : ''}
${closingText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:16px;line-height:1.7;text-align:left;padding:0px 20px">
${preserveBrAndConvertNewlines(formattedClosingText)}
</td>
</tr>
<tr>
<td style="font-size:0;height:6px" height="6">&nbsp;</td>
</tr>` : ''}
<tr>
<td dir="ltr" style="color:#333333;font-size:16px;line-height:1.5;text-align:left;padding:0px 20px">
${addBoldFormatting(signoffText)}
</td>
</tr>
<tr>
<td style="font-size:0;height:6px" height="6">&nbsp;</td>
</tr>
<tr>
<td style="padding:0px 20px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
<tbody>
<tr>
<td align="center" style="padding:0">
<a href="http://he2.ai" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#4ade80;color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:700;text-decoration:none;text-align:center;padding:14px 32px;border-radius:8px;line-height:1.2;letter-spacing:0.01em">Activate the <span style="font-weight:700">USD 149.99 Annual Plan</span></a>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</body>
</html>`;
}

