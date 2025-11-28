import { parseEmailText } from "./text-parser";

interface UptimeTemplateOptions {
  logoBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  uptimeBodyBase64?: string | null; // Optional: for base64 data URIs (Resend API)
  useCid?: boolean; // If true, use CID references (for SMTP). Default: true
  textContent?: string;
  defaultGreeting?: string;
  defaultParagraphs?: string[];
  defaultSignoff?: string;
}

export function createUptimeHtmlTemplate(
  options: UptimeTemplateOptions
): string {
  const {
    logoBase64,
    uptimeBodyBase64,
    useCid = true, // Default to CID for SMTP compatibility
    textContent,
    defaultGreeting = "Greetings from Helium,",
    defaultParagraphs = [
      "We're pleased to inform you that Helium is now back online and fully operational after scheduled maintenance.",
      "All systems are running smoothly, and you can now access all features and services as usual. We appreciate your patience during the brief maintenance window.",
      "If you experience any issues, please don't hesitate to reach out to our support team.",
    ],
    defaultSignoff = "Thanks,<br>The Helium Team",
  } = options;

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : "";
  
  const uptimeBodyImg = useCid
    ? `<img src="cid:uptime-body" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="System Back Online">`
    : uptimeBodyBase64
    ? `<img src="${uptimeBodyBase64}" width="560" height="420" style="display:block;width:100%;height:auto;max-width:100%" alt="System Back Online">`
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

  // Function to add bold formatting to specific terms
  const addBoldFormatting = (text: string): string => {
    if (!text) return text;
    let formatted = text;
    // Make "back online" bold
    formatted = formatted.replace(/\bback online\b/gi, '<span style="font-weight:700">back online</span>');
    // Make "patience" bold
    formatted = formatted.replace(/\bpatience\b/gi, '<span style="font-weight:700">patience</span>');
    // Make "The Helium Team" bold
    formatted = formatted.replace(/\bThe Helium Team\b/gi, '<span style="font-weight:700">The Helium Team</span>');
    return formatted;
  };

  // Apply bold formatting
  const formattedMainText = addBoldFormatting(mainText);
  const formattedSecondaryText = addBoldFormatting(secondaryText);
  const formattedClosingText = addBoldFormatting(closingText);
  const formattedSignoffText = addBoldFormatting(signoffText);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="x-apple-disable-message-reformatting">
<style>
body {
  width: 100%;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  background-color: #f0f1f5;
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
}
.email-container {
  max-width: 600px;
  margin: 0 auto;
  background-color: #ffffff;
}
.email-content {
  padding: 0 20px;
  margin-bottom: 6px;
  color: #333333;
  font-size: 18.6667px;
  line-height: 1.84;
  text-align: left;
}
.logo-wrapper {
  text-align: center;
  padding: 12px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.uptime-image-wrapper {
  text-align: center;
  padding: 0 20px;
}
.uptime-image {
  max-width: 560px;
  width: 100%;
  height: auto;
}
.spacer {
  height: 12px;
}
.spacer-large {
  height: 16px;
}
.footer {
  background-color: #070300;
  padding: 13px 20px;
  text-align: center;
}
.footer-content {
  max-width: 522px;
  margin: 0 auto;
  padding: 7px;
}
.footer-text {
  color: #f6f5f1;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-align: left;
  margin-bottom: 16px;
}
.footer-detail {
  color: #f6f5f1;
  font-size: 13.3333px;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-align: left;
}
@media (max-width: 450px) {
  .footer {
    display: none;
  }
}
</style>
</head>
<body>
<div style="background-color: #f0f1f5; width: 100%;">
  <div class="email-container">
    <div style="padding: 10px 0 0 0;">
      <div class="logo-wrapper">
        ${logoImg}
      </div>
      <div class="spacer-large"></div>
      <div class="uptime-image-wrapper">
        <div class="uptime-image">
          ${uptimeBodyImg}
        </div>
      </div>
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${greetingText.replace(
    "Greetings from Helium,",
    'Greetings from <span style="font-weight:700">Helium</span>,'
  )}<br></div>
      </div>
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedMainText}<br></div>
      </div>
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedSecondaryText}<br></div>
      </div>
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedClosingText}<br></div>
      </div>
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedSignoffText}<br></div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-content">
        <div class="footer-text">Need help?<br></div>
        <div class="footer-detail">
          <span style="white-space: pre-wrap;">Our support team is here to assist you with onboarding, integrations, or deployment. You can reach us directly at </span><span style="font-weight:700;white-space:pre-wrap">support@he2.ai</span><span style="white-space:pre-wrap"> or through the in-app assistant.</span><br>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
