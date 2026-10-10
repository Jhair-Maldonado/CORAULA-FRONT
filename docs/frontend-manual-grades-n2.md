# Planilla docente N2: integración provisional

La rama prepara la planilla existente sin cambiar la gestión administrativa. El documento local del backend `docs/manual-grades-n2-design.md` declara expresamente una propuesta sin endpoints ni DTO N2 implementados. No se encontraron contratos definitivos verificables. Este trabajo debe revisarse como DRAFT.

## Contratos pendientes de verificación

El servicio docente utiliza exclusivamente estas rutas, relativas a la base Axios `/api`:

- GET `/v1/teacher/courses/{sectionCourseId}/bimesters`
- GET `/v1/teacher/courses/{sectionCourseId}/bimesters/{bimesterId}/criterion-grades`
- POST en la misma ruta de calificaciones, con `{ enrollmentId, criterionId, grade }` por celda.

Los DTO están identificados como provisionales en `teacherGradesApi.ts`. Las lecturas validan estructura, identificadores, tipos y contexto antes de presentar resultados. No sustituyen errores por datos académicos simulados. `MANUAL_GRADES_CONTRACT_VERIFIED = false` bloquea el guardado tanto en la interfaz como en el servicio antes de cualquier POST. Confirmar DTO y despliegue backend es requisito previo a cambiar esa protección.

## Comportamiento preparado

La selección usa bimestres docentes autorizados y la planilla obtiene matrículas y notas de la respuesta del backend. Las solicitudes de lectura se cancelan al cambiar de contexto; las claves de selección impiden mostrar respuestas anteriores. Los criterios MANUAL activos son dinámicos. Los criterios inactivos con notas existentes conservan sus columnas de consulta.

Solo una primera nota MANUAL en un bimestre ABIERTO podrá ingresarse: rango 0–20 y hasta dos decimales. Cero persistido es una nota existente y queda readonly. Las notas ausentes permanecen vacías. PA aparece una sola vez y readonly; la propuesta no incluye su resultado, por lo que se muestra Pendiente sin calcularlo.

El flujo de escritura preparado utiliza registros individuales, bloqueo de doble envío y recarga real de la planilla incluso si un registro falla. No promete atomicidad del conjunto ni reintenta escrituras automáticamente. Una recarga fallida mantiene bloqueado el siguiente envío hasta recuperar la planilla. Los errores 403 y 409 se presentan explícitamente. Exportación y apertura administrativa siguen deshabilitadas.

## Verificación y limitaciones

Ejecutar `npm.cmd run lint`, `npm.cmd run build` y `node --experimental-strip-types --test tests/evaluationPreparation.test.mjs tests/manualGrades.test.mjs`.

Las pruebas usan fixtures y transportes inyectados exclusivamente en tests: criterios dinámicos, PA null/cero, bimestres PLANIFICADO/ABIERTO, rango y decimales, primeras notas, registros satisfactorios, duplicidad, 403/409, registro parcial, recarga fallida, contexto incompatible y respuestas vacías o inválidas. No escriben notas en Supabase ni presentan fixtures en la aplicación.

No se dispone de navegador automatizado ni Playwright/Puppeteer instalado. Validación visual, interacción del hook bajo cambios rápidos de contexto y E2E con backend N2 quedan pendientes. La compilación y las pruebas unitarias no sustituyen esas verificaciones.

## Archivos del módulo

- `feature/docente/vistas/notas/vistaNotasDocente.tsx`
- `src/hooks/useTeacherGrades.ts`
- `src/lib/manualGrades.ts`
- `src/lib/manualGradesContract.ts`
- `src/services/teacher/teacherGradesService.ts`
- `src/types/evaluationApi.ts`
- `src/types/teacherGradesApi.ts`
- `tests/manualGrades.test.mjs`
- `docs/frontend-manual-grades-n2.md`

Antes de habilitar operaciones reales: aprobar y verificar los DTO definitivos, confirmar matrículas activas y permisos en backend, realizar E2E en un entorno aislado y validar concurrencia/conflictos. Las correcciones administrativas y el historial quedan fuera de la pantalla docente.
