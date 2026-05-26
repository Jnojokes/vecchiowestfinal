# Vecchio West · Landing Page (Vercel-ready)

Landing page modulare per il pub **Vecchio West** (Sant'Elpidio a Mare, FM).
Pacchetto pronto per essere **droppato in una nuova repo GitHub** e deployato su **Vercel**.

Stagione 2026 — XSolve Studio.

---

## 🚀 Deploy su Vercel — Quickstart

### Opzione A · Da GitHub (consigliata, auto-deploy a ogni push)

1. Crea una **nuova repo** su GitHub (es. `vecchiowest-landing-vercel`).
2. Copia **tutti i file di questa cartella** (incluso `vercel.json`, `.gitignore`, `admin/`, `data/`, ecc.) nella root della repo.
3. `git add . && git commit -m "initial" && git push`.
4. Vai su [vercel.com](https://vercel.com) → **Add New → Project** → importa la repo.
5. Framework Preset: **Other** (non serve build). Build Command vuoto, Output Directory vuoto.
6. Click **Deploy**. In ~30 secondi sei online su `xxx.vercel.app`.

### Opzione B · Da CLI (deploy manuale, senza GitHub)

```bash
npm i -g vercel
cd vercel-package
vercel        # primo deploy = preview
vercel --prod # promuove a produzione
```

### Dominio custom (`vecchiowestpub.it`)

In Vercel: **Project → Settings → Domains → Add** `vecchiowestpub.it` e `www.vecchiowestpub.it`.

Sul registrar (Aruba/Register/ecc.) imposta:

| Record | Host | Valore |
|--------|------|--------|
| A      | @    | `76.76.21.21` |
| CNAME  | www  | `cname.vercel-dns.com` |

⚠️ **Prima rimuovi il dominio da Netlify** (Domains → Remove) altrimenti il DNS continua a puntare lì.

---

## 📁 Struttura del pacchetto

```
.
├── index.html              ← home (master page con SEO + JSON-LD)
├── menu.html               ← pagina menu completa (standalone)
├── vercel.json             ← routing, headers, cache, redirect
├── sitemap.xml             ← sitemap (dominio vecchiowestpub.it)
├── robots.txt              ← robots + link sitemap
├── .gitignore
├── css/
│   ├── tokens.css          ← design tokens (palette, font, spacing)
│   └── global.css          ← stili globali + utility
├── js/
│   └── app.js              ← loader blocchi + Alpine components
├── blocks/                 ← 11 blocchi modulari indipendenti
│   ├── 01-hero.html
│   ├── 02-promo.html
│   ├── 03-menu.html
│   ├── 04-usp-bbq.html
│   ├── 05-eventi.html
│   ├── 06-galleria.html
│   ├── 07-recensioni.html
│   ├── 08-contatti.html
│   ├── 09-sticky-cta.html
│   ├── 10-footer.html
│   └── 11-roulette.html    ← overlay "Tenta la sorte"
├── data/                   ← JSON editabili (un file per blocco)
│   ├── hero.json
│   ├── promo.json
│   ├── menu.json
│   ├── nav.json
│   ├── usp_bbq.json
│   ├── eventi.json
│   ├── galleria.json
│   ├── recensioni.json
│   ├── contatti.json
│   ├── sticky.json
│   ├── footer.json
│   └── roulette.json       ← config roulette (modalità, premio, cooldown)
├── assets/
│   ├── img/
│   └── video/
└── admin/
    └── index.html          ← UI Decap CMS (configurazione GitHub backend)
```

---

## ⚙️ Cosa fa `vercel.json`

- **`cleanUrls: true`** → `/menu` serve `menu.html` (senza estensione).
- **Security headers** (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) su tutte le risposte.
- **Cache aggressiva** per `/assets/*` (1 anno, immutable) → immagini e video.
- **Cache breve** per `/css/*`, `/js/*` (1 giorno, must-revalidate).
- **Cache molto breve** per `/data/*`, `/blocks/*` (5 min) → i contenuti si aggiornano subito dopo l'edit dei JSON.
- **Redirect 301** per `/eventi`, `/contatti`, `/galleria` → ancore sulla home.
- **Sitemap** servita come `application/xml`.

---

## 🛠️ Sviluppo locale

I `fetch` non funzionano da `file://`, serve un server HTTP statico.

```bash
# Python
python3 -m http.server 8080

# oppure Node
npx serve .

# oppure Vercel CLI (simula tutti i comportamenti di vercel.json)
vercel dev
```

Apri `http://localhost:8080` (o `http://localhost:3000` con `vercel dev`).

---

## ✍️ Modificare i contenuti

Tutto è in `data/*.json`. Edita il file, salva, ricarica la pagina.
Ogni JSON ha un campo `_note` con istruzioni inline.

Esempi:
- **Promo banner**: `data/promo.json` → `active: true/false`, `title`, `subtitle`, `cta_text`, `cta_link`, `expires_at`.
- **Eventi**: `data/eventi.json` → array di eventi con data, immagine, descrizione.
- **Roulette**: `data/roulette.json` → `attivo`, `mode` (`lottery` o `always_win`), `probabilita_vittoria`, `cooldown_ore`, `auto_open_dopo_secondi`.

Per **disattivare un blocco**: commenta lo slot in `index.html`:
```html
<!-- <div data-block="blocks/05-eventi.html"></div> -->
```

---

## 🔐 CMS / pannello admin (`/admin`)

`admin/index.html` carica **Decap CMS** che permette al cliente di editare i JSON senza toccare il codice.

Su Netlify funzionava con `git-gateway` + Netlify Identity. **Su Vercel non c'è git-gateway**, quindi hai 3 opzioni:

### Opzione 1 · GitHub backend + OAuth proxy (raccomandata in produzione)

1. Su GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: `https://www.vecchiowestpub.it`
   - Authorization callback URL: l'URL del tuo proxy (vedi sotto).
2. Deploya un **OAuth proxy** (uno qualsiasi tra questi, gratuiti):
   - Cloudflare Worker: [`sterlingwes/decap-proxy`](https://github.com/sterlingwes/decap-proxy)
   - Netlify Function dedicata: [`ublabs/decap-proxy`](https://github.com/ublabs/decap-proxy)
   - Vercel Function: [`decaporg/decap-cms/tree/main/packages/netlify-cms-backend-github`](https://decapcms.org/docs/external-oauth-clients/)
3. In `admin/index.html` sostituisci:
   - `repo: 'OWNER/REPO'` → `nomeUtente/nomeRepo`
   - `base_url: 'https://decap-proxy.example.com'` → URL del tuo proxy
4. Rimuovi la riga `local_backend: true` in produzione.

### Opzione 2 · Solo locale (`local_backend`)

Per editare senza configurare OAuth:
```bash
npx decap-server
# poi apri http://localhost:8080/admin/
```
Lascia `local_backend: true` nell'admin (già impostato).

### Opzione 3 · Disabilitare il CMS

Cancella la cartella `admin/` e lascia che il cliente o tu modifichi i `data/*.json` direttamente (via Git o Vercel UI).

---

## ✅ Verifica post-deploy

Dopo il primo deploy controlla:

- [ ] `https://www.vecchiowestpub.it/` carica con tutti i blocchi (hero, promo, menu, eventi, galleria, recensioni, contatti, footer).
- [ ] `https://www.vecchiowestpub.it/menu` serve la pagina menu (cleanUrls funziona).
- [ ] `https://www.vecchiowestpub.it/sitemap.xml` mostra il dominio `vecchiowestpub.it` con `lastmod 2026-05-26`.
- [ ] `https://www.vecchiowestpub.it/robots.txt` è raggiungibile.
- [ ] Il **menu laterale verticale** (sidebar a sinistra) compare e scrolla correttamente.
- [ ] La voce "**Tenta la sorte**" apre l'overlay roulette.
- [ ] Su mobile la roulette è leggibile e cliccabile.
- [ ] La promo banner si chiude e ricompare dopo refresh (sessione storage).
- [ ] Su Lighthouse: Performance, Accessibility, Best Practices, SEO tutti >90.

---

## 🎯 Feature stagione 2026

- **Sidebar verticale** sticky con scroll-spy (Alpine + IntersectionObserver).
- **Pagina menu** dedicata (`/menu`) oltre alla sezione in home.
- **Roulette overlay** "Tenta la sorte" con cooldown 24h via localStorage, modalità lottery (1/25) o always_win (compliant DPR 430/2001).
- **Schema.org JSON-LD** completo: Restaurant + LocalBusiness + Event + Menu.
- **Promo banner** dismissibile con scadenza temporale (`expires_at`).
- **Filtro globale sepia** 0.2–0.35 sulle immagini per coerenza cinematografica western.

---

## 🎨 Brand & Stile

- **Palette**: terra bruciato + seppia + oro pallido (`#c89b3c`).
- **Accenti DJ Flow / Latin Night**: fucsia desaturato + cobalto, solo nei blocchi `theme-latin`.
- **Tipografia**: Rye (display), Oswald (headline), Inter (body), Special Elite (mono).
- **NON USARE**: rosso/oro saturo, neon nightclub, palette catena USA.

---

## 📊 Analytics

Segnaposti già nel `<head>` di `index.html`. Decommenta e inserisci:
- **GA4** Measurement ID
- **Meta Pixel** ID (Facebook Ads)
- **Microsoft Clarity** Project ID (heatmaps gratuite)

---

## 🆘 Troubleshooting

**Il sito mostra ancora la versione vecchia dopo il push**
→ Vercel **Dashboard → Deployments**: verifica che l'ultimo commit risulti "Ready". Se è "Building" aspetta. Se è "Failed", apri il log.

**Il CMS dice "Failed to load entries"**
→ Manca l'OAuth proxy o l'OAuth App. Usa l'Opzione 2 (`local_backend`) finché non hai il proxy configurato.

**`/menu` ritorna 404**
→ Controlla che `vercel.json` abbia `"cleanUrls": true` e che `menu.html` sia in root.

**Le immagini non si vedono**
→ Verifica che la cartella `assets/img/` sia inclusa nel commit (a volte `.gitignore` aggressivi la escludono).

---

**XSolve Studio** · stagione 2026 · `n.bartoli@xsolvestudio.com`
