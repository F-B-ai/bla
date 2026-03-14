# ESSĒRE - Pipeline di Rilascio

## Panoramica

Il rilascio segue 4 fasi progressive, dalla build privata interna fino alla versione ufficiale.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌───────────────────┐
│  1. Internal     │───▶│  2. TestFlight   │───▶│  3. Android Internal│───▶│  4. Produzione    │
│  (Build privata) │    │  (iPhone beta)   │    │  (Android beta)     │    │  (Release privata)│
└─────────────────┘    └──────────────────┘    └─────────────────────┘    └───────────────────┘
```

---

## Fase 1: Build Nativa Privata (Internal)

Build ad-hoc per test interni su dispositivi registrati.

```bash
# iOS (richiede dispositivi registrati nel profilo ad-hoc)
eas build --profile internal --platform ios

# Android (genera APK installabile)
eas build --profile internal --platform android

# Entrambe le piattaforme
eas build --profile internal --platform all
```

**Distribuzione**: link di download diretto da Expo. Condividi il link con i tester.

---

## Fase 2: TestFlight (iPhone)

Pubblica su TestFlight per beta testing su iPhone.

### Prerequisiti
1. Account Apple Developer ($99/anno)
2. App creata su App Store Connect
3. Aggiorna i placeholder in `eas.json` → sezione `submit.testflight`:
   - `appleId`: il tuo Apple ID
   - `ascAppId`: ID dell'app su App Store Connect
   - `appleTeamId`: Team ID Apple Developer

### Comandi
```bash
# Build per TestFlight
eas build --profile testflight --platform ios

# Invia a TestFlight (dopo la build)
eas submit --profile testflight --platform ios

# Build + invio automatico
eas build --profile testflight --platform ios --auto-submit
```

**Distribuzione**: invita i tester via email da App Store Connect → TestFlight.

---

## Fase 3: Internal Test Android

Pubblica sul canale di test interno di Google Play.

### Prerequisiti
1. Account Google Play Developer ($25 una tantum)
2. App creata su Google Play Console
3. Service Account JSON per l'upload automatico:
   - Crea un Service Account su Google Cloud Console
   - Abilita Google Play Android Developer API
   - Scarica il file JSON e salvalo come `google-service-account.json` nella cartella `fitness-app/`
   - Aggiungi `google-service-account.json` al `.gitignore`

### Comandi
```bash
# Build per Google Play
eas build --profile android-internal --platform android

# Invia al canale interno
eas submit --profile android-internal --platform android

# Build + invio automatico
eas build --profile android-internal --platform android --auto-submit
```

**Distribuzione**: aggiungi i tester via email su Google Play Console → Test interni.

---

## Fase 4: Versione Privata Ufficiale (Produzione)

Release ufficiale sugli store, configurabile come distribuzione privata/limitata.

### iOS (App Store - Distribuzione privata)
Opzioni per rilascio privato:
- **Unlisted App**: l'app non appare nei risultati di ricerca, accessibile solo con link diretto
- **Apple Business Manager**: distribuzione B2B a organizzazioni specifiche

### Android (Google Play - Distribuzione privata)
Opzioni per rilascio privato:
- **Closed Testing**: solo utenti invitati
- **Managed Google Play**: distribuzione enterprise

### Comandi
```bash
# Build di produzione
eas build --profile production --platform all

# Invia agli store
eas submit --profile production --platform all
```

---

## Setup Iniziale

### 1. Configura EAS
```bash
cd fitness-app
npm install -g eas-cli
eas login
eas init  # questo genera il projectId
```

### 2. Aggiorna i placeholder
Dopo `eas init`, aggiorna:
- `app.json` → `extra.eas.projectId` e `updates.url`
- `eas.json` → credenziali Apple e Google nei profili `submit`

### 3. Aggiungi al .gitignore
```
google-service-account.json
```

---

## Comandi Utili

```bash
# Stato delle build
eas build:list

# Configurare dispositivi iOS per test interni
eas device:create

# Aggiornamenti OTA (senza rebuild)
eas update --branch internal --message "fix: descrizione"
eas update --branch production --message "fix: descrizione"
```

---

## Note Importanti

- Le build iOS richiedono un Mac o EAS Build (cloud)
- TestFlight supporta fino a 10.000 tester esterni
- Il test interno Android supporta fino a 100 tester
- Gli aggiornamenti OTA (`eas update`) funzionano solo per modifiche JS, non per cambiamenti nativi
