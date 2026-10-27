import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMaterialFile,
  formatBytes,
  MAX_MATERIAL_FILE_SIZE_BYTES,
  slugifyCurso,
  resolverCursoAlumno,
  descargarArchivoMaterial,
  DESCARGA_NO_DISPONIBLE
} from '../src/services/materialesService.ts';
import httpClientModule from '../src/services/httpClient.ts';

// Interop ESM/CJS de tsx: el default puede llegar envuelto.
const httpClient = httpClientModule.defaults ? httpClientModule : httpClientModule.default;

const materialBase = { id: 'm-1', titulo: 'Guía de Álgebra', curso: 'Matemática', docente: 'Prof. Marco Aurelio', fecha: '01/09/2026', formato: 'PDF', tamanio: '2 MB' };

// Stubs de DOM para observar descargas sin navegador; el adaptador de Axios evita red real.
async function withDownloadStubs(adapter, run) {
  const originalAdapter = httpClient.defaults.adapter;
  const originalWindow = globalThis.window, originalDocument = globalThis.document, originalStorage = globalThis.localStorage;
  const calls = { requests: [], blobs: [], anchors: [] };
  httpClient.defaults.adapter = async config => { calls.requests.push(config); return adapter(config); };
  globalThis.window = { URL: { createObjectURL: blob => { calls.blobs.push(blob); return 'blob:fake'; }, revokeObjectURL() {} } };
  globalThis.document = {
    createElement: () => { const a = { style: {}, click() { a.clicked = true; } }; calls.anchors.push(a); return a; },
    body: { appendChild() {}, removeChild() {} }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null }, configurable: true, writable: true });
  try { await run(calls); } finally {
    httpClient.defaults.adapter = originalAdapter;
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true, writable: true });
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
  }
}

test('descargarArchivoMaterial without a real urlDescarga generates no file and reports it is unavailable', async () => {
  await withDownloadStubs(async () => { throw new Error('no debe llamarse'); }, async calls => {
    for (const urlDescarga of [undefined, '', '#']) {
      await assert.rejects(descargarArchivoMaterial({ ...materialBase, urlDescarga }), { message: DESCARGA_NO_DISPONIBLE });
    }
    assert.equal(DESCARGA_NO_DISPONIBLE, 'Descarga no disponible: módulo en construcción');
    assert.equal(calls.requests.length, 0);
    assert.equal(calls.blobs.length, 0);
    assert.equal(calls.anchors.length, 0);
  });
});

test('descargarArchivoMaterial downloads the real file from urlDescarga', async () => {
  await withDownloadStubs(
    async config => ({ config, status: 200, statusText: 'OK', headers: { 'content-type': 'application/pdf' }, data: 'contenido-real' }),
    async calls => {
      await descargarArchivoMaterial({ ...materialBase, urlDescarga: '/v1/materiales/m-1/archivo' });
      assert.equal(calls.requests.length, 1);
      assert.equal(calls.requests[0].url, '/v1/materiales/m-1/archivo');
      assert.equal(calls.requests[0].responseType, 'blob');
      assert.equal(calls.blobs.length, 1);
      assert.equal(calls.blobs[0].type, 'application/pdf');
      assert.equal(await calls.blobs[0].text(), 'contenido-real');
      assert.equal(calls.anchors[0].download, 'gu_a_de__lgebra.pdf');
      assert.equal(calls.anchors[0].href, 'blob:fake');
      assert.equal(calls.anchors[0].clicked, true);
      await new Promise(res => setTimeout(res, 250)); // deja terminar la limpieza del ancla
    }
  );
});

test('descargarArchivoMaterial reports a failed real download without generating a file', async () => {
  await withDownloadStubs(async () => { throw new Error('network'); }, async calls => {
    await assert.rejects(descargarArchivoMaterial({ ...materialBase, urlDescarga: '/v1/materiales/m-1/archivo' }), /No fue posible descargar/);
    assert.equal(calls.blobs.length, 0);
  });
});

test('formatBytes formats bytes correctly into human-readable units', () => {
  assert.equal(formatBytes(0), '0 Bytes');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
  assert.equal(formatBytes(15 * 1024 * 1024), '15 MB');
});

test('slugifyCurso normalizes course names with accents and special characters', () => {
  assert.equal(slugifyCurso('Matemática'), 'matematica');
  assert.equal(slugifyCurso('Ciencia y Tecnología'), 'ciencia-y-tecnologia');
  assert.equal(slugifyCurso('Educación Física & Deporte'), 'educacion-fisica-deporte');
  assert.equal(slugifyCurso('ARTE Y CULTURA'), 'arte-y-cultura');
});

