// ip.txt — API: GET /ip
export async function onRequest(context) {
  const { request } = context;
  const ip = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const cf = request.cf || {};
  const ua = request.headers.get('User-Agent') || '';

  return new Response(
    JSON.stringify({
      ip: ip,
      countryCode: cf.country || 'N/A',
      country: cf.country || 'N/A',
      region: cf.region || '',
      city: cf.city || '',
      postal: cf.postalCode || '',
      timezone: cf.timezone || '',
      isp: '', // Không có trên CF miễn phí
      org: '',
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
