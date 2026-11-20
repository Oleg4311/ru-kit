// Сборка песочницы: site/index.html, site/app.js (библиотека + интерфейс одним файлом) и site/version.json с коммитом.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

rmSync('site', { recursive: true, force: true });
mkdirSync('site');
await build({ entryPoints: ['site-src/app.ts'], bundle: true, format: 'esm', target: 'es2022', minify: true, outfile: 'site/app.js', legalComments: 'none' });
copyFileSync('site-src/index.html', 'site/index.html');

let commit = process.env.GITHUB_SHA;
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    commit = undefined;
  }
}
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
if (commit) writeFileSync('site/version.json', JSON.stringify({ commit, version, builtAt: new Date().toISOString() }, null, 2) + '\n');
console.log('site/ готов');
