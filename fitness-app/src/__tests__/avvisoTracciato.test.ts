// ============================================================
// GLI AVVISI SONO TRACCIATI, E LI MANDA SOLO IL TITOLARE
// ------------------------------------------------------------
// 5 novembre 2026. Il titolare: «la comunicazione, controlla bene
// comunque che tutto sia tracciato».
//
// Non lo era. Mandare o cancellare un avviso non lasciava riga nel
// Registro. E il pulsante «Invia Avviso» ce l'avevano anche i
// collaboratori e i manager, che potevano mandare una comunicazione
// a TUTTO lo studio — senza traccia.
//
// Dopo la scelta A, un avviso a tutti è un atto del titolare, e deve
// lasciare un segno.
// ============================================================

import fs from 'fs';
import path from 'path';

const leggi = (r: string): string =>
  fs.readFileSync(path.join(__dirname, '..', r), 'utf8');

describe('l\'avviso lascia una riga nel Registro', () => {
  const svc = leggi('services/comunicazioneService.ts');

  it('quando si manda', () => {
    expect(svc).toMatch(/annota\(\{[\s\S]{0,120}azione: 'creato',[\s\S]{0,60}oggetto: 'avviso'/);
  });

  it('quando si cancella', () => {
    expect(svc).toMatch(/annota\(\{ azione: 'eliminato', oggetto: 'avviso'/);
  });

  it('e la riga dice a quanti è stato mandato, e se era una prova', () => {
    expect(svc).toMatch(/dettaglio: `\$\{dati\.prova \? 'prova · ' : ''\}a \$\{dati\.destinatariIds\.length\}/);
  });

  it('«avviso» è un tipo vero del Registro', () => {
    const reg = leggi('domain/registro.ts');
    expect(reg).toMatch(/\| 'avviso'/);
    expect(reg).toMatch(/avviso: 'avviso',/);
  });
});

describe('solo il titolare manda un avviso a tutto lo studio', () => {
  it('nell\'app: il pulsante è gated su isOwner, non su isStaff', () => {
    const scr = leggi('screens/shared/NotificationsScreen.tsx');
    expect(scr).toMatch(/\{isOwner && \(\s*\n\s*<TouchableOpacity\s*\n\s*style=\{styles\.sendAlertBtn\}/);
    expect(scr).not.toMatch(/\{isStaff && \(\s*\n\s*<TouchableOpacity\s*\n\s*style=\{styles\.sendAlertBtn\}/);
  });

  it('nelle regole: comunicazioni create è isOwner', () => {
    const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
    const i = rules.indexOf('match /comunicazioni');
    const blocco = rules.slice(i, i + 300);
    expect(blocco).toMatch(/allow create, update: if isOwner\(\);/);
  });
});
