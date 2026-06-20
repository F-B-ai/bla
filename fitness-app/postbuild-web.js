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
    <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
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
  'icon-32.png',
  'icon-192.png',
  'icon-512.png',
  'icon-180.png',
  'favicon.ico'
];

const buildTs = Date.now().toString();
webAssets.forEach((file) => {
  const src = path.join(__dirname, 'web', file);
  const dst = path.join(__dirname, 'dist', file);
  if (fs.existsSync(src)) {
    if (file === 'sw.js') {
      let sw = fs.readFileSync(src, 'utf8');
      sw = sw.replace('__BUILD_TS__', buildTs);
      fs.writeFileSync(dst, sw);
      console.log(`✓ ${file} copied to dist/ (cache version: ${buildTs})`);
    } else {
      fs.copyFileSync(src, dst);
      console.log(`✓ ${file} copied to dist/`);
    }
  }
});

// Inject safe area CSS for PWA standalone on notched iPhones
if (!html.includes('tab-bar-bottom')) {
  const safeAreaCss = `\n    <style>@supports(padding-bottom:env(safe-area-inset-bottom)){#tab-bar-bottom{padding-bottom:env(safe-area-inset-bottom)!important}}</style>`;
  html = html.replace('</head>', safeAreaCss + '\n  </head>');
}

// Inject local Ionicons font preload + @font-face (both cases for Expo compatibility)
if (!html.includes("preload\" href=\"/Ionicons.ttf\"")) {
  const fontPreload = `\n    <link rel="preload" href="/Ionicons.ttf" as="font" type="font/ttf" crossorigin="anonymous" />\n    <style>@font-face { font-family: 'Ionicons'; src: url('/Ionicons.ttf') format('truetype'); font-display: block; } @font-face { font-family: 'ionicons'; src: url('/Ionicons.ttf') format('truetype'); font-display: block; }</style>`;
  const fontScript = `\n    <script>(function(){if(typeof FontFace!=='undefined'){var p=[];['Ionicons','ionicons'].forEach(function(n){var f=new FontFace(n,'url(/Ionicons.ttf)',{weight:'normal',style:'normal',display:'block'});p.push(f.load().then(function(l){document.fonts.add(l)}).catch(function(e){console.warn(n+' load failed:',e)}))});window.__ioniconsReady=Promise.all(p)}else{window.__ioniconsReady=Promise.resolve()}})();</script>`;
  html = html.replace('</head>', fontPreload + fontScript + '\n  </head>');
}

// Fix lang to Italian
html = html.replace('lang="en"', 'lang="it"');

// Fix viewport for iOS
html.replace(
  'width=device-width, initial-scale=1, shrink-to-fit=no',
  'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
);

// Inject service worker registration script before </body>
const swScript = `\n    <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(reg){var hasController=!!navigator.serviceWorker.controller;setInterval(function(){reg.update()},60000);reg.addEventListener('updatefound',function(){var nw=reg.installing;nw.addEventListener('statechange',function(){if(nw.state==='activated'&&hasController){window.location.reload()}})})})})}</script>`;
if (!html.includes("register('/sw.js')")) {
  html = html.replace('</body>', swScript + '\n  </body>');
}

