# Vecchio West · Report di Valutazione UX/UI

**Data:** 26 maggio 2026
**Scope:** Analisi completa del progetto landing page Vecchio West applicando le best practice delle skill `design:critique`, `design:design-system`, `design:accessibility-review`, `design:ux-writing`, `design:handoff`.

---

## 1. Voto attuale: **7.4 / 10**

Progetto di **buona qualità professionale**, con un'identità visiva forte e coerente e un'architettura tecnica solida. Si distingue chiaramente da template generici "pub USA" grazie all'estetica spaghetti western italiano (Sergio Leone) ben tradotta in design system. Le aree di miglioramento riguardano principalmente **micro-interazioni delle card**, **gerarchia tipografica in profondità**, **accessibilità AA verificata**, e alcuni dettagli di **usabilità mobile**.

### Breakdown per area

| Area | Voto | Note sintetiche |
|------|------|----|
| Identità & coerenza visiva | 8.5 / 10 | Palette terra/seppia/oro pallido autentica, niente neon, niente saturazioni USA. |
| Design system & tokens | 8.0 / 10 | Tokens ben strutturati, ma manca scala tipografica fluida e mapping AA/AAA. |
| Architettura informazione | 7.5 / 10 | Ordine blocchi sensato, ma mancano gerarchie secondarie sulle card. |
| **Card dinamica & effetti** | **6.5 / 10** | Effetti hover base (translateY + border-color). Manca raffinatezza cinematografica. |
| **Color palette in uso** | **7.5 / 10** | Palette ottima sui token, ma uso ripetitivo del gold come unico accento attivo. |
| Tipografia | 7.5 / 10 | Stack Rye/Oswald/Inter/Special Elite ottimo, ma usato in modo conservativo. |
| Usabilità mobile | 7.0 / 10 | Tab menu scroll orizzontale ok, ma carousel recensioni non swipe-friendly. |
| Accessibilità (WCAG 2.1 AA) | 6.5 / 10 | ARIA usato, reduced-motion gestito, ma contrasti da verificare e focus stati incoerenti. |
| Attenzione ai dettagli | 7.5 / 10 | Grain texture, easings custom, gunshot effect = punti alti. Mancano micro-anim sulle card. |
| Performance | 7.0 / 10 | Tailwind CDN in produzione è il rosso più evidente. |
| SEO & schema | 9.5 / 10 | JSON-LD Restaurant + Event impeccabile, OG/Twitter completi. |

---

## 2. Punti di forza riconosciuti

**Identità.** La palette `--vw-bg #1a120b` + `--vw-paper #f0e3c8` + `--vw-gold #c89b3c` è precisa, desaturata e cinematografica. Il rifiuto esplicito di "rosso/oro saturo, neon nightclub, palette catena USA" nel README dimostra direzione progettuale matura. Il filtro `sepia(0.35) saturate(0.85)` sul video hero è una scelta da art director.

**Design tokens.** `tokens.css` con palette, font stack, spacing, radius, ombre e easings custom (`--vw-ease-out-back`, `--vw-ease-bullet`, `--vw-ease-spin`) è uno dei tratti più professionali del progetto. Pochi clienti restaurant arrivano a questo livello di formalizzazione.

**Modularità.** Sistema a blocchi con `data-block` + `app.js` loader è elegante: ogni sezione è componente isolato con JSON associato. Permette al cliente di disattivare blocchi commentando una riga.

**SEO & dati strutturati.** JSON-LD con `Restaurant` + `LocalBusiness` + `Event` per inaugurazione + `openingHoursSpecification` per ogni fascia. Google Maps capirà tutto e l'evento può apparire in "Vicino a te". Questo è livello agenzia tier-1.

**Reduced-motion.** Già nel CSS globale (visto in `global.css` riassunto). Bene.

**Micro-pattern coerenti.** L'icona `★` come "stella sceriffo" hero, il `vw-divider` con stella SVG dopo ogni h2, il `border-top: 3px solid gold` su paper cards = piccoli ma costanti segnali di brand.

---

## 3. Analisi area per area + roadmap "al massimo"

### 3.1 CARD — dinamica & effetti

