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
.downtime-image-wrapper {
  text-align: center;
  padding: 0 20px;
}
.downtime-image {
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
.spacer-small {
  height: 2px;
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
      <div class="downtime-image-wrapper">
        <div class="downtime-image">
          ${downtimeBodyImg}
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
      ${closingText ? `<div class="email-content">
        <div style="white-space: pre-wrap;">${formattedClosingText}<br></div>
      </div>` : ''}
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${signoffText}<br></div>
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
