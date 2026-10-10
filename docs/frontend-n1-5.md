# Frontend paralelo a N1.5

## Validación final para pull request hacia dev

La implementación existente se conservó. La rama de trabajo es `feat/frontend-evaluation-n1-n1-5`; la base remota `origin/dev` se comprobó tras `git fetch origin` y continúa en `5c9f4b31552686ea58eb4f0cfabc24edccfc5ee6`.

Se reejecutaron `npm.cmd run lint`, `npm.cmd run build` y `node --test tests/evaluationPreparation.test.mjs`: todos PASS. Lint mantiene las 17 advertencias preexistentes, sin errores; build compila y genera 36 páginas; las cinco pruebas de regresión pasan. `git diff --check` no presenta errores de whitespace.

La revisión funcional disponible fue por código y contratos: navegación a Bimestres, selección de periodo por ID, consulta/creación/edición de bimestres PLANIFICADO, consulta/creación/edición de criterios, selección docente de sección-curso y bimestre, matrícula activa, columnas MANUAL, PA única readonly, loading/error/vacío/reintento y mensajes Axios para red, 400/401/403/404/409/422. No se ejecutaron mutaciones administrativas reales ni se validaron flujos autenticados contra el backend.

La revisión del JSX confirma conservación de tokens administrativos, cards, border-line, bg-canvas, radios y tipografía; las tablas conservan overflow horizontal y los formularios usan layouts responsive. Esto es inspección estática, no validación visual. No hay herramienta de navegador en la sesión ni Playwright/Puppeteer instalado en el proyecto. Quedan pendientes comprobaciones visuales en escritorio/móvil de navegación, formularios, mensajes, vacíos y PA.

El PR debe ser **DRAFT** por las validaciones visuales y funcionales autenticadas pendientes. Guardar notas y Abrir bimestre continúan deshabilitados. Los datos docentes de evaluación aún requieren contratos N2 aprobados; el módulo no simula persistencia ni presenta mocks académicos como resultados reales. Se publican exclusivamente los once archivos del inventario académico, sin archivos de entorno, credenciales ni cambios de módulos ajenos.

Las secciones siguientes documentan la implementación y el estado previo al commit. El SHA del commit y la URL del PR se entregan en el cierre y en GitHub.

## Consolidación N1/N1.5 previa a N2

Rama de origen: `dev`. Rama de trabajo actual: `feat/frontend-evaluation-n1-n1-5`, creada con `git switch -c` desde el HEAD actual de dev. HEAD inicial y final: `5c9f4b31552686ea58eb4f0cfabc24edccfc5ee6`. No hay commits nuevos.

Se inspeccionaron `git branch --show-current`, `git status --short`, `git diff --check` y `git diff` antes de editar. Se preservaron los 3 archivos modificados y 6 nuevos iniciales. No se ejecutó reset, clean, stash, pull, checkout, commit, push ni PR. No se accedió a Supabase ni se abrieron o modificaron bimestres reales. No se modificó Flyway V12 ni el backend.

Al trasladar el trabajo a la rama, el estado real ya contenía 3 archivos modificados y 8 nuevos: los seis originales más `evaluationPreparation.ts` y su archivo de pruebas incorporados en la consolidación previa. Todos se conservaron sin commit. En esta última revisión se editaron únicamente la vista docente, `evaluationApi.ts` y este informe; se mantuvo el resto del trabajo local.

### Archivos y alcance

| Archivo | Estado al iniciar | Trabajo en esta consolidación |
| --- | --- | --- |
| `feature/admin/vistas/(academico)/cursos/detalleDelCurso.tsx` | Modificado | Revisado; integración local preservada sin nuevas ediciones |
| `feature/docente/vistas/notas/vistaNotasDocente.tsx` | Modificado | PA única, bimestre y datos vinculados al contexto y matrícula |
| `layout/admin/adminSidebar.tsx` | Modificado | Revisado; enlace Bimestres preservado sin nuevas ediciones |
| `docs/frontend-n1-5.md` | Nuevo | Informe actualizado, investigación histórica preservada |
| `feature/admin/vistas/(academico)/bimestres/vistaBimestres.tsx` | Nuevo | Validación, actualización de lista, estados de guardado y apertura bloqueada |
| `feature/admin/vistas/(academico)/cursos/courseCriteria.tsx` | Nuevo | Creación y edición de criterios además de consulta |
| `src/app/administrador/(academico)/bimestres/page.tsx` | Nuevo | Revisado; ruta preservada sin nuevas ediciones |
| `src/services/admin/evaluationService.ts` | Nuevo | GET individual, POST y PATCH de criterios; detalles de errores HTTP |
| `src/types/evaluationApi.ts` | Nuevo | Requests administrativos y contrato interno de preparación docente |
| `src/lib/evaluationPreparation.ts` | No existía | Separación MANUAL/PA, notas nullable y validación de contexto |
| `tests/evaluationPreparation.test.mjs` | No existía | Regresiones de PA, columnas dinámicas y contexto |

