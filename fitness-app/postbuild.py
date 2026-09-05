#!/usr/bin/env python3
"""Post-build: patch Expo-generated dist/index.html with PWA customizations."""
import os, shutil

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

with open(os.path.join(DIST, "index.html"), "r") as f:
    html = f.read()

html = html.replace(
    "width=device-width, initial-scale=1, shrink-to-fit=no",
    "width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no",
)
html = html.replace('lang="en"', 'lang="it"')

pwa_head = """
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
  <link rel="manifest" href="/manifest.json" />

  <style>html, body { background: #0D0D0D; }
  @supports(padding-bottom:env(safe-area-inset-bottom)){#tab-bar-bottom{padding-bottom:env(safe-area-inset-bottom)!important}}</style>

  <link rel="preload" href="/Ionicons.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <style>@font-face { font-family: 'Ionicons'; src: url('/Ionicons.ttf') format('truetype'); font-display: block; } @font-face { font-family: 'ionicons'; src: url('/Ionicons.ttf') format('truetype'); font-display: block; }</style>
  <script>(function(){if(typeof FontFace!=='undefined'){var p=[];['Ionicons','ionicons'].forEach(function(n){var f=new FontFace(n,'url(/Ionicons.ttf)',{weight:'normal',style:'normal',display:'block'});p.push(f.load().then(function(l){document.fonts.add(l)}).catch(function(e){console.warn(n+' load failed:',e)}))});window.__ioniconsReady=Promise.all(p)}else{window.__ioniconsReady=Promise.resolve()}})()</script>
"""
html = html.replace("</head>", pwa_head + "\n  </head>")

sw_script = """
  <script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(reg){var hasController=!!navigator.serviceWorker.controller;setInterval(function(){reg.update()},60000);reg.addEventListener('updatefound',function(){var nw=reg.installing;nw.addEventListener('statechange',function(){if(nw.state==='activated'&&hasController){window.location.reload()}})})})})}</script>
"""
html = html.replace("</body>", sw_script + "\n  </body>")

with open(os.path.join(DIST, "index.html"), "w") as f:
    f.write(html)

shutil.copy(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "sw.js"),
    os.path.join(DIST, "sw.js"),
)

print("Post-build done: HTML patched + SW copied")