// --- CODE PROTECTION: Anti-debugging, anti-inspection, anti-copy ---
const protectionScript = `
    <script>
    // Anti-devtools: block right-click, keyboard shortcuts, debugger
    (function(){
      // Block right-click context menu
      document.addEventListener('contextmenu',function(e){e.preventDefault();return false});
      // Block common dev tools shortcuts
      document.addEventListener('keydown',function(e){
        // F12
        if(e.key==='F12'){e.preventDefault();return false}
        // Ctrl+Shift+I / Cmd+Opt+I (Inspector)
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='I'||e.key==='i')){e.preventDefault();return false}
        // Ctrl+Shift+J / Cmd+Opt+J (Console)
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='J'||e.key==='j')){e.preventDefault();return false}
        // Ctrl+Shift+C / Cmd+Opt+C (Element picker)
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='C'||e.key==='c')){e.preventDefault();return false}
        // Ctrl+U / Cmd+U (View source)
        if((e.ctrlKey||e.metaKey)&&(e.key==='U'||e.key==='u')){e.preventDefault();return false}
        // Ctrl+S / Cmd+S (Save page)
        if((e.ctrlKey||e.metaKey)&&(e.key==='S'||e.key==='s')){e.preventDefault();return false}
        // Ctrl+Shift+K (Firefox console)
        if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='K'||e.key==='k')){e.preventDefault();return false}
      });
      // Block drag on all elements
      document.addEventListener('dragstart',function(e){e.preventDefault();return false});
      // Block text selection via CSS
      var s=document.createElement('style');
      s.textContent='*{-webkit-user-select:none!important;-moz-user-select:none!important;-ms-user-select:none!important;user-select:none!important}input,textarea,[contenteditable=true]{-webkit-user-select:text!important;-moz-user-select:text!important;-ms-user-select:text!important;user-select:text!important}';
      document.head.appendChild(s);
      // Debugger trap: continuous breakpoint to slow down devtools
      (function _dt(){try{(function(){return false})['constructor']('debugger')()}catch(_){}setTimeout(_dt,100)})();
      // Detect devtools via timing
      var _c=0;
      setInterval(function(){var t=performance.now();debugger;if(performance.now()-t>50){_c++;if(_c>2){document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0D0D0D;color:#C5A55A;font-family:sans-serif;font-size:24px;text-align:center;padding:40px">Accesso non autorizzato</div>'}}else{_c=0}},2000);
      // Override console methods
      var _noop=function(){};
      ['log','debug','info','warn','error','table','trace','dir','group','groupEnd','clear','count','assert','profile','profileEnd','time','timeEnd','timeStamp'].forEach(function(m){try{console[m]=_noop}catch(_){}});
      // Detect print and block it
      window.addEventListener('beforeprint',function(e){e.preventDefault()});
      var mp=window.matchMedia('print');
      if(mp&&mp.addListener){mp.addListener(function(m){if(m.matches){document.body.style.display='none'}})}
    })();
    </script>`;

if (!html.includes('Anti-devtools')) {
  html = html.replace('</head>', protectionScript + '\n  </head>');
}

// Copy public/ files to dist/ (meditazione.html, etc.)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  fs.readdirSync(publicDir).forEach((file) => {
    const src = path.join(publicDir, file);
    const dst = path.join(__dirname, 'dist', file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dst);
      console.log(`✓ public/${file} copied to dist/`);
    }
  });
}

fs.writeFileSync(indexPath, html);
console.log('✓ PWA meta tags and service worker injected into dist/index.html');

// --- OBFUSCATION: Obfuscate main JS bundle ---
const JavaScriptObfuscator = require('javascript-obfuscator');
const jsDir = path.join(__dirname, 'dist', '_expo', 'static', 'js', 'web');

if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js') && !f.endsWith('.map'));
  jsFiles.forEach((file) => {
    const filePath = path.join(jsDir, file);
    const stat = fs.statSync(filePath);
    if (stat.size < 100) {
      console.log(`○ ${file} skipped (empty/stub)`);
      return;
    }
    console.log(`⚡ Obfuscating ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);
    const code = fs.readFileSync(filePath, 'utf8');
    try {
      const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: true,
        debugProtectionInterval: 2000,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 5,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.5,
        transformObjectKeys: true,
        unicodeEscapeSequence: false,
        sourceMap: false,
      });
      fs.writeFileSync(filePath, result.getObfuscatedCode());
      const newSize = fs.statSync(filePath).size;
      console.log(`✓ ${file} obfuscated (${(newSize / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      console.error(`✗ Failed to obfuscate ${file}:`, err.message);
    }
  });
} else {
  console.warn('⚠ JS output directory not found, skipping obfuscation');
}

// Remove any source maps
const distDir = path.join(__dirname, 'dist');
function removeMapFiles(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((item) => {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      removeMapFiles(full);
    } else if (item.endsWith('.map')) {
      fs.unlinkSync(full);
      console.log(`✓ Removed source map: ${item}`);
    }
  });
}
removeMapFiles(distDir);

console.log('✓ Code protection applied: obfuscation + anti-debugging + security headers');
