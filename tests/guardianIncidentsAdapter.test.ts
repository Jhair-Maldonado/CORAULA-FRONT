import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCIDENT_SEVERITY_FILTERS, adaptGuardianIncidents, filterIncidents, parseSeverityFilter, severityFilterLabel, toIncidentView,
} from '../src/adapters/guardianIncidentsAdapter';
import type { GuardianIncidentsPage } from '../src/types/guardianIncidentsApi';

const page = (over: Partial<GuardianIncidentsPage> = {}): GuardianIncidentsPage => ({
  page: 0, size: 100, totalElements: 4, totalPages: 1,
  content: [
    { id: 4, occurredAt: '2026-10-07T03:30:00Z', severity: 'GRAVE', description: 'Pelea.', courseName: 'Matemática' },
    { id: 3, occurredAt: '2026-10-06T15:05:00Z', severity: 'MODERADA', description: 'Interrupción.', courseName: 'Arte' },
    { id: 2, occurredAt: '2026-10-05T15:05:00Z', severity: 'LEVE', description: 'Sin material.', courseName: 'Arte' },
    { id: 1, occurredAt: '2026-10-04T15:05:00Z', severity: 'LEVE', description: 'Tarde.', courseName: 'Historia' },
  ],
  ...over,
});

test('modelo de vista: fecha de Lima, etiqueta y clases de token por gravedad', () => {
  const [grave, moderada, leve] = adaptGuardianIncidents(page()).items;
  assert.equal(grave.dateLabel, '06/10/2026 22:30');
  assert.deepEqual([grave.severityLabel, grave.badgeClassName, grave.borderClassName], ['Grave', 'bg-accent-soft text-accent border-accent/30', 'border-l-accent']);
  assert.deepEqual([moderada.severityLabel, moderada.badgeClassName, moderada.borderClassName], ['Moderada', 'bg-white text-warning-ink border-warning-ink/30', 'border-l-warning-ink']);
  assert.deepEqual([leve.severityLabel, leve.badgeClassName, leve.borderClassName], ['Leve', 'bg-success text-success-ink border-success-ink/30', 'border-l-success-ink']);
  assert.equal(toIncidentView(page().content[0]).courseName, 'Matemática');
});

test('KPI: total = totalElements del backend; conteos por gravedad sobre lo recibido', () => {
  assert.deepEqual(adaptGuardianIncidents(page()).kpis, { total: 4, leve: 2, moderada: 1, grave: 1 });
  const partial = adaptGuardianIncidents(page({ totalElements: 250, totalPages: 3 }));
  assert.equal(partial.kpis.total, 250);
  assert.equal(partial.truncated, true);
  assert.equal(adaptGuardianIncidents(page()).truncated, false);
});

test('filtro TODAS/LEVE/MODERADA/GRAVE', () => {
  assert.deepEqual([...INCIDENT_SEVERITY_FILTERS], ['TODAS', 'LEVE', 'MODERADA', 'GRAVE']);
  const sizes = INCIDENT_SEVERITY_FILTERS.map(f => adaptGuardianIncidents(page(), f).visible.length);
  assert.deepEqual(sizes, [4, 2, 1, 1]);
  assert.equal(adaptGuardianIncidents(page(), 'GRAVE').items.length, 4, 'items no se filtra');
  assert.deepEqual(filterIncidents(adaptGuardianIncidents(page()).items, 'LEVE').map(i => i.id), [2, 1]);
  assert.deepEqual(INCIDENT_SEVERITY_FILTERS.map(severityFilterLabel), ['Todas', 'Leve', 'Moderada', 'Grave']);
});

test('?gravedad= desconocido o ausente equivale a TODAS', () => {
  assert.equal(parseSeverityFilter('GRAVE'), 'GRAVE');
  for (const raw of [null, undefined, '', 'grave', 'CRITICA']) assert.equal(parseSeverityFilter(raw), 'TODAS');
});

test('sin datos: contenido vacío, página nula o indefinida dan KPI en 0 y ninguna tarjeta', () => {
  for (const input of [page({ content: [], totalElements: 0, totalPages: 0 }), null, undefined]) {
    const view = adaptGuardianIncidents(input, 'GRAVE');
    assert.deepEqual(view.kpis, { total: 0, leve: 0, moderada: 0, grave: 0 });
    assert.deepEqual([view.items.length, view.visible.length, view.truncated], [0, 0, false]);
  }
});
