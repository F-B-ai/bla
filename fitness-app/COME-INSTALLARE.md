# ESSĒRE - Come installare l'app (Android e iPhone)

## Cosa ti serve

1. **Account Expo** (gratuito): vai su https://expo.dev e registrati
2. **Account Apple Developer** (99$/anno): solo per pubblicare su App Store
3. **Account Google Play** (25$ una tantum): solo per pubblicare su Play Store

## Metodo rapido: Android APK (senza account sviluppatore)

Con EAS puoi generare un file APK che installi direttamente sul telefono Android, senza passare dal Play Store.

### Setup iniziale (una sola volta)

1. Vai su https://expo.dev e crea un account
2. Vai su **Account Settings > Access Tokens** e crea un token
3. Vai nelle **Settings** del tuo repository GitHub
4. Vai su **Secrets and variables > Actions**
5. Aggiungi un nuovo secret chiamato `EXPO_TOKEN` con il token creato al punto 2

### Lanciare una build

1. Vai su GitHub > il tuo repository > tab **Actions**
2. Clicca su **"EAS Build (Android & iOS)"** nella lista a sinistra
3. Clicca **"Run workflow"**
4. Scegli:
   - **Profile**: `preview` (per testare)
   - **Platform**: `android` per APK, `ios` per iPhone, `all` per entrambi
5. Clicca **"Run workflow"**
6. Aspetta che la build finisca (circa 10-20 minuti)
7. Vai su https://expo.dev > il tuo progetto > **Builds**
8. Scarica il file:
   - **Android**: scarica l'APK e installalo direttamente sul telefono
   - **iPhone**: segui le istruzioni per installare via link

### Build automatica

Ogni volta che fai push su `main` o `master` con modifiche nella cartella `fitness-app/`, la build parte automaticamente per **entrambe le piattaforme**.

## Installare l'APK su Android

1. Dalla pagina Builds su expo.dev, clicca **Download** sull'APK
2. Apri il file sul telefono Android
3. Se richiesto, abilita "Installa da fonti sconosciute" nelle impostazioni
4. L'app si installa come una normale app

## Installare su iPhone (preview)

Per i profili `development` e `preview`, devi prima registrare il dispositivo:

1. Vai su https://expo.dev > il tuo progetto > **Devices**
2. Segui le istruzioni per registrare il tuo iPhone
3. Dopo la registrazione, lancia una nuova build
4. Scarica e installa dall'app link fornito

## Versione Web (accesso immediato)

L'app e' disponibile anche come web app:
- Vai su **https://essere-3fe6f.web.app** da qualsiasi browser
- Funziona su iPhone e Android senza installare nulla

## Profili di build

| Profilo | Uso | Output Android | Output iOS |
|---------|-----|---------------|------------|
| `development` | Sviluppo con hot reload | APK debug | Dev build |
| `preview` | Test versione completa | **APK installabile** | Ad-hoc build |
| `production` | Pubblicazione store | AAB (Play Store) | IPA (App Store) |

## Pubblicare sugli store

### Google Play Store
1. Lancia build con profilo `production` e platform `android`
2. Scarica il file AAB da expo.dev
3. Vai su https://play.google.com/console
4. Crea una nuova app e carica il file AAB

### Apple App Store
1. Modifica `eas.json` con i tuoi dati Apple:
   - `appleId`: la tua email Apple
   - `ascAppId`: l'ID dell'app su App Store Connect
   - `appleTeamId`: il tuo Team ID Apple Developer
2. Lancia build con profilo `production` e platform `ios`
3. Dopo la build: `eas submit --platform ios`

## Configurare la chiave AI

Dopo aver installato l'app:
1. Accedi all'app
2. Vai su **Impostazioni AI**
3. Inserisci la tua chiave API Anthropic (`sk-ant-...`)
4. Premi **Salva**

Le funzionalita' AI (analisi posturale, progressioni, suggerimenti esercizi) saranno attive.

