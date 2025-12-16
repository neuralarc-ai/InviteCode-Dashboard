import { parseEmailText } from "./text-parser";

interface DowntimeTemplateOptions {
  logoBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  downtimeBodyBase64?: string | null; // Optional: for base64 data URIs (Resend API) - Deprecated/Unused in new layout
  pattern2Base64?: string | null; // Optional: for background pattern
  useCid?: boolean; // If true, use CID references (for SMTP). Default: true
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
}

export function createDowntimeHtmlTemplate(
  options: DowntimeTemplateOptions
): string {
  const {
    logoBase64,
    pattern2Base64,
    useCid = true, // Default to CID for SMTP compatibility
    textContent,
    defaultGreeting = "Greetings from Helium,",
    defaultParagraphs = [
      "We wanted to let you know that Helium will be temporarily unavailable for 1 hour as we perform scheduled maintenance and upgrades.",
      "During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.",
      "We appreciate your patience and understanding as we work to make Helium even better for you.",
      "We encourage you to take advantage of these benefits and make the most of your Helium experience. If you need any assistance or have questions before the webinar, please do not hesitate to reach out.",
    ],
    defaultSignoff = "Helium Community Team<br>Your Partner in Innovation<br><br>© 2025 Helium. All rights reserved.",
  } = options;

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : "";

  // Background Image Logic for pattern2
  const bgImageStyle = useCid
    ? "background-image:url(cid:pattern2-bg);background-repeat:repeat;background-position:top center;"
    : pattern2Base64
    ? `background-image:url('${pattern2Base64}');background-repeat:repeat;background-position:top center;`
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
    // Make "temporarily unavailable" bold
    formatted = formatted.replace(/\btemporarily unavailable\b/gi, '<span style="font-weight:700">temporarily unavailable</span>');
    // Make "1 hour" bold
    formatted = formatted.replace(/\b1 hour\b/gi, '<span style="font-weight:700">1 hour</span>');
    // Make "maintenance" bold
    formatted = formatted.replace(/\bmaintenance\b/gi, '<span style="font-weight:700">maintenance</span>');
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

  // Combine main and secondary text for the First Card (#CBE5EF - Light Blue)
  const firstCardContent = [formattedMainText, formattedSecondaryText]
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
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background-color:#27584F;${bgImageStyle}border-radius:20px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
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

<!-- Light Blue Card (#CBE5EF) -->
${firstCardContent ? `
<tr>
<td style="padding-bottom:20px">
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#CBE5EF;border-radius:12px">
<tr>
<td style="padding:24px;color:#333333;font-size:16px;line-height:1.6">
${firstCardContent}
</td>
</tr>
</table>
</td>
</tr>
` : ''}

<!-- Beige Card (#EEDBCD) -->
${formattedClosingText ? `
<tr>
<td style="padding-bottom:30px">
<table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#EEDBCD;border-radius:12px">
<tr>
<td style="padding:24px;color:#333333;font-size:16px;line-height:1.6">
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