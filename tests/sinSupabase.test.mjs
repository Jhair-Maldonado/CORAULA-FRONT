import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// APOD-FRONT-CORRECCION: la base de datos solo se accede desde el backend. Prohibido @supabase/* en el frontend.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CODE_DIRS = ['src', 'feature', 'layout'];
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const FORBIDDEN = /@supabase\/|supabase-js/;

function* codeFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* codeFiles(full);
    else if (CODE_EXT.has(path.extname(entry.name))) yield full;
  }
}

test('package.json no declara dependencias @supabase/*', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const found = Object.keys(pkg[field] ?? {}).filter(name => FORBIDDEN.test(name));
    assert.deepEqual(found, [], `${field}: ${found.join(', ')}`);
  }
});

test('el código del frontend no importa ni menciona @supabase/*', () => {
  const offenders = [];
  for (const dir of CODE_DIRS) {
    for (const file of codeFiles(path.join(ROOT, dir))) {
      if (FORBIDDEN.test(readFileSync(file, 'utf8'))) offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(offenders, []);
});
