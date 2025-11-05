// Cloudflare Pages Function - Domain IP & GeoIP Lookup API (IMPROVED)
// Endpoint: /resolve?domain=example.com

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Validate domain parameter
  if (!domain) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing domain parameter',
        message: 'Vui lòng cung cấp ?domain=example.com'
      }), 
      { 
        status: 400,
        headers: corsHeaders
      }
    );
  }

  // Clean domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0];

  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(cleanDomain)) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid domain',
        message: 'Domain không hợp lệ',
        domain: cleanDomain
      }), 
      { 
        status: 400,
        headers: corsHeaders
      }
    );
  }

  try {
    // Step 1: Resolve domain to IP using Google DNS
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
          message: 'Không tìm thấy địa chỉ IP cho domain này',
          domain: cleanDomain
        }),
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    // Get first A record (IPv4)
    const ipRecord = dnsData.Answer.find(record => record.type === 1);
    if (!ipRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'No A record found',
          message: 'Không tìm thấy IPv4 address',
          domain: cleanDomain
        }),
        { 
          status: 404,
          headers: corsHeaders
        }
      );
    }

    const ip = ipRecord.data;

    // Step 2: Try multiple GeoIP APIs with fallback
    
    // Try API 1: ip-api.com (NO API KEY NEEDED, BETTER RATE LIMITS)
    try {
      const geoResponse = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,timezone,isp,org,as,query`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        
        if (geoData.status === 'success') {
          return new Response(
            JSON.stringify({
              domain: cleanDomain,
              ip: ip,
              country: geoData.country || 'Unknown',
              countryCode: geoData.countryCode || null,
              region: geoData.regionName || geoData.region || 'Unknown',
              city: geoData.city || 'Unknown',
              postal: geoData.zip || null,
              timezone: geoData.timezone || null,
              isp: geoData.isp || 'Unknown',
              org: geoData.org || geoData.as || null,
              asn: geoData.as || null,
              timestamp: new Date().toISOString(),
              source: 'ip-api.com'
            }),
            { 
              status: 200,
              headers: corsHeaders
            }
          );
        }
      }
    } catch (err) {
      console.log('ip-api.com failed:', err.message);
    }

    // Try API 2: ipwho.is (Backup)
    try {
      const whoResponse = await fetch(
        `https://ipwho.is/${ip}`,
        {
          signal: AbortSignal.timeout(5000)
        }
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
              timestamp: new Date().toISOString(),
              source: 'ipwho.is'
            }),
            { 
              status: 200,
              headers: corsHeaders
            }
          );
        }
      }
    } catch (err) {
      console.log('ipwho.is failed:', err.message);
    }

    // Try API 3: ipapi.co (Last resort)
    try {
      const ipapiResponse = await fetch(
        `https://ipapi.co/${ip}/json/`,
        {
          headers: { 'User-Agent': 'CheckTools/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      );

      if (ipapiResponse.ok) {
        const ipapiData = await ipapiResponse.json();
        
        // Check if not rate limited
        if (!ipapiData.error) {
          return new Response(
            JSON.stringify({
              domain: cleanDomain,
              ip: ip,
              country: ipapiData.country_name || 'Unknown',
              countryCode: ipapiData.country_code || null,
              region: ipapiData.region || 'Unknown',
              city: ipapiData.city || 'Unknown',
              postal: ipapiData.postal || null,
              timezone: ipapiData.timezone || null,
              isp: ipapiData.org || 'Unknown',
              org: ipapiData.org || null,
              asn: ipapiData.asn || null,
              latitude: ipapiData.latitude || null,
              longitude: ipapiData.longitude || null,
              timestamp: new Date().toISOString(),
              source: 'ipapi.co'
            }),
            { 
              status: 200,
              headers: corsHeaders
            }
          );
        }
      }
    } catch (err) {
      console.log('ipapi.co failed:', err.message);
    }

    // Try API 4: Cloudflare's own trace (Basic info only)
    try {
      const cfResponse = await fetch(`https://1.1.1.1/cdn-cgi/trace`);
      const cfText = await cfResponse.text();
      const cfData = Object.fromEntries(
        cfText.split('\n').map(line => line.split('=')).filter(pair => pair.length === 2)
      );
      
      // This won't give us target IP info, but it's here as an example
    } catch (err) {
      console.log('Cloudflare trace failed:', err.message);
    }

    // If all APIs fail, return basic info
    return new Response(
      JSON.stringify({
        domain: cleanDomain,
        ip: ip,
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        isp: 'Unknown',
        message: 'Chỉ có thông tin IP cơ bản (Tất cả GeoIP APIs đều thất bại)',
        error: 'All GeoIP APIs failed or rate limited',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ 
        error: err.message,
        message: 'Không thể tra cứu domain',
        domain: cleanDomain
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