Además se revisaron, sin modificarlos: `vistaTodosLosCursos.tsx`, `courseForm.tsx`, `src/types/courseApi.ts`, `src/services/httpClient.ts`, las rutas administrativas de cursos y el layout administrativo, `src/app/docente/notas/page.tsx`, `DocenteSessionContext`, `teacherCoursesService` y `teacherCoursesApi`. Los controladores, requests, responses y casos de uso de criterios/bimestres del backend local se usaron como evidencia de los contratos; el backend no se editó.

### Contratos administrativos

Todos los paths siguientes llevan prefijo `/api/v1/management`; el cliente ya aporta `/api` como base y el servicio usa `/v1/management`.

| Operación | Endpoint confirmado | Estado frontend |
| --- | --- | --- |
| Configuración de criterios | GET `/courses/{courseId}/evaluation-criteria?academicPeriodId={periodId}` | Consumido; tabla dinámica |
| Consulta individual de criterio | GET `/evaluation-criteria/{criterionId}` | Método disponible; la edición utiliza el criterio de la lista |
| Crear criterio | POST `/courses/{courseId}/evaluation-criteria` | Formulario conectado |
| Editar criterio | PATCH `/evaluation-criteria/{criterionId}` | Solo campos admitidos y modificados |
| Listar bimestres | GET `/academic-periods/{periodId}/bimesters` | Consumido; estados y fechas |
| Crear bimestre | POST `/academic-periods/{periodId}/bimesters` | Formulario conectado |
| Editar bimestre | PATCH `/bimesters/{id}` | Solo PLANIFICADO; no envía número ni estado |
| Abrir bimestre | POST `/bimesters/{id}/open` | Confirmado en backend; sin método ni handler frontend, botón deshabilitado |

### Incompatibilidades detectadas y resolución

- PA se renderizaba en `criteria.map` y también en la última columna. Se excluyó PARTICIPACION_ACADEMICA de los inputs y se conserva una única columna PA.
- Las filas recibidas no estaban vinculadas al bimestre ni a la sección y no incluían matrícula. Se añadió contexto explícito y comparación con `enrollmentId`; una selección incompatible muestra configuración pendiente, sin calificaciones previas.
- Criterios solo tenía consulta: se agregaron creación/edición, validación del tipo inmutable y mensajes de conflictos y validación.
- La explicación de apertura decía que N1.5 estaba pendiente de integración: ahora indica la validación de concurrencia pendiente, conservando el bloqueo.
- El frontend no dispone de listado de periodos ni lecturas docentes confirmadas de evaluación. Se mantiene periodo por ID en administración y preparación por props en notas. No son errores de compilación; son contratos pendientes.
- N0B ofrece catálogo `/academic-areas`, pero el contrato actual de cursos aún utiliza `area: string`, igual que el formulario existente. No se añadió un campo `academicAreaId` ni se modificó el módulo de áreas.

### Verificación final

- `npm.cmd run lint` (equivalente de `npm run lint` en este PowerShell): exit 0, 0 errores y 17 advertencias. La salida es idéntica al lint ejecutado antes de editar; ninguna advertencia fue introducida por esta consolidación. Se preservaron los módulos ajenos que las generan.
- `npm.cmd run build`: exit 0; compilación, TypeScript y generación de 36 páginas correctas. Incluye `/administrador/bimestres` y `/docente/notas`.
- `npx.cmd tsc --noEmit`: exit 0.
- `node --test tests/evaluationPreparation.test.mjs`: 5 pruebas aprobadas. Node 24 emite una advertencia de detección de módulo al importar el helper TypeScript; no se cambió el tipo de módulo global del proyecto.
- `git diff --check`: exit 0; únicamente aviso de conversión LF/CRLF de Git, sin errores de whitespace.
- No hubo pruebas autenticadas contra el backend ni validación visual en navegador. Las mutaciones administrativas se validaron por contrato y compilación, sin ejecutarlas contra datos reales.

