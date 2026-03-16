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
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />`;

// Add PWA meta after <title>
if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</title>', '</title>' + pwaMeta);
}

// Fix lang to Italian
html = html.replace('lang="en"', 'lang="it"');

// Fix viewport for iOS
html = html.replace(
  'width=device-width, initial-scale=1, shrink-to-fit=no',
  'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
);

fs.writeFileSync(indexPath, html);
console.log('✓ PWA meta tags injected into dist/index.html');