**Situazione attuale.**
- Menu items: `translateY(-2px)` + cambio border a gold su hover. Transizione singola 0.2s ease.
- Eventi: `translateY(-4px)` + border gold + shadow-md su hover. Border-top variabile (gold western vs magenta latin).
- Recensioni: cross-fade tra carte attive (`opacity` + `scale(0.96 → 1)`).
- Galleria: `scale(1.04)` su `img` + `filter: sepia(0) saturate(1.05)` su hover (immagine "riprende colore" → ottima metafora).
- Paper cards (vw-card-paper): solo shadow-md statica.

**Punti critici.**
1. **Effetti uniformi e ripetitivi** — quasi tutte le card hanno lo stesso pattern (translateY 2-4px + border-color gold). Non c'è differenziazione gerarchica: una card "Eventi" dovrebbe sentirsi più "preziosa" di una card menu.
2. **Mancanza di rivelazione progressiva** — non c'è hover state che riveli informazioni secondarie (es. allergeni che appaiono solo on hover su desktop).
3. **Niente parallax sottile sui media** — la galleria fa `scale(1.04)` ma le hero card eventi avrebbero più impatto con un Ken Burns leggero sulle foto.
4. **Stelle/dot recensioni** — le stelle sono testo `★★★★★` renderizzato come stringa, non SVG. Su retina rende meno nitido. Inoltre la "stella sceriffo" potrebbe essere coerente con quella del divider.
5. **Touch device** — su mobile il `translateY(-4px)` non si vede mai (no hover). Manca alternativa con `:active` o `focus-within` per dare feedback tattile.

**Roadmap "al massimo" — Cards.**

a) **Sistema gerarchico a 3 tier**:
   - **Tier 1 (eventi, recensioni attive):** card "pergamena" con effetto "carta che si solleva". `transform: rotate(-0.4deg) translateY(-6px)` su hover, ombra calda lunga `0 24px 60px rgba(26,18,11,0.6)`. Bordo dorato che si "accende" gradualmente via `box-shadow: inset 0 0 0 1px var(--vw-gold)` invece di sostituire il border (così niente "jump" di 1px).
   - **Tier 2 (menu items, USP):** card "legno" con micro-tilt. Su hover, leggera rotazione 0.5° sull'asse Y per simulare assi di legno che si piegano. `transform-style: preserve-3d` + `perspective` sul container.
   - **Tier 3 (galleria, badge):** rimane minimale, scale + filter come ora ma con timing più cinematografico (cubic-bezier 0.16, 0.84, 0.27, 1 = il già definito `--vw-ease-spin`).

b) **Reveal progressivo dei contenuti** sulle menu item card:
   - Sezione `allergeni` e `badge` di default `opacity: 0.55` + `transform: translateY(2px)`.
   - Su `:hover` o `:focus-within`: opacity 1, posizione 0, transizione 0.35s `--vw-ease-out-back`.
   - Su mobile (max-width 768px): sempre opacity 1 (no hover affidabile).

c) **Parallax leggero** sulle card immagine eventi:
   - `transform: scale(1.08) translateY(-2%)` sull'`img` interno con `transition: transform 1.2s var(--vw-ease-spin)`.
   - Effetto "respiro" continuo: `@keyframes vw-card-breath { 0%, 100% { transform: scale(1.02); } 50% { transform: scale(1.04); } }` con `animation: vw-card-breath 8s ease-in-out infinite` (solo se NON `prefers-reduced-motion`).

d) **SVG sceriffo star** invece di stringa `★`:
   - Crea componente Alpine `<vw-stars rating="4.5" />` che genera N SVG stelle inline.
   - Stelle riempite con `var(--vw-gold)`, vuote con `var(--vw-dust)`, mezza stella via `linearGradient` SVG.
   - Animazione "stamp" su entrata: ogni stella appare con `scale(0) → scale(1.2) → scale(1)` con delay sequenziale 80ms.

e) **Tactile feedback mobile** — aggiungi su `.vw-eventi__card:active` e `.vw-menu__item:active`:
   ```css
   transform: scale(0.98);
   transition: transform 0.1s ease;
   ```
   Feedback istantaneo al tap.

f) **Effetto "carta strappata"** sulle paper card (recensioni) — bordo inferiore con `mask-image: url(data:image/svg+xml...)` che simula strappo manuale. Dettaglio Sergio Leone autentico.

g) **Magnetic CTA** sul `vw-btn` principale (solo desktop):
   - `pointermove` calcola offset cursore vs centro pulsante, applica `transform: translate(x*0.15, y*0.15)`.
   - Effetto "il pulsante ti viene incontro" → ottimo su CTA "Prenota" e "Tenta la sorte".

