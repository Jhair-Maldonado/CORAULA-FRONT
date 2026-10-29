# Evidencias no funcionales — CORAULA Frontend

Issue #37 (QA-NF-EVIDENCIAS). Trazabilidad: RNF-01, RNF-02, RNF-04; observaciones 8 y 10 del APF2.

## Medición 2026-10-26

### Contexto
| Campo | Valor |
| --- | --- |
| Fecha | 2026-10-26 |
| Commit base | `dev@6bf15d1` + correcciones de accesibilidad de esta rama (`qa/37-evidencias-nf`) |
| Servidor | `npm run build` + `next start -p 3100` en local (Windows 11). **No** `next dev` |
| Variables | Sin `.env`; `NEXT_PUBLIC_USE_MOCKS` sin definir (modo mocks) |
| Navegador | Microsoft Edge 156.0.4314.42 (headless) |
| Lighthouse | 13.5.0, modo navegación; móvil = configuración por defecto (emulación móvil + throttling simulado), escritorio = `desktop-config` |
| axe | axe-core 4.14.0 vía `@axe-core/playwright` 4.14.0 (Playwright 1.64.1, canal `msedge`), etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`; viewport 1350×940 |
| npm audit | npm de Node 24.14.0, registro público |

Herramientas instaladas fuera del repositorio; `package.json` y el lock no cambian.

### Archivos
- `2026-10-26/npm-audit-prod.json` (`npm audit --omit=dev --json`) y `2026-10-26/npm-audit-full.json` (`npm audit --json`).
- Reportes completos de Lighthouse (`<ruta>.<mobile|desktop>.{html,json}`): en Drive, <enlace de Drive>. No se versionan en el repositorio.
- `2026-10-26/axe/<ruta>.json`.
- `2026-10-26/summary.json`: resumen tras las correcciones. `2026-10-26/summary-antes.json`: resumen previo a las correcciones (sus informes completos se sustituyeron por los de la medición final).

### Lighthouse (tras correcciones)
Puntuaciones: rendimiento / accesibilidad / buenas prácticas / SEO.

| Ruta | Dispositivo | Rend. | Acc. | BP | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | Móvil | 84 | 95 | 100 | 100 | 1.8 s | 2.8 s | 430 ms | 0 |
| `/login` | Escritorio | 99 | 96 | 100 | 100 | 0.5 s | 0.9 s | 0 ms | 0 |
| `/login/security/administrador` | Móvil | 76 | 95 | 100 | 100 | 2.7 s | 4.1 s | 300 ms | 0 |
| `/login/security/administrador` | Escritorio | 99 | 96 | 100 | 100 | 0.5 s | 0.9 s | 10 ms | 0 |
| `/docente/login` | Móvil | 72 | 96 | 100 | 100 | 2.7 s | 4.2 s | 340 ms | 0 |
| `/docente/login` | Escritorio | 100 | 96 | 100 | 100 | 0.6 s | 0.6 s | 10 ms | 0 |
| `/alumno/login` | Móvil | 77 | 100 | 100 | 100 | 2.7 s | 3.8 s | 260 ms | 0 |
| `/alumno/login` | Escritorio | 100 | 100 | 100 | 100 | 0.5 s | 0.6 s | 10 ms | 0 |
| `/alumno` (→ `/alumno/login`) | Móvil | 72 | 100 | 100 | 100 | 2.7 s | 4.4 s | 370 ms | 0 |
| `/alumno` (→ `/alumno/login`) | Escritorio | 98 | 100 | 100 | 100 | 0.8 s | 1.0 s | 0 ms | 0 |

Notas:
- `/alumno` sin sesión redirige en el cliente a `/alumno/login`; mide la misma pantalla.
- Una sola ejecución por ruta y dispositivo. El rendimiento móvil (throttling simulado) varió entre 72 y 96 en las dos tandas de esta fecha para pantallas equivalentes; para cifras comparables, repetir 3–5 veces y tomar la mediana, idealmente sobre el despliegue.
- Las vistas del portal Administrador (y los portales Docente y Apoderado) requieren sesión: **se medirán sobre el despliegue con una cuenta de validación** (depende de #33).

### axe (infracciones por severidad)
| Ruta | Antes: crítica / grave / moderada / menor | Después |
| --- | --- | --- |
| `/login` | 0 / 1 (`color-contrast`) / 0 / 0 | 0 / 0 / 0 / 0 |
| `/login/security/administrador` | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| `/docente/login` | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| `/alumno/login` | 0 / 1 (`color-contrast`) / 10 (`landmark-one-main`, `region`) / 0 | 0 / 0 / 0 / 0 |
| `/alumno` (→ `/alumno/login`) | igual que `/alumno/login` | 0 / 0 / 0 / 0 |

axe automatizado cubre solo parte de WCAG; no sustituye la revisión manual (teclado, lector de pantalla).

### Correcciones aplicadas
1. `src/app/login/page.tsx`: etiqueta «Alumnos» del encabezado, `text-muted` → `text-ink/80` (contraste 4.47:1 → >4.5:1).
2. `feature/alumno/vistas/login/vistaLoginAlumno.tsx`: pie «Colegio San Marcos · Sistema CORAULA 2026», `#6B7280` → `#4B5563` (contraste 4.39:1 → >4.5:1).
3. `src/app/alumno/layout.tsx`: el contenedor de la pantalla de login pasa de `<div>` a `<main>` (landmark principal; resuelve `landmark-one-main` y `region`).
4. `target-size` (rama `fix/37-pendientes`): el botón «Mostrar contraseña» de `/login`, `/login/security/administrador` y `/docente/login` mide al menos 24×24 px (`min-w-6 min-h-6 p-1`), con el icono en la misma posición.
5. Mensajes de error de `/login`, `/login/security/administrador`, `/docente/login` y `/alumno/login` con `role="alert"` y `aria-live="assertive"`, para que el lector de pantalla los anuncie.

