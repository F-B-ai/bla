#!/usr/bin/env node
/* ============================================================
   IL SITO, COME LO VEDE CHI DIGITA mindmovementlab.it
   ------------------------------------------------------------
   L'applicazione e il sito vivono sullo stesso progetto Firebase
   ma NON possono stare sullo stesso spazio: su essere-3fe6f.web.app
   la radice «/» è l'applicazione, e chi arrivasse sul dominio nuovo
   troverebbe una schermata di accesso invece del sito.
   Quindi il sito si pubblica a parte, con la sua radice.

   Questo script prende le pagine da public/ — che restano l'unica
   copia da modificare — e ne fa una cartella pronta da pubblicare:

     · «Il metodo» diventa la pagina iniziale (index.html);
     · i collegamenti all'applicazione diventano assoluti, perché
       sul dominio del sito «/» non è più l'app;
     · ogni pagina dichiara il proprio indirizzo definitivo
       (canonical), così i motori di ricerca non vedono due siti
       uguali su due domini e non ne penalizzano nessuno;
     · robots.txt e sitemap.xml con il dominio vero.

   Una cartella sola, generata: nessuna seconda copia da tenere
   allineata a mano. È la stessa ragione per cui il CSS del sito sta
   in un file solo.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const DOMINIO = 'https://mindmovementlab.it';
const APP = 'https://essere-3fe6f.web.app/';

const RADICE = path.join(__dirname, '..');
const DA = path.join(RADICE, 'public');
const A = path.join(RADICE, 'sito-dist');

/** Le pagine del sito. `meditazione.html` non ne fa parte: non è linkata. */
const PAGINE = {
  'metodo.html': 'index.html',
  'studio.html': 'studio.html',
  'premium.html': 'premium.html',
  'chi-sono.html': 'chi-sono.html',
  'contatti.html': 'contatti.html',
  'note-legali.html': 'note-legali.html',
  'diario.html': 'diario.html',
};

/**
 * Pagine che si ricevono, non si trovano.
 *
 * Il diario è la risposta a chi scrive «DIARIO» in privato: quel
 * passaggio è il motivo per cui esiste. Se finisse nella mappa del
 * sito e nei motori di ricerca lo scaricherebbero tutti senza mai
 * scrivere una riga, e il foglio resterebbe — ma la conversazione no.
 * Resta fuori dalla sitemap; la pagina dichiara anche `noindex`.
 */
const SENZA_INDICE = new Set(['diario.html']);

/**
 * Le trenta righe del diario.
 *
 * Scritte qui e non a runtime: è un modulo da stampare, e uno che
 * dipende da JavaScript è uno che un giorno esce vuoto — e se ne
 * accorge chi ha già premuto «stampa». Scritte a mano nella pagina
 * sarebbero trenta blocchi identici, e il giorno in cui cambia una
 * colonna se ne sbaglia una.
 */
const righeDelMese = (giorni = 30) => {
  const ripeti = (n, cosa) => Array.from({ length: n }, () => cosa).join('');
  const pallini = `<div class="pallini">${ripeti(5, '<span class="pallino"></span>')}</div>`;
  const caselle = `<div class="caselle">${ripeti(3, '<span class="casella"></span>')}</div>`;
  const riquadro = '<div class="riquadrino"></div>';
  return Array.from({ length: giorni }, (_, i) => `
        <tr>
          <td class="giorno">${i + 1}</td>
          <td>${riquadro}</td>
          <td>${pallini}</td>
          <td>${pallini}</td>
          <td>${caselle}</td>
          <td>${riquadro}</td>
          <td class="note"></td>
        </tr>`).join('');
};

const RISORSE = [
  'sito.css', 'favicon.ico',
  // i tre marchi: lo studio, la persona, l'applicazione
  'logo-essere.svg', 'logo-essere-app.png',
  'logo-mindmovementlab.jpg', 'logo-francesco.jpg',
  // la foto di gara, nella pagina «Chi sono»
  'foto-mondiale.jpg',
  // la copertina del libro, nella stessa pagina
  'libro-mind-movement.jpg',
  // l'immagine dell'anteprima quando il link viene incollato
  'anteprima.jpg',
  'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png',
];

const indirizzo = (file) => (file === 'index.html' ? `${DOMINIO}/` : `${DOMINIO}/${file}`);

