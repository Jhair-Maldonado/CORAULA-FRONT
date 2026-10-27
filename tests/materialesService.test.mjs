import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMaterialFile,
  formatBytes,
  MAX_MATERIAL_FILE_SIZE_BYTES,
  slugifyCurso,
  resolverCursoAlumno
} from '../src/services/materialesService.ts';

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
