import { parseEmailText } from "./text-parser";

interface CreditsTemplateOptions {
  logoBase64: string | null;
  creditsBodyBase64: string | null;
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
}

export function createCreditsHtmlTemplate(
  options: CreditsTemplateOptions
): string {
  const {
    logoBase64,
    creditsBodyBase64,
    textContent,
    defaultGreeting = "Greetings from Helium,",
    defaultParagraphs = [
      "We're excited to inform you that credits have been added to your Helium account. These credits are now available for you to use across all platform features.",
      "You can check your credit balance in your account dashboard at any time. If you have any questions about your credits or how to use them, please feel free to reach out to our support team.",
      "Thank you for being a valued member of the Helium community.",
    ],
    defaultSignoff = "Thanks,<br>The Helium Team",
  } = options;

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:100%;height:auto;max-width:100%">`
    : "";
  const creditsBodyImg = creditsBodyBase64
    ? `<img src="${creditsBodyBase64}" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%">`
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
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background-color:#eedbcd">
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
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#0e1b10;font-size:16px;letter-spacing:-0.04em;line-height:1.2;text-align:left;padding:0px 20px">
<span style="font-size:18.6667px;white-space:pre-wrap">Good news. Your </span><span style="font-size:18.6667px;font-weight:700;white-space:pre-wrap">Helium AI account has been added with new </span><span style="font-size:21.3333px;font-weight:700;white-space:pre-wrap">5000 credits</span><span style="font-size:18.6667px;white-space:pre-wrap">, ready to power your next wave of intelligent operations.</span><span style="font-size:18.6667px;white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#0e1b10;font-size:18.6667px;letter-spacing:-0.04em;line-height:1.2;text-align:left;padding:0px 20px">
<span style="white-space:pre-wrap"><br>Every credit you use activates </span><span style="font-weight:700;white-space:pre-wrap">Helium’s Adaptive Intelligence Memory (AIM)</span><span style="white-space:pre-wrap"> and </span><span style="font-weight:700;white-space:pre-wrap">Helio Orchestrator</span><span style="white-space:pre-wrap">, enabling your organisation to think, learn, and act faster than ever.</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="color:#0e1b10;font-size:18.6667px;letter-spacing:-0.04em;white-space:pre-wrap;line-height:1.2;text-align:left;padding:0px 20px">
<br>Here is what you can do right now:<br>
</td>
</tr>
<tr>
<td style="font-size:0;height:16px" height="16">&nbsp;</td>
</tr>
<tr>
<td dir="ltr" style="line-height:1.2;text-align:left;padding:0px 20px;font-size:0">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial, Helvetica, sans-serif">
<tbody>
<tr>
<td style="width:24px;vertical-align:top;padding-right:8px;text-align:right">
<span style="font-size:18.6667px;color:#0e1b10;display:inline-block">•</span>
</td>
<td style="font-size:18.6667px;letter-spacing:-0.04em;color:#0e1b10;vertical-align:top">
<span style="font-weight:700;white-space:pre-wrap">Run deeper analysis</span><span style="white-space:pre-wrap"> with contextual intelligence from AIM.</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td dir="ltr" style="line-height:1.2;text-align:left;padding:0px 20px;font-size:0">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial, Helvetica, sans-serif">
<tbody>
<tr>
<td style="width:24px;vertical-align:top;padding-right:8px;text-align:right">
<span style="font-size:18.6667px;color:#0e1b10;display:inline-block">•</span>
</td>
<td style="font-size:18.6667px;letter-spacing:-0.04em;color:#0e1b10;vertical-align:top">
<span style="font-weight:700;white-space:pre-wrap">Automate workflows</span><span style="white-space:pre-wrap"> across departments using Helio.</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td dir="ltr" style="line-height:1.2;text-align:left;padding:0px 20px;font-size:0">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial, Helvetica, sans-serif">
<tbody>
<tr>
<td style="width:24px;vertical-align:top;padding-right:8px;text-align:right">
<span style="font-size:18.6667px;color:#0e1b10;display:inline-block">•</span>
</td>
<td style="font-size:18.6667px;letter-spacing:-0.04em;color:#0e1b10;vertical-align:top">
<span style="font-weight:700;white-space:pre-wrap">Collaborate with AI agents</span><span style="white-space:pre-wrap"> to accelerate decisions and insights.</span><span style="white-space:pre-wrap"><br></span>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td dir="ltr" style="line-height:1.2;text-align:left;padding:0px 20px;font-size:0">
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial, Helvetica, sans-serif">
<tbody>
<tr>
<td style="width:24px;vertical-align:top;padding-right:8px;text-align:right">
<span style="font-size:18.6667px;color:#0e1b10;display:inline-block">•</span>
</td>
<td style="font-size:18.6667px;letter-spacing:-0.04em;color:#0e1b10;vertical-align:top">
<span style="font-weight:700;white-space:pre-wrap">Build lasting intelligence</span><span style="white-space:pre-wrap"> that evolves with your business.</span><span style="font-weight:700;white-space:pre-wrap"><br></span><span style="white-space:pre-wrap"><br>Use your credits wisely. Each interaction strengthens your company’s knowledge ecosystem and enhances Helium’s understanding of your unique business context.</span><span style="white-space:pre-wrap"><br></span>
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
<td dir="ltr" style="color:#0e1b10;font-size:18.6667px;letter-spacing:-0.04em;white-space:pre-wrap;line-height:0.8;text-align:left;padding:0px 20px">
<br>
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
</td>
</tr>
</tbody>
</table>
</body>
</html>`;
}