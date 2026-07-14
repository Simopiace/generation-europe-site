// netlify/functions/submission-created.js
//
// Netlify richiama AUTOMATICAMENTE questa funzione a ogni invio di un Netlify Form
// (evento "submission-created"). Due compiti, SOLO per il modulo italiano "join-it":
//   1) invia l'autoresponder al richiedente via Resend, con RITARDO 1-5h in orario diurno
//      (9-20 Europe/Rome) — cosi' la frase "l'abbiamo esaminata" e' credibile;
//   2) salva/aggiorna il "lead" su Supabase (tabella geneu_calls) cosi' il webhook Cal,
//      alla conferma della call, ritrova il "perche'" incrociando l'email.
//
// Env var richieste su Netlify:
//   BREVO_API_KEY           (segreto)  — Brevo, dominio autenticato (DKIM)
//   SUPABASE_SERVICE_KEY    (segreto)  — service_role di Supabase
//   SUPABASE_URL            (opz.)     — default sotto

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oalkecucljumelkzahgr.supabase.co';
const BOOKING_URL  = 'https://www.generationeurope.eu/it/prenota-call';

function romeHour(d) {
  return parseInt(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', hour: '2-digit', hour12: false,
  }).format(d), 10);
}

// Ritardo casuale 1-5h, poi spostato dentro la finestra diurna 09:00-19:59 (Europe/Rome).
function computeScheduledAt() {
  let target = new Date(Date.now() + (1 + Math.random() * 4) * 3600 * 1000);
  let guard = 0;
  while (guard++ < 48) {
    const h = romeHour(target);
    if (h >= 9 && h < 20) break;
    target = new Date(target.getTime() + 3600 * 1000); // +1h finche' non rientra in orario
  }
  return target.toISOString();
}

function emailHtml(saluto) {
  return `<div style="font-family: Verdana, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1a2230;">
  <p>${saluto}</p>
  <p>grazie per la richiesta di adesione che ci hai inviato. L'abbiamo esaminata con attenzione, e dopo una prima valutazione il tuo profilo &egrave; risultato in linea con gli obiettivi e con il pensiero di Generation Europe.</p>
  <p>Ci piacerebbe quindi conoscerti. Il prossimo passo &egrave; una videochiamata di mezz'ora con noi fondatori, dove ci parli di te e di come vorresti contribuire, e ti racconteremo a che punto &egrave; l'associazione e cosa stiamo preparando.</p>
  <p>Ti invitiamo a leggere il sito, in particolare le sezioni Chi Siamo, La Vision e Il Piano, prima dell'incontro: cos&igrave; arriverai sapendo gi&agrave; che cos'&egrave; Generation Europe, cosa vuole e in che modo intende agire.</p>
  <p>Ora che siamo un'associazione a tutti gli effetti, stiamo ammettendo i primi soci: chi entra in questa fase parteciper&agrave; fin dall'inizio ai gruppi di lavoro e agli eventi a loro riservati.</p>
  <p>Puoi prenotare la videochiamata da qui, scegliendo il giorno e l'orario che preferisci:</p>
  <p><a href="${BOOKING_URL}" style="color:#00163A; font-weight:bold;">${BOOKING_URL}</a></p>
  <p>Gli slot delle prossime settimane sono limitati: meglio prenotare con qualche giorno di anticipo.</p>
  <p>A presto,<br>I fondatori di Generation Europe<br><a href="https://www.generationeurope.eu" style="color:#00163A;">www.generationeurope.eu</a></p>
</div>`;
}

async function upsertLead(data) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) { console.error('SUPABASE_SERVICE_KEY mancante'); return; }
  const row = {
    name:  data.name || null,
    email: (data.email || '').trim().toLowerCase(),
    why:   data.message || null,
    city:  data.city || null,
    country: data.country || null,
    role:  data.role || null,
    source_lang: 'it',
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/geneu_calls?on_conflict=email`, {
    method: 'POST',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([row]),
  });
  if (!res.ok) console.error('Supabase upsert lead fallito', res.status, await res.text());
}

async function sendEmail(email, saluto) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) { console.error('BREVO_API_KEY mancante'); return; }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Generation Europe', email: 'info@generationeurope.eu' },
      to: [{ email }],
      subject: 'La tua richiesta di adesione a Generation Europe',
      htmlContent: emailHtml(saluto),
      scheduledAt: computeScheduledAt(), // ISO 8601, <=72h avanti (Brevo)
    }),
  });
  if (!res.ok) console.error('Brevo send fallito', res.status, await res.text());
}

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || '{}');
    const data = (payload && payload.data) || {};
    const formName = (payload && payload.form_name) || '';

    if (formName !== 'join-it') {
      return { statusCode: 200, body: `skip: ${formName}` };
    }
    const email = (data.email || '').trim();
    if (!email) return { statusCode: 200, body: 'no email in submission' };

    const firstName = (data.name || '').trim().split(/\s+/)[0] || '';
    const saluto = firstName ? `Ciao ${firstName},` : 'Ciao,';

    // Non blocchiamo l'uno sull'altro: se uno fallisce, l'altro va comunque.
    const results = await Promise.allSettled([ sendEmail(email, saluto), upsertLead(data) ]);
    results.forEach((r) => { if (r.status === 'rejected') console.error('task fallito', r.reason); });

    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('submission-created error', e);
    return { statusCode: 500, body: 'error' };
  }
};
