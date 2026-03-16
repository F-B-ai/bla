const http = require('http');
const fs = require('fs');
const path = require('path');
const distDir = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  // Localtunnel bypass: respond to its password check
  if (req.url === '/' && req.headers['bypass-tunnel-reminder']) {
    // Already bypassed
  }
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) filePath = path.join(distDir, 'index.html');
  const ext = path.extname(filePath);
  const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2'};
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    const headers = {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Bypass-Tunnel-Reminder': 'true'
    };
    // iOS Safari requires CORS headers for font files
    if (ext === '.ttf' || ext === '.woff2' || ext === '.woff') {
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  const os = require('os');
  const nets = os.networkInterfaces();
  console.log(`\nServer running on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  Network: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
