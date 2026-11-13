// ============================================================
// IL DOCUMENTO DEL REGISTRO — impaginazione
// ------------------------------------------------------------
// Esce dallo studio e finisce sul tavolo di un professionista.
// Perciò: niente colori dello studio, niente conclusioni, niente
// aggettivi. Fatti, metodo, e le avvertenze su che cosa i fatti NON
// dicono — stampate dentro al documento, non dette a voce.
//
// Sta nel dominio e non in utils/printUtils perché un documento del
// genere va potuto guardare e provare senza aprire l'applicazione: i
// conti li fa registroPresenze.ts, qui si impagina e basta, e il
// risultato è una stringa che si può aprire in un browser e leggere.
// ============================================================

export const DOCUMENTO_REGISTRO_VERSION = 1;

const REGISTRO_CSS = `
  @page { size: A4; margin: 14mm 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; font-size: 10pt; line-height: 1.35; }
  .testata { display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2.5px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
  .testata .ente { font-size: 11pt; font-weight: 700; }
  .testata .sede { font-size: 8pt; color: #555; margin-top: 2px; }
  .testata .estratto { font-size: 8pt; color: #555; text-align: right; line-height: 1.5; }
  h1 { font-size: 14pt; margin-bottom: 4px; }
  h2 { font-size: 10pt; text-transform: uppercase; letter-spacing: 1px;
    margin: 16px 0 5px; border-bottom: 1px solid #bbb; padding-bottom: 3px; }
  p { margin-bottom: 5px; }
  .nota { font-size: 9pt; color: #444; }
  .scopo { background: #f5f5f5; border-left: 3px solid #111; padding: 7px 10px;
    font-size: 9.5pt; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4px; }
  th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .8px;
    color: #555; border-bottom: 1.2px solid #111; padding: 4px 5px 3px; }
  td { padding: 4px 5px; border-bottom: 1px solid #ddd; vertical-align: top; }
  td.n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  tr.forte td { font-weight: 700; }
  .cifre { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 4px; }
  .cifra { border: 1px solid #111; padding: 7px 12px; min-width: 110px; }
  .cifra .v { font-size: 17pt; font-weight: 700; line-height: 1; }
  .cifra .e { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .8px; color: #555; margin-top: 4px; }
  ol.avvertenze { margin-left: 16px; font-size: 9pt; color: #333; }
  ol.avvertenze li { margin-bottom: 4px; }
  .pie { margin-top: 14px; border-top: 1px solid #bbb; padding-top: 6px; font-size: 8pt; color: #555; }
  .vuoto { font-size: 9pt; color: #555; font-style: italic; padding: 6px 0; }
  @media print { .no-print { display: none; } }
`;

const giornoIt = (g: string): string => {
  if (!g) return '-';
  const [a, m, d] = g.split('-');
  return `${d}/${m}/${a}`;
};

const esc = (s: string): string =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MAX_RIGHE = 200;

export interface DatiDocumentoRegistro {
  registro: {
    dal: string; al: string;
    totaleSedute: number; seduteFuture: number;
    totaleIngressi: number; seduteSenzaScrittura: number;
    ingressiDiNonAllenati: number; personeNonAllenate: number;
    mensili: { mese: string; perConduttore: { nome: string; sedute: number }[] }[];
    righeInRitardo: { id: string; studentId: string; collaboratorId: string;
      giorno: string; ora: string; giornoScrittura: string; ritardo: number | null }[];
    spaiati: { id: string; allievo: string; giorno: string; ora: string }[];
    conduttori: { nome: string; sedute: number; conScrittura: number; scritteDopo: number;
      scritteMoltoDopo: number; ritardoMassimo: number; ritardoMedio: number }[];
  };
  avvertenze: string[];
  nomeAllievo: (id: string) => string;
  nomeConduttore: (id: string) => string;
  ente: string;
  sede: string;
}

export interface DocumentoRegistro {
  css: string;
  html: string;
}