## Installazione Ibrida (TestFlight + APK)

Il metodo ibrido lancia in parallelo la distribuzione iOS via TestFlight e Android via APK diretto, tutto con un solo click.

### Come usare

1. Vai su GitHub > il tuo repository > tab **Actions**
2. Clicca su **"Installazione Ibrida (TestFlight + APK)"**
3. Clicca **"Run workflow"**
4. Opzioni disponibili:
   - **Salta build iOS/TestFlight**: per generare solo l'APK Android
   - **Salta build Android/APK**: per inviare solo a TestFlight
   - **Invia automaticamente a TestFlight**: se attivo, dopo la build iOS viene inviata direttamente a TestFlight
5. Clicca **"Run workflow"**

### Cosa succede

| Piattaforma | Metodo | Requisiti |
|-------------|--------|-----------|
| iOS | TestFlight (beta) | Apple Developer Account + credenziali in `eas.json` |
| Android | APK diretto (download) | Solo `EXPO_TOKEN` nei secrets GitHub |

### Dopo il workflow

- **iPhone**: apri l'app TestFlight e troverai ESSERE nella lista dei beta test
- **Android**: vai su [expo.dev](https://expo.dev) > Builds, scarica l'APK e installalo

### Prerequisiti

Per TestFlight, assicurati di aver configurato in `eas.json` → `submit.testflight`:
- `appleId`: la tua email Apple Developer
- `ascAppId`: ID dell'app su App Store Connect
- `appleTeamId`: il tuo Team ID

## Rilascio Produzione (App Store + Google Play)

Quando l'app e' pronta per il rilascio ufficiale, usa il workflow di produzione per pubblicare su entrambi gli store.

### Prerequisiti

1. **iOS (App Store)**:
   - Account Apple Developer ($99/anno)
   - App creata su [App Store Connect](https://appstoreconnect.apple.com)
   - Credenziali configurate in `eas.json` → `submit.production.ios`:
     - `appleId`: la tua email Apple Developer
     - `ascAppId`: ID dell'app su App Store Connect
     - `appleTeamId`: il tuo Team ID

2. **Android (Google Play)**:
   - Account Google Play Developer ($25 una tantum)
   - App creata su [Google Play Console](https://play.google.com/console)
   - Service Account JSON per l'upload automatico:
     1. Crea un Service Account su Google Cloud Console
     2. Abilita Google Play Android Developer API
     3. Scarica il file JSON
     4. Codificalo in base64: `base64 -w 0 google-service-account.json`
     5. Aggiungi il risultato come secret `GOOGLE_SERVICE_ACCOUNT_JSON` nel repository GitHub

### Come lanciare il rilascio

1. Vai su GitHub > il tuo repository > tab **Actions**
2. Clicca su **"Rilascio Produzione (App Store + Google Play)"**
3. Clicca **"Run workflow"**
4. Opzioni disponibili:
   - **Salta build iOS**: per pubblicare solo su Google Play
   - **Salta build Android**: per pubblicare solo su App Store
   - **Invia automaticamente agli store**: se attivo, dopo la build viene inviata direttamente agli store per la review
5. Clicca **"Run workflow"**

### Dopo il rilascio

| Piattaforma | Cosa fare |
|-------------|-----------|
| iOS | Vai su [App Store Connect](https://appstoreconnect.apple.com) per gestire la review e scegliere il tipo di distribuzione (pubblica, unlisted, o B2B) |
| Android | Vai su [Google Play Console](https://play.google.com/console) per gestire il rilascio (produzione, closed testing, o managed) |

### Opzioni di distribuzione privata

- **iOS Unlisted**: l'app non appare nei risultati di ricerca, accessibile solo con link diretto
- **iOS Business Manager**: distribuzione B2B a organizzazioni specifiche
- **Android Closed Testing**: solo utenti invitati
- **Android Managed Google Play**: distribuzione enterprise

## Supporto

Per problemi con le build, controlla i log su https://expo.dev > Builds.