### Pendientes para N2

1. Confirmar y conectar endpoints docentes autorizados para bimestres, configuración y calificaciones. La ruta actual aún no suministra `TeacherEvaluationData`.
2. Adaptar el response de N2 al contrato interno, con sección-curso, bimestre, periodo y matrícula, y notas nullable por ID de criterio. El backend debe limitar las matrículas al periodo seleccionado.
3. Recibir PA calculada por backend a partir de actividades calificadas; sin resultado, mostrar Pendiente. No inferir cero por ausencia ni calcular promedios en frontend.
4. Conectar guardar solo cuando exista su contrato y validaciones de N2; por ahora el botón permanece deshabilitado y los borradores no se persisten.
5. Completar validación de concurrencia de apertura en backend antes de habilitarla. Verificar los flujos con autenticación y en navegador antes de habilitar operaciones reales.

Estado: `FRONTEND_EVALUATION_READY_FOR_REVIEW`.

## Implementación

- Detalle administrativo de curso: sección de criterios con consulta GET `/api/v1/management/courses/{courseId}/evaluation-criteria?academicPeriodId={periodId}`. Renderiza `response.criteria.map`, incluyendo activos e inactivos. El tipo backend `PARTICIPACION_ACADEMICA` se presenta como AUTOMÁTICO.
- `/administrador/bimestres`: listado por periodo, creación y edición únicamente para PLANIFICADO. Conserva tokens administrativos, cards, bordes y radios. Botón Abrir bimestre deshabilitado, sin handler ni método HTTP de apertura, hasta completar la validación de concurrencia del backend N1.5.
- Los contratos se comprobaron en el checkout local `CORAULA-BACKE/coraula-backend`, controladores `EvaluationCriterionController` y `BimesterController`, junto con sus requests y responses. No se modificó el backend.
- No hay un contrato de listado de periodos en esos controladores; se solicita un ID válido sin asumir año = ID ni un periodo predeterminado.
- Notas docente: cursos desde el contexto real y alumnos desde `teacherCoursesService.getStudents`. No usa las rutas de notas sin confirmar de `src/lib/api.ts` ni los antiguos mocks. Conserva header, cards, colores, tabla e inputs. Elimina Mes y columnas antiguas.
- Criterios: consulta, creación y edición de nombre, descripción, orden y activo. El PATCH no envía tipo, curso ni periodo. Se valida nombre hasta 255 caracteres, orden entero positivo único (incluyendo criterios inactivos) y una única PA activa. La descripción se puede limpiar con null. No se impone un máximo de cinco criterios manuales. El backend valida curso y periodo activos y resuelve conflictos concurrentes.
- `VistaNotasDocente` recibe opcionalmente `bimesters` y `evaluation: TeacherEvaluationData`, un contrato interno de preparación, no un response de backend. La evaluación contiene `sectionCourseId`, `bimesterId`, `configuration` y `records`. Solo se usa cuando coinciden sección-curso, curso, bimestre y periodo; cada fila además debe coincidir en `studentId` y `enrollmentId` con la matrícula activa consultada. El selector real de bimestre se habilita cuando se suministra su lista, sin selector mensual.
- Las columnas de inputs son exclusivamente criterios MANUAL activos ordenados por `order`, sin límite de cantidad. PARTICIPACION_ACADEMICA se separa y aparece una vez como PA readonly. Se toma la nota por ID del criterio; si no existe esa entrada se admite `pa` suministrada en el contrato interno. Un null explícito permanece Pendiente, incluso si hay un `pa` antiguo. Cero se muestra como cero. Sin PA activa no se muestra una nota previa. No se calcula PA ni promedio final. Los borradores se aíslan por sección-curso, periodo, bimestre, criterio y matrícula.
- La ruta docente actual no suministra todavía esas props: muestra alumnos y PA pendiente, junto con el estado de configuración pendiente. No se usa el endpoint administrativo con permisos docentes. Guardar y Exportar están deshabilitados. La lectura docente de bimestres/configuración/calificaciones queda pendiente de un contrato autorizado de N2; no se inventaron endpoints. El backend debe filtrar las matrículas activas del periodo seleccionado.

