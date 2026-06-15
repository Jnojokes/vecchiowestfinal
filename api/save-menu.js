// =========================================================
// api/save-menu.js · Endpoint serverless del CMS /modifica-menu
//
// Endpoint unico: POST /api/save-menu, body JSON { action, password, menu? }.
// Il token GitHub resta SOLO lato server: il browser invia solo la password.
// L'unico file scrivibile è data/menu.json (path hardcoded, mai dal client).
//
// Action:
//   verify  → password ok                → 200 { ok:true }
//   load    → legge data/menu.json da GH  → 200 { ok:true, menu, sha }
//   publish → committa data/menu.json     → 200 { ok:true }
//
// Env: ADMIN_PASSWORD, GITHUB_TOKEN,
//      GITHUB_REPO   (default "Jnojokes/vecchiowestfinal"),
//      GITHUB_BRANCH (default "main").
// Zero dipendenze: fetch globale (Node 18+) + crypto.
// =========================================================

const crypto = require('crypto');

// File gestibile: SOLO questo. Mai preso dal client.
const FILE_PATH = 'data/menu.json';
const GITHUB_API = 'https://api.github.com';

// Set ammessi — validazione lato server (autoritativa, oltre a quella client).
const BADGE_AMMESSI = ['TOP', 'PICCANTE', 'MARCHIGIANO', 'VEG', 'VEGAN', 'NUOVO'];
const ALLERGENI_AMMESSI = ['glutine', 'lattosio', 'sedano', 'sesamo', 'uova'];

module.exports = async (req, res) => {
  // Solo POST.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Metodo non consentito.' });
  }

  // Configurazione server.
  const adminPassword = process.env.ADMIN_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'Jnojokes/vecchiowestfinal';
  const branch = process.env.GITHUB_BRANCH || 'main';

  // Senza password configurata non si fa nulla: errore generico, nessun dettaglio.
  if (!adminPassword) {
    return json(res, 500, { ok: false, error: 'Server non configurato (ADMIN_PASSWORD mancante).' });
  }

  // Lettura body.
  let body;
  try {
    body = await readBody(req);
  } catch (_) {
    return json(res, 400, { ok: false, error: 'Body della richiesta non valido.' });
  }
  const { action, password, menu } = body || {};

  // Password constant-time — vale per OGNI action.
  if (!verificaPassword(password, adminPassword)) {
    return json(res, 401, { ok: false, error: 'Password errata.' });
  }

  // Da qui in poi: richiesta autenticata.
  try {
    if (action === 'verify') {
      return json(res, 200, { ok: true });
    }

    if (action === 'load') {
      if (!token) return json(res, 500, { ok: false, error: 'Server non configurato (GITHUB_TOKEN mancante).' });
      const file = await ghGetFile(repo, branch, token);
      return json(res, 200, { ok: true, menu: file.menu, sha: file.sha });
    }

    if (action === 'publish') {
      if (!token) return json(res, 500, { ok: false, error: 'Server non configurato (GITHUB_TOKEN mancante).' });

      const errore = validaMenu(menu);
      if (errore) return json(res, 400, { ok: false, error: errore });

      // Recupera lo sha corrente (necessario per l'update).
      const { sha } = await ghGetFile(repo, branch, token);
      const contenuto = JSON.stringify(menu, null, 2) + '\n';
      const message =
        'menu: aggiornamento da /modifica-menu (' +
        new Date().toISOString().slice(0, 16).replace('T', ' ') + ')';
      await ghPutFile(repo, branch, token, contenuto, sha, message);
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { ok: false, error: 'Azione sconosciuta.' });
  } catch (err) {
    // ghError() produce già messaggi puliti (nessun token). Errori di rete → 502.
    const status = err && err.status ? err.status : 502;
    const messaggio = err && err.message ? err.message : 'Errore di comunicazione con GitHub.';
    return json(res, status, { ok: false, error: messaggio });
  }
};

// ---------- Helpers ----------

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

