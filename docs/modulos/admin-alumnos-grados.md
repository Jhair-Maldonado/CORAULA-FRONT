# Módulo Administrador: panel de grados y alumnos

## Objetivo
Panel lateral «Niveles y Grados — Secciones del plantel» y grilla de tarjetas de alumnos por sección, para
ADMINISTRADOR y DIRECTIVO. Permite recorrer el plantel por nivel, grado y sección, ver la ocupación (n / máx) de cada
sección y entrar a la lista de alumnos de una sección. Issue FRONT #152.

## Rutas
- `/administrador/alumnos` -> listado general de alumnos («Ver todo alumnado»).
- `/administrador/alumnos/grado/[id]` -> alumnos de la sección `id` (el `id` es un `sectionId`, no un grado).
- `/administrador/alumnos/grado/[id]/estudiante/[estudianteId]` -> perfil del alumno conservando el panel de la sección.
- `/administrador/alumnos/estudiante/[estudianteId]` -> perfil del alumno desde el listado general.

## Componentes principales
- `GradosSidebar`: contenedor; carga el árbol con `useGradeTree` y resalta la sección de la ruta.
- `GradosPanel`: panel puro (`estado`, `tree`, `activeSectionId`, `onRetry`); acordeón por grado, estados de carga, error con
  reintento, vacío, 403 y sin periodo.
- `StudentsGrid` y `TarjetaEstudiante`: encabezado de la sección, búsqueda, paginación y tarjetas con chip de estado.

## Servicios
- `academicPeriodsService.list()` -> `GET /v1/management/academic-periods`; se toma el periodo vigente y activo con
  `defaultAcademicPeriod` sobre los periodos activos (si no hay vigente, el activo que empieza más tarde); sin ninguno, estado sin periodo.
- `vacanciesService.list(periodId)` -> `GET /v1/management/vacancies?academicPeriodId=`.
- `studentsService.list({ sectionId, search, page, size })` -> `GET /v1/management/students`.

## Integración backend
- `toGradeTree` (`src/adapters/vacancyAdapter.ts`) convierte `GradeVacanciesView[]` en nivel → grado → sección.
- Orden: Primaria, Secundaria y «Otro nivel»; grados ascendentes; secciones por nombre (comparación natural) y luego id.
- Contadores inválidos cuentan como 0; capacidad inválida deja la ocupación en solo «n»; la sobreocupación se muestra tal cual.
- Los grados sin secciones se omiten; el total del grado es la suma de sus secciones.

## Mocks temporales
`dev:mock` usa el fixture de `/v1/management/vacancies` (5° Primaria A 4/30 y B 0/30; 1° Secundaria A 1/35). Sin mocks propios del panel.

## Decisiones técnicas
- El panel usa el periodo vigente, no un selector: el backend sin `academicPeriodId` devolvería todos los periodos activos.
- Mensajes de error propios: nunca se muestra el texto que envía el backend.
- Las secciones inactivas se atenúan (`opacity-60` y texto «Inactiva»), pero hoy el backend no las envía en `/vacancies`.
- El chip de estado del alumno usa un tono (`studentStatusTone`) con tokens del proyecto y siempre incluye el texto.
- La tarjeta ya no muestra el código de alumno (como en el diseño).

## Pendientes
- [ ] Mostrar secciones inactivas cuando el backend las incluya en `/vacancies`.
- [ ] Selector de periodo para consultar periodos anteriores, si se requiere.
