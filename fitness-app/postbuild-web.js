// Inject PWA meta tags into dist/index.html after Expo build
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const pwaMeta = `
    <!-- PWA Meta -->
    <meta name="theme-color" content="#0D0D0D" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="ESSĒRE" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
    <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="manifest" href="/manifest.json" />`;

// Add PWA meta after <title>
if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</title>', '</title>' + pwaMeta);
}

// Copy all web static assets to dist
const webAssets = [
  'sw.js',
  'Ionicons.ttf',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-180.png',
  'favicon.ico'
];

webAssets.forEach((file) => {
  const src = path.join(__dirname, 'web', file);
  const dst = path.join(__dirname, 'dist', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log(`✓ ${file} copied to dist/`);
  }
});

// Inject local Ionicons font preload + @font-face (both cases for Expo compatibility)
if (!html.includes("preload\" href=\"/Ionicons.ttf\"")) {
  const fontPreload = `\n    <link rel="preload" href="/Ionicons.ttf" as="font" type="font/ttf" crossorigin="anonymous" />\n    <style>@font-face { font-family: 'Ionicons'; src: url('/Ionicons.ttf') format('truetype'); font-display: block; } @font-face { font-family: 'ionicons'; src: url('/Ionicons.ttf') format('truetype'); font-display: block; }</style>`;
  const fontScript = `\n    <script>(function(){if(typeof FontFace!=='undefined'){var p=[];['Ionicons','ionicons'].forEach(function(n){var f=new FontFace(n,'url(/Ionicons.ttf)',{weight:'normal',style:'normal',display:'block'});p.push(f.load().then(function(l){document.fonts.add(l)}).catch(function(e){console.warn(n+' load failed:',e)}))});window.__ioniconsReady=Promise.all(p)}else{window.__ioniconsReady=Promise.resolve()}})();</script>`;
  html = html.replace('</head>', fontPreload + fontScript + '\n  </head>');
}

// Fix lang to Italian
html = html.replace('lang="en"', 'lang="it"');

// Fix viewport for iOS
html = html.replace(
  'width=device-width, initial-scale=1, shrink-to-fit=no',
  'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
);

// Inject service worker registration script before </body>
const swScript = `\n    <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(reg){var hasController=!!navigator.serviceWorker.controller;setInterval(function(){reg.update()},60000);reg.addEventListener('updatefound',function(){var nw=reg.installing;nw.addEventListener('statechange',function(){if(nw.state==='activated'&&hasController){window.location.reload()}})})})})}</script>`;
if (!html.includes("register('/sw.js')")) {
  html = html.replace('</body>', swScript + '\n  </body>');
}

fs.writeFileSync(indexPath, html);
console.log('✓ PWA meta tags and service worker injected into dist/index.html');