test('resolverCursoAlumno resolves course by slug, ID, or name and groups materials', () => {
  const cursosMock = [
    { id: 'cur-mat-5b', curso: 'Matemática', slug: 'matematica', codigo: 'MAT-5B', docente: 'Prof. Marco Aurelio', count: 2 },
    { id: 'cur-cyt-5b', curso: 'Ciencia y Tecnología', slug: 'ciencia-y-tecnologia', codigo: 'CYT-5B', docente: 'Prof. Carlos Rivas', count: 0 }
  ];

  const materialesMock = [
    { id: 'm-1', titulo: 'Guía de Álgebra', curso: 'Matemática', docente: 'Prof. Marco Aurelio', fecha: '01/09/2026', formato: 'PDF', tamanio: '2 MB' },
    { id: 'm-2', titulo: 'Matrices', curso: 'Matemática', docente: 'Prof. Marco Aurelio', fecha: '05/09/2026', formato: 'PPTX', tamanio: '3 MB' }
  ];

  // Resolve by slug
  const resSlug = resolverCursoAlumno(cursosMock, materialesMock, 'matematica');
  assert.ok(resSlug);
  assert.equal(resSlug.cursoNombre, 'Matemática');
  assert.equal(resSlug.materiales.length, 2);

  // Resolve by ID
  const resId = resolverCursoAlumno(cursosMock, materialesMock, 'cur-mat-5b');
  assert.ok(resId);
  assert.equal(resId.cursoNombre, 'Matemática');

  // Resolve course with 0 materials (should return course with empty array, NOT null)
  const resEmpty = resolverCursoAlumno(cursosMock, materialesMock, 'ciencia-y-tecnologia');
  assert.ok(resEmpty);
  assert.equal(resEmpty.cursoNombre, 'Ciencia y Tecnología');
  assert.equal(resEmpty.materiales.length, 0);

  // Unknown course returns null
  const resUnknown = resolverCursoAlumno(cursosMock, materialesMock, 'curso-no-existente');
  assert.equal(resUnknown, null);
});

test('validateMaterialFile rejects null or undefined file', () => {
  const resultNull = validateMaterialFile(null);
  assert.equal(resultNull.valid, false);
  assert.match(resultNull.error, /Debe seleccionar un archivo/);

  const resultUndefined = validateMaterialFile(undefined);
  assert.equal(resultUndefined.valid, false);
});

test('validateMaterialFile rejects empty files (0 bytes)', () => {
  const emptyFile = {
    name: 'guia_clase.pdf',
    size: 0,
    type: 'application/pdf'
  };
  const result = validateMaterialFile(emptyFile);
  assert.equal(result.valid, false);
  assert.match(result.error, /vacío/);
});

test('validateMaterialFile rejects files exceeding the 15 MB limit', () => {
  const oversizedFile = {
    name: 'lectura_completa.pdf',
    size: MAX_MATERIAL_FILE_SIZE_BYTES + 1024,
    type: 'application/pdf'
  };
  const result = validateMaterialFile(oversizedFile);
  assert.equal(result.valid, false);
  assert.match(result.error, /excede el tamaño máximo permitido de 15 MB/);
});

test('validateMaterialFile rejects unauthorized extensions (.exe, .mp4, .png, etc.)', () => {
  for (const badName of ['malware.exe', 'script.bat', 'video_clase.mp4', 'foto.png', 'audio.mp3']) {
    const file = {
      name: badName,
      size: 1024 * 50,
      type: ''
    };
    const result = validateMaterialFile(file);
    assert.equal(result.valid, false, `Should reject ${badName}`);
    assert.match(result.error, /Formato de archivo no permitido/);
  }
});

test('validateMaterialFile accepts all institutional allowed formats (PDF, DOCX, PPTX, XLSX, ZIP)', () => {
  const validCases = [
    { name: 'separata_modulo1.pdf', size: 1024 * 200, type: 'application/pdf' },
    { name: 'ejercicios_tarea.docx', size: 1024 * 500, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { name: 'diapositivas_tema2.pptx', size: 1024 * 1024 * 4, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { name: 'cuadro_notas.xlsx', size: 1024 * 300, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { name: 'archivos_fuente.zip', size: 1024 * 1024 * 8, type: 'application/zip' }
  ];

  for (const item of validCases) {
    const result = validateMaterialFile(item);
    assert.equal(result.valid, true, `Should accept ${item.name}: ${result.error}`);
    assert.equal(result.error, null);
    assert.ok(result.formattedSize);
  }
});
