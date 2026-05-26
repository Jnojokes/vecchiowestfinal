/* =========================================================
   VECCHIO WEST · APP CORE  (v3 — robust load order)
   Sequenza:
   1. App.js esegue al parsing (no defer)
   2. Su DOMContentLoaded → carica blocchi via fetch
   3. Dopo caricamento blocchi → inietta Alpine.js dinamicamente
   4. Alpine emette alpine:init → registriamo i componenti
   5. Alpine fa walk del DOM (ora completo)
   ========================================================= */

(function () {
  'use strict';

  document.documentElement.classList.add('vw-loading');
  console.log('[VW] app.js eseguito');

  // ---------- Cache fetch JSON ----------
  const dataCache = new Map();
  async function fetchJSON(path) {
    if (dataCache.has(path)) return dataCache.get(path);
    const p = fetch(path, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} su ${path}`);
        return r.json();
      })
      .catch((err) => {
        console.error('[VW] Errore JSON', path, err);
        return {};
      });
    dataCache.set(path, p);
    return p;
  }
  window.__vwFetchJSON = fetchJSON;

  // ---------- Loader blocchi HTML ----------
  async function loadBlocks() {
    const slots = Array.from(document.querySelectorAll('[data-block]'));
    console.log('[VW] Carico', slots.length, 'blocchi');
    if (slots.length === 0) {
      console.warn('[VW] Nessuno slot data-block trovato nel DOM');
      return;
    }
    for (const slot of slots) {
      const path = slot.getAttribute('data-block');
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status} su ${path}`);
        const html = await res.text();
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const parent = slot.parentNode;
        while (tmp.firstChild) parent.insertBefore(tmp.firstChild, slot);
        slot.remove();
      } catch (err) {
        console.error('[VW] Errore blocco', path, err);
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'padding:1rem;color:#b14a30;background:#1a120b;border:1px solid #b14a30;margin:1rem;font-family:monospace;font-size:0.85rem';
        errDiv.textContent = `Errore caricamento ${path}: ${err.message}`;
        slot.parentNode.insertBefore(errDiv, slot);
        slot.remove();
      }
    }
    console.log('[VW] Blocchi caricati ✓');
  }

  // ---------- Registra Alpine components prima dell'iniezione ----------
  // Il listener è installato adesso (ben prima che lo script Alpine venga caricato)
  document.addEventListener('alpine:init', () => {
    console.log('[VW] alpine:init catturato — registro components');
    const Alpine = window.Alpine;
    if (!Alpine) {
      console.error('[VW] window.Alpine non disponibile in alpine:init!');
      return;
    }

    // Block generico
    Alpine.data('vwBlock', (name, path) => ({
      data: {},
      async init() {
        this.data = await fetchJSON(path);
        console.log('[VW]', name, 'pronto', Object.keys(this.data).length, 'campi');
      },
    }));

    // BLOCK 02 · Promo Banner
    Alpine.data('vwPromoBanner', (path) => ({
      visible: true,
      current: null,
      rotazione: [],
      idx: 0,
      timer: null,
      async init() {
        const data = await fetchJSON(path);
        const promos = [];
        if (data.active && !this.isExpired(data)) promos.push(data);
        if (Array.isArray(data.rotazione)) {
          data.rotazione.forEach((p) => {
            if (p.active && !this.isExpired(p)) promos.push(p);
          });
        }
        this.rotazione = promos;
        if (!promos.length) { this.visible = false; return; }
        const dismissedKey = `vw_promo_${promos[0].title}`;
        if (localStorage.getItem(dismissedKey)) { this.visible = false; return; }
        this.current = promos[0];
        if (promos.length > 1) {
          this.timer = setInterval(() => {
            this.idx = (this.idx + 1) % promos.length;
            this.current = promos[this.idx];
          }, 7000);
        }
        const ad = this.current.auto_dismiss_seconds;
        if (ad && ad > 0) setTimeout(() => (this.visible = false), ad * 1000);
      },
      isExpired(p) {
        if (!p?.expires_at) return false;
        return new Date(p.expires_at) < new Date();
      },
      dismiss() {
        this.visible = false;
        if (this.current?.title) localStorage.setItem(`vw_promo_${this.current.title}`, '1');
        if (this.timer) clearInterval(this.timer);
      },
    }));

    // BLOCK 03 · Menu (B4: filtro allergeni multi-toggle)
    Alpine.data('vwMenu', (path) => ({
      data: { sezioni: [] },
      activeTab: '',
      filtriAllergeni: [],
      itemsVisibili: [],
      allergeniDisponibili: [],
      async init() {
        this.data = await fetchJSON(path);
        if (this.data.sezioni?.length) this.activeTab = this.data.sezioni[0].id;
        const set = new Set();
        this.data.sezioni?.forEach((s) =>
          s.items?.forEach((i) => (i.allergeni || []).forEach((a) => set.add(a)))
        );
        this.allergeniDisponibili = Array.from(set).sort();
        this.aggiornaItems();
        // Reactive: rifiltra quando l'array filtriAllergeni muta
        this.$watch('filtriAllergeni', () => this.aggiornaItems());
      },
      setTab(id) { this.activeTab = id; this.aggiornaItems(); },
      toggleAllergene(all) {
        const idx = this.filtriAllergeni.indexOf(all);
        if (idx === -1) this.filtriAllergeni.push(all);
        else this.filtriAllergeni.splice(idx, 1);
        this.aggiornaItems();
      },
      aggiornaItems() {
        const sezione = this.data.sezioni?.find((s) => s.id === this.activeTab);
        const items = sezione?.items || [];
        this.itemsVisibili = this.filtriAllergeni.length === 0
          ? items
          : items.filter((i) => !(i.allergeni || []).some((a) => this.filtriAllergeni.includes(a)));
      },
    }));

    // BLOCK 05 · Eventi (B8: labelRelativa "Stasera/Domani/Tra X giorni")
    Alpine.data('vwEventi', (path) => ({
      data: { eventi: [] },
      eventiVisibili: [],
      async init() {
        this.data = await fetchJSON(path);
        const now = new Date();
        const finestraMs = (this.data.finestra_giorni || 30) * 24 * 3600 * 1000;
        this.eventiVisibili = (this.data.eventi || [])
          .filter((e) => {
            const d = new Date(e.data_inizio);
            return d >= now && d - now <= finestraMs;
          })
          .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio))
          .slice(0, this.data.max_visibili || 3);
      },
      formatGiorno(iso) { return new Date(iso).getDate(); },
      formatMese(iso) { return new Date(iso).toLocaleString('it-IT', { month: 'short' }).toUpperCase(); },
      formatOra(iso) { return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); },
      labelRelativa(iso) {
        if (!iso) return null;
        const target = new Date(iso);
        const now = new Date();
        const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const d1 = new Date(target.getFullYear(), target.getMonth(), target.getDate());
        const diffDays = Math.round((d1 - d0) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Stasera';
        if (diffDays === 1) return 'Domani';
        if (diffDays === 2) return 'Dopodomani';
        if (diffDays > 2 && diffDays <= 7) return `Tra ${diffDays} giorni`;
        if (diffDays > 7 && diffDays <= 14) return 'Prossima settimana';
        if (diffDays < 0) return 'Concluso';
        return null;
      },
      addToCalendarUrl(ev) {
        const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: ev.titolo,
          dates: `${fmt(ev.data_inizio)}/${fmt(ev.data_fine || ev.data_inizio)}`,
          details: ev.descrizione_breve || '',
          location: ev.luogo || "Vecchio West, Sant'Elpidio a Mare",
        });
        return `https://calendar.google.com/calendar/render?${params}`;
      },
    }));

    // BLOCK 06 · Galleria + Lightbox
    Alpine.data('vwGalleria', (path) => ({
      data: { asset: [], tag_disponibili: [] },
      tagAttivo: 'tutti',
      lightboxOpen: false,
      lightboxIndex: 0,
      get assetVisibili() {
        if (this.tagAttivo === 'tutti') return this.data.asset || [];
        return (this.data.asset || []).filter((a) => a.tag === this.tagAttivo);
      },
      get lightboxItem() { return this.assetVisibili[this.lightboxIndex]; },
      async init() { this.data = await fetchJSON(path); },
      apriLightbox(i) { this.lightboxIndex = i; this.lightboxOpen = true; document.body.style.overflow = 'hidden'; },
      prev() { const len = this.assetVisibili.length; this.lightboxIndex = (this.lightboxIndex - 1 + len) % len; },
      next() { const len = this.assetVisibili.length; this.lightboxIndex = (this.lightboxIndex + 1) % len; },
    }));

    // BLOCK 07 · Recensioni Carousel (A3 avatar, B2 SVG stars, B3 swipe touch)
    Alpine.data('vwRecensioni', (path) => ({
      data: { recensioni: [] },
      current: 0,
      autoplay: null,
      // B3 · swipe touch state
      touchStartX: 0,
      touchEndX: 0,
      _starsObserver: null,
      async init() {
        this.data = await fetchJSON(path);
        if (this.data.recensioni?.length > 1) {
          this.autoplay = setInterval(() => this.next(), 6000);
        }
        // B2 · IntersectionObserver per stamp animation stelle
        this.$nextTick(() => {
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.$root.querySelectorAll('.vw-stars').forEach((el) => el.classList.add('is-visible'));
            return;
          }
          this._starsObserver = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                this._starsObserver.unobserve(e.target);
              }
            });
          }, { threshold: 0.4 });
          this.$root.querySelectorAll('.vw-stars').forEach((el) => this._starsObserver.observe(el));
        });
      },
      get mediaRating() {
        const arr = this.data.recensioni || [];
        if (!arr.length) return 0;
        return arr.reduce((s, r) => s + (r.rating || 0), 0) / arr.length;
      },
      next() { const len = this.data.recensioni?.length || 1; this.current = (this.current + 1) % len; },
      prev() { const len = this.data.recensioni?.length || 1; this.current = (this.current - 1 + len) % len; },
      renderStars(n) { const full = Math.round(n); return '★'.repeat(full) + '☆'.repeat(5 - full); },
      formatData(iso) {
        return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
      },
      // A3 · iniziali avatar
      initials(nome) {
        if (!nome) return '?';
        const parti = String(nome).trim().split(/\s+/);
        const ini = parti.length === 1
          ? parti[0].slice(0, 2)
          : (parti[0][0] + parti[parti.length - 1][0]);
        return ini.toUpperCase();
      },
      avatarHue(nome) {
        let h = 0;
        const s = nome || '';
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
        return h % 360;
      },
      // B3 · swipe touch nativo (threshold 50px)
      onTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        // Pausa autoplay finché l'utente interagisce
        if (this.autoplay) { clearInterval(this.autoplay); this.autoplay = null; }
      },
      onTouchMove() { /* passive: niente per ora, no transform drag (card sono absolute) */ },
      onTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].clientX;
        const delta = this.touchEndX - this.touchStartX;
        const threshold = 50;
        if (delta < -threshold) this.next();
        else if (delta > threshold) this.prev();
      },
    }));

    // BLOCK 09 · Sticky CTA
    Alpine.data('vwSticky', (path) => ({
      data: { attivo: false, mostra_dopo_scroll_px: 600, azioni: [] },
      visibile: false,
      async init() {
        this.data = await fetchJSON(path);
        const handler = () => {
          const y = window.scrollY;
          const soglia = this.data.mostra_dopo_scroll_px || 600;
          if (this.data.nascondi_se_in_cima && y < soglia) this.visibile = false;
          else this.visibile = true;
        };
        window.addEventListener('scroll', handler, { passive: true });
        handler();
      },
    }));

    // BLOCK 00 · Sidebar verticale + drawer mobile (B5)
    Alpine.data('vwNav', (path) => ({
      data: { brand: 'Vecchio West', voci: [], cta: {} },
      activeId: '',
      open: false,
      _observer: null,
      async init() {
        this.data = await fetchJSON(path);
        document.body.classList.add('has-sidebar');

        this.$nextTick(() => this.setupScrollSpy());

        // B5 · drawer mobile: body lock + classe sul backdrop
        this.$watch('open', (val) => {
          const isMobile = window.matchMedia('(max-width: 1023px)').matches;
          if (isMobile) {
            document.body.style.overflow = val ? 'hidden' : '';
          }
        });
      },
      setupScrollSpy() {
        const ids = (this.data.voci || [])
          .map((v) => (v.href || '').replace(/^#/, ''))
          .filter(Boolean);
        const sezioni = ids
          .map((id) => document.getElementById(id))
          .filter(Boolean);
        if (!sezioni.length) {
          console.warn('[VW] vwNav: nessuna sezione id trovata per scroll-spy');
          return;
        }
        if (this._observer) this._observer.disconnect();
        // Soglia: una sezione è "attiva" quando la sua zona centrale è in viewport
        this._observer = new IntersectionObserver(
          (entries) => {
            // Prendi l'entry con intersectionRatio maggiore tra quelle che intersecano
            const visibili = entries
              .filter((e) => e.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
            if (visibili.length) {
              this.activeId = visibili[0].target.id;
            }
          },
          {
            root: null,
            rootMargin: '-30% 0px -55% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1],
          }
        );
        sezioni.forEach((s) => this._observer.observe(s));
        // Imposta una voce di default in base all'hash o alla prima visibile
        const hash = window.location.hash.replace(/^#/, '');
        if (hash && ids.includes(hash)) this.activeId = hash;
        else this.activeId = ids[0];
      },
      onVoceClick(voce, ev) {
        // B5 · chiusura drawer al click di una voce
        this.open = false;
        const id = (voce.href || '').replace(/^#/, '');
        if (id) this.activeId = id;
      },
      // B5 · focus trap mobile dentro l'aside drawer
      trapFocus(e) {
        if (!this.open) return;
        const isMobile = window.matchMedia('(max-width: 1023px)').matches;
        if (!isMobile) return;
        const root = e.currentTarget;
        const focusable = root.querySelectorAll(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      },
    }));

    // BLOCK 11 · Roulette overlay (lottery / always_win)
    Alpine.data('vwRoulette', (path) => ({
      data: {
        attivo: false,
        mode: 'lottery',
        probabilita_vittoria: 0.04,
        cooldown_ore: 24,
        auto_open_dopo_secondi: 0,
        titolo: 'Roulette del West',
        sottotitolo: '',
        premio_descrizione: '',
        consolazione: '',
        disclaimer: '',
        codice_prefix: 'VW',
        hub_label_default: 'WEST',
        hub_label_win: 'WIN!',
        hub_label_lose: 'MISS',
      },
      overlayOpen: false,
      spinning: false,
      rotazioneTotale: 0,
      risultato: null, // 'win' | 'lose' | null
      codice: '',
      cooldownAttivo: false,
      cooldownFormatted: '',
      _cooldownTimer: null,
      _autoOpenTimer: null,
      get triggerVisibile() {
        return this.data?.attivo === true && !this.cooldownAttivo;
      },
      get hubLabel() {
        if (this.risultato === 'win') return this.data.hub_label_win || 'WIN!';
        if (this.risultato === 'lose') return this.data.hub_label_lose || 'MISS';
        return this.data.hub_label_default || 'WEST';
      },
      async init() {
        const cfg = await fetchJSON(path);
        this.data = Object.assign(this.data, cfg);
        if (!this.data.attivo) return;

        // Stato cooldown da localStorage
        this.checkCooldown();

        // Apertura automatica (se configurata e non in cooldown)
        const ao = Number(this.data.auto_open_dopo_secondi || 0);
        if (ao > 0 && !this.cooldownAttivo && !this.risultato) {
          this._autoOpenTimer = setTimeout(() => this.apri(), ao * 1000);
        }

        // Permetti apertura via hash #roulette (anchor da nav)
        window.addEventListener('hashchange', () => this.handleHash());
        this.handleHash();
      },
      handleHash() {
        if (window.location.hash === '#roulette' && this.data.attivo) {
          this.apri();
        }
      },
      apri() {
        this.overlayOpen = true;
        document.body.style.overflow = 'hidden';
        // Refresh cooldown (potrebbe essere scaduto nel frattempo)
        this.checkCooldown();
        // A7 · sposta focus sul primo bottone del modal
        this.$nextTick(() => {
          const firstBtn = document.querySelector('.vw-roulette-modal .vw-btn, .vw-roulette-modal .vw-roulette-close');
          if (firstBtn) firstBtn.focus();
        });
      },
      // A7 · focus trap nel modal roulette
      trapFocus(e) {
        if (!this.overlayOpen) return;
        const modal = document.querySelector('.vw-roulette-modal');
        if (!modal) return;
        const focusable = modal.querySelectorAll(
          'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      },
      chiudi() {
        this.overlayOpen = false;
        document.body.style.overflow = '';
        if (this._cooldownTimer) {
          // Lascia girare il timer in background per il trigger floating
        }
      },
      checkCooldown() {
        try {
          const raw = localStorage.getItem('vw_roulette_last');
          if (!raw) {
            this.cooldownAttivo = false;
            this.cooldownFormatted = '';
            return;
          }
          const last = JSON.parse(raw);
          const ts = Number(last.timestamp || 0);
          const oreMs = Number(this.data.cooldown_ore || 24) * 3600 * 1000;
          const scadenza = ts + oreMs;
          const now = Date.now();
          if (now >= scadenza) {
            // Cooldown finito: rimuovi marker
            localStorage.removeItem('vw_roulette_last');
            this.cooldownAttivo = false;
            this.cooldownFormatted = '';
            this.risultato = null;
            return;
          }
          this.cooldownAttivo = true;
          // Mostra il risultato precedente nella modal (così se l'utente
          // riapre vede ancora il codice di vincita o il messaggio di MISS)
          if (last.esito === 'win') {
            this.risultato = 'win';
            this.codice = last.codice || '';
          } else if (last.esito === 'lose') {
            this.risultato = 'lose';
          }
          this.updateCooldownFormatted(scadenza);
          if (this._cooldownTimer) clearInterval(this._cooldownTimer);
          this._cooldownTimer = setInterval(() => {
            this.updateCooldownFormatted(scadenza);
          }, 60 * 1000);
        } catch (err) {
          console.warn('[VW] roulette cooldown read error', err);
          this.cooldownAttivo = false;
        }
      },
      updateCooldownFormatted(scadenzaMs) {
        const diff = scadenzaMs - Date.now();
        if (diff <= 0) {
          this.cooldownAttivo = false;
          this.cooldownFormatted = '';
          if (this._cooldownTimer) {
            clearInterval(this._cooldownTimer);
            this._cooldownTimer = null;
          }
          return;
        }
        const totMin = Math.ceil(diff / 60000);
        const h = Math.floor(totMin / 60);
        const m = totMin % 60;
        if (h > 0) this.cooldownFormatted = `${h}h ${m.toString().padStart(2, '0')}m`;
        else this.cooldownFormatted = `${m}m`;
      },
      generaCodice() {
        const prefix = this.data.codice_prefix || 'VW';
        // 6 caratteri alfanumerici no ambigui (no 0/O, 1/I/L)
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let s = '';
        for (let i = 0; i < 6; i++) {
          s += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${prefix}-${s}`;
      },
      spin() {
        if (this.spinning || this.cooldownAttivo) return;
        this.spinning = true;
        this.risultato = null;

        // Decisione: lottery vs always_win
        let vince;
        if (this.data.mode === 'always_win') {
          vince = true;
        } else {
          const p = Number(this.data.probabilita_vittoria || 0);
          vince = Math.random() < p;
        }

        // Calcola rotazione: 6-10 giri completi + offset finale che
        // posiziona il pointer (top) su settore vincente/non vincente.
        // La ruota CSS ha 12 settori da 30° alternati rosso/nero/oro.
        // Settori "oro" (vincenti visivamente) sono a 60-90°, 180-210°, 300-330°
        // (centri: 75°, 195°, 315°).
        // Settori "nero" o "rosso" (non vincenti) sono i restanti.
        const giri = 6 + Math.floor(Math.random() * 5); // 6..10
        const centriVincita = [75, 195, 315];
        const centriPerdita = [15, 45, 105, 135, 165, 225, 255, 285, 345];
        const target = vince
          ? centriVincita[Math.floor(Math.random() * centriVincita.length)]
          : centriPerdita[Math.floor(Math.random() * centriPerdita.length)];
        // Il pointer è in alto (rotazione 0 = settore in alto).
        // Per portare il settore "target" sotto il pointer dobbiamo ruotare
        // di -target (in senso orario) + giri completi. Aggiungiamo alla
        // rotazione attuale per evitare reset visivi.
        const finalAngle = giri * 360 - target;
        this.rotazioneTotale = this.rotazioneTotale + finalAngle;

        // Aspetta la fine della transizione CSS (--roulette-spin-duration)
        const durMs = 4000; // ~ var(--roulette-spin-duration)
        setTimeout(() => {
          this.spinning = false;
          if (vince) {
            this.risultato = 'win';
            this.codice = this.generaCodice();
            this.salvaEsito('win', this.codice);
          } else {
            this.risultato = 'lose';
            this.salvaEsito('lose', null);
          }
        }, durMs + 80);
      },
      salvaEsito(esito, codice) {
        try {
          localStorage.setItem(
            'vw_roulette_last',
            JSON.stringify({ timestamp: Date.now(), esito, codice })
          );
        } catch (err) {
          console.warn('[VW] roulette save error', err);
        }
        // Avvia il timer di cooldown immediato
        this.checkCooldown();
      },
    }));

    window.trackNewsletter = function () {
      if (window.gtag) window.gtag('event', 'newsletter_signup');
      if (window.fbq) window.fbq('track', 'Lead');
      return true;
    };
  });

  // ---------- Effetto gunshot globale (delegation) ----------
  function attivaGunshotLayer() {
    let layer = document.querySelector('.vw-gunshot-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'vw-gunshot-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    // Click delegation su tutto il documento
    document.addEventListener(
      'click',
      (ev) => {
        const target = ev.target.closest('[data-gunshot]');
        if (!target) return;
        // Rispetta reduced-motion
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const x = ev.clientX;
        const y = ev.clientY;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const hole = document.createElement('span');
        hole.className = 'vw-gunshot-hole';
        hole.style.left = x + 'px';
        hole.style.top = y + 'px';
        layer.appendChild(hole);

        const flash = document.createElement('span');
        flash.className = 'vw-gunshot-flash';
        flash.style.left = x + 'px';
        flash.style.top = y + 'px';
        layer.appendChild(flash);

        // Cleanup dopo il fade completo (≈ var(--gunshot-fade-ms))
        setTimeout(() => {
          flash.remove();
        }, 400);
        setTimeout(() => {
          hole.remove();
        }, 1400);
      },
      { passive: true }
    );
  }

  // ---------- Magnetic CTA (C4 · solo pointer fine, no reduced-motion) ----------
  function initMagnetic() {
    if (!window.matchMedia) return;
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = document.querySelectorAll('[data-magnetic]');
    if (!elements.length) return;
    const STRENGTH = 0.25;
    const RADIUS = 80;
    elements.forEach((el) => {
      let rafId = null;
      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const distance = Math.hypot(dx, dy);
        if (distance < RADIUS + Math.max(rect.width, rect.height) / 2) {
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            el.style.transform = `translate(${dx * STRENGTH}px, ${dy * STRENGTH}px)`;
          });
        } else {
          el.style.transform = '';
        }
      };
      const onLeave = () => {
        if (rafId) cancelAnimationFrame(rafId);
        el.style.transform = '';
        el.style.transition = 'transform .35s cubic-bezier(.34, 1.56, .64, 1)';
        setTimeout(() => { el.style.transition = ''; }, 400);
      };
      document.addEventListener('mousemove', onMove, { passive: true });
      el.addEventListener('mouseleave', onLeave);
    });
  }

  // ---------- IntersectionObserver per [data-reveal] ----------
  function attivaReveal() {
    const elementi = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!elementi.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Reduced motion: mostra subito tutto, niente animazione
      elementi.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );
    elementi.forEach((el) => obs.observe(el));
  }

  // ---------- Bootstrap completo ----------
  async function bootstrap() {
    try {
      await loadBlocks();

      // Effetti globali dopo che il DOM è completo
      attivaGunshotLayer();
      attivaReveal();
      initMagnetic();

      // Inietta Alpine DINAMICAMENTE dopo che il DOM è completo
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.13.5/dist/cdn.min.js';
      s.defer = true;
      s.onload = () => {
        console.log('[VW] Alpine caricato');
        document.documentElement.classList.remove('vw-loading');
      };
      s.onerror = (e) => {
        console.error('[VW] Errore caricamento Alpine', e);
        document.documentElement.classList.remove('vw-loading');
      };
      document.head.appendChild(s);
    } catch (err) {
      console.error('[VW] Bootstrap fallito', err);
      document.documentElement.classList.remove('vw-loading');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