export const documentoRegistro = (
  dati: DatiDocumentoRegistro
): DocumentoRegistro => {
  const { registro: r, avvertenze, nomeAllievo, nomeConduttore, ente, sede } = dati;
  const ora = new Date();
  const estrattoIl = `${ora.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} alle ${ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

  const tagliata = (n: number) => (n > MAX_RIGHE
    ? `<p class="nota">Elencate le prime ${MAX_RIGHE} righe su ${n}. L'elenco completo è disponibile su richiesta.</p>`
    : '');

  const mesiIt = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const meseIt = (m: string): string => {
    const [a, n] = m.split('-');
    return `${mesiIt[Number(n) - 1] || n} ${a}`;
  };

  const nomiMensili = Array.from(new Set(
    r.mensili.flatMap((m) => m.perConduttore.map((c) => c.nome))
  ));

  const tabellaMensile = r.mensili.length ? `
    <table>
      <tr><th>Mese</th>${nomiMensili.map((n) => `<th style="text-align:right">${esc(n)}</th>`).join('')}<th style="text-align:right">Totale</th></tr>
      ${r.mensili.map((m) => {
        const tot = m.perConduttore.reduce((a, b) => a + b.sedute, 0);
        return `<tr><td>${meseIt(m.mese)}</td>${nomiMensili.map((n) => {
          const v = m.perConduttore.find((c) => c.nome === n);
          return `<td class="n">${v ? v.sedute : '-'}</td>`;
        }).join('')}<td class="n">${tot}</td></tr>`;
      }).join('')}
    </table>` : '<p class="vuoto">Nessuna seduta svolta nel periodo.</p>';

  const tabellaConduttori = r.conduttori.length ? `
    <table>
      <tr>
        <th>Conduttore</th><th>Sedute</th><th>Con data di scrittura</th>
        <th>Scritte dopo</th><th>Oltre 7 giorni</th><th>Ritardo max</th><th>Ritardo medio</th>
      </tr>
      ${r.conduttori.map((c) => `
      <tr>
        <td>${esc(c.nome)}</td>
        <td class="n">${c.sedute}</td>
        <td class="n">${c.conScrittura}</td>
        <td class="n">${c.scritteDopo}</td>
        <td class="n">${c.scritteMoltoDopo}</td>
        <td class="n">${c.ritardoMassimo ? c.ritardoMassimo + ' gg' : '-'}</td>
        <td class="n">${c.ritardoMedio ? c.ritardoMedio + ' gg' : '-'}</td>
      </tr>`).join('')}
    </table>` : '<p class="vuoto">Nessuna seduta nel periodo.</p>';

  const tabellaRitardi = r.righeInRitardo.length ? `
    <table>
      <tr><th>Giorno della seduta</th><th>Ora</th><th>Allievo</th><th>Conduttore</th><th>Scritta il</th><th>Giorni dopo</th></tr>
      ${r.righeInRitardo.slice(0, MAX_RIGHE).map((x) => `
      <tr>
        <td>${giornoIt(x.giorno)}</td>
        <td class="n">${esc(x.ora || '-')}</td>
        <td>${esc(nomeAllievo(x.studentId) || '-')}</td>
        <td>${esc(nomeConduttore(x.collaboratorId) || 'Non indicato')}</td>
        <td>${giornoIt(x.giornoScrittura)}</td>
        <td class="n">${x.ritardo}</td>
      </tr>`).join('')}
    </table>
    ${tagliata(r.righeInRitardo.length)}`
    : '<p class="vuoto">Nessuna seduta risulta scritta dopo il giorno in cui si è svolta.</p>';

  const tabellaSpaiati = r.spaiati.length ? `
    <table>
      <colgroup><col style="width:22%"><col style="width:22%"><col style="width:56%"></colgroup>
      <tr><th>Giorno</th><th>Ora dell'ingresso</th><th>Allievo</th></tr>
      ${r.spaiati.slice(0, MAX_RIGHE).map((s) => `
      <tr><td>${giornoIt(s.giorno)}</td><td class="n">${esc(s.ora)}</td><td>${esc(s.allievo)}</td></tr>`).join('')}
    </table>
    ${tagliata(r.spaiati.length)}`
    : '<p class="vuoto">Ogni ingresso registrato trova una seduta nello stesso giorno.</p>';

  const content = `
    <div class="testata">
      <div>
        <div class="ente">${esc(ente)}</div>
        <div class="sede">${esc(sede)}</div>
      </div>
      <div class="estratto">Estratto il ${estrattoIl}<br>Documento interno</div>
    </div>

    <h1>Registro delle sedute e degli ingressi</h1>
    <p class="nota">Periodo coperto dai dati: ${giornoIt(r.dal)} — ${giornoIt(r.al)}</p>

    <div class="scopo">
      Il documento mette a confronto due registri che nascono da mani diverse:
      le <b>sedute</b>, inserite da chi le conduce, e gli <b>ingressi</b>,
      registrati dall'allievo all'arrivo. Riporta inoltre, per ogni seduta,
      <b>quando la riga è stata scritta</b> — un dato registrato dal server.
      Non contiene valutazioni né conclusioni: solo i numeri e il metodo con
      cui sono stati ottenuti.
    </div>

    <div class="cifre">
      <div class="cifra"><div class="v">${r.totaleSedute - r.seduteFuture}</div><div class="e">Sedute svolte</div></div>
      <div class="cifra"><div class="v">${r.seduteFuture}</div><div class="e">Ancora da svolgere</div></div>
      <div class="cifra"><div class="v">${r.totaleIngressi}</div><div class="e">Ingressi registrati</div></div>
      <div class="cifra"><div class="v">${r.righeInRitardo.length}</div><div class="e">Scritte dopo</div></div>
      <div class="cifra"><div class="v">${r.spaiati.length}</div><div class="e">Ingressi da approfondire</div></div>
    </div>

    <h2>1 · Sedute per mese</h2>
    <p class="nota">Sedute già svolte, mese per mese e conduttore per conduttore.
    Gli appuntamenti futuri non sono conteggiati.</p>
    ${tabellaMensile}

    <h2>2 · Riepilogo per conduttore</h2>
    ${tabellaConduttori}

    <h2>3 · Sedute scritte dopo il giorno in cui si sono svolte</h2>
    <p class="nota">L'ultima colonna dice quanti giorni sono passati fra lo
    svolgimento della seduta e il momento in cui la riga è stata creata
    nell'applicazione. Zero giorni — cioè la scrittura lo stesso giorno o in
    anticipo — non compare in questo elenco.</p>
    ${tabellaRitardi}

    <h2>4 · Ingressi di chi svolge sedute, in giornate senza seduta</h2>
    <p class="nota">Ingressi registrati in giornate nelle quali, per quello stesso
    nome, non risulta alcuna seduta: né svolta, né programmata, né annullata.
    L'elenco riguarda <b>soltanto le persone che nel periodo hanno svolto almeno
    una seduta</b>${r.ingressiDiNonAllenati ? `: restano fuori ${r.ingressiDiNonAllenati} ingressi di ${r.personeNonAllenate} iscritti che si allenano in autonomia e per i quali una seduta non è prevista` : ''}.</p>
    ${tabellaSpaiati}

    <h2>5 · Che cosa questi dati dicono, e che cosa no</h2>
    <ol class="avvertenze">
      ${avvertenze.map((a) => `<li>${esc(a)}</li>`).join('')}
    </ol>

    <div class="pie">
      Estrazione automatica dai dati dell'applicazione gestionale dello studio.
      Nessun dato è stato inserito, modificato o selezionato a mano nella
      produzione di questo documento.
    </div>`;

  return { css: REGISTRO_CSS, html: content };
};