/**
 * I collegamenti all'applicazione.
 *
 * Nelle pagine sono scritti `href="/"` perché sul dominio dell'app la
 * radice è l'app. Sul dominio del sito la radice è il sito: se non si
 * riscrivono, «Accedi all'applicazione» riporterebbe alla home del
 * sito — un anello che non porta da nessuna parte, e che nessuno
 * segnala perché sembra funzionare.
 */
const riscriviCollegamenti = (html) => html
  .replace(/<a href="\/">Accedi all'applicazione<\/a>/g,
    `<a href="${APP}">Accedi all'applicazione</a>`)
  .replace(/<a class="bottone vuoto" href="\/">Apri l'applicazione<\/a>/g,
    `<a class="bottone vuoto" href="${APP}">Apri l'applicazione</a>`)
  // e solo DOPO: «Il metodo» è la pagina iniziale
  .replace(/href="\/metodo\.html"/g, 'href="/"');

/** L'indirizzo definitivo della pagina, dichiarato dentro la pagina. */
const aggiungiCanonical = (html, file) => {
  const url = indirizzo(file);
  let out = html.replace(
    '<link rel="stylesheet" href="/sito.css">',
    `<link rel="canonical" href="${url}">\n<link rel="stylesheet" href="/sito.css">`
  );
  if (/<meta property="og:title"/.test(out) && !/og:url/.test(out)) {
    out = out.replace('<meta property="og:title"',
      `<meta property="og:url" content="${url}">\n<meta property="og:title"`);
  }
  return anteprimaCondivisione(out);
};

/**
 * L'immagine che si vede quando il link viene incollato.
 *
 * WhatsApp, Facebook e Telegram NON accettano un indirizzo relativo:
 * `/icon-512.png` per loro non esiste, e il link appare come un
 * rettangolo di testo grigio. È il difetto che non si nota mai, perché
 * chi lo manda vede l'anteprima presa dalla propria cache e crede che
 * funzioni per tutti.
 *
 * Qui l'indirizzo diventa assoluto, e l'immagine diventa quella giusta:
 * 1200×630, il formato che quelle applicazioni ritagliano senza tagliare
 * niente. Un quadrato di 512 veniva mostrato piccolo e di lato.
 */
const anteprimaCondivisione = (html) => {
  let out = html.replace(
    /<meta property="og:image" content="[^"]*">/,
    `<meta property="og:image" content="${DOMINIO}/anteprima.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="it_IT">
<meta name="twitter:card" content="summary_large_image">`
  );
  // og:site_name: è il nome che compare in grigio sopra l'anteprima
  if (/<meta property="og:title"/.test(out) && !/og:site_name/.test(out)) {
    out = out.replace('<meta property="og:title"',
      '<meta property="og:site_name" content="Mind Movement Lab">\n<meta property="og:title"');
  }
  return out;
};

const svuota = (dir) => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
};

const main = () => {
  svuota(A);

  Object.entries(PAGINE).forEach(([origine, destinazione]) => {
    const sorgente = path.join(DA, origine);
    if (!fs.existsSync(sorgente)) {
      console.error(`✗ manca public/${origine}`);
      process.exitCode = 1;
      return;
    }
    let html = fs.readFileSync(sorgente, 'utf8');
    html = html.replace('<!--RIGHE-DEL-MESE-->', righeDelMese());
    html = riscriviCollegamenti(html);
    html = aggiungiCanonical(html, destinazione);
    fs.writeFileSync(path.join(A, destinazione), html);
    console.log(`✓ ${origine} → ${destinazione}`);
  });

  RISORSE.forEach((f) => {
    const sorgente = path.join(DA, f);
    if (fs.existsSync(sorgente)) {
      fs.copyFileSync(sorgente, path.join(A, f));
      console.log(`✓ ${f}`);
    }
  });

  const pagine = Object.values(PAGINE).filter((f) => !SENZA_INDICE.has(f));
  const oggi = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pagine.map((f) => `  <url>
    <loc>${indirizzo(f)}</loc>
    <lastmod>${oggi}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(A, 'sitemap.xml'), sitemap);

  fs.writeFileSync(path.join(A, 'robots.txt'), `# ESSĒRE — Mind Movement Lab, Gragnano
User-agent: *
Allow: /

Sitemap: ${DOMINIO}/sitemap.xml
`);
  console.log(`✓ sitemap.xml (${pagine.length} pagine) e robots.txt`);
  console.log(`\nCartella pronta: sito-dist/ — da pubblicare sul dominio ${DOMINIO}`);
};

main();
