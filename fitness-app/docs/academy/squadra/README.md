# La squadra — schede di ruolo

| File | Ruolo |
|---|---|
| `ruolo-giuseppe-direttore-tecnico.docx` | Direttore Tecnico |
| `ruolo-ferruccio-head-coach.docx` | Head Coach |
| `ruolo-cristian-pt-specialista.docx` | PT Specialista |
| `script-riunione-trasformazione.docx` | Lo script con cui si conduce la riunione che introduce il cambiamento alla squadra |

Da tenere allineate con lo stato reale dello staff: **Fabio è stato disattivato**
(vedi `src/services/authService.ts` e le regole Firestore) e non compare fra le
schede — corretto. Le tariffe dei conduttori vivono in `src/domain/protocollo.ts`
e nel listino: se una scheda di ruolo cita compensi, deve concordare con quelle.
