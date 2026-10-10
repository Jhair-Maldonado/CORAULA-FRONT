# N2: registro inicial MANUAL del docente

## Evidencia de habilitación

`MANUAL_GRADES_CONTRACT_VERIFIED = true` habilita servicio y Guardar en `feat/n2-manual-grades-ui-integration`, creada desde dev `ad0637d6c69f9c181206e5966178293d62ec91b0` con árbol limpio.

Se comprobaron logs del [PR backend #25](https://github.com/Jhair-Maldonado/CORAULA-BACKEND/pull/25), HEAD `f44a096a42bf233776943d31386f98c758c22429`. GitHub confirma que ya fue fusionado; la descripción conserva observaciones de una revisión anterior. Evidencia final:

- [PostgreSQL y consumidor HTTP](https://github.com/Jhair-Maldonado/CORAULA-BACKEND/actions/runs/38080220970/job/114295415778): SUCCESS, 47 pruebas, cero fallos/errores/omisiones; Flyway hasta V12. Consumidor frontend probado: `ad0637d6c69f9c181206e5966178293d62ec91b0`, con flag habilitado temporalmente en ese checkout aislado.
- GET bimestres 200, GET planilla 200, POST inicial 201, duplicado 409, POST cero 201, GET confirmación 200, matrícula cruzada 409 y PA 409. El runner imprime `POST HTTP verificados: 201,409,201,409,409` y CI comprueba su ejecución sin omisiones.
- [CI general backend](https://github.com/Jhair-Maldonado/CORAULA-BACKEND/actions/runs/38080220957/job/114295415596): BUILD SUCCESS, 1285 pruebas, cero fallos/errores y una omisión del runner fuera del entorno frontend aislado. Esa omisión no sustituye el job PostgreSQL obligatorio anterior.

La evidencia corresponde al consumidor HTTP y PostgreSQL aislado; no prueba login ni interacción de UI. Esta tarea no modifica backend, no repite su suite y no escribe datos en Supabase.

## Contrato y comportamiento

Se preservan las rutas GET/POST docentes existentes, base Axios `/api` y prefijo `/v1/teacher/courses/{sectionCourseId}/bimesters`. POST emite solo `{ enrollmentId, criterionId, grade }`. Curso-sección viene de asignaciones reales; bimestres, matrículas y notas se consultan al backend. No se calculan PA, promedios ni resultados finales.

Solo primeras notas MANUAL activas en ABIERTO: 0–20 inclusive, máximo dos decimales, sin redondeo. Las notas persistidas son readonly; cero es una nota y null es pendiente. PA aparece una sola vez y readonly/Pendiente porque N2 no entrega su resultado. Criterios inactivos con notas previas siguen visibles solo para lectura.

Inputs conservan estilos/etiquetas y teclado decimal. Se conserva el texto inválido para mostrar errores: `type=number` podía convertirlo silenciosamente en vacío. Guardar queda deshabilitado sin borradores válidos, ante errores y durante envío/recarga.

POST secuenciales individuales: una celda fallida detiene las siguientes; no hay reversión de éxito parcial ni reintento automático. Después del intento se consulta la planilla. El éxito exige que las notas aceptadas aparezcan con gradeId y valor coincidente en la consulta; si falla recarga/confirmación, se bloquea el siguiente envío hasta recuperar el estado.

401 conserva el interceptor global `auth:unauthorized`; 403 no revela detalles internos, 400 muestra validación y 409 explica conflicto y consulta el estado. Una ref síncrona impide doble envío. La generación de contexto invalida callbacks anteriores incluso antes del siguiente render; AbortController y montaje por curso descartan respuestas tardías. Desmontar durante POST detiene registros restantes y evita mensajes en el contexto nuevo.

El backend genera una celda por criterio MANUAL mostrado, incluyendo pendientes null. El parser exige esa lista completa, sin duplicados ni celdas PA; valida timestamps coherentes con ausencia/persistencia. Una respuesta incompleta no produce entradas pendientes ficticias.

## Verificación frontend

- `npm ci`: PASS con lockfile final; dependencias de pruebas fijadas. Reporta 13 vulnerabilidades, el mismo conteo anterior a agregarlas; actualización global fuera de alcance.
- `npm test`: **25/25 PASS**, cero fallos/omisiones: 17 pruebas de evaluación actualizadas y 8 pruebas del hook/servicio.
- `npm run lint`: PASS, cero errores y 17 advertencias preexistentes en otros módulos.
- `npm run build`: PASS, TypeScript y generación de páginas.
- `git diff --check`: PASS.
- CI frontend instala con `npm ci` y ejecuta `npm test` antes de lint/build.

Tests cubren límites/decimales, cero/null, estados, MANUAL/PA/inactivo, DTO POST del servicio real con adapter de prueba, recarga, 400/401/403/409, éxito parcial, doble clic, selección antes del render, cambio de curso durante GET/POST y ausencia de confirmación. Un montaje nuevo verifica cero readonly obtenido de un transporte simulado: no es evidencia de persistencia en una base real. Fixtures y mocks se limitan a tests. react-test-renderer emite un aviso de deprecación; solo se usa como arnés del hook, sin dependencia de producción.

## Pendientes y decisión

Navegador E2E: **NOT_RUN**. Sin navegador automatizado ni backend/fixtures PostgreSQL aislados con login disponibles para el recorrido completo en esta sesión. Validar login → curso → bimestre → nota → guardar → recargar página, responsive y estados visuales. PR **DRAFT**, sin afirmar preparación para producción.

No se encontraron consumidores administrativos N2 de PATCH `/management/criterion-grades/{id}` o GET `/history`. Correcciones e historial quedan para otro PR. Exportación y apertura administrativa continúan deshabilitadas.

Coordinación pendiente: el workflow backend #25 espera reemplazar literalmente un flag `false` por `true` al consultar frontend dev. Tras fusionar este PR, deberá aceptar el flag ya habilitado o eliminar ese reemplazo; de otro modo fallará antes del runner. Ese workflow pertenece al backend y no se modifica aquí.

Decisión del alcance docente: **READY_FOR_REVIEW**. Aceptación final pendiente de navegador E2E y coordinación del workflow backend antes de llevar el flag a dev. Los POST son individuales; al desmontar tras una aceptación se debe consultar el estado antes de volver a registrar.
