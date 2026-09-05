# White-Label — Guida alla rivendita / affitto dell'app

Questa app è un prodotto **white-label**: ogni palestra cliente riceve la
propria istanza isolata (proprio brand, proprio database, proprio URL),
mentre tu (Mind Movement Lab) resti proprietario del prodotto e controlli
la licenza.

## Architettura

- **Un'istanza per cliente**: ogni palestra ha il proprio progetto
  Firebase (dati completamente separati, GDPR ok) e il proprio deploy.
- **Un solo file di configurazione**: `src/config/brand.ts` contiene nome,
  tagline, colori, codici check-in e la config Firebase del cliente. Tema
  (`theme.ts`) e Firebase (`firebase.ts`) leggono da lì.
- **Licenza con kill-switch**: il documento Firestore `config/license`
  controlla l'accesso. `active: false` → l'app mostra "Servizio
  temporaneamente sospeso" e diventa inutilizzabile finché non riattivi.
  Solo tu puoi scriverlo (via service account); i client possono solo
  leggerlo. Se il documento manca, l'app resta operativa (fail-open).

## Attivare una nuova palestra cliente

1. **Crea il progetto Firebase del cliente** su
   https://console.firebase.google.com (Auth email/password, Firestore,
   Storage, Hosting).
2. **Configura il brand**: duplica il repo (o un branch per cliente) e
   modifica SOLO `src/config/brand.ts`:
   - `appName`, `tagline`, colori
   - `checkinQRCode` / `checkinManualCode` (unici per palestra)
   - `firebase` → la config web del progetto del cliente
   - `appUrl`, `licenseId` (es. `nomepalestra-001`)
3. **Icone/logo**: sostituisci `src/assets/icon.png`, `splash.png` e le
   icone in `public/` con quelle del cliente (stesse dimensioni).
4. **Regole**: `firebase deploy --only firestore:rules,storage` sul
   progetto del cliente (o gli script `deploy-storage-rules.js`).
5. **Build & deploy**: `npm run build:web && node postbuild-web.js`, poi
   `firebase deploy --only hosting --project <id-cliente>`.
6. **Licenza**: crea il documento `config/license` nel Firestore del
   cliente: `{ active: true, licenseId: '...', plan: 'rental' }`.
7. **Primo owner**: fai registrare il titolare della palestra (l'app
   impone un solo owner per istanza).

## Gestire l'affitto a rate

- Rata pagata → non fai nulla, l'istanza resta attiva.
- Rata NON pagata → imposta `active: false` (ed eventualmente `message:
  'Canone non saldato — contatta il fornitore'`) su `config/license`
  del progetto del cliente. L'app si blocca immediatamente per tutti
  gli utenti, **senza cancellare alcun dato**. Al pagamento, rimetti
  `active: true` e tutto riprende.
- Puoi anche impostare `expiresAt` (Timestamp): scadenza automatica
  della licenza senza intervento manuale.

## Cosa NON è incluso (da gestire a contratto)

- Fatturazione/incasso dei canoni (bonifico o Stripe fuori dall'app).
- Contratto di licenza white-label + addendum GDPR (la palestra è
  titolare dei dati dei propri iscritti; tu sei responsabile del
  trattamento come fornitore tecnico).
- Costi Firebase dell'istanza cliente (piano Spark gratuito o Blaze a
  consumo, da ribaltare nel canone).
