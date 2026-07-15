// netlify/functions/cal-webhook.js
//
// Riceve il webhook di Cal.com. Quando una prenotazione viene CONFERMATA
// (per eventi "richiede conferma", l'evento e' BOOKING_CREATED), scrive/aggiorna
// la call nella tabella Supabase geneu_calls, incrociando per EMAIL con il lead
// gia' salvato dall'autoresponder (cosi' porta con se' il "perche'").
//
// URL da incollare in Cal.com > Settings > Webhooks:
//   https://www.generationeurope.eu/.netlify/functions/cal-webhook
// Trigger: Booking Created (+ eventualmente Booking Rescheduled / Cancelled).
//
// Env var su Netlify:
//   SUPABASE_SERVICE_KEY  (segreto)
//   SUPABASE_URL          (opz.)
//   CAL_WEBHOOK_SECRET    (opz.) — se impostato, verifica la firma X-Cal-Signature-256

const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oalkecucljumelkzahgr.supabase.co';

function verifySignature(rawBody, headers) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return true; // niente secret => non verifichiamo
  const sig = headers['x-cal-signature-256'] || headers['X-Cal-Signature-256'];
  if (!sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
  catch { return false; }
}

async function supabase(method, path, body) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) console.error('Supabase', method, path, res.status, await res.text());
  return res;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method not allowed' };
  const raw = event.body || '{}';

  if (!verifySignature(raw, event.headers || {})) {
    console.error('cal-webhook: firma non valida');
    return { statusCode: 401, body: 'invalid signature' };
  }

  let body;
  try { body = JSON.parse(raw); } catch { return { statusCode: 400, body: 'bad json' }; }

  const trigger = body.triggerEvent || body.event || '';
  const p = body.payload || {};

  // Estrazione difensiva (lo shape esatto Cal lo confermeremo col test reale).
  const attendee = (Array.isArray(p.attendees) && p.attendees[0]) || {};
  const email = (attendee.email || p.email || '').trim().toLowerCase();
  const name  = attendee.name || p.name || null;
  const start = p.startTime || p.start || (p.booking && p.booking.startTime) || null;
  const uid   = p.uid || (p.booking && p.booking.uid) || null;
  const meetingUrl =
    (p.metadata && p.metadata.videoCallUrl) ||
    (p.videoCallData && p.videoCallData.url) ||
    (typeof p.location === 'string' && /^https?:\/\//.test(p.location) ? p.location : null) ||
    null;
  // log per confermare il campo esatto del link Meet al primo booking reale
  console.log('cal-webhook meeting fields', JSON.stringify({ location: p.location, videoCallUrl: p.metadata && p.metadata.videoCallUrl, videoCallData: p.videoCallData }));

  if (!email) return { statusCode: 200, body: 'no email in payload' };

  try {
    if (trigger === 'BOOKING_CANCELLED') {
      // call annullata: la togliamo dalla lista (call_start -> null)
      await supabase('PATCH', `geneu_calls?email=eq.${encodeURIComponent(email)}`,
        { call_start: null, cal_booking_uid: null, meeting_url: null, status: 'todo' });
      return { statusCode: 200, body: 'cancelled' };
    }

    // BOOKING_CREATED (conferma) o BOOKING_RESCHEDULED
    if (trigger === 'BOOKING_CREATED' || trigger === 'BOOKING_RESCHEDULED') {
      const row = { email, name, call_start: start, cal_booking_uid: uid, status: 'todo' };
      if (meetingUrl) row.meeting_url = meetingUrl; // solo se trovato, per non azzerarlo
      await supabase('POST', 'geneu_calls?on_conflict=email', [row]);
      return { statusCode: 200, body: 'ok' };
    }

    return { statusCode: 200, body: `ignored: ${trigger}` };
  } catch (e) {
    console.error('cal-webhook error', e);
    return { statusCode: 500, body: 'error' };
  }
};
