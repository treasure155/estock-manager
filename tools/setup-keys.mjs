#!/usr/bin/env node
// One-time setup on the ADMIN's computer:
//   1. creates the licence signing key (only this computer can issue licence keys),
//   2. creates the auto-update signing key,
//   3. writes the two PUBLIC keys into the project so builds can check them,
//   4. stores the update key in GitHub secrets (needs the GitHub CLI, `gh`).
// Safe to run again: existing keys are never overwritten.
//
//   npm run setup-keys
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { generateKeyPairSync, createPrivateKey, createPublicKey, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { KEY_DIR, LICENSE_PRIVATE, UPDATER_KEY, UPDATER_PASSWORD, PUBLIC_KEY_FILE, TAURI_CONF, ROOT } from './common.mjs';

const say = (m) => console.log(m);
mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });

// 1. Licence key (Ed25519)
if (!existsSync(LICENSE_PRIVATE)) {
  const { privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(LICENSE_PRIVATE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  say(`✔ Created licence signing key: ${LICENSE_PRIVATE}`);
} else say(`• Licence signing key already exists: ${LICENSE_PRIVATE}`);
const pub = createPublicKey(createPrivateKey(readFileSync(LICENSE_PRIVATE)));
const raw = Buffer.from(pub.export({ format: 'jwk' }).x, 'base64url');
writeFileSync(PUBLIC_KEY_FILE, raw.toString('base64') + '\n');
say(`✔ Wrote licence public key to src-tauri/license_public_key.txt`);

// 2. Update signing key (Tauri/minisign)
if (!existsSync(UPDATER_KEY)) {
  const password = randomBytes(18).toString('base64url');
  writeFileSync(UPDATER_PASSWORD, password, { mode: 0o600 });
  const r = spawnSync('npx', ['tauri', 'signer', 'generate', '--ci', '-w', UPDATER_KEY, '-p', password], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('✘ Could not create the update signing key. Run `npm install` first.'); process.exit(1); }
  say(`✔ Created update signing key: ${UPDATER_KEY}`);
} else say(`• Update signing key already exists: ${UPDATER_KEY}`);
try { chmodSync(UPDATER_KEY, 0o600); } catch { /* Windows */ }
const updaterPub = readFileSync(UPDATER_KEY + '.pub', 'utf8').trim();
const conf = JSON.parse(readFileSync(TAURI_CONF, 'utf8'));
conf.plugins ??= {}; conf.plugins.updater ??= {};
conf.plugins.updater.pubkey = updaterPub;
writeFileSync(TAURI_CONF, JSON.stringify(conf, null, 2) + '\n');
say('✔ Wrote update public key to src-tauri/tauri.conf.json');

// 3. GitHub secrets for the build machines
const gh = spawnSync('gh', ['auth', 'status'], { stdio: 'ignore', cwd: ROOT, shell: process.platform === 'win32' });
if (gh.status === 0) {
  const set = (name, value) => spawnSync('gh', ['secret', 'set', name], { input: value, cwd: ROOT, stdio: ['pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' }).status === 0;
  const ok = set('TAURI_SIGNING_PRIVATE_KEY', readFileSync(UPDATER_KEY, 'utf8')) && set('TAURI_SIGNING_PRIVATE_KEY_PASSWORD', readFileSync(UPDATER_PASSWORD, 'utf8'));
  say(ok ? '✔ Saved the update key to GitHub secrets' : '✘ Could not save GitHub secrets (see message above)');
} else {
  say('\n! GitHub CLI not signed in. Add these two secrets by hand on GitHub:');
  say('  Repo → Settings → Secrets and variables → Actions → New repository secret');
  say(`  TAURI_SIGNING_PRIVATE_KEY           = contents of ${UPDATER_KEY}`);
  say(`  TAURI_SIGNING_PRIVATE_KEY_PASSWORD  = contents of ${UPDATER_PASSWORD}`);
}

say(`\nIMPORTANT: back up the folder ${KEY_DIR} (e.g. to a flash drive).`);
say('If it is lost you cannot issue licence keys or ship updates to existing users.');
say('Never put that folder in the project or on GitHub.');
say('\nNext: commit and push. The public keys are safe to commit.');
