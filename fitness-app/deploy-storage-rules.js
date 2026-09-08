// Deploy Firebase Storage rules via the Firebase Rules REST API,
// bypassing firebase-tools' serviceusage API check (which the SA can't access).
const fs = require('fs');
const crypto = require('crypto');

const KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'firebase-sa-key.json';
const PROJECT = 'essere-3fe6f';
const RULES_FILE = 'storage.rules';

const sa = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(sa.private_key).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  const token = await getAccessToken();
  const auth = { Authorization: `Bearer ${token}` };
  const source = fs.readFileSync(RULES_FILE, 'utf8');

  // 1. List releases to find the storage release name
  const relRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`, { headers: auth });
  const relData = await relRes.json();
  if (!relData.releases) throw new Error('List releases failed: ' + JSON.stringify(relData));
  const storageRelease = relData.releases.find((r) => r.name.includes('/releases/firebase.storage'));
  if (!storageRelease) throw new Error('No storage release found. Releases: ' + relData.releases.map(r => r.name).join(', '));
  console.log('Storage release:', storageRelease.name);

  // 2. Create a new ruleset
  const rsRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: { files: [{ name: 'storage.rules', content: source }] } }),
  });
  const rsData = await rsRes.json();
  if (!rsData.name) throw new Error('Create ruleset failed: ' + JSON.stringify(rsData));
  console.log('Created ruleset:', rsData.name);

  // 3. Update the storage release (UpdateReleaseRequest format)
  const relName = storageRelease.name;
  const updRes = await fetch(`https://firebaserules.googleapis.com/v1/${relName}`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      release: { name: relName, rulesetName: rsData.name },
      updateMask: 'rulesetName',
    }),
  });
  const updData = await updRes.json();
  if (updData.error) throw new Error('Update release failed: ' + JSON.stringify(updData));
  console.log('✓ Storage rules released successfully:', updData.name);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