---

### 3.2 COLOR PALETTE — informazione

**Situazione attuale.**
- Palette base (terra + paper + sand + dust + ink) **eccellente**.
- Gold usato come unico accento attivo: CTA, badge "top", border attivo, stelle, divider. **Sovraccarico.**
- Rossi (`--vw-red #8c2f1b`) presenti nei token ma usati solo per "piccante" badge. Sotto-utilizzati.
- Cobalt + magenta DJ Flow ben isolati a `.theme-latin`, ma dichiarati solo sui card eventi → uso troppo timido per il marketing che il cliente vuole spingere sulle latin night.

**Punti critici.**
1. **Gold-fatigue**: l'oro pallido perde "preziosità" quando appare ovunque (CTA, badge, stelle, divider, eyebrow, prezzo, h3 menu, border attivo, scroll indicator, hero logo frame, hero scroll svg). Quando tutto è prezioso, nulla lo è.
2. **Mancano colori secondari di stato** — niente verde per "disponibile/prenotabile", niente arancio per "esaurimento prossimo", niente rosso vino per highlight prezzi premium.
3. **Sfondi monocromatici** — `--vw-bg` e `--vw-bg-2` sono molto simili (`#1a120b` vs `#2a1d12`). Le sezioni quasi non si distinguono. La sezione recensioni usa `bg-2` ma il salto è sottile.
4. **Latin night sotto-presente** — è il "secondo brand" del locale (DJ Flow è marketing forte) ma i cobalt/magenta appaiono solo nella border-top di una card.

**Roadmap "al massimo" — Palette.**

a) **Definisci ruoli semantici per ogni colore** (token semantici sopra i token cromatici):
   ```css
   --vw-action-primary: var(--vw-gold);          /* CTA principali */
   --vw-action-secondary: var(--vw-paper);       /* CTA ghost */
   --vw-state-hot: var(--vw-red);                /* piccante, sold-out */
   --vw-state-fresh: #6b8a4a;                    /* veg, marchigiano (verde oliva spento) */
   --vw-state-new: var(--vw-gold-2);             /* novità menu */
   --vw-state-premium: var(--vw-red-2);          /* prezzo top */
   --vw-divider: rgba(200, 155, 60, 0.18);
   ```

b) **Introdurre un verde oliva spento** `#6b8a4a` (NON il `--vw-state-fresh`) per badge marchigiano/vegan invece di riusare il gold. Restituisce la sensazione "ulivo, terra marchigiana" coerente con la narrativa.

c) **Sezioni alternate con maggiore contrasto** — invece di `bg / bg-2 / bg`, usa `bg / bg-paper-inverted / bg / bg-2`:
   - Recensioni → fondo `--vw-paper` con testo `--vw-ink` (carta vera, non card di carta su sfondo scuro). Crea una breakthrough visiva forte.
   - Eventi → fondo `--vw-bg` (notte).
   - Galleria → fondo `--vw-bg-2` (terra giorno).

d) **Latin theme più presente**:
   - Header sezione "Eventi" mostra che ci sono **2 eventi western + 1 latin** → introduce un divider differente quando si entra nel blocco latin.
   - Sticky CTA con vibrazione magenta solo nelle 24h prima di una Latin Night.

e) **Gold gerarchico** — invece di un solo gold, usa la triade già nei token:
   - `--vw-gold-dark #8a6a26` → testi piccoli, eyebrow, label
   - `--vw-gold #c89b3c` → CTA, accenti principali
   - `--vw-gold-2 #e3b75a` → highlight, hover state del gold

   Differenzia visivamente "il prezzo €12" (`gold-dark`) dal "Tenta la sorte" CTA (`gold`).

f) **Contrast check WCAG AA** — verifica con tool tipo APCA o `contrast-ratio.com`:
   - `--vw-gold #c89b3c` su `--vw-bg #1a120b` = ~7.4:1 → AAA per testo normale ✓
   - `--vw-paper-2 #d9c39a` su `--vw-bg #1a120b` = ~9.2:1 → AAA ✓
   - `--vw-sand #b89b6a` (allergeni note) su `--vw-bg #1a120b` = ~5.8:1 → AA ✓ ma sotto la soglia AAA
   - `--vw-dust #7a5a3a` (border) su `--vw-bg #1a120b` = ~3.1:1 → solo per non-text UI (border, divider) **OK**, ma se usato per testo è fail.

