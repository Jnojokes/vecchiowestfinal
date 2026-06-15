# Setup CMS menù — `/modifica-menu`

Guida per attivare l'editor self-service del menù del Vecchio West.
L'editor (`/modifica-menu`) permette di aggiungere/modificare/togliere piatti e
sezioni e **pubblicare con un click**, anche da telefono, senza GitHub.

Come funziona: il sito è statico, quindi per rendere permanente una modifica
la pagina chiama una piccola funzione lato server (`/api/save-menu`) che committa
`data/menu.json` su GitHub. Vercel rilascia automaticamente il nuovo deploy.
Il **token GitHub resta solo sul server** (mai nel browser) e l'accesso è
protetto da **una password**.

---

## 1) Crea un token GitHub (fine-grained)

1. GitHub → **Settings** → **Developer settings** → **Fine-grained tokens** → **Generate new token**.
2. **Repository access** → *Only select repositories* → seleziona **solo** `Jnojokes/vecchiowestfinal`.
3. **Repository permissions** → **Contents** → **Read and write**.
   (Tutti gli altri permessi possono restare *No access*.)
4. Scegli una scadenza (es. 90 giorni o personalizzata) → **Generate token** → **copia il token**
   (lo vedrai una volta sola).

---

## 2) Imposta le variabili d'ambiente su Vercel

Progetto **vecchiowestfinal** → **Settings** → **Environment Variables**.
Crea queste 4 variabili per **Production** *e* **Preview**:

| Nome             | Valore                                  |
| ---------------- | --------------------------------------- |
| `ADMIN_PASSWORD` | la password scelta per entrare nell'editor |
| `GITHUB_TOKEN`   | il token copiato al punto 1             |
| `GITHUB_REPO`    | `Jnojokes/vecchiowestfinal`             |
| `GITHUB_BRANCH`  | `main`                                  |

Poi fai un **Redeploy** del progetto (Deployments → ⋯ → Redeploy) perché le
variabili abbiano effetto.

> ⚠️ Non mettere mai il token nel codice o in pagine pubbliche: vive solo qui.

---

## 3) Test in locale (opzionale)

Serve la Vercel CLI (`npm i -g vercel`) e l'accesso al progetto.

```bash
vercel env pull .env.local     # scarica le env dal progetto Vercel
vercel dev                     # avvia sito + funzioni serverless
```

Apri **http://localhost:3000/modifica-menu**, inserisci la password,
modifica un piatto e premi **Pubblica**.

> `.env.local` contiene segreti: è già ignorato da git, non committarlo.

---

## 4) Uso quotidiano

1. Vai su **https://www.vecchiowestpub.it/modifica-menu** (anche da telefono).
2. Accedi con **utente `admin`** e la **password** (= valore di `ADMIN_PASSWORD`).
3. Aggiungi/modifica/togli piatti e sezioni, riordina con le frecce ▲▼.
   - Il **prezzo** va scritto come `12,00` (virgola, 2 decimali, senza €) —
     l'editor normalizza in automatico (`12` → `12,00`).
   - **Badge** e **allergeni** si selezionano dai pulsanti (set fissi).
4. Premi **Pubblica**: comparirà *"Pubblicato! Online tra ~1 minuto."*
   Il menù aggiornato appare sia in home (sezione menù) sia su `/menu`.
5. **Scarica backup** salva una copia del menù in JSON; **Ricarica** ripristina
   l'ultima versione online scartando le modifiche non salvate.

### Cambiare la password
Modifica `ADMIN_PASSWORD` su Vercel (Settings → Environment Variables) e fai
**Redeploy**. La nuova password è subito valida.

### Note
- La vecchia pagina `/admin` (scaffold Decap mai completato) ora reindirizza a `/modifica-menu`.
- La funzione può scrivere **solo** `data/menu.json`: nient'altro del repo è modificabile dall'editor.
