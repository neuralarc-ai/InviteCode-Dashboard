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

  // Function to add bold formatting to specific terms
  const addBoldFormatting = (text: string): string => {
    if (!text) return text;
    let formatted = text;
    // Make "Added" bold (case-insensitive)
    formatted = formatted.replace(/\bAdded\b/gi, '<span style="font-weight:700">Added</span>');
    // Make "credit balance" bold
    formatted = formatted.replace(/\bcredit balance\b/gi, '<span style="font-weight:700">credit balance</span>');
    // Make "valued" bold
    formatted = formatted.replace(/\bvalued\b/gi, '<span style="font-weight:700">valued</span>');
    // Make "The Helium Team" bold
    formatted = formatted.replace(/\bThe Helium Team\b/gi, '<span style="font-weight:700">The Helium Team</span>');
    return formatted;
  };

  // Apply bold formatting
  const formattedMainText = addBoldFormatting(mainText);
  const formattedSecondaryText = addBoldFormatting(secondaryText);
  const formattedClosingText = addBoldFormatting(closingText);
  const formattedSignoffText = addBoldFormatting(signoffText);

  // Use CID references for SMTP (default), or base64 data URIs for Resend API
  const logoImg = useCid
    ? `<img src="cid:email-logo" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : logoBase64
    ? `<img src="${logoBase64}" width="56" height="57" style="display:block;width:56px;height:auto;max-width:56px;margin:0 auto;" alt="Helium Logo">`
    : "";

  // Use custom image CID if useCustomImage is true, otherwise use default credits-body CID
  const creditsCid = useCustomImage ? 'credits-custom' : 'credits-body';
  const creditsBodyImg = useCid
    ? `<img src="cid:${creditsCid}" width="560" height="220" style="display:block;width:100%;height:auto;max-width:100%" alt="Credits Added">`
    : creditsBodyBase64
    ? `<img src="${creditsBodyBase64}" width="560" height="220" style="display:block;width:100%;height:auto;max-width:100%" alt="Credits Added">`
    : "";

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
.credits-image-wrapper {
  text-align: center;
  padding: 0 20px;
}
.credits-image {
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
.button-wrapper {
  text-align: center;
  padding: 0 20px;
  margin-top: 12px;
}
.button {
  display: inline-block;
  background-color: #4ade80;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
  padding: 14px 32px;
  border-radius: 8px;
  line-height: 1.2;
  letter-spacing: 0.01em;
}
.footer {
  background-color: #f0f1f5;
  padding: 13px 20px;
  text-align: center;
}
.footer-content {
  max-width: 522px;
  margin: 0 auto;
  padding: 7px;
}
.footer-text {
  color: #0e1b10;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-align: left;
  margin-bottom: 16px;
}
.footer-detail {
  color: #0e1b10;
  font-size: 13.3333px;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-align: left;
}
.footer-link {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
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
      <div class="credits-image-wrapper">
        <div class="credits-image">
          ${creditsBodyImg}
        </div>
      </div>
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${greetingText.replace(
    "Greetings from Helium,",
    'Greetings from <span style="font-weight:700">Helium</span>,'
  )}<br></div>
      </div>
      ${mainText ? `<div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedMainText}<br></div>
      </div>` : ''}
      ${secondaryText ? `<div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedSecondaryText}<br></div>
      </div>` : ''}
      ${closingText ? `<div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedClosingText}<br></div>
      </div>` : ''}
      <div class="spacer"></div>
      <div class="email-content">
        <div style="white-space: pre-wrap;">${formattedSignoffText}<br></div>
      </div>
      <div class="button-wrapper">
        <a href="http://he2.ai" target="_blank" rel="noopener noreferrer" class="button">Get Started</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-content">
        <div class="footer-text">Need help?<br></div>
        <div class="footer-detail">
          <span style="white-space: pre-wrap;">Our support team is here to assist you with onboarding, integrations, or deployment. You can reach us directly at </span><a href="mailto:support@he2.ai" class="footer-link">support@he2.ai</a><span style="white-space:pre-wrap"> or through the in-app assistant.</span><br>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}