---

### 3.3 INFORMAZIONE — gerarchia & UX writing

**Situazione attuale.**
- Eyebrow + h2 + divider stella → pattern sano, ripetuto su tutte le sezioni.
- Menu items: nome (Rye uppercase) + prezzo + descrizione + badge + allergeni. Strutturalmente ok ma denso visivamente.
- Eventi: data + titolo + descrizione_breve + CTA "Salva la data" → buono.
- Recensioni: virgolette giganti + testo + autore + stelle + data → buono ma `vw-rec__quote` con `"` semplice è povero (un `"` di apertura francese o un SVG svolazzo sarebbe più editoriale).

**Punti critici.**
1. **Microcopy "western" sotto-sfruttato**. Il README parla di "spaghetti western italiano" ma le CTA dicono semplicemente "Prenota" o "Salva la data". Sprecato.
2. **Empty state freddo**: "Nessun piatto disponibile con questo filtro" → asettico, anti-brand.
3. **Allergen label** `Allergeni:` in mono → ok ma la lista è inline senza pause visive (es. comma-separated). Si potrebbe usare chip discrete.
4. **Prezzi non leggibili a colpo d'occhio** — `€ 12` (Oswald gold 1.1rem) si confonde col nome (Rye 1.15rem). Il prezzo dovrebbe essere quello che "salta agli occhi" su un menu.
5. **Recensioni autore** in uppercase senza foto/avatar — manca il fattore umano.

**Roadmap "al massimo" — Information & UX writing.**

a) **Microcopy west-tonale per CTA & empty state** (skill `design:ux-writing`):
   - "Prenota" → "Prenota il tuo tavolo da sceriffo"
   - "Salva la data" → "Segna sul taccuino"
   - "Lascia recensione" → "Lascia la tua firma sul registro"
   - Empty state menu: "Niente da masticare con questo filtro. Prova un'altra direzione." (con icona piccolo cespuglio rotolante "tumbleweed" SVG).
   - Empty state eventi: "Calendario silenzioso. Solo polvere e vento. Torna presto." (icona cactus).
   - Errore form prenotazione: "Il telegrafo non è arrivato. Riprova tra un attimo." (al posto di "Errore generico").
   - Loading state: "Il fuoco sta scaldando..." invece di spinner muto.

b) **Gerarchia prezzo dominante**:
   - Aumenta `font-size` prezzo a `1.35rem`, mantieni nome a `1.15rem` ma reduce a `--vw-paper` (non più paper-2/-1).
   - Posiziona il prezzo a destra in un "tag" stile pergamena (`background: rgba(200, 155, 60, 0.08)`, `padding: 2px 8px`, `border-radius: 2px`).

c) **Allergeni come chip discrete** invece di lista comma-separated:
   - `<span class="vw-allergene-chip">Glutine</span> <span class="vw-allergene-chip">Latte</span>`
   - Stile: `font-size: 0.7rem`, `text-transform: uppercase`, `padding: 2px 6px`, `border: 1px dotted var(--vw-dust)`, `color: var(--vw-sand)`.

d) **Avatar recensioni** generato da iniziali:
   - Cerchio 40px con fondo `--vw-paper-2`, lettera iniziale Rye dorata.
   - Allinea avatar | autore + stelle | data → riga unica più scorrevole.

e) **Aggiungi colonna "tempo di lettura/cottura"** sulle voci menu BBQ:
   - "Tempo al tavolo: ~12 min" → trasforma un'informazione operativa in promessa.

f) **SVG quote graphic** invece di `"` plain text per recensioni:
   - Riccio decorativo "art nouveau western" tipo wanted poster.

g) **Data eventi più ricca**:
   - Aggiungi "tra 3 giorni" / "stasera" / "domani" computato JS, accanto alla data formattata. Riduce attrito mentale.

---

### 3.4 USABILITÀ — fluidità & friction

**Situazione attuale.**
- Sidebar verticale con scroll-spy → ottimo per desktop, ma su mobile non si capisce dal codice se è collapsata in hamburger o lateralmente swipe.
- Promo banner dismissibile con sessionStorage → buono.
- Roulette overlay con cooldown localStorage 24h → ottimo, compliant.
- Filtro allergeni nel menu = select HTML standard → funziona ma è "amministrativo", non discovery-friendly.
- Carousel recensioni con pulsanti prev/next → funziona, ma nessun swipe touch nativo nel codice mostrato.
- Galleria con lightbox keyboard nav (←→ esc) → ottimo, ma manca pinch-to-zoom mobile.

