import { useState, useEffect } from "react";

// ─── DATI CONDIVISI ───────────────────────────────────────────────
const fasciaLayers = [
  { id: "superficiale", nome: "Fascia Superficiale", colore: "#C41E3A", profondita: "0–2 cm", descrizione: "Avvolge l'intero corpo. Regola temperatura, riserve energetiche e comunicazione ormonale.", funzioni: ["Isolamento termico", "Riserva energetica", "Recettori sensoriali", "Passaggio vascolare"] },
  { id: "profonda", nome: "Fascia Profonda", colore: "#8B0000", profondita: "2–8 cm", descrizione: "Struttura densa e fibrosa. Avvolge muscoli, ossa, nervi. Trasmette forza meccanica tra segmenti lontani.", funzioni: ["Trasmissione forza", "Stabilizzazione", "Separazione compartimenti", "Via nervosa"] },
  { id: "viscerale", nome: "Fascia Viscerale", colore: "#4A0010", profondita: "Profonda", descrizione: "Sospende e protegge gli organi interni. Risponde direttamente allo stress cronico.", funzioni: ["Sospensione organi", "Mobilità viscerale", "Risposta stress", "Asse HPA"] },
];

const quizDomande = [
  { domanda: "Quanti tipi principali di fascia esistono nel corpo?", risposte: ["2", "3", "5", "7"], corretta: 1 },
  { domanda: "Cos'è la tixotropia fasciale?", risposte: ["Un tipo di stretching", "La capacità di fluidificarsi con calore e movimento", "Una patologia fasciale", "Un muscolo profondo"], corretta: 1 },
  { domanda: "Chi ha mappato le linee miofasciali?", risposte: ["Joe Dispenza", "Thomas Myers", "Robert Schleip", "Eckhart Tolle"], corretta: 1 },
  { domanda: "La fascia contiene recettori propriocettivi:", risposte: ["Meno dei muscoli", "Uguale ai muscoli", "Più dei muscoli stessi", "Nessuno"], corretta: 2 },
];

const lineeAT = [
  { nome: "Superficial Back Line", short: "SBL", desc: "Pianta del piede → tendine Achille → ischio-crurali → sacro-lombare → occipite" },
  { nome: "Superficial Front Line", short: "SFL", desc: "Dorso del piede → tibiale anteriore → retto addominale → sternocleidomastoideo" },
  { nome: "Lateral Line", short: "LL", desc: "Malleolo laterale → peronei → bande ileo-tibiali → obliqui → intercostali" },
  { nome: "Spiral Line", short: "SPL", desc: "Doppia elica che avvolge il corpo. Crea e controlla rotazioni. Stabilizza arco plantare." },
  { nome: "Deep Front Line", short: "DFL", desc: "Core fasciale profondo. Diaframma → psoas → diaframma pelvico. Via posturale centrale." },
];