### npm audit
#### Resultado vigente (tras el PR #89)
Medido el 2026-10-27 sobre `dev@2da77e1` (incluye el merge del PR #89, `a825163`); npm 11.9.0, Node 24.14.0, registro público.

| Alcance | Crítica | Alta | Moderada | Baja | Total |
| --- | --- | --- | --- | --- | --- |
| Producción (`--omit=dev`) | 0 | 0 | 0 | 0 | **0** |
| Completo | 0 | 3 | 0 | 0 | 3 |

El PR #89 (`fix(deps)`) actualizó `next` a 16.4.3 y las dependencias transitivas de producción, y retiró `xlsx`. Quedan tres avisos altos solo de desarrollo (`brace-expansion`, `js-yaml`, `zod`, vía herramientas de lint), con corrección por `npm audit fix`; no llegan al bundle.

#### Medición inicial (2026-10-26, previa al PR #89)
Producción: 2 críticas y 5 altas (7). Completo: 2 críticas y 8 altas (10). Detalle por paquete en `2026-10-26/npm-audit-prod.json` y `2026-10-26/npm-audit-full.json`; incluía `next` 16.3.1 (crítica), `dompurify` vía `jspdf` (crítica), y `axios`, `follow-redirects`, `sharp`, `source-map-js` y `xlsx` (altas).

### Pendiente
- Repetir Lighthouse en `/login`, `/login/security/administrador` y `/docente/login` para confirmar que `target-size` desaparece tras la corrección 4.
- Avisos de npm audit solo de desarrollo (`brace-expansion`, `js-yaml`, `zod`).
- Medición de las vistas autenticadas (Administrador y demás portales) sobre el despliegue con una cuenta de validación (#33).
- Sustituir las secciones 8.2 y 14.3 del documento APF3 con estas evidencias (Coordinación).