**Punti critici.**
1. **Tab menu scroll orizzontale senza affordance** — su mobile l'utente potrebbe non capire che ci sono altre categorie. Manca shadow fade ai bordi.
2. **Filtro allergeni come select** è anti-pattern moderno. Una serie di chip toggle è molto più tattile.
3. **Carousel recensioni senza swipe** → friction su mobile.
4. **Form prenotazione contatti** (non analizzato in dettaglio ma menzionato come blocco) — bisogna verificare campi minimi, accept terms, microcopy errori.
5. **Sticky CTA + roulette + promo banner + sidebar** = 4 elementi persistenti. Su mobile rischia clutter.
6. **Add-to-calendar URL** — buono che ci sia, ma serve preview (icona iCal/Google) e fallback per chi usa Outlook.

**Roadmap "al massimo" — Usabilità.**

a) **Tab menu con scroll affordance**:
   ```css
   .vw-menu__tabs {
     mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
   }
   ```
   Fade ai bordi → l'utente "sente" che c'è altro fuori dallo schermo. Indicator opzionale: piccolo `▸` flottante a destra che lampeggia 2 volte all'apparizione.

b) **Filtro allergeni come chip toggle multipli** (anche compatibile WCAG):
   - Lista chip cliccabili, ognuna `role="switch"` con `aria-checked`.
   - Permette di escludere più allergeni contemporaneamente (oggi solo uno).
   - Visivamente: chip non attive bordo dust, attive sfondo `--vw-red-2` con icona ✕ → "escludo questo".

c) **Swipe nativo carousel recensioni**:
   - Implementa via `touchstart/touchmove/touchend` calcolando delta X.
   - Sostituisci `position: absolute` con `transform: translateX(${current * -100}%)` → swipe diretto continuo.
   - Aggiungi `cursor: grab` / `cursor: grabbing`.

d) **Sidebar mobile**:
   - Su `<768px` sidebar diventa hamburger top-left fisso.
   - Apertura: slide-in da sinistra full-height con backdrop scuro.
   - Voce "Tenta la sorte" sempre in evidenza (gold, dimensione +).

e) **Riduzione clutter mobile**:
   - Se promo banner attivo → nascondi sticky CTA per i primi 2s.
   - Se roulette trigger floating attivo → si fonde con sticky CTA (un solo bottone tondo che ruota tra "Prenota" e "Tenta la sorte" con micro-animazione).

f) **Add-to-calendar smart**:
   - Detect user agent: iOS → iCal direct, Android → Google Calendar deeplink, desktop → modal con 3 opzioni (Google, iCal, Outlook).

g) **Form prenotazione WhatsApp invece di form classico** (allineato al README che dice "Prenota su WhatsApp"):
   - Pre-compila messaggio: "Ciao Vecchio West, vorrei prenotare per [data] alle [ora] per [persone] persone."
   - `wa.me/393520029607?text=...` → un click, zero attrito.

h) **Focus management roulette**:
   - All'apertura: focus su pulsante "Spara!"
   - Alla chiusura: focus ritorna al trigger flottante.
   - Trap focus all'interno del modal (`@keydown.tab.prevent` + cycle).

---

### 3.5 ATTENZIONE AI DETTAGLI — micro-design

**Cose già fatte bene**:
- Grain texture overlay con SVG noise
- Custom easings nominati (bullet, spin, out-back)
- Sepia filter coerente su tutti i media
- Reduce-motion gestito
- Star divider SVG ricorrente
- `clamp()` su titoli hero
- `100svh` invece di `100vh` su hero (consapevolezza mobile address bar)

**Dettagli mancanti che farebbero la differenza**:

a) **Cursore custom su elementi interattivi tipo galleria** — `cursor: url('crosshair.png'), crosshair` su `.vw-galleria__item`. Mirino da pistola = perfetto. Solo desktop, ovviamente.

b) **Sound design opzionale (mute by default)**:
   - Whisky bottle clink sul click CTA principale (15-30ms, max 200KB compressed).
   - Bullet whoosh sul gunshot effect (già esiste visually).
   - Saloon door creak sull'apertura sidebar mobile.
   - Toggle "mute/unmute" persistente in localStorage, default `mute: true`.

