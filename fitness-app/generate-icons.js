const sharp = require('sharp');

const sizes = [
  { name: 'web/icon-32.png', size: 32 },
  { name: 'web/icon-180.png', size: 180 },
  { name: 'web/icon-192.png', size: 192 },
  { name: 'web/icon-512.png', size: 512 },
  { name: 'src/assets/icon.png', size: 1024 },
  { name: 'src/assets/adaptive-icon.png', size: 1024 },
];

// SVG icon matching the Essère branding: red ensō circle, white wave, dark bg, rounded corners
function generateSVG(size) {
  const r = size * 0.12; // corner radius
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="ensoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF1A1A"/>
      <stop offset="40%" stop-color="#E00000"/>
      <stop offset="100%" stop-color="#8B0000"/>
    </linearGradient>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F5F0E8" stop-opacity="0.15"/>
      <stop offset="25%" stop-color="#F5F0E8" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#F5F0E8" stop-opacity="1"/>
      <stop offset="75%" stop-color="#F5F0E8" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#F5F0E8" stop-opacity="0.2"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <filter id="brushTexture">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" seed="2" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g>
    <!-- Dark background - full square, OS applies its own rounding -->
    <rect width="512" height="512" fill="#0D0D0D"/>

    <!-- Subtle radial glow -->
    <circle cx="256" cy="230" r="200" fill="none" stroke="#1a0000" stroke-width="80" opacity="0.3"/>

    <!-- Ensō circle - main brushstroke -->
    <path d="
      M 300 82
      C 370 95, 420 150, 430 225
      C 440 300, 400 380, 330 410
      C 260 440, 170 420, 115 365
      C 60 310, 50 230, 80 165
      C 110 100, 175 72, 240 72
      C 260 72, 280 75, 295 80
    " stroke="url(#ensoGrad)" stroke-width="38" stroke-linecap="round" fill="none" filter="url(#brushTexture)"/>

    <!-- Ensō inner edge highlight -->
    <path d="
      M 298 88
      C 365 100, 412 152, 422 225
      C 432 298, 394 374, 328 403
    " stroke="#FF2020" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.4"/>

    <!-- Ensō outer edge shadow -->
    <path d="
      M 302 78
      C 375 90, 426 148, 436 225
      C 446 302, 406 384, 334 415
      C 262 446, 168 424, 112 368
      C 56 312, 46 228, 76 162
      C 106 96, 172 68, 238 68
    " stroke="#600000" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.3"/>

    <!-- White flowing wave in center -->
    <path d="
      M 140 250
      C 175 222, 215 218, 256 245
      C 297 272, 337 268, 372 240
    " stroke="url(#waveGrad)" stroke-width="10" stroke-linecap="round" fill="none" filter="url(#shadow)"/>

    <!-- Wave tip fade -->
    <path d="
      M 368 242
      C 380 234, 390 230, 395 228
    " stroke="#F5F0E8" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.35"/>

    <!-- "Essère" text -->
    <text x="256" y="470" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="58" fill="#E8E0D4" letter-spacing="2" opacity="0.95">Essère</text>
  </g>
</svg>`;
}

async function generate() {
  for (const { name, size } of sizes) {
    const svg = generateSVG(size);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(name);
    console.log(`✓ ${name} (${size}x${size})`);
  }
  console.log('\nIcone generate!');
}

generate().catch(console.error);
