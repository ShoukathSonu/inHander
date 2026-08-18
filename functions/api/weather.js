/**
 * Cloudflare Pages Function: /api/weather
 * Edge API route for zero-lag, zero-permission client geolocation & weather
 */

export async function onRequest(context) {
  try {
    const cf = context.request.cf || {};
    
    // Extract geolocation from edge request headers with local fallback (Bengaluru)
    const city = cf.city || "Bengaluru";
    const latitude = cf.latitude || "12.9716";
    const longitude = cf.longitude || "77.5946";

    // Query Open-Meteo server-side
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "inHander-Weather/1.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch weather from provider" }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    const data = await response.json();
    const temp = Math.round(data?.current?.temperature_2m ?? 24);

    return new Response(
      JSON.stringify({
        city: city || "Your Location",
        temp: temp
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
