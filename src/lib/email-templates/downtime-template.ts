import { parseEmailText } from "./text-parser";

interface DowntimeTemplateOptions {
  logoBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  downtimeBodyBase64?: string | null; // Optional: for base64 data URIs (Resend API)
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
    downtimeBodyBase64,
    useCid = true, // Default to CID for SMTP compatibility
    textContent,
    defaultGreeting = "Greetings from Helium,",
    defaultParagraphs = [
      "We wanted to let you know that Helium will be <span style='font-weight:700'>temporarily unavailable</span> for <span style='font-weight:700'>1 hour</span> as we perform scheduled maintenance and upgrades.",
      "During this window, you won't be able to access Helium. Once the maintenance is complete, you'll be able to log back in and experience the platform as usual.",
      "We appreciate your patience and understanding as we work to make Helium even better for you.",
    ],
    defaultSignoff = "Thanks,<br>The Helium Team",
  } = options;

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : "";
  
  const downtimeBodyImg = useCid
    ? `<img src="cid:downtime-body" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="Downtime Notice">`
    : downtimeBodyBase64
    ? `<img src="${downtimeBodyBase64}" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="Downtime Notice">`
    : "";

  // Parse text content
  const parsed = parseEmailText(textContent || "");
  const greetingText = parsed.greeting || defaultGreeting;
  const paragraphs =
    parsed.paragraphs.length > 0 ? parsed.paragraphs : defaultParagraphs;
  const signoffText = parsed.signoff || defaultSignoff;

  // Distribute paragraphs across the three display sections
  // First paragraph -> mainText, second paragraph -> secondaryText, rest -> closingText
  const mainText = paragraphs[0] || "";
  const secondaryText = paragraphs[1] || "";
  const closingText = paragraphs.length > 2 
    ? paragraphs.slice(2).join("<br><br>")
    : "";

  // Function to add bold formatting to specific terms
  const addBoldFormatting = (text: string): string => {
    if (!text) return text;
    let formatted = text;
    // Make "temporarily unavailable" bold
    formatted = formatted.replace(/\btemporarily unavailable\b/gi, '<span style="font-weight:700">temporarily unavailable</span>');
    // Make "1 hour" bold
    formatted = formatted.replace(/\b1 hour\b/gi, '<span style="font-weight:700">1 hour</span>');
    return formatted;
  };

  // Apply bold formatting
  const formattedMainText = addBoldFormatting(mainText);
  const formattedSecondaryText = addBoldFormatting(secondaryText);
  const formattedClosingText = addBoldFormatting(closingText);

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
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f0f1f5;margin:0;padding:0;font-family:Arial, Helvetica, sans-serif">
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
<td style="padding:12px 0">
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
<td style="width:100%;padding:0">
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
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
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
          ${downtimeBodyImg}
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
<td style="font-size:0;height:12px" height="12">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${greetingText.replace(
    "Greetings from Helium,",
    'Greetings from <span style="font-weight:700">Helium</span>,'
  )}<br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:12px" height="12">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${formattedMainText}<br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:12px" height="12">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${formattedSecondaryText}<br></span>
</td>
</tr>
${closingText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${formattedClosingText}<br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:12px" height="12">&nbsp;</td>
</tr>` : ''}
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${signoffText}<br></span>
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
<table border="0" cellpadding="0" cellspacing="0" class="layout-0" align="center" style="display:table;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#070300">
<tbody>
<tr>
<td style="text-align:center;padding:13px 20px">
<table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:522px;table-layout:fixed;margin:0 auto">
<tbody>
<tr>
<td width="100.00%" style="width:100.00%;box-sizing:border-box;vertical-align:top">
<table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;table-layout:fixed">
<tbody>
<tr>
<td style="padding:7px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.4;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word">
<tbody>
<tr>
<td dir="ltr" style="color:#f6f5f1;font-size:16px;font-weight:700;letter-spacing:-0.01em;white-space:pre-wrap;line-height:1.2;text-align:left">Need help?<br></td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#f6f5f1;font-size:13.3333px;letter-spacing:-0.01em;line-height:1.2;text-align:left">
<span style="white-space:pre-wrap">Our support team is here to assist you with onboarding, integrations, or deployment. You can reach us directly at </span><span style="font-weight:700;white-space:pre-wrap">support@he2.ai</span><span style="white-space:pre-wrap"> or through the in-app assistant.</span><span style="white-space:pre-wrap"><br></span>
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