c) **Texture differenziate per ruolo**:
   - Sfondo paper card → texture carta invecchiata (SVG filter feTurbulence + feColorMatrix).
   - Sfondo bg-2 → texture legno verticale sottile (linear-gradient ripetuto).
   - Bordi gold → micro-pattern "scrollwork" su `border-image` (SVG inline).

d) **Loading state della pagina più atmosferico**:
   - Mentre `app.js` carica i blocchi, mostra una "vignetta" centrale: silhouette cowboy + scritta "Caricando il saloon..." con grain attivo.
   - Sostituisce il `x-cloak` jump-in.

e) **Easter egg Konami code** → digita ↑↑↓↓←→←→BA e parte un effetto duello noon (5 secondi di campane).

f) **Date format italiano corretto**:
   - "29 mag" non "may 29" né "29/05/2026" → già visto `formatMese` ma verificare.
   - Per orari: "ore 21:00" o "21:00" mai "9:00 PM".

g) **Capitalizzazione brand**:
   - "Vecchio West" sempre con W maiuscola, mai "vecchio west" o "Vecchio west".
   - Add a `text-transform: none` esplicito sui logo per evitare CSS reset accidenti.

h) **Skip to main content link** (a11y, già menzionato):
   - `<a class="vw-skip-link" href="#hero">Salta al contenuto</a>` visibile solo on focus. Per screen reader e tab navigation.

i) **Print stylesheet**:
   - Stampa solo menu + contatti, palette in grigio caldo su bianco. Per chi vuole portare il menu al tavolo offline.

j) **Open Graph image dinamico**:
   - L'OG image attuale è statica. Su Vercel puoi generare OG dinamici con `@vercel/og` (es. card "Stasera DJ Flow Latin Night" generata real-time). Highly differential.

k) **Stelle micro-animazione**:
   - All'arrivo in viewport, le stelle del rating si "stampano" una alla volta con `scale(0) → 1.2 → 1`, delay 80ms. Già menzionato in card section, ma vale ribadire come dettaglio.

l) **Numero telefono `tel:` con format internazionale**:
   - `tel:+393520029607` → ✓ già fatto. Bene.
   - Aggiungi label "Chiama subito" su mobile e "Chiamaci al" su desktop (call intent diverso).

m) **`<noscript>` block** — già presente con phone fallback. Bene ma potresti aggiungere indirizzo Google Maps come link statico.

n) **`preload` solo per asset above-the-fold** — controllato: `Rye-Regular.woff2` e `hero-poster.jpg` preloaded. Ottimo.

o) **`color-scheme: dark`** — già nel meta. Bene, signal al browser per evitare flash bianco.

---

### 3.6 PERFORMANCE & ACCESSIBILITÀ — quick audit

**Performance — punti di attenzione**:
1. **Tailwind CDN in production** — il README lo segnala già. Sostituire con build statica (`tailwindcss CLI` con `--minify`) riduce di ~3MB il bundle iniziale.
2. **Alpine.js iniettato dinamicamente da app.js** — verifica che sia con `defer` o `async` per non bloccare il rendering.
3. **Hero video autoplay** — peso video critico. Assicurati che esista versione mobile <1MB e che si usi `media` attribute o JS detection per servirla.
4. **Galleria immagini** — `loading="lazy"` ✓ già presente. Verifica `decoding="async"` e `fetchpriority="low"` su immagini below-the-fold.
5. **JSON-LD** — `Event` con `startDate 2026-05-29` ma siamo al 26 maggio 2026 oggi. Mancano 3 giorni. Dopo il 30 maggio quel JSON-LD diventerà "stale" e Google potrebbe penalizzare. Implementa cron job (Vercel cron) che rimuove eventi passati dal JSON-LD.

