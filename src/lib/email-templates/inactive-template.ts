import { parseEmailText } from "./text-parser";

interface InactiveTemplateOptions {
  logoBase64?: string | null;
  inactiveBodyBase64?: string | null;
  useCid?: boolean;
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
}

export function createInactiveHtmlTemplate(
  options: InactiveTemplateOptions
): string {
  const {
    logoBase64,
    inactiveBodyBase64,
    useCid = true,
    textContent,
    defaultGreeting = "Hello,",
    defaultParagraphs = [
      "We hope this message finds you well. We've noticed you haven't been active on Helium lately, and we wanted to reach out - not to pressure you, but simply to let you know that you're missed and valued.",
      "We want you to know that there's absolutely no rush to return. Life has its seasons, and we understand that sometimes you need to step back and focus on other things.",
      "Whether you return tomorrow, next month, or next year, know that you'll always have a place here at Helium. We're not going anywhere, and we'll be excited to welcome you back whenever you're ready.",
    ],
    defaultSignoff = "With understanding and care,<br>The Helium Team",
  } = options;

  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : "";
  
  const inactiveBodyImg = useCid
    ? `<img src="cid:inactive-body" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="We're here when you're ready">`
    : inactiveBodyBase64
    ? `<img src="${inactiveBodyBase64}" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="We're here when you're ready">`
    : "";

  const parsed = parseEmailText(textContent || "");
  const greetingText = parsed.greeting || defaultGreeting;
  
  // Use parsed paragraphs if available, otherwise fallback to defaultParagraphs.
  // If parsing results in no paragraphs but textContent exists, use textContent as paragraph to ensure WYSIWYG.
  let paragraphs = parsed.paragraphs;
  if (paragraphs.length === 0 && textContent && textContent.trim().length > 0) {
     paragraphs = [textContent];
  } else if (paragraphs.length === 0) {
     paragraphs = defaultParagraphs;
  }

  const signoffText = parsed.signoff || defaultSignoff;

  // Function to add bold formatting to specific terms
  const addBoldFormatting = (text: string): string => {
    if (!text) return text;
    let formatted = text;
    formatted = formatted.replace(/\bmissed and valued\b/gi, '<span style="font-weight:700">missed and valued</span>');
    formatted = formatted.replace(/\bno rush to return\b/gi, '<span style="font-weight:700">no rush to return</span>');
    formatted = formatted.replace(/\bwelcome you back\b/gi, '<span style="font-weight:700">welcome you back</span>');
    return formatted;
  };

  // Generate HTML for all paragraphs
  const paragraphsHtml = paragraphs.map(p => `
    <tr>
    <td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
    <span style="white-space:pre-wrap">${addBoldFormatting(p)}<br></span>
    </td>
    </tr>
    <tr>
    <td style="font-size:0;height:12px" height="12">&nbsp;</td>
    </tr>
  `).join('');

  const formattedSignoffText = addBoldFormatting(signoffText);

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
          ${inactiveBodyImg}
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
<span style="white-space:pre-wrap">${greetingText}<br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:12px" height="12">&nbsp;</td>
</tr>
${paragraphsHtml}
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${formattedSignoffText}<br></span>
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

