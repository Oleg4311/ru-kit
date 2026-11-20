// Сборка пакета: dist/index.js (один ESM-файл без зависимостей) и типы dist/*.d.ts.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { build } from 'esbuild';

rmSync('dist', { recursive: true, force: true });
await build({ entryPoints: ['src/index.ts'], bundle: true, format: 'esm', target: 'es2022', outfile: 'dist/index.js', legalComments: 'none' });
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
console.log('dist/ готов');
