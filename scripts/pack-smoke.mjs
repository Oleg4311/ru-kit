// Проверка пакета глазами пользователя: собираем tarball, ставим в пустой проект и вызываем из него.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });

const root = resolve('.');
const work = mkdtempSync(join(tmpdir(), 'ru-kit-smoke-'));
const packed = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', work], root))[0];

const files = packed.files.map((f) => f.path);
assert.ok(files.includes('dist/index.js') && files.includes('dist/index.d.ts'), 'в пакете нет dist');
assert.ok(!files.some((f) => f.startsWith('src/') || f.startsWith('test/') || f.startsWith('e2e/')), 'в пакет попали исходники или тесты');
console.log(`пакет ${packed.filename}: ${files.length} файлов, ${packed.size} байт`);

const app = join(work, 'app');
mkdirSync(app);
writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'smoke', private: true, type: 'module' }));
run(npm, ['install', '--no-audit', '--no-fund', join(work, packed.filename)], app);
writeFileSync(
  join(app, 'main.mjs'),
  `import { plural, numberToWords, amountInWords, isInn, normalizePhone, transliterate } from '@oleg4311/ru-kit';
console.log(JSON.stringify([
  plural(5, ['яблоко', 'яблока', 'яблок']),
  numberToWords(2026),
  amountInWords('21000,02'),
  isInn('7707083893'),
  normalizePhone('8 (916) 123-45-67'),
  transliterate('Щербаков'),
]));`,
);
const out = JSON.parse(run('node', ['main.mjs'], app));
assert.deepEqual(out, ['яблок', 'две тысячи двадцать шесть', 'двадцать одна тысяча рублей 02 копейки', true, '+79161234567', 'Shcherbakov']);
console.log('установка из tarball и вызов — ок');