// Legge il body sia se già parsato (req.body, comportamento Vercel) sia
// leggendo lo stream raw (robustezza con `vercel dev` / runtime diversi).
function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return Promise.resolve(req.body ? JSON.parse(req.body) : {});
    }
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Oltre la soglia: chiudi lo stream (req.destroy) così raw smette di
      // crescere, oltre a rifiutare la promise. guard ~5MB.
      if (raw.length > 5_000_000) { req.destroy(); reject(new Error('Body troppo grande')); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Confronto constant-time con check di lunghezza (timingSafeEqual richiede
// buffer di pari lunghezza, quindi il check va fatto prima).
function verificaPassword(input, atteso) {
  if (typeof input !== 'string' || typeof atteso !== 'string') return false;
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(atteso, 'utf8');
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); }
  catch (_) { return false; }
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'vecchiowest-cms',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Errore GitHub con messaggio leggibile, MAI con il token.
// Status SEMPRE 502 (gateway upstream): così l'HTTP 401 della nostra
// function significa univocamente "password errata" e il client non
// confonde un problema del token GitHub con un problema di autenticazione.
function ghError(status) {
  const mappa = {
    401: 'Token GitHub non valido o scaduto.',
    403: 'Accesso GitHub negato (permessi del token o rate limit).',
    404: 'File data/menu.json o repository non trovato.',
    409: 'Conflitto: il file è cambiato sul server. Ricarica e riprova.',
    422: 'Richiesta GitHub non valida (sha o contenuto).',
  };
  const e = new Error(mappa[status] || `Errore GitHub (${status}).`);
  e.status = 502;
  return e;
}

async function ghGetFile(repo, branch, token) {
  const url = `${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: ghHeaders(token) });
  if (!r.ok) throw ghError(r.status);
  const data = await r.json();
  const decoded = Buffer.from(data.content || '', 'base64').toString('utf8');
  let menu;
  try { menu = JSON.parse(decoded); }
  catch (_) { throw ghError(502); }
  return { menu, sha: data.sha };
}

async function ghPutFile(repo, branch, token, contenuto, sha, message) {
  const url = `${GITHUB_API}/repos/${repo}/contents/${FILE_PATH}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: Buffer.from(contenuto, 'utf8').toString('base64'),
      sha,
      branch,
    }),
  });
  if (!r.ok) throw ghError(r.status);
  return r.json();
}

// Validazione forma del menu (autoritativa). Ritorna null se ok, stringa-errore altrimenti.
function validaMenu(menu) {
  if (!menu || typeof menu !== 'object' || Array.isArray(menu)) {
    return 'Menu non valido: atteso un oggetto.';
  }
  if (!Array.isArray(menu.sezioni)) {
    return 'Menu non valido: "sezioni" deve essere un array.';
  }
  for (let si = 0; si < menu.sezioni.length; si++) {
    const s = menu.sezioni[si];
    const etichettaSez = (s && s.titolo) || `#${si + 1}`;
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      return `Sezione ${etichettaSez} non valida.`;
    }
    if (!Array.isArray(s.items)) {
      return `Sezione "${etichettaSez}": "items" deve essere un array.`;
    }
    for (let ii = 0; ii < s.items.length; ii++) {
      const it = s.items[ii];
      if (!it || typeof it !== 'object' || Array.isArray(it)) {
        return `Piatto #${ii + 1} della sezione "${etichettaSez}" non valido.`;
      }
      if (typeof it.nome !== 'string' || it.nome.trim() === '') {
        return `Un piatto della sezione "${etichettaSez}" non ha nome.`;
      }
      if (typeof it.prezzo !== 'string') {
        return `Il piatto "${it.nome}" non ha un prezzo valido.`;
      }
      if (it.badge !== undefined &&
          (!Array.isArray(it.badge) || it.badge.some((b) => !BADGE_AMMESSI.includes(b)))) {
        return `Il piatto "${it.nome}" contiene badge non ammessi.`;
      }
      if (it.allergeni !== undefined &&
          (!Array.isArray(it.allergeni) || it.allergeni.some((a) => !ALLERGENI_AMMESSI.includes(a)))) {
        return `Il piatto "${it.nome}" contiene allergeni non ammessi.`;
      }
    }
  }
  return null;
}
