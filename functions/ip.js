// API: /ip
export async function onRequest(context) {
  const { request } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = request.headers.get('cf-connecting-ip') || 
                request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'Unknown';

    const country = request.headers.get('cf-ipcountry') || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    try {
      if (ip && ip !== 'Unknown') {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { 'User-Agent': 'CheckTools/1.0' },
          signal: AbortSignal.timeout(3000)
        });

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          
          return new Response(
            JSON.stringify({
              ip: ip,
              country: geoData.country_name || country,
              countryCode: geoData.country_code || country,
              city: geoData.city || null,
              region: geoData.region || null,
              timezone: geoData.timezone || null,
              postal: geoData.postal || null,
              org: geoData.org || null,
              isp: geoData.org || null,
              userAgent: userAgent,
              timestamp: new Date().toISOString()
            }),
            { status: 200, headers: corsHeaders }
          );
        }
      }
    } catch (geoError) {
      console.error('GeoIP lookup failed:', geoError);
    }

    return new Response(
      JSON.stringify({
        ip: ip,
        country: country,
        countryCode: country,
        city: null,
        region: null,
        timezone: null,
        postal: null,
        userAgent: userAgent,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ 
        error: err.message,
        message: 'Cannot get IP information'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}