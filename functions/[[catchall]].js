// Cloudflare Pages Function — Email Handler
// Email Routing: catch-all → Function ini → POST ke Tempik API
//
// Tempik API: https://tempik.mdstudioai.my.id

const TEMPIK_URL = 'https://mdstudioai.my.id/tempik-api';

export async function onRequestEmail(context) {
  const message = context.email;
  const to = message.headers.get('to') || '';
  const from = message.headers.get('from') || '';
  const subject = message.headers.get('subject') || '';

  // Parse email body
  let body = '';
  try {
    const raw = await new Response(message.raw).text();
    const bnd = raw.match(/boundary="?([^";\r\n]+)"?/i);
    if (bnd) {
      const parts = raw.split('--' + bnd[1]);
      for (const p of parts) {
        if (p.toLowerCase().includes('content-type: text/plain')) {
          const i = p.indexOf('\r\n\r\n');
          if (i > -1) { body = p.substring(i + 4).trim(); break; }
        }
      }
    }
    if (!body) {
      const i = raw.indexOf('\r\n\r\n');
      body = i > -1 ? raw.substring(i + 4).trim() : raw.substring(0, 5000);
    }
  } catch (e) {
    body = 'Parse error: ' + e.message;
  }

  // Extract OTP (x.ai format: XXX-XXX atau 6 digit)
  let otp = null;
  const hay = subject + ' ' + body;
  const m3 = hay.match(/(\d{3})-(\d{3})/);
  if (m3) {
    otp = m3[1] + m3[2];
  } else {
    const m6 = hay.match(/(?<!\d)(\d{6})(?!\d)/);
    if (m6) otp = m6[1];
  }

  // POST ke Tempik API
  try {
    const resp = await fetch(`${TEMPIK_URL}/api/inboxes/${encodeURIComponent(to)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: from,
        subject: subject,
        body: body.substring(0, 10000),
        otp: otp,
      }),
    });
    const result = await resp.text();
    console.log(`[EMAIL-ROUTER] ${to} | OTP: ${otp} | Status: ${resp.status}`);
  } catch (e) {
    console.error(`[EMAIL-ROUTER] Forward failed: ${e.message}`);
  }

  return new Response('OK', { status: 200 });
}