### Conexión futura del consumidor docente

La vista expone `onSelectionChange(selection)` con `sectionCourseId`, `courseId`, `sectionId`, `bimesterId` y `academicPeriodId`. Sin bimestre los dos últimos son null; sin curso asignado se comunica null. El consumidor debe mantener estable el callback con `useCallback`, esperar una selección completa antes de consultar evaluación, descartar respuestas obsoletas y adaptar únicamente contratos aprobados con backend.

Se prepararon `bimestersLoading`, `bimestersError`, `evaluationLoading` y `evaluationError`, junto con `onRetryBimesters` y `onRetryEvaluation`. Durante carga/error no se reutiliza la evaluación previa: no se muestran inputs con calificaciones antiguas y PA queda Pendiente. La lista de alumnos conserva su consulta real, con sus propios estados. Las nuevas props son opcionales y no activan ninguna petición ni guardado por sí mismas. La ruta actual sigue sin consultar endpoints de evaluación docente.

## Investigación Git: materiales, recursos y actividades docente

Validación: `npx.cmd tsc --noEmit`, ESLint de los componentes y servicios afectados y `npm.cmd run build` completados correctamente. No se realizó validación visual en navegador ni solicitudes con una sesión autenticada al backend.

Se revisaron referencias locales y remotas disponibles con `git log --all`, `git ls-tree`, `git show` y `git branch --contains`. No se restauraron archivos ni se actualizaron referencias remotas.

### Evidencia

- **463668a9c7aa746c9b411bef9b72e52c3f037b63**, 6 de octubre de 2026, `feat: agregar módulo y componentes para docentes`: incorpora la vista docente con materiales dentro del detalle del curso.
- **origin/feature/docentes** conserva los archivos de ese módulo. El commit también está en el historial de `dev` y las ramas de integración docente.
- **21926166003810cf616ef8ba392b860f7ab00360**, 8 de octubre de 2026, `feat(teacher): integrate real assigned courses`: reemplaza el detalle anterior por la información académica y alumnos reales. La versión previa se consulta con `git show 2192616^:feature/docente/vistas/cursos/vistaDetalleCursoDocente.tsx`.

### Archivos

| Archivo | Papel |
| --- | --- |
| `feature/docente/vistas/cursos/vistaDetalleCursoDocente.tsx` en 463668a | Vista de semanas, clases y creación de material |
| `src/app/docente/cursos/[id]/page.tsx` | Ruta del detalle |
| `src/types/docentes.ts` | `ClaseDocente`, `SemanaCursoDocente`, `CursoDetalleDocente` |
| `src/lib/api.ts` | `getCursoDetalleDocente`, `crearMaterialDocente`; rutas TODO sin contrato confirmado |
| `src/lib/mocks/mockDocente.ts` | Semanas y clases simuladas |

No se encontró una ruta docente independiente llamada materiales, recursos o actividades en las referencias revisadas. La funcionalidad se agrupaba en el detalle de curso, con tipos documento, video, ejercicios y evaluación y la marca `tieneTarea`.

### Estructura histórica (sin restauración)

```text
Detalle del curso
├── Header: volver, curso y grado
├── Acciones del curso y resumen de clases/tareas
├── Semanas desplegables
│   └── Clases: icono por tipo, nombre, descripción, tarea y archivo
├── Modal «Creando Material de Clase» (referencia Frame fYgNB)
│   ├── Título
│   ├── Semana
│   ├── Tipo: documento / video / ejercicios / evaluación
│   ├── Nombre de archivo simulado / enlace
│   └── Tiene tarea
└── Modal de asistencia rápida (referencia Frame lVoY0)
```

Se presenta estructura derivada del código, no capturas de una vista en ejecución.

### Reutilización actual

Se pueden extraer los paneles desplegables de semanas, las cards e iconos de clases y la distribución visual del formulario de material, conservando los tokens actuales. Los tipos pueden servir de punto de partida cuando exista el contrato de recursos.

No deben reutilizarse directamente los IDs simulados, las semanas fijas del formulario, la falsa carga de archivos, las rutas TODO ni las mutaciones de mocks. El modal de asistencia rápida contiene alumnos simulados y debe ceder al módulo real de asistencia. La adaptación futura debe conservar `sectionCourseId`, la autorización docente y los estudiantes reales del detalle actual.
