// Free IP geolocation + user-agent parsing for visitor analytics.
// ip-api.com needs no API key (free tier: 45 requests/min); results are
// cached in memory so repeat visitors cost nothing. Works on Node 18+
// (global fetch) with zero new dependencies.
const cache = new Map();

function isLocalIp(ip) {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.')
  );
}

// "37.111.22.10" -> { city: "Dehradun", country: "India" } (city-level, approximate)
async function geoLookup(ip) {
  if (isLocalIp(ip)) return { city: 'Local', country: 'Local' };
  if (cache.has(ip)) return cache.get(ip);
  const fallback = { city: '', country: '' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const d = await res.json().catch(() => ({}));
    const out =
      d && d.status === 'success' ? { city: d.city || '', country: d.country || '' } : fallback;
    cache.set(ip, out);
    if (cache.size > 2000) cache.clear(); // keep memory bounded
    return out;
  } catch (e) {
    return fallback;
  }
}

// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/120.0 ..." -> "Chrome · Windows"
function parseDevice(ua) {
  ua = String(ua || '');
  let browser = 'Unknown';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua)) browser = 'Opera';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  let os = '';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  return os ? `${browser} · ${os}` : browser;
}

// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/120.0 ..." -> "Chrome"
function parseBrowser(ua) {
  ua = String(ua || '');
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua)) return 'Opera';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Unknown';
}

module.exports = { geoLookup, parseDevice, parseBrowser };
