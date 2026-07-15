// netlify/functions/calls-data.js
//
// Backend dell'app "call desk" (pagina nascosta gestione-call-...).
// Protetta da PASSCODE verificato LATO SERVER: i dati delle call escono SOLO
// dopo password corretta (non sono nel sorgente della pagina).
//
// Contratto (POST JSON):
//   { passcode, action: "list" }                    -> { calls: [...] }
//   { passcode, action: "setStatus", id, status }   -> { ok: true }   (status: "todo"|"done")
//
// Env var su Netlify:
//   CALL_DESK_PASSCODE    (segreto) — la password condivisa dei co-founder
//   SUPABASE_SERVICE_KEY  (segreto)
//   SUPABASE_URL          (opz.)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oalkecucljumelkzahgr.supabase.co';

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

async function sb(method, path, body) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    apikey: key || '',
    Authorization: `Bearer ${key || ''}`,
    'Content-Type': 'application/json',
  };
  if (method === 'PATCH') headers.Prefer = 'return=minimal';
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });

  let req;
  try { req = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad json' }); }

  const pass = process.env.CALL_DESK_PASSCODE;
  if (!pass || req.passcode !== pass) return json(401, { error: 'unauthorized' });

  try {
    if (req.action === 'list') {
      const res = await sb('GET',
        'geneu_calls?select=id,name,email,call_start,why,city,country,role,status&call_start=not.is.null&order=call_start.asc');
      if (!res.ok) return json(502, { error: 'db read failed' });
      const calls = await res.json();
      return json(200, { calls });
    }

    if (req.action === 'setStatus') {
      const status = req.status === 'done' ? 'done' : 'todo';
      if (!req.id) return json(400, { error: 'missing id' });
      const res = await sb('PATCH', `geneu_calls?id=eq.${encodeURIComponent(req.id)}`, { status });
      if (!res.ok) return json(502, { error: 'db update failed' });
      return json(200, { ok: true });
    }

    return json(400, { error: 'unknown action' });
  } catch (e) {
    console.error('calls-data error', e);
    return json(500, { error: 'error' });
  }
};
