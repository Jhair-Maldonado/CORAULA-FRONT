# Sincronización del consumidor docente N2

El consumidor se cotejó contra el contrato definitivo `CORAULA-BACKE/coraula-backend/docs/manual-grades-n2.md` y los records Java de `TeacherManualGradesController`, `BimesterResponse`, `CriterionGradesSheetResponse`, `CriterionGradeResponse`, `CreateManualCriterionGradeRequest` y `EvaluationCriterionResponse`.

## Coincidencias aplicadas

- GET de bimestres autorizados devuelve `BimesterResponse[]` con id, periodo, número, nombre, fechas y estado.
- GET de planilla devuelve curso, sección-curso, periodo, bimestre, criterios, matrículas y celdas manuales. La lista `grades` por alumno se conserva como lista de celdas `{criterionId, gradeId, grade, registeredAt, updatedAt}`; `grade` y timestamps pendientes pueden ser null.
- Los criterios usan los campos reales `id`, `courseId`, `academicPeriodId`, `name`, `description`, `order`, `type`, `active`. El parser valida la pertenencia de curso y periodo.
- POST responde HTTP 201 con `{id, enrollmentId, sectionCourseId, bimesterId, criterionId, grade, registeredByTeacherId, registeredAt, updatedAt}`. El cuerpo emite solo `{enrollmentId, criterionId, grade}`; no se agrega identidad ni contexto y el parser valida la respuesta contra la petición.
- Los tipos y parsers dejaron de identificarse como provisionales. La ruta Axios `/api` más `/v1/teacher/...` coincide con `@RequestMapping` del controlador.

## Reglas preservadas

PA sigue readonly y sin cálculo; la planilla no recibe celdas PA manuales. Los criterios MANUAL son dinámicos, incluyendo criterios inactivos con notas previas solo para lectura. `null` representa pendiente y cero sigue siendo una nota persistida. Se mantienen las validaciones de 0–20, máximo dos decimales, solo primeras notas y bimestre ABIERTO.

`MANUAL_GRADES_CONTRACT_VERIFIED` permanece `false`: el servicio rechaza POST antes de HTTP. La coincidencia con código y documentación no prueba conexión, configuración de sesión, permisos ni comportamiento E2E. No se escribieron notas en Supabase.

## Diferencias y pendientes

El contrato definitivo sí está implementado en los DTO/controlador Java revisados, a diferencia del estado registrado en el PR frontend anterior. La integración de transporte debe validarse con backend N2 en entorno aislado y un usuario docente autorizado antes de habilitar POST. La documentación backend informa que PostgreSQL aislado aún no se validó; las pruebas H2 no prueban locks ni concurrencia en PostgreSQL. Tampoco se ejecutó validación visual automatizada.

Las pruebas frontend usan DTO fixtures e inyección de transporte solo en test; cubren nulidad y cero, estados, criterios dinámicos, conflictos y recarga, sin tocar servicios externos.
