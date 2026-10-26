# Guía de contribución — CORAULA Frontend

## Requisitos y puesta en marcha
- Node.js 22 (la misma versión que usa CI) y npm.
- Backend `coraula-backend` en local (puerto 8080) si vas a trabajar sin mocks.

```bash
npm install
```

Copia la plantilla de variables de entorno a `.env.local` (no versionado):

| Terminal | Comando |
| --- | --- |
| bash / Git Bash | `cp .env.example .env.local` |
| CMD | `copy .env.example .env.local` |
| PowerShell | `Copy-Item .env.example .env.local` |

Reinicia `npm run dev` cada vez que cambies `.env.local`. Detalle de cada variable: sección «Variables de Entorno» del [README](README.md).

| Script | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run lint` | ESLint |
| `npm test` | Pruebas de `tests/*.test.mjs` y `tests/*.test.tsx` |
| `npm run build` | Build de producción |

CI (`.github/workflows/ci.yml`) ejecuta `npm test`, `npm run lint` y `npm run build` en cada PR a `dev` o `main`.

## Flujo de trabajo
1. **Nada sin issue.** Todo cambio parte de un issue asignado.
2. Crea la rama desde `dev` actualizado:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/<n.º issue>-<descripcion>   # o fix/… o docs/…
   ```
   Ejemplo: `feat/81-asistencia-docente`.
3. PR pequeño: entre 1 y 3 días de trabajo. Si crece, divide el issue.
4. Antes de abrir el PR, integra lo último de `dev` (`git pull origin dev`) y vuelve a correr lint, test y build.
5. Abre el PR **hacia `dev`** usando la plantilla. En la descripción incluye `Closes #n` (cierra el issue) o `Refs #n` (avance parcial).
6. `main` solo recibe PRs desde `dev`, y los abre Coordinación.

## Zonas de responsabilidad

| Persona | Zona |
| --- | --- |
| Jhony | `feature/docente/` (módulo Docente) |
| Isabel | `feature/padre/` (módulo Apoderado) |
| Nayely | `feature/alumno/` (módulo Alumno) |
| Jhair (Coordinación, con Codex y Claude Code) | `feature/admin/`, autenticación, `src/services/httpClient.ts`, `src/lib/`, `src/types/` compartidos, adaptadores compartidos (`src/adapters/`) y configuración |

Cada módulo incluye también sus piezas asociadas: la ruta en `src/app/<rol>/`, sus servicios en `src/services/<área>/` y sus componentes en `src/components/<rol>/`.

**Zona compartida o ajena:** si necesitas tocarla, avisa en el issue **antes de empezar** y espera respuesta de Coordinación.

## Datos y seguridad
- No versiones `.env`, `.env.local` ni ningún secreto (tokens, contraseñas, claves). Solo `.env.example` está versionado.
- Usa únicamente datos ficticios. Nada de datos reales de alumnos, apoderados ni docentes, tampoco en capturas.
- No uses cuentas de producción para probar.
- Los mocks se activan si `NEXT_PUBLIC_USE_MOCKS` falta o tiene un valor distinto de `false` (`src/lib/mockMode.ts`). Indica en el PR si probaste con mocks o con el backend real.

## Convenciones

### Commits
[Conventional Commits](https://www.conventionalcommits.org/es/) en español, con el ámbito del módulo y el número de issue:

```
<tipo>(<ámbito>): <descripción en minúsculas> (#n)
```

Tipos: `feat`, `fix`, `docs`, `test`, `refactor`. Ejemplos del historial:
- `feat(admin): alta individual de alumno y matrícula en sección (#72)`
- `docs: plantilla .env.example y variables de entorno en README (#79)`

### Estructura del código
- **Rutas** (`src/app/<rol>/…/page.tsx`): App Router de Next.js. La página solo importa y renderiza la vista del módulo, por ejemplo `feature/docente/vistas/cursos/vistaCursosDocente`.
- **Vistas** (`feature/<módulo>/vistas/`): pantallas y lógica de UI de cada módulo.
- **Servicios** (`src/services/<área>/*Service.ts`): objetos que llaman al backend con `httpClient` (`@/services/httpClient`) usando rutas relativas como `/v1/management/teachers`. Devuelven el `data` tipado de la respuesta.
- **Tipos** (`src/types/`): los contratos del backend van en `*Api.ts` (por ejemplo `teacherApi.ts`); los modelos de la UI van en archivos propios (por ejemplo `adminTeacher.ts`).
- **Adaptadores** (`src/adapters/*Adapter.ts`): funciones puras `toX` que convierten entre los tipos del backend y los modelos de la UI o los formularios (ver `teacherAdapter.ts`).
- **Datos simulados**: `src/data/mock*.ts` y `src/lib/mocks/`.
- **Pruebas**: `tests/<nombre>.test.tsx` o `.test.mjs` con `node:test`, ejecutadas con `tsx`.
- Usa el alias `@/` para importar desde `src/`.
- `src/lib/api.ts` es un cliente heredado que usan los portales Alumno y parte de Docente. Para integraciones nuevas, usa `httpClient` y coordina en el issue.

## Revisión
Coordinación revisa cada PR antes del merge y comprueba que:
- el cambio se ajuste al alcance del issue enlazado y a la zona de quien lo abre;
- CI esté en verde (test, lint y build);
- no haya `.env`, secretos ni datos reales;
- se hayan agregado o actualizado las pruebas que correspondan;
- incluya capturas o GIF si cambia la interfaz;
- respete los contratos (`src/types/`, servicios) y la estructura descrita arriba.
