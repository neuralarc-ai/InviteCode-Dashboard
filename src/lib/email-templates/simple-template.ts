// Simple email template generator for sections that don't need special HTML structure
export function convertTextToHtml(textContent: string): string {
  // Split by double newlines to separate the heading from the content
  const parts = textContent.split(/\n\n+/);
  const firstLine = parts[0]?.trim() || '';
  const restOfContent = parts.slice(1).join('\n\n');
  
  // Convert the rest of the content: double newlines become paragraph breaks, single newlines become line breaks
  let htmlContent = '';
  if (restOfContent.trim()) {
    htmlContent = restOfContent
      .replace(/\n\n+/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
  
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#CFEBD5;margin:0;padding:0;font-family:Arial, Helvetica, sans-serif">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#CFEBD5" style="background-color:#CFEBD5">
<tbody>
<tr>
<td style="background-color:#CFEBD5">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:0 auto;background-color:#ffffff">
<tbody>
<tr>
<td style="padding:20px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="color:#000;font-style:normal;font-weight:normal;font-size:16px;line-height:1.6;letter-spacing:0;text-align:left;direction:ltr;border-collapse:collapse;font-family:Arial, Helvetica, sans-serif;white-space:normal;word-wrap:break-word;word-break:break-word">
<tbody>
${firstLine ? `<tr>
<td dir="ltr" style="color:#1a1a1a;font-size:24px;font-weight:700;line-height:1.6;text-align:left;padding:0 0 16px 0">
<span style="white-space:pre-wrap">${firstLine}</span>
</td>
</tr>` : ''}
${htmlContent ? `<tr>
<td dir="ltr" style="color:#333;font-size:16px;line-height:1.6;text-align:left;padding:0">
<span style="white-space:pre-wrap">${htmlContent}</span>
</td>
</tr>` : ''}
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