**Accessibilità WCAG 2.1 AA — punti aperti**:
1. **Focus visibili coerenti** — verifica che tutti i `:focus-visible` abbiano outline gold di almeno 2px con offset 2px. Senza grep esaustivo non posso confermare, ma è il primo audit a fare.
2. **ARIA su carousel recensioni** — `aria-hidden="true"` su card non attive ✓ ma manca `aria-live="polite"` sul `track` per annunciare cambi a screen reader.
3. **Lang attribute** — `<html lang="it">` ✓.
4. **Alt text immagini galleria** — viene dal JSON, verifica che ogni asset abbia `alt` descrittivo (non "image1.jpg").
5. **Tab order** — sidebar verticale fissa potrebbe interrompere tab order naturale. Considera `tabindex="-1"` sul container quando collapsato.
6. **Color contrast** — vedi tabella in 3.2.f.
7. **Roulette modal** — trap focus mancante (vedi 3.4.h).
8. **Tab roving su menu tabs** — `role="tab"` ✓ ma manca `tabindex="-1"` sulle non-attive + frecce ←→ per navigarle (pattern ARIA Authoring Practices Guide).
9. **Promo banner dismiss** — verifica che il pulsante di chiusura abbia `aria-label="Chiudi promo"`.
10. **Lightbox galleria** — `role="dialog"` + `aria-modal="true"` ✓ ottimo. Verifica anche `aria-labelledby` punta a un title.

---

## 4. Roadmap "al massimo" — sintesi prioritizzata

### Quick wins (giornata di lavoro, alto impatto)
1. Microcopy west-tonale su CTA + empty states + loading.
2. Avatar iniziali nelle recensioni.
3. Chip allergeni invece di lista comma-separated.
4. Scroll affordance (mask fade) sui tab orizzontali.
5. Form prenotazione → WhatsApp prefilled link.
6. Contrast check & sistemazione `--vw-sand` su `--vw-bg-2`.
7. Sezione recensioni con fondo `--vw-paper` (breakthrough visivo).
8. Rimozione Tailwind CDN, build statica.
9. `aria-live` su carousel recensioni + trap focus roulette.
10. `tel:` semantica "Chiama subito" su mobile.

### Medium effort (2-3 giorni)
1. Sistema gerarchico card a 3 tier (paper / wood / minimal) con micro-animazioni dedicate.
2. SVG stars component con stamp animation.
3. Swipe touch nativo sul carousel recensioni.
4. Cursore mirino su galleria desktop.
5. Filtri allergeni multi-toggle.
6. Sidebar mobile come slide-in hamburger.
7. Magnetic CTA sui pulsanti principali.
8. Avatar iniziali animati su rating.

### Investimenti (1+ settimana, alto valore)
1. Build pipeline (Tailwind static + JS bundle minified + image optimization via Vercel/Next-image equivalent).
2. OG image dinamico Vercel (`@vercel/og`).
3. Sound design opzionale + toggle mute persistente.
4. Cron job Vercel per pulizia JSON-LD eventi passati.
5. Decap CMS OAuth proxy completo (oggi è in `local_backend` only).
6. Loading screen atmosferico con grain + silhouette.
7. Easter egg + storia interattiva (Konami → cutscene).
8. Print stylesheet menu.

### Hardening continuo
- Lighthouse CI in pipeline (PR check ≥90 su tutte le metriche).
- axe-core integration test.
- Real User Monitoring (Web Vitals via Vercel Analytics o Microsoft Clarity).
- Feedback widget "segnala bug" che apre WhatsApp predefinito a XSolve Studio.

---

## 5. Voto post-roadmap stimato

Implementando i **Quick wins + Medium effort**: **8.6 / 10**.
Implementando anche gli **Investimenti**: **9.4 / 10** (livello agenzia premium internazionale, comparable a Curationist, McSweeney's, Edition Hotels).

Il punto fermo per arrivare a 9.4 è **build pipeline + atmosfera narrativa coerente fino al dettaglio sonoro/cursore + accessibility AA verificata end-to-end**. Il resto è già a 7.4 perché le fondamenta sono solide.

---

## 6. Limiti di questa valutazione

- Non ho ispezionato i blocchi `00-nav.html`, `02-promo.html`, `04-usp-bbq.html`, `08-contatti.html`, `09-sticky-cta.html`, `10-footer.html`, `11-roulette.html`, `js/app.js`, `data/*.json`, `menu.html`, `css/menu-page.css`, `css/global.css` (in versione completa). Stime di voto basate sui blocchi rappresentativi (hero, menu, eventi, recensioni, galleria) e sui token.
- Per un audit accessibility certificato AA serve un test con screen reader (NVDA, VoiceOver) e tool come axe-core su browser reale.
- I voti su performance richiederebbero un Lighthouse run sul deploy effettivo.

---

**Documento redatto come materiale di lavoro tecnico/strategico, da usare come specifica per implementazione interna XSolve Studio.**
