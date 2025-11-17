import { parseEmailText } from "./text-parser";

interface CreditsTemplateOptions {
  logoBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  creditsBodyBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  useCid?: boolean; // If true, use CID references (for SMTP). Default: true
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
  useCustomImage?: boolean; // If true, use credits-custom CID instead of credits-body
}

export function createCreditsHtmlTemplate(
  options: CreditsTemplateOptions
): string {
  const {
    logoBase64,
    creditsBodyBase64,
    useCid = true, // Default to CID for SMTP compatibility
    useCustomImage = false,
    textContent,
    defaultGreeting = "Greetings from Helium,",
    defaultParagraphs = [
      "We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.",
      "You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.",
      "Thank you for being a valued member of the Helium community.",
    ],
    defaultSignoff = "Thanks,<br>The Helium Team",
  } = options;

  // Parse text content
  const parsed = parseEmailText(textContent || "");
  const greetingText = parsed.greeting || defaultGreeting;
  const paragraphs =
    parsed.paragraphs.length > 0 ? parsed.paragraphs : defaultParagraphs;
  const signoffText = parsed.signoff || defaultSignoff;

  // Distribute paragraphs - use first paragraph as main text, second as secondary, rest as closing
  const mainText = paragraphs[0] || "";
  const secondaryText = paragraphs[1] || "";
  const closingText = paragraphs.slice(2).join(" ") || "";

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%" alt="Helium Logo">`
    : "";

  // Use custom image CID if useCustomImage is true, otherwise use default credits-body CID
  const creditsCid = useCustomImage ? 'credits-custom' : 'credits-body';
  const creditsBodyImg = useCid
    ? `<img src="cid:${creditsCid}" width="560" height="220" style="display:block;width:100%;height:auto;max-width:100%" alt="Credits Added">`
    : creditsBodyBase64
    ? `<img src="${creditsBodyBase64}" width="560" height="220" style="display:block;width:100%;height:auto;max-width:100%" alt="Credits Added">`
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
<td style="width:100%;padding:20 0">
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
${creditsBodyImg}
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
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${greetingText.replace(
    "Greetings from Helium,",
    'Greetings from <span style="font-weight:700">Helium</span>,'
  )}</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
${mainText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;line-height:1.84;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap">${mainText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>` : ''}
${secondaryText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
${secondaryText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>` : ''}
${closingText ? `<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
${closingText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>` : ''}
<tr>
<td dir="ltr" style="color:#333333;font-size:18.6667px;white-space:pre-wrap;line-height:1.84;text-align:left;padding:0px 20px">
${signoffText}<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:8px" height="8">&nbsp;</td>
</tr>
<tr>
<td style="padding:0px 20px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
<tbody>
<tr>
<td align="center" style="padding:0">
<a href="http://he2.ai" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#4ade80;color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:600;text-decoration:none;text-align:center;padding:14px 32px;border-radius:8px;line-height:1.2;letter-spacing:0.01em">Get Started</a>
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
<table border="0" cellpadding="0" cellspacing="0" class="layout-0" align="center" style="display:table;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#f0f1f5">
<tbody>
<tr>
<td style="text-align:center;padding:13.099106420068516px 20px">
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
<td dir="ltr" style="color:#0e1b10;font-size:16px;font-weight:700;letter-spacing:-0.01em;white-space:pre-wrap;line-height:1.2;text-align:left">Need help?<br></td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#0e1b10;font-size:13.3333px;letter-spacing:-0.01em;line-height:1.2;text-align:left">
<span style="white-space:pre-wrap">Our support team is here to assist you with onboarding, integrations, or deployment. You can reach us directly at </span><a href="mailto:support@he2.ai" style="color:#2563eb;font-weight:700;text-decoration:none;white-space:pre-wrap">support@he2.ai</a><span style="white-space:pre-wrap"> or through the in-app assistant.</span><span style="white-space:pre-wrap"><br></span>
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
<table border="0" cellpadding="0" cellspacing="0" class="layout-0-under-450" align="center" style="display:none;border-spacing:0px;border-collapse:separate;width:100%;max-width:100%;table-layout:fixed;margin:0 auto;background-color:#f0f1f5">
<tbody>
<tr>
<td style="text-align:center;padding:13.099106420068516px 20px">
<table border="0" cellpadding="0" cellspacing="0" style="border-spacing:0px;border-collapse:separate;width:100%;max-width:420px;table-layout:fixed;margin:0 auto">
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
<td dir="ltr" style="color:#0e1b10;font-size:16px;font-weight:700;letter-spacing:-0.01em;white-space:pre-wrap;line-height:1.2;text-align:left">Need help?<br></td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#0e1b10;font-size:13.3333px;letter-spacing:-0.01em;line-height:1.2;text-align:left">
<span style="white-space:pre-wrap">Our support team is here to assist you with onboarding, integrations, or deployment. You can reach us directly at </span><a href="mailto:support@he2.ai" style="color:#2563eb;font-weight:700;text-decoration:none;white-space:pre-wrap">support@he2.ai</a><span style="white-space:pre-wrap"> or through the in-app assistant.</span><span style="white-space:pre-wrap"><br></span>
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
