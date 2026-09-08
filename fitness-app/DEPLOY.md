# Deploy — ESSĒRE

La pubblicazione è AUTOMATICA via GitHub Actions:

- un commit con `[deploy]` nel messaggio (o l'avvio manuale dalla tab
  Actions) esegue: test → build → pubblicazione hosting + regole
  sul progetto `essere-3fe6f`;
- la chiave vive nel secret `FIREBASE_SERVICE_ACCOUNT` del repository
  (Settings → Secrets and variables → Actions) — mai in chat, mai nel
  codice;
- workflow: `.github/workflows/firebase-deploy.yml`.

Primo collaudo end-to-end: 16 luglio 2026.
