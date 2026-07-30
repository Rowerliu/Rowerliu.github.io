const MAX_POINTS = 150;

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || 'https://rowerliu.github.io')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const matchedOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}

function requestIsAllowed(request, env) {
  const origin = request.headers.get('Origin');
  return !origin || allowedOrigins(env).includes(origin);
}

function roundedCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(1)) : null;
}

async function dailyVisitorHash(request, env) {
  if (!env.HASH_SALT) throw new Error('HASH_SALT secret is not configured');

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${date}|${ip}|${env.HASH_SALT}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { date, hash };
}

async function readPoints(env) {
  const [pointResult, totalResult] = await Promise.all([
    env.DB.prepare(
      `SELECT lat, lng, city, country, visits AS count, last_seen AS lastSeen
       FROM visitor_locations
       ORDER BY visits DESC, last_seen DESC
       LIMIT ?1`,
    )
      .bind(MAX_POINTS)
      .all(),
    env.DB.prepare('SELECT COALESCE(SUM(visits), 0) AS total FROM visitor_locations').first(),
  ]);

  return {
    points: pointResult.results || [],
    total: Number(totalResult?.total || 0),
  };
}

async function recordVisit(request, env) {
  const cf = request.cf || {};
  const lat = roundedCoordinate(cf.latitude);
  const lng = roundedCoordinate(cf.longitude);

  if (lat === null || lng === null) {
    return { ...(await readPoints(env)), recorded: false, reason: 'location-unavailable' };
  }

  const city = String(cf.city || '');
  const country = String(cf.country || '');
  const locationId = `${lat.toFixed(1)}:${lng.toFixed(1)}:${country}`;
  const { date, hash } = await dailyVisitorHash(request, env);

  const dedupe = await env.DB.prepare(
    'INSERT OR IGNORE INTO daily_visitors (visitor_hash, visit_date) VALUES (?1, ?2)',
  )
    .bind(hash, date)
    .run();

  const isNewDailyVisitor = Number(dedupe.meta?.changes || 0) > 0;
  if (isNewDailyVisitor) {
    await env.DB.prepare(
      `INSERT INTO visitor_locations (id, lat, lng, city, country, visits, last_seen)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         city = excluded.city,
         visits = visitor_locations.visits + 1,
         last_seen = CURRENT_TIMESTAMP`,
    )
      .bind(locationId, lat, lng, city, country)
      .run();
  }

  await env.DB.prepare("DELETE FROM daily_visitors WHERE visit_date < date('now', '-2 days')").run();
  return { ...(await readPoints(env)), recorded: isNewDailyVisitor };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (!requestIsAllowed(request, env)) {
      return json(request, env, { error: 'origin-not-allowed' }, 403);
    }

    const { pathname } = new URL(request.url);

    try {
      if (request.method === 'GET' && pathname === '/health') {
        return json(request, env, { ok: true });
      }
      if (request.method === 'GET' && pathname === '/points') {
        return json(request, env, await readPoints(env));
      }
      if (request.method === 'POST' && pathname === '/visit') {
        return json(request, env, await recordVisit(request, env));
      }

      return json(request, env, { error: 'not-found' }, 404);
    } catch (error) {
      console.error(error);
      return json(request, env, { error: 'visitor-api-unavailable' }, 500);
    }
  },
};
