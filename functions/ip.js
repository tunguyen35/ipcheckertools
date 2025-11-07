// ip.js — API: GET /ip
export async function onRequest(context) {
  const { request } = context;
  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const cf = request.cf || {};
  const ua = request.headers.get('User-Agent') || '';

  // fallback khi CF không có ISP / ORG
  let isp = cf.asOrganization || cf.asn || '';
  let org = cf.asOrganization || '';

  if (!isp || isp === '') {
    try {
      const resp = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { 'User-Agent': 'CheckTools/1.0' },
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        const data = await resp.json();
        isp = data.org || data.asn || 'Không xác định';
        org = data.org || '';
      }
    } catch (e) {
      isp = 'Không xác định';
      org = '';
    }
  }

  return new Response(
    JSON.stringify({
      ip: ip,
      countryCode: cf.country || 'N/A',
      country: cf.country || 'N/A',
      region: cf.region || '',
      city: cf.city || '',
      postal: cf.postalCode || '',
      timezone: cf.timezone || '',
      isp: isp || 'Không xác định',
      org: org || '',
      userAgent: ua
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    }
  );
}
