import { parseEmailText } from "./text-parser";

interface CreditsTemplateOptions {
  logoBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  creditsBodyBase64?: string | null; // Optional: for base64 data URIs (Resend API) - Deprecated/Unused in new layout
  pattern3Base64?: string | null; // Optional: for background pattern
  useCid?: boolean; // If true, use CID references (for SMTP). Default: true
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
  useCustomImage?: boolean; // If true, use credits-custom CID instead of credits-body - Deprecated/Unused in new layout
}

export function createCreditsHtmlTemplate(
  options: CreditsTemplateOptions
): string {
  const {
    logoBase64,
    pattern3Base64,
    useCid = true, // Default to CID for SMTP compatibility
    textContent,
    defaultGreeting = "Greetings from Helium,",
    defaultParagraphs = [
      "We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.",
      "You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.",
      "Thank you for being a valued member of the Helium community.",
    ],
    defaultSignoff = "Thanks,<br>The Helium Team",
  } = options;

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : "";

  // Background Image Logic for pattern3
  const bgImageStyle = useCid
    ? "background-image:url(cid:pattern3-bg);background-repeat:repeat;background-position:top center;"
    : pattern3Base64
    ? `background-image:url('${pattern3Base64}');background-repeat:repeat;background-position:top center;`
    : "";

  // Parse text content
  const parsed = parseEmailText(textContent || "");
  const greetingText = parsed.greeting || defaultGreeting;
  const paragraphs =
    parsed.paragraphs.length > 0 ? parsed.paragraphs : defaultParagraphs;
  const signoffText = parsed.signoff || defaultSignoff;

  const mainText = paragraphs[0] || "";
  const secondaryText = paragraphs[1] || "";
  const closingText = paragraphs[2] || "";
  // New: Post-card content (any paragraphs after the 3rd one)
  const postCardText = paragraphs.slice(3).join('<br><br>') || "";

  // Function to add bold formatting to specific terms
  const addBoldFormatting = (text: string): string => {
    if (!text) return text;
    let formatted = text;
    // Make "credits" bold
    formatted = formatted.replace(/\bcredits\b/gi, '<span style="font-weight:700">credits</span>');
    // Make "account dashboard" bold
    formatted = formatted.replace(/\baccount dashboard\b/gi, '<span style="font-weight:700">account dashboard</span>');
    // Make "The Helium Team" bold
    formatted = formatted.replace(/\bThe Helium Team\b/gi, '<span style="font-weight:700">The Helium Team</span>');
    return formatted;
  };

  // Apply bold formatting
  const formattedMainText = addBoldFormatting(mainText);
  const formattedSecondaryText = addBoldFormatting(secondaryText);
  const formattedClosingText = addBoldFormatting(closingText);
  const formattedPostCardText = addBoldFormatting(postCardText);
  const formattedSignoffText = addBoldFormatting(signoffText);

  // Combine main and secondary text for the Dark Card (#262626)
  const darkCardContent = [formattedMainText, formattedSecondaryText]
    .filter(Boolean)
    .join('<br><br>');

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
</style>
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f5f5f5;margin:0;padding:0;font-family:Arial, Helvetica, sans-serif">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#f5f5f5" style="background-color:#f5f5f5;">
<tbody>
<tr>
<td style="padding:40px 20px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background-color:#E0693D;${bgImageStyle}border-radius:20px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
<tbody>
<tr>
<td>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border-radius:12px;overflow:hidden">
<tbody>
<tr>
<td style="padding:40px 30px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
<tbody>
<!-- Logo -->
<tr>
<td style="padding-bottom:30px;text-align:center">
  ${logoImg}
</td>
</tr>

<!-- Greeting -->
<tr>
<td dir="ltr" style="color:#333333;font-size:18px;line-height:1.6;text-align:left;padding-bottom:20px;font-weight:600">
<span style="white-space:pre-wrap">${greetingText.replace(
    "Greetings from Helium,",
    'Greetings from <span style="font-weight:700">Helium</span>,'
  )}</span>
</td>
</tr>

<!-- Dark Card (#262626) -->
${darkCardContent ? `
<tr>
<td style="padding-bottom:20px">
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#262626;border-radius:12px">
<tr>
<td style="padding:24px;color:#ffffff;font-size:16px;line-height:1.6">
${darkCardContent}
</td>
</tr>
</table>
</td>
</tr>
` : ''}

<!-- Red Card (#C63E3E) -->
${formattedClosingText ? `
<tr>
<td style="padding-bottom:30px">
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#C63E3E;border-radius:12px">
<tr>
<td style="padding:24px;color:#ffffff;font-size:16px;line-height:1.6">
${formattedClosingText}
</td>
</tr>
</table>
</td>
</tr>
` : ''}

<!-- Post-Card Text -->
${formattedPostCardText ? `
<tr>
<td dir="ltr" style="color:#333333;font-size:16px;line-height:1.6;text-align:left;padding-bottom:30px">
<span style="white-space:pre-wrap">${formattedPostCardText}</span>
</td>
</tr>
` : ''}

<!-- Signoff -->
<tr>
<td dir="ltr" style="color:#333333;font-size:16px;line-height:1.6;text-align:left">
<span style="white-space:pre-wrap">${formattedSignoffText}</span>
</td>
</tr>

</tbody>
</table>
</td>
</tr>
</tbody>
</table>


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