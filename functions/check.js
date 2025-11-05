// API: /check?url=https://example.com
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing URL parameter',
        message: 'Please provide ?url=https://example.com'
      }), 
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    new URL(targetUrl);
  } catch (e) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid URL',
        message: 'URL format is invalid',
        url: targetUrl
      }), 
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const startTime = Date.now();
    
    const response = await fetch(targetUrl, { 
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (CheckTools-Bot) Website-Status-Checker'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    const responseTime = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        url: targetUrl,
        status: response.ok ? 'up' : 'down',
        up: response.ok,
        ok: response.ok,
        http_code: response.status,
        statusText: response.statusText,
        response_time: `${responseTime}ms`,
        time: responseTime,
        timeFormatted: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );
    
  } catch (err) {
    return new Response(
      JSON.stringify({ 
        url: targetUrl,
        status: 'down',
        up: false,
        ok: false,
        error: err.message,
        message: 'Website cannot be reached',
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );
  }
}