// ─── ACADEMY VERSION ────────────────────────────────────────────────
function AcademyView() {
  const [activeModule, setActiveModule] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState([true, false, false, false]);

  const modules = [
    { id: 0, titolo: "Cos'è la Fascia", durata: "8 min", tag: "FONDAMENTI" },
    { id: 1, titolo: "Anatomy Trains", durata: "12 min", tag: "AVANZATO" },
    { id: 2, titolo: "Protocollo Fasciale", durata: "15 min", tag: "PRATICA" },
    { id: 3, titolo: "Test di Valutazione", durata: "10 min", tag: "QUIZ" },
  ];

  const handleAnswer = (idx) => {
    setSelected(idx);
    if (idx === quizDomande[quizIndex].corretta) setQuizScore(s => s + 1);
    setTimeout(() => {
      if (quizIndex < quizDomande.length - 1) {
        setQuizIndex(i => i + 1);
        setSelected(null);
      } else {
        setQuizDone(true);
        setProgress([true, true, true, true]);
      }
    }, 800);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh", background: "#0A0A0A", fontFamily: "Georgia, serif", color: "#E8E0E0" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .mod-item:hover { background: rgba(196,30,58,.1) !important; }
        .ans-btn:hover { border-color: #C41E3A !important; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ background: "#080808", borderRight: "1px solid #1A1A1A", padding: "32px 0" }}>
        <div style={{ padding: "0 24px 32px", borderBottom: "1px solid #141414" }}>
          <div style={{ fontSize: 9, letterSpacing: 6, color: "#C41E3A", marginBottom: 8 }}>MIND MOVEMENT</div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>ACADEMY</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Modulo 3 — Anatomia Funzionale</div>
        </div>

        <div style={{ padding: "24px 0" }}>
          <div style={{ fontSize: 9, letterSpacing: 5, color: "#444", padding: "0 24px", marginBottom: 16 }}>LEZIONI</div>
          {modules.map((mod, i) => (
            <div key={mod.id} className="mod-item" onClick={() => setActiveModule(mod.id)}
              style={{ padding: "14px 24px", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 12, background: activeModule === mod.id ? "rgba(196,30,58,.12)" : "transparent", borderLeft: activeModule === mod.id ? "2px solid #C41E3A" : "2px solid transparent" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${progress[i] ? "#C41E3A" : "#2A2A2A"}`, background: progress[i] ? "#C41E3A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: progress[i] ? "#fff" : "#333" }}>
                {progress[i] ? "✓" : i + 1}
              </div>
              <div>
                <div style={{ fontSize: 12, color: activeModule === mod.id ? "#E8E0E0" : "#888", marginBottom: 2 }}>{mod.titolo}</div>
                <div style={{ fontSize: 10, color: "#444", letterSpacing: 1 }}>{mod.durata} · {mod.tag}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ padding: "24px", borderTop: "1px solid #141414", marginTop: "auto" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#555", marginBottom: 10 }}>COMPLETAMENTO</div>
          <div style={{ background: "#1A1A1A", height: 4, borderRadius: 2 }}>
            <div style={{ height: "100%", background: "#C41E3A", borderRadius: 2, width: `${(progress.filter(Boolean).length / 4) * 100}%`, transition: "width .6s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "#C41E3A", marginTop: 8 }}>{progress.filter(Boolean).length * 25}% completato</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ padding: "48px", overflowY: "auto", maxHeight: "100vh" }}>
        {activeModule === 0 && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 6, color: "#C41E3A", marginBottom: 16 }}>LEZIONE 01 · FONDAMENTI</div>
            <h1 style={{ fontSize: 42, margin: "0 0 8px", fontWeight: 900, letterSpacing: -1 }}>Cos'è la Fascia</h1>
            <p style={{ color: "#666", marginBottom: 40, fontStyle: "italic" }}>Tempo stimato: 8 minuti</p>

            <div style={{ maxWidth: 660 }}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "#C4B4B4", marginBottom: 32 }}>
                La fascia è il sistema connettivo continuo che avvolge, separa e connette ogni struttura del corpo umano — dai muscoli agli organi, dai nervi ai vasi sanguigni. Non è semplicemente un "involucro": è una rete biologica intelligente capace di trasmettere forza, informazione e tensione attraverso l'intero organismo.
              </p>

              {fasciaLayers.map((layer, i) => (
                <div key={layer.id} style={{ borderLeft: `3px solid ${layer.colore}`, padding: "20px 24px", marginBottom: 20, background: "rgba(255,255,255,.02)", animation: `fadeUp .4s ${i * .15}s both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, letterSpacing: 2, color: layer.colore }}>{layer.nome.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#555", background: "#111", padding: "3px 10px" }}>Prof. {layer.profondita}</div>
                  </div>
                  <p style={{ fontSize: 14, color: "#9A8A8A", lineHeight: 1.6, marginBottom: 14 }}>{layer.descrizione}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {layer.funzioni.map(f => <span key={f} style={{ fontSize: 10, padding: "4px 10px", border: `1px solid ${layer.colore}30`, color: layer.colore, letterSpacing: 1 }}>{f}</span>)}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 40, padding: "24px", background: "rgba(196,30,58,.06)", border: "1px solid #C41E3A20" }}>
                <div style={{ fontSize: 10, letterSpacing: 4, color: "#C41E3A", marginBottom: 12 }}>CONCETTO CHIAVE</div>
                <p style={{ fontSize: 15, fontStyle: "italic", color: "#C4B4B4", lineHeight: 1.7 }}>
                  "La fascia contiene più recettori propriocettivi dei muscoli stessi. Questo significa che la tua percezione corporea dipende più dalla fascia che dai muscoli che alleni ogni giorno."
                </p>
              </div>

              <button onClick={() => { setActiveModule(1); setProgress(p => { const n=[...p]; n[0]=true; return n; }); }}
                style={{ marginTop: 32, padding: "14px 36px", background: "#C41E3A", border: "none", color: "#fff", fontSize: 12, letterSpacing: 3, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                LEZIONE SUCCESSIVA →
              </button>
            </div>
          </div>
        )}

        {activeModule === 1 && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 6, color: "#C41E3A", marginBottom: 16 }}>LEZIONE 02 · AVANZATO</div>
            <h1 style={{ fontSize: 42, margin: "0 0 8px", fontWeight: 900, letterSpacing: -1 }}>Anatomy Trains</h1>
            <p style={{ color: "#666", marginBottom: 40, fontStyle: "italic" }}>Tom Myers — Le linee miofasciali del corpo</p>

            <div style={{ maxWidth: 660 }}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "#C4B4B4", marginBottom: 32 }}>
                Tom Myers ha rivoluzionato la comprensione del movimento mappando 12 linee miofasciali — catene continue di tessuto fasciale che attraversano il corpo da un'estremità all'altra, trasmettendo tensione e forza ben oltre i confini di un singolo muscolo.
              </p>

              {lineeAT.map((linea, i) => (
                <div key={linea.short} style={{ display: "flex", gap: 20, marginBottom: 20, padding: "18px", background: "rgba(255,255,255,.02)", border: "1px solid #1A1A1A", animation: `fadeUp .3s ${i * .1}s both` }}>
                  <div style={{ width: 48, height: 48, background: "#C41E3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: 1 }}>{linea.short}</div>
                  <div>
                    <div style={{ fontSize: 13, letterSpacing: 1, color: "#E8E0E0", marginBottom: 6 }}>{linea.nome}</div>
                    <div style={{ fontSize: 13, color: "#7A6A6A", lineHeight: 1.5 }}>{linea.desc}</div>
                  </div>
                </div>
              ))}

              <button onClick={() => { setActiveModule(2); setProgress(p => { const n=[...p]; n[1]=true; return n; }); }}
                style={{ marginTop: 32, padding: "14px 36px", background: "#C41E3A", border: "none", color: "#fff", fontSize: 12, letterSpacing: 3, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                LEZIONE SUCCESSIVA →
              </button>
            </div>
          </div>
        )}

        {activeModule === 2 && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 6, color: "#C41E3A", marginBottom: 16 }}>LEZIONE 03 · PRATICA</div>
            <h1 style={{ fontSize: 42, margin: "0 0 8px", fontWeight: 900, letterSpacing: -1 }}>Il Protocollo</h1>
            <p style={{ color: "#666", marginBottom: 40, fontStyle: "italic" }}>Applicazione clinica del lavoro fasciale</p>

            <div style={{ maxWidth: 660 }}>
              {[
                { num: "01", fase: "VALUTAZIONE", durata: "10 min", content: "Osservazione posturale e palpazione dei punti di tensione fasciale. Identificazione delle linee di Anatomy Trains compromesse. Analisi del pattern respiratorio.", strumenti: ["Osservazione visiva", "Palpazione superficiale", "Test di flessibilità catene"] },
                { num: "02", fase: "IDRATAZIONE TISSUTALE", durata: "15 min", content: "Rollio miofasciale con foam roller e ball. Pressione sostenuta sui trigger point. Obiettivo: fluidificare la matrice extracellulare tramite effetto tixotropico.", strumenti: ["Foam roller", "Lacrosse ball", "Pressione manuale"] },
                { num: "03", fase: "ALLUNGAMENTO FASCIALE", durata: "20 min", content: "Stretching lungo le catene miofasciali. Mantenimento 90–120 secondi per ogni posizione. Abbinamento con respirazione diaframmatica consapevole.", strumenti: ["Stretching catene", "Breathing fasciale", "Posizioni Myers"] },
                { num: "04", fase: "INTEGRAZIONE", durata: "15 min", content: "Movimento consapevole che consolida il nuovo pattern fasciale. Esercizi di propriocezione. Visualizzazione del percorso delle linee nel corpo.", strumenti: ["Movimento fluido", "Propriocezione", "Integrazione mente-corpo"] },
              ].map((step, i) => (
                <div key={step.num} style={{ marginBottom: 28, animation: `fadeUp .3s ${i * .1}s both` }}>
                  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 48, color: "#C41E3A15", fontWeight: 900, lineHeight: 1, flexShrink: 0, width: 60 }}>{step.num}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, letterSpacing: 3, color: "#C41E3A" }}>{step.fase}</div>
                        <div style={{ fontSize: 10, color: "#555", background: "#111", padding: "3px 10px" }}>{step.durata}</div>
                      </div>
                      <p style={{ fontSize: 14, color: "#9A8A8A", lineHeight: 1.6, marginBottom: 14 }}>{step.content}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {step.strumenti.map(s => <span key={s} style={{ fontSize: 10, padding: "4px 10px", border: "1px solid #1E1E1E", color: "#666", letterSpacing: 1 }}>{s}</span>)}
                      </div>
                    </div>
                  </div>
                  {i < 3 && <div style={{ width: "100%", height: 1, background: "#111", marginTop: 28 }} />}
                </div>
              ))}

              <button onClick={() => { setActiveModule(3); setProgress(p => { const n=[...p]; n[2]=true; return n; }); }}
                style={{ marginTop: 32, padding: "14px 36px", background: "#C41E3A", border: "none", color: "#fff", fontSize: 12, letterSpacing: 3, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                VAI AL TEST →
              </button>
            </div>
          </div>
        )}

        {activeModule === 3 && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 6, color: "#C41E3A", marginBottom: 16 }}>LEZIONE 04 · VALUTAZIONE</div>
            <h1 style={{ fontSize: 42, margin: "0 0 8px", fontWeight: 900, letterSpacing: -1 }}>Test Fasciale</h1>
            <p style={{ color: "#666", marginBottom: 40, fontStyle: "italic" }}>{quizDomande.length} domande · Soglia minima: 75%</p>

            {!quizStarted && !quizDone && (
              <div style={{ maxWidth: 500 }}>
                <p style={{ fontSize: 15, color: "#9A8A8A", lineHeight: 1.7, marginBottom: 32 }}>Verifica la comprensione dei concetti fondamentali sulla fascia e il suo ruolo nel movimento umano.</p>
                <button onClick={() => setQuizStarted(true)} style={{ padding: "14px 36px", background: "#C41E3A", border: "none", color: "#fff", fontSize: 12, letterSpacing: 3, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  INIZIA IL TEST
                </button>
              </div>
            )}

            {quizStarted && !quizDone && (
              <div style={{ maxWidth: 560, animation: "fadeUp .3s ease" }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 24 }}>Domanda {quizIndex + 1} di {quizDomande.length}</div>
                <div style={{ background: "#111", height: 3, marginBottom: 32 }}>
                  <div style={{ height: "100%", background: "#C41E3A", width: `${((quizIndex + 1) / quizDomande.length) * 100}%`, transition: "width .4s" }} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, marginBottom: 32, color: "#E8E0E0" }}>{quizDomande[quizIndex].domanda}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {quizDomande[quizIndex].risposte.map((r, i) => (
                    <button key={i} className="ans-btn" onClick={() => handleAnswer(i)} disabled={selected !== null}
                      style={{ padding: "16px 20px", background: selected === null ? "transparent" : selected === i ? (i === quizDomande[quizIndex].corretta ? "rgba(0,180,0,.15)" : "rgba(196,30,58,.2)") : (i === quizDomande[quizIndex].corretta && selected !== null ? "rgba(0,180,0,.15)" : "transparent"), border: `1px solid ${selected === i ? (i === quizDomande[quizIndex].corretta ? "#00B400" : "#C41E3A") : "#222"}`, color: "#C4B4B4", fontSize: 14, textAlign: "left", cursor: "pointer", fontFamily: "Georgia, serif", transition: "all .2s" }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quizDone && (
              <div style={{ maxWidth: 500, animation: "fadeUp .4s ease" }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: quizScore >= 3 ? "#C41E3A" : "#555", marginBottom: 16 }}>{quizScore}/{quizDomande.length}</div>
                <div style={{ fontSize: 18, color: "#E8E0E0", marginBottom: 8 }}>{quizScore >= 3 ? "Modulo Completato" : "Ripassa le lezioni"}</div>
                <p style={{ fontSize: 14, color: "#9A8A8A", lineHeight: 1.6, marginBottom: 32 }}>{quizScore >= 3 ? "Hai dimostrato una comprensione solida del sistema fasciale. Puoi avanzare al modulo PNEI." : "Alcune aree richiedono approfondimento. Ti consigliamo di ripassare le lezioni 1 e 2."}</p>
                {quizScore >= 3 && (
                  <div style={{ padding: "24px", border: "1px solid #C41E3A40", background: "rgba(196,30,58,.05)", marginBottom: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: 4, color: "#C41E3A", marginBottom: 8 }}>CERTIFICATO MODULO 3</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>Anatomia Funzionale</div>
                    <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Mind Movement Academy · Francesco Busanca</div>
                  </div>
                )}
                <button onClick={() => { setQuizStarted(false); setQuizDone(false); setQuizIndex(0); setQuizScore(0); setSelected(null); }}
                  style={{ padding: "12px 28px", background: "transparent", border: "1px solid #333", color: "#888", fontSize: 11, letterSpacing: 3, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  RIPETI IL TEST
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ESSĒRE APP VERSION ────────────────────────────────────────────
function EssereView() {
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedLayer, setExpandedLayer] = useState(null);

  const nav = [
    { id: "overview", label: "Overview", icon: "◈" },
    { id: "anatomy", label: "Anatomia", icon: "⬡" },
    { id: "protocol", label: "Protocollo", icon: "◎" },
    { id: "progress", label: "I Tuoi Dati", icon: "◫" },
  ];

  const userStats = [
    { label: "Sessioni", valore: "24", unit: "totali" },
    { label: "Settimane", valore: "8", unit: "di programma" },
    { label: "Mobilità", valore: "+34%", unit: "miglioramento" },
    { label: "Tensione", valore: "-41%", unit: "riduzione" },
  ];

  return (
    <div style={{ background: "#0E0E0E", minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#E8E0E0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        .nav-item:hover { color: #C41E3A !important; }
        .layer-row:hover { background: rgba(196,30,58,.08) !important; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #161616", background: "#090909" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "#C41E3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>E</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>ESSĒRE</div>
            <div style={{ fontSize: 9, color: "#555", letterSpacing: 2 }}>MIND MOVEMENT LAB</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, color: "#555" }}>Marco Rossi</div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#C41E3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>MR</div>
        </div>
      </div>

      {/* BOTTOM NAV (mobile style) */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>

        {activeSection === "overview" && (
          <div style={{ padding: "32px 24px", animation: "fadeUp .3s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 5, color: "#C41E3A", marginBottom: 8 }}>BUONGIORNO</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: -0.5 }}>Marco</h1>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>Settimana 8 · Fase Integrazione</p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
              {userStats.map((stat, i) => (
                <div key={stat.label} style={{ padding: "20px", background: "#111", border: "1px solid #1A1A1A", animation: `fadeUp .3s ${i * .08}s both` }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#C41E3A", lineHeight: 1, marginBottom: 4 }}>{stat.valore}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{stat.unit}</div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginTop: 4 }}>{stat.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* Today's module */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 4, color: "#555", marginBottom: 16 }}>OGGI</div>
              <div style={{ padding: "24px", background: "#C41E3A", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
                <div style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>SESSIONE PROGRAMMATA</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Protocollo Fasciale</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginBottom: 20 }}>60 min · Idratazione + Allungamento SBL</div>
                <button style={{ padding: "10px 24px", background: "#fff", border: "none", color: "#C41E3A", fontSize: 11, letterSpacing: 3, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 700 }}>INIZIA →</button>
              </div>
            </div>

            {/* Recent content */}
            <div>
              <div style={{ fontSize: 10, letterSpacing: 4, color: "#555", marginBottom: 16 }}>CONTENUTI RECENTI</div>
              {["Anatomy Trains — Linea Dorsale Superficiale", "PNEI e Stress Fasciale", "Respiro Diaframmatico Profondo"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid #141414" }}>
                  <div style={{ width: 36, height: 36, background: "#161616", border: "1px solid #C41E3A30", display: "flex", alignItems: "center", justifyContent: "center", color: "#C41E3A", fontSize: 14, flexShrink: 0 }}>▶</div>
                  <div style={{ fontSize: 14, color: "#C4B4B4" }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "anatomy" && (
          <div style={{ padding: "32px 24px", animation: "fadeUp .3s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 5, color: "#C41E3A", marginBottom: 16 }}>LIBRERIA CONTENUTI</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>Il Sistema Fasciale</h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 32, lineHeight: 1.6 }}>Esplora l'anatomia funzionale della fascia</p>

            {fasciaLayers.map((layer, i) => (
              <div key={layer.id} className="layer-row" onClick={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
                style={{ borderLeft: `3px solid ${layer.colore}`, padding: "18px 16px", marginBottom: 12, cursor: "pointer", background: "#111", transition: "all .2s", animation: `fadeUp .3s ${i*.1}s both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, letterSpacing: 2, color: layer.colore, marginBottom: 4 }}>{layer.nome.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>Profondità: {layer.profondita}</div>
                  </div>
                  <div style={{ color: "#333", fontSize: 18, transition: "transform .3s", transform: expandedLayer === layer.id ? "rotate(90deg)" : "rotate(0)" }}>›</div>
                </div>
                {expandedLayer === layer.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${layer.colore}20`, animation: "fadeUp .2s ease" }}>
                    <p style={{ fontSize: 14, color: "#9A8A8A", lineHeight: 1.6, marginBottom: 14 }}>{layer.descrizione}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {layer.funzioni.map(f => <span key={f} style={{ fontSize: 10, padding: "4px 8px", border: `1px solid ${layer.colore}30`, color: layer.colore }}>{f}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 10, letterSpacing: 4, color: "#555", marginBottom: 16 }}>ANATOMY TRAINS</div>
              {lineeAT.map((linea, i) => (
                <div key={linea.short} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid #141414", animation: `fadeUp .3s ${i*.08}s both` }}>
                  <div style={{ width: 38, height: 38, background: "#C41E3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: 1 }}>{linea.short}</div>
                  <div>
                    <div style={{ fontSize: 13, color: "#E8E0E0", marginBottom: 4 }}>{linea.nome}</div>
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>{linea.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "protocol" && (
          <div style={{ padding: "32px 24px", animation: "fadeUp .3s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 5, color: "#C41E3A", marginBottom: 16 }}>PROTOCOLLO ATTIVO</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>Sessione Fasciale</h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>Fase 3 — Idratazione + Allungamento</p>

            {[
              { num: "01", nome: "RISCALDAMENTO", durata: "5 min", completato: true, desc: "Respirazione diaframmatica + rotazioni articolari" },
              { num: "02", nome: "IDRATAZIONE", durata: "15 min", completato: true, desc: "Foam roller SBL completa — 60 sec per zona" },
              { num: "03", nome: "ALLUNGAMENTO", durata: "20 min", completato: false, desc: "Stretching catene Myers — posizioni 90s" },
              { num: "04", nome: "INTEGRAZIONE", durata: "10 min", completato: false, desc: "Movimento fluido consapevole" },
              { num: "05", nome: "CHIUSURA", durata: "5 min", completato: false, desc: "Meditazione + scan corporeo" },
            ].map((step, i) => (
              <div key={step.num} style={{ display: "flex", gap: 16, marginBottom: 20, animation: `fadeUp .3s ${i*.08}s both` }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: step.completato ? "#C41E3A" : "#1A1A1A", border: `2px solid ${step.completato ? "#C41E3A" : "#2A2A2A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: step.completato ? "#fff" : "#444", flexShrink: 0 }}>
                    {step.completato ? "✓" : step.num}
                  </div>
                  {i < 4 && <div style={{ width: 1, flex: 1, background: "#1A1A1A", margin: "8px 0" }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 12, letterSpacing: 2, color: step.completato ? "#C41E3A" : "#E8E0E0" }}>{step.nome}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{step.durata}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#666", lineHeight: 1.5 }}>{step.desc}</div>
                  {!step.completato && i === 2 && (
                    <button style={{ marginTop: 12, padding: "10px 20px", background: "#C41E3A", border: "none", color: "#fff", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      INIZIA FASE →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === "progress" && (
          <div style={{ padding: "32px 24px", animation: "fadeUp .3s ease" }}>
            <div style={{ fontSize: 10, letterSpacing: 5, color: "#C41E3A", marginBottom: 16 }}>ANALYTICS</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px" }}>I Tuoi Progressi</h2>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 32 }}>Settimane 1–8</p>

            {[
              { label: "Mobilità toracica", valore: 78, delta: "+18%" },
              { label: "Flessibilità catena dorsale", valore: 65, delta: "+12%" },
              { label: "Controllo respiratorio", valore: 88, delta: "+34%" },
              { label: "HRV mattutino", valore: 72, delta: "+22%" },
            ].map((metric, i) => (
              <div key={metric.label} style={{ marginBottom: 24, animation: `fadeUp .3s ${i*.1}s both` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#C4B4B4" }}>{metric.label}</span>
                  <span style={{ fontSize: 12, color: "#C41E3A" }}>{metric.delta}</span>
                </div>
                <div style={{ background: "#1A1A1A", height: 6, borderRadius: 3 }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg, #8B0000, #C41E3A)", borderRadius: 3, width: `${metric.valore}%`, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{metric.valore}/100</div>
              </div>
            ))}

            <div style={{ marginTop: 32, padding: "20px", background: "#111", border: "1px solid #C41E3A20" }}>
              <div style={{ fontSize: 10, letterSpacing: 4, color: "#C41E3A", marginBottom: 12 }}>NOTA DEL COACH</div>
              <p style={{ fontSize: 14, color: "#9A8A8A", lineHeight: 1.7, fontStyle: "italic" }}>
                "Marco, il tuo pattern fasciale dorsale mostra un'eccellente risposta al protocollo. La tensione cronica nella Deep Front Line si sta normalizzando. Continua con il respiro diaframmatico mattutino."
              </p>
              <div style={{ fontSize: 11, color: "#555", marginTop: 12 }}>— Francesco Busanca</div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 72, background: "#090909", borderTop: "1px solid #161616", display: "flex", alignItems: "center" }}>
        {nav.map(item => (
          <button key={item.id} className="nav-item" onClick={() => setActiveSection(item.id)}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: activeSection === item.id ? "#C41E3A" : "#444", transition: "color .2s", fontFamily: "Georgia, serif", padding: "12px 0" }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 2 }}>{item.label.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── LINK IN BIO VERSION ────────────────────────────────────────────
function LinkInBioView() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCta, setHoveredCta] = useState(false);

  useEffect(() => { setTimeout(() => setIsVisible(true), 100); }, []);

  return (
    <div style={{ background: "#050505", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#F0E8E8", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes breathe { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.06);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:.8;transform:scale(1.4)} }
        @keyframes lineGrow { from{width:0} to{width:100%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      `}</style>

      {/* BG CIRCLES */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[["-10%","20%",400],["-5%","70%",260],["80%","10%",340],["90%","80%",200]].map(([x,y,size],i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,30,58,.06) 0%, transparent 70%)", animation: `breathe ${5+i}s infinite` }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* PROFILE */}
        <div style={{ textAlign: "center", marginBottom: 56, opacity: isVisible ? 1 : 0, transition: "all 1s ease" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #C41E3A, #4A0010)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#fff", animation: "float 6s infinite" }}>FB</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: -0.5 }}>Francesco Busanca</h1>
          <div style={{ fontSize: 12, letterSpacing: 4, color: "#C41E3A", marginBottom: 12 }}>MIND MOVEMENT LAB</div>
          <p style={{ fontSize: 14, color: "#7A6A6A", lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
            Campione del Mondo Natural · PNEI · Fascia · Coscienza
          </p>
        </div>

        {/* HERO STATEMENT */}
        <div style={{ textAlign: "center", marginBottom: 56, animation: isVisible ? "fadeUp .6s .2s both" : "none" }}>
          <div style={{ fontSize: "clamp(32px, 7vw, 52px)", fontWeight: 900, lineHeight: 0.95, letterSpacing: -2, marginBottom: 20 }}>
            Il tuo corpo<br />
            <span style={{ color: "#C41E3A" }}>non è stanco.</span><br />
            È disconnesso.
          </div>
          <div style={{ width: 40, height: 2, background: "#C41E3A", margin: "0 auto 20px", animation: "lineGrow 1.2s .6s both" }} />
          <p style={{ fontSize: 15, color: "#9A8A8A", lineHeight: 1.7 }}>
            La fascia — la rete connettiva che avvolge ogni cellula del tuo corpo — è la risposta che nessun allenamento tradizionale ti ha mai dato.
          </p>
        </div>

        {/* FASCIA QUICK FACTS */}
        <div style={{ marginBottom: 48, animation: isVisible ? "fadeUp .6s .35s both" : "none" }}>
          <div style={{ fontSize: 10, letterSpacing: 5, color: "#C41E3A", marginBottom: 20, textAlign: "center" }}>IL METODO</div>
          {[
            { num: "70%", text: "del dolore cronico ha origine fasciale, non muscolare" },
            { num: "6×", text: "più recettori sensoriali nella fascia rispetto ai muscoli" },
            { num: "12", text: "linee miofasciali connettono il tuo corpo da un'estremità all'altra" },
          ].map((fact, i) => (
            <div key={i} style={{ display: "flex", gap: 20, padding: "18px 0", borderBottom: "1px solid #111", alignItems: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#C41E3A", minWidth: 60, textAlign: "right" }}>{fact.num}</div>
              <div style={{ fontSize: 14, color: "#9A8A8A", lineHeight: 1.5 }}>{fact.text}</div>
            </div>
          ))}
        </div>

        {/* QUOTE */}
        <div style={{ padding: "32px 28px", border: "1px solid #1A1A1A", marginBottom: 48, position: "relative", animation: isVisible ? "fadeUp .6s .5s both" : "none" }}>
          <div style={{ position: "absolute", top: -12, left: 28, background: "#050505", padding: "0 8px", fontSize: 32, color: "#C41E3A", lineHeight: 1 }}>"</div>
          <p style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.7, color: "#C4B4B4", margin: 0 }}>
            Non alleno muscoli. Alleno esseri umani. La fascia è il luogo dove il corpo conserva la memoria di ogni emozione, ogni stress, ogni limite che hai creduto di avere.
          </p>
          <div style={{ fontSize: 11, color: "#555", marginTop: 16, letterSpacing: 2 }}>— FRANCESCO BUSANCA</div>
        </div>

        {/* CTA BUTTONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: isVisible ? "fadeUp .6s .6s both" : "none" }}>
          <a href="#" style={{ display: "block", textDecoration: "none" }}>
            <div onMouseEnter={() => setHoveredCta("proto")} onMouseLeave={() => setHoveredCta(null)}
              style={{ padding: "18px 24px", background: hoveredCta === "proto" ? "#E02040" : "#C41E3A", transition: "background .2s", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>GRATUITO</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Scarica il Protocollo Fasciale</div>
              </div>
              <div style={{ fontSize: 20, color: "#fff" }}>↓</div>
            </div>
          </a>

          <a href="#" style={{ display: "block", textDecoration: "none" }}>
            <div onMouseEnter={() => setHoveredCta("sess")} onMouseLeave={() => setHoveredCta(null)}
              style={{ padding: "18px 24px", background: "transparent", border: `1px solid ${hoveredCta === "sess" ? "#C41E3A" : "#1E1E1E"}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "border .2s" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", marginBottom: 4 }}>PRIMA SESSIONE</div>
                <div style={{ fontSize: 16, color: "#C4B4B4" }}>Prenota una Valutazione</div>
              </div>
              <div style={{ fontSize: 20, color: "#C41E3A" }}>→</div>
            </div>
          </a>

          <a href="#" style={{ display: "block", textDecoration: "none" }}>
            <div onMouseEnter={() => setHoveredCta("app")} onMouseLeave={() => setHoveredCta(null)}
              style={{ padding: "18px 24px", background: "transparent", border: `1px solid ${hoveredCta === "app" ? "#C41E3A" : "#1E1E1E"}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "border .2s" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", marginBottom: 4 }}>APP</div>
                <div style={{ fontSize: 16, color: "#C4B4B4" }}>Entra nell'App ESSĒRE</div>
              </div>
              <div style={{ fontSize: 20, color: "#C41E3A" }}>E</div>
            </div>
          </a>
        </div>

        {/* SOCIAL */}
        <div style={{ textAlign: "center", marginTop: 56, animation: isVisible ? "fadeUp .6s .8s both" : "none" }}>
          <div style={{ fontSize: 10, letterSpacing: 5, color: "#333", marginBottom: 20 }}>SEGUIMI</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
            {["Instagram", "YouTube", "TikTok"].map(s => (
              <div key={s} style={{ fontSize: 12, color: "#555", letterSpacing: 1, cursor: "pointer" }}>{s}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#222", marginTop: 40 }}>MIND MOVEMENT LAB · GRAGNANO (NA)</div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN SWITCHER ────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("academy");

  const modes = [
    { id: "academy", label: "🎓 ACADEMY" },
    { id: "essere", label: "📱 ESSĒRE APP" },
    { id: "linkinbio", label: "🔗 LINK IN BIO" },
  ];

  return (
    <div>
      {/* SWITCHER */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, background: "rgba(0,0,0,.95)", borderBottom: "1px solid #1A1A1A", display: "flex", justifyContent: "center", gap: 0, backdropFilter: "blur(10px)" }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ padding: "12px 24px", background: "none", border: "none", cursor: "pointer", fontSize: 10, letterSpacing: 3, color: mode === m.id ? "#C41E3A" : "#444", borderBottom: mode === m.id ? "2px solid #C41E3A" : "2px solid transparent", transition: "all .2s", fontFamily: "Georgia, serif" }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ paddingTop: 44 }}>
        {mode === "academy" && <AcademyView />}
        {mode === "essere" && <EssereView />}
        {mode === "linkinbio" && <LinkInBioView />}
      </div>
    </div>
  );
}
