#!/usr/bin/env node
// Publishes a release in one step:  npm run release
// Checks the version numbers agree and the public keys are set, commits,
// tags v<version> and pushes. GitHub then builds Windows and Mac installers
// and publishes the release (installed apps pick it up as an update).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, PUBLIC_KEY_FILE, TAURI_CONF } from './common.mjs';

const run = (c) => execSync(c, { cwd: ROOT, stdio: 'inherit' });
const out = (c) => execSync(c, { cwd: ROOT }).toString().trim();
const fail = (m) => { console.error('✘ ' + m); process.exit(1); };

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const conf = JSON.parse(readFileSync(TAURI_CONF, 'utf8'));
const cargo = readFileSync(join(ROOT, 'src-tauri', 'Cargo.toml'), 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (pkg !== conf.version || pkg !== cargo) fail(`Versions differ: package.json ${pkg}, tauri.conf.json ${conf.version}, Cargo.toml ${cargo}. Make them the same.`);
if (readFileSync(PUBLIC_KEY_FILE, 'utf8').trim() === 'UNSET') fail('Licence public key not set. Run: npm run setup-keys');
if (!conf.plugins?.updater?.pubkey || conf.plugins.updater.pubkey === 'UNSET') fail('Update public key not set. Run: npm run setup-keys');

const tag = `v${pkg}`;
if (out(`git tag --list ${tag}`)) fail(`${tag} was already released. Raise the version in package.json, src-tauri/tauri.conf.json and src-tauri/Cargo.toml first.`);
const branch = out('git rev-parse --abbrev-ref HEAD');
run('git add -A');
try { run(`git commit -m "Release ${tag}"`); } catch { console.log('• Nothing new to commit'); }
run(`git tag -a ${tag} -m "eStock Manager ${tag}"`);
run(`git push origin ${branch} ${tag}`);
console.log(`\n✔ Pushed ${tag}. Watch the build: GitHub → Actions. The release appears under Releases when both installers are done.`);
