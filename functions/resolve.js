// API: /resolve?domain=example.com
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!domain) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing domain parameter',
        message: 'Please provide ?domain=example.com'
      }), 
      { status: 400, headers: corsHeaders }
    );
  }

  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0];

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(cleanDomain)) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid domain',
        message: 'Domain format is invalid',
        domain: cleanDomain
      }), 
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const dnsResponse = await fetch(
      `https://dns.google/resolve?name=${cleanDomain}&type=A`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!dnsResponse.ok) {
      throw new Error('DNS lookup failed');
    }

    const dnsData = await dnsResponse.json();
    
    if (!dnsData.Answer || dnsData.Answer.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Domain not found',
          message: 'No IP address found for this domain',
          domain: cleanDomain
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const ipRecord = dnsData.Answer.find(record => record.type === 1);
    if (!ipRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'No A record found',
          message: 'No IPv4 address found',
          domain: cleanDomain
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const ip = ipRecord.data;

    try {
      const geoResponse = await fetch(
        `https://ipapi.co/${ip}/json/`,
        {
          headers: { 'User-Agent': 'CheckTools/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        
        return new Response(
          JSON.stringify({
            domain: cleanDomain,
            ip: ip,
            country: geoData.country_name || 'Unknown',
            countryCode: geoData.country_code || null,
            region: geoData.region || 'Unknown',
            city: geoData.city || 'Unknown',
            postal: geoData.postal || null,
            timezone: geoData.timezone || null,
            isp: geoData.org || 'Unknown',
            org: geoData.org || null,
            asn: geoData.asn || null,
            latitude: geoData.latitude || null,
            longitude: geoData.longitude || null,
            timestamp: new Date().toISOString()
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    } catch (geoError) {
      console.error('GeoIP lookup failed:', geoError);
    }

    try {
      const whoResponse = await fetch(
        `https://ipwho.is/${ip}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (whoResponse.ok) {
        const whoData = await whoResponse.json();
        
        if (whoData.success) {
          return new Response(
            JSON.stringify({
              domain: cleanDomain,
              ip: ip,
              country: whoData.country || 'Unknown',
              countryCode: whoData.country_code || null,
              region: whoData.region || 'Unknown',
              city: whoData.city || 'Unknown',
              postal: whoData.postal || null,
              timezone: whoData.timezone?.id || null,
              isp: whoData.connection?.isp || 'Unknown',
              org: whoData.connection?.org || null,
              asn: whoData.connection?.asn || null,
              latitude: whoData.latitude || null,
              longitude: whoData.longitude || null,
              timestamp: new Date().toISOString()
            }),
            { status: 200, headers: corsHeaders }
          );
        }
      }
    } catch (whoError) {
      console.error('ipwho.is lookup failed:', whoError);
    }

    return new Response(
      JSON.stringify({
        domain: cleanDomain,
        ip: ip,
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        isp: 'Unknown',
        message: 'Basic info only (GeoIP lookup failed)',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ 
        error: err.message,
        message: 'Cannot resolve domain',
        domain: cleanDomain
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}