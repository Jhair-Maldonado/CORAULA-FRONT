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
- `2026-10-26/lighthouse/<ruta>.<mobile|desktop>.{html,json}`.
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

### npm audit
| Alcance | Crítica | Alta | Moderada | Baja | Total |
| --- | --- | --- | --- | --- | --- |
| Producción (`--omit=dev`) | 2 | 5 | 0 | 0 | 7 |
| Completo | 2 | 8 | 0 | 0 | 10 |

| Paquete | Severidad | Directa | Alcance | Origen | Corrección | Decisión propuesta |
| --- | --- | --- | --- | --- | --- | --- |
| `next` 16.3.1 | Crítica | Sí | Prod | — | 16.4.3 (fuera del rango fijado `16.3.1`) | Actualizar en un nodo propio con regresión completa. Incluye RCE en servidores Windows y en Image Optimization |
| `dompurify` ≤3.4.16 | Crítica | No | Prod | `jspdf` 4.2.1 | `npm audit fix` | Actualizar en el nodo de dependencias; el código no usa `jspdf.html()` |
| `axios` 1.19.0 | Alta | Sí | Prod | — | `npm audit fix` | Actualizar (parche dentro del rango) |
| `follow-redirects` 1.16.0 | Alta | No | Prod | `axios` | `npm audit fix` | Se resuelve con `axios` |
| `sharp` 0.35.3 | Alta | No | Prod | `next` | `npm audit fix` | Actualizar |
| `source-map-js` 1.2.1 | Alta | No | Prod | `postcss`, `@tailwindcss/postcss` | `npm audit fix` | Actualizar (impacto solo en build) |
| `xlsx` 0.18.5 | Alta | Sí | Prod | — | Sin corrección en npm | **Ningún archivo lo importa**: proponer retirarlo de `dependencies` |
| `brace-expansion` | Alta | No | Dev | herramientas de lint | `npm audit fix` | Actualizar; no llega al bundle |
| `js-yaml` 4.x | Alta | No | Dev | herramientas de lint | `npm audit fix` | Actualizar; no llega al bundle |
| `zod` 4.4.3 | Alta | No | Dev | `eslint-plugin-react-hooks` | `npm audit fix` | Actualizar; no llega al bundle |

No se ejecutó `npm audit fix` ni `--force` en este nodo.

### Pendiente
- `target-size` (Lighthouse): el botón «Mostrar contraseña» de `/login`, `/login/security/administrador` y `/docente/login` mide menos de 24×24 px. Requiere ajustar su tamaño o padding; fuera de las correcciones triviales.
- Actualización de dependencias según la tabla de npm audit (nodo aparte).
- Medición de las vistas autenticadas (Administrador y demás portales) sobre el despliegue con una cuenta de validación (#33).
- Sustituir las secciones 8.2 y 14.3 del documento APF3 con estas evidencias (Coordinación).
