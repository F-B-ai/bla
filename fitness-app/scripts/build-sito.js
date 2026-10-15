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
};

const RISORSE = [
  'sito.css', 'favicon.ico',
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

  const pagine = Object.values(PAGINE);
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
