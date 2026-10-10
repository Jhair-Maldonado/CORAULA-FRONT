# N3-F1: actividades académicas del docente

## Integración

Ruta existente: `/docente` → curso asignado → `/docente/cursos/{sectionCourseId}` → sección **Actividades académicas**. No añade otra carga de cursos ni identidad docente: reutiliza el detalle autorizado, DocenteSessionProvider, AuthGuard DOCENTE y Axios/JWT. El selector carga los bimestres reales con teacherGradesService; no utiliza rutas management.

Contrato revisado en [docs/academic-activities-n3.md del backend develop](https://github.com/Jhair-Maldonado/CORAULA-BACKEND/blob/develop/docs/academic-activities-n3.md), blob `f4e89210a3c8916d9b353fd52997266d3f23e843`.

Base HTTP: `/api/v1/teacher/courses/{sectionCourseId}/bimesters/{bimesterId}/activities`.

- GET colección: exige 200 y array validado, orden createdAt/id, admite vacío.
- GET `/{activityId}`: exige 200 y coincidencia del ID y contexto.
- POST: exige 201 y DTO completo del contexto. Envía exclusivamente `{title, description, type, cuentaParaPa}`; título trim obligatorio ≤255, descripción opcional/null, tipos TAREA/PRACTICA/EXAMEN/PROYECTO, boolean explícito. No envía identidad, estado ni calificaciones. Location se comprueba cuando es observable; CORS puede ocultar ese encabezado al navegador. La confirmación no depende de él: requiere DTO válido y recarga de la colección.
- Response: id, sectionCourseId, bimesterId, createdByTeacherId, title, description, type, cuentaParaPa, status, createdAt, updatedAt. Solo PLANIFICADA, timestamps UTC y updatedAt null admitido. No se sintetizan campos ausentes ni se aceptan filas ajenas al contexto.

Crear PLANIFICADA no está restringido a bimestre ABIERTO según N3-A: preparar no publica ni habilita notas. Cuenta para PA es únicamente configuración futura. No hay notas, cálculos, materiales, entregas, PATCH, DELETE ni transiciones.

## Interfaz y consistencia

Lista, formulario y detalle mantienen tokens administrativos del portal docente, cards, bordes, tipografía y adaptación mediante grid/flex responsive. Estados loading, vacío, errores, reintento y mensajes alert/status. Muestra detalle completo, incluyendo creador y fechas, sin deducir datos de identidad de otros docentes.

Lock síncrono compartido entre bimestres impide doble POST. Durante envío se deshabilita el selector y las acciones incompatibles. Cambiar curso remonta el módulo; cambiar bimestre invalida callbacks síncronamente y remonta la planilla. AbortController cancela lecturas obsoletas; controles de montaje/contexto descartan respuestas tardías, incluidos POST y recargas. No se aborta ni reintenta una mutación para suponer que no persistió.

Después de cada intento de POST se consulta nuevamente el listado. Éxito requiere POST coherente y presencia del ID creado en esa consulta; no se inserta una fila optimista. 400/401/403/404/409 usan mensajes fijos sin detalles sensibles; 401 conserva el interceptor global. Si el POST pierde conexión o responde de forma inconsistente/5xx, no se atribuye éxito a una fila parecida: títulos repetidos son válidos y el backend no tiene idempotencia. Se bloquea nueva creación hasta leer correctamente y confirmar explícitamente que se revisó el listado; esa confirmación limpia el formulario. Un POST aceptado cuya recarga falla o no contiene el ID también exige revisión. No hay retry automático ni promesa de prevención de duplicados a través de recarga de página, navegación o nuevas sesiones.

## Verificación comprobada

- `npm ci`: PASS, lockfile existente sin nuevas dependencias. Audit informó 33 vulnerabilidades de dependencias existentes; no se actualizaron paquetes fuera de alcance.
- `npm test`: 50/50 PASS, 0 fail/skip (37 anteriores + 13 nuevas de N3).
- `npm run lint`: PASS, 0 errores y 17 advertencias preexistentes ajenas al módulo.
- `npm run build`: PASS, TypeScript y 36 páginas.
- `git diff --check`: PASS.

Pruebas de servicio/componentes usan adapters Axios y react-test-renderer. Cubren colección vacía/ordenada, detalle/reintento, DTO exacto y tipos/booleanos, validación de título y respuestas incompletas, 201, Location observable, recarga, doble envío, 400/401/403/404/409, POST ambiguo, fallo/inconsistencia de recarga, cambio de curso/bimestre y respuestas tardías. Incluyen envío obsoleto antes del render y ausencia de campos de notas. Fixtures solo en tests; no son datos docentes en producción ni evidencia de persistencia real.

`BROWSER_E2E: NOT_RUN`: no hay infraestructura disponible de navegador con backend y PostgreSQL aislados para el recorrido. Pendiente login docente → curso → bimestre → crear → consultar detalle → recargar página, revisión visual/responsive y exposición CORS de Location. No se efectuaron escrituras en Supabase compartido, cambios backend, migraciones ni modificaciones de otros módulos académicos.

Decisión: READY_FOR_REVIEW técnica; pruebas de integración/browser pendientes explícitas. La idempotencia backend y las operaciones N3-B requieren contratos futuros y quedan fuera de esta entrega.
