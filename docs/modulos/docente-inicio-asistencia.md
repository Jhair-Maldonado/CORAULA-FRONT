# Docente · Inicio, asistencia y detalle del curso

## Objetivo
Recupera tres vistas del Portal Docente con datos reales del backend (FRONT #157, #158 y #159, épica #151):
- **Inicio**: tarjetas de curso con barra de color y la columna «Mi horario de hoy» con la clase en curso y la línea de tiempo del día.
- **Asistencia**: resumen de la sesión, botones masivos «Todos X», filas por alumno, y motivo y causa de contingencia.
- **Detalle del curso**: estados con color y sin datos técnicos en pantalla (modal de asistencia, actividades y materiales).

## Rutas
- `/docente` -> `vistaCursosDocente` (inicio).
- `/docente/asistencia` -> `vistaAsistenciaDocente`. Acepta `?curso=<sectionCourseId>&fecha=YYYY-MM-DD` (enlace «Tomar lista» del inicio). La página lee los parámetros en un hijo cliente dentro de `Suspense` y los pasa como `initialCourseId` e `initialDate`.
- `/docente/cursos/[id]` -> `vistaDetalleCursoDocente` (con `ModalAsistenciaCurso`, `ActividadesDocente` y `MaterialesDocente`).

## Componentes principales
- `vistaCursosDocente`: tarjetas de curso (`w-1.5 h-14 rounded-full` con `courseBarClass`) y columna «Mi horario de hoy».
- `vistaAsistenciaDocente` y `FilaAlumnoAsistencia`: panel de asistencia y fila de alumno (avatar con iniciales, código, chip de estado y selector).
- `SelectorEstadoAsistencia`, `JustificacionAsistencia` y `ElementoMaterial`: **compartidos con gestión** (Director). Solo cambió su presentación a tokens; las letras P/T/F, los `aria-label` y los ids de los campos no cambiaron.
- `Modal` (`@/components/ui/Modal`): confirma el marcado masivo. Es compartido y no se tocó.

## Estado/contexto
`DocenteSessionContext` entrega `cursos`, `cursoActivo` y `setCursoActivo`. El resto es estado local: el borrador de asistencia vive en `AttendancePanel` y el horario del día en `useTeacherDaySchedule`.

## Hooks, adapters y utilidades
- `useTeacherDaySchedule(cursos, { clock?, tickMs? })`: una llamada por curso con `Promise.allSettled` y la fecha de Lima. `clock` y `tickMs` se inyectan para las pruebas.
- `teacherDayScheduleAdapter` (puro): `buildDaySchedule` ordena por inicio, curso y sesión; calcula la clase en curso («Termina en N min»), los próximos bloques, los cursos fallidos y el estado vacío. `toCourseOutcome` clasifica cada resultado (`ok`, `outOfPeriod` o `error`).
- `src/lib/limaClock.ts`: `limaToday`, `limaMinutes`, `isRealDay` (fecha real por ida y vuelta UTC), `formatLimaDay` y `formatDayLong`.
- `src/lib/courseColor.ts`: `COURSE_BAR_PALETTE` y `courseBarClass(sectionCourseId)` (`% 4`).
- `src/lib/attendanceStatusUi.ts`: opciones, etiquetas y clases de token por estado.
- `src/lib/attendanceDraft.ts`: `effectiveStatus`, `isAttendanceDirty` y `planBulkStatus`.
- `src/lib/attendanceJustification.ts` (existente): causas, tope de 255 caracteres e `isFirstCapture`.

## Servicios
- `teacherCoursesService.getCourses()`: `GET /v1/teacher/courses`.
- `teacherAttendanceService.getAttendance(sc, date)`: `GET /v1/teacher/courses/{sc}/attendance?date=`.
- `teacherAttendanceService.saveAttendance(sc, scheduleId, date, request)`: `PUT /v1/teacher/courses/{sc}/attendance/{scheduleId}?date=`.
- `teacherAttendanceLoadErrorMessage` y `teacherAttendanceSaveErrorMessage`: mensajes propios para el GET y el PUT.
- `teacherActivitiesService` y `teacherMaterialsService`: sin cambios de contrato.
- Solo DOCENTE en la matriz de permisos; sin endpoints nuevos.

## Origen de cada dato (R3)
| Elemento de UI | Campo del backend | Endpoint |
|---|---|---|
| Tarjeta de curso: nombre, código, grado, sección, nivel, alumnos, «N h semanales» | `name`, `code`, `grade`, `sectionName`, `level`, `studentCount`, `weeklyHours` | `GET /v1/teacher/courses` |
| Línea de tiempo de hoy: inicio, fin, aula | `sessions[].startTime`, `endTime`, `classroom` (null se omite) | `GET .../attendance?date=<hoy en Lima>` |
| «Clase en curso / Termina en N min» | Cálculo en el cliente con la hora de Lima | — |
| Pendientes de asistencia del horario | `sessions[].pendingCount` | `GET .../attendance` |
| Resumen: presentes, tardanzas, inasistencias, pendientes | `presentCount`, `lateCount`, `absenceCount`, `pendingCount` (por sesión) | `GET .../attendance` |
| Fila: código, nombre, estado | `studentCode` («No registrado» si es null), `fullName`, `status` | `GET .../attendance` |
| Fila bloqueada | `students[].justificationStatus === 'APROBADA'` | `GET .../attendance` |
| Guardar | `records[]`, `reason`, `contingencyCause` | `PUT .../attendance/{scheduleId}?date=` |
| Botones masivos | Solo estado local | — |
| Actividades y materiales | `teacherActivitiesService`, `teacherMaterialsService` | Ya integrados |

No se restauran, por no existir en el backend (R3 a): recreos y almuerzo, el botón «J Justificada», barras de porcentaje, promedio mensual, selector de mes e incidencias por alumno.

## Reglas del marcado masivo
- «Todos X» asigna X de inmediato a quien no tiene estado efectivo (ni borrador ni guardado).
- Si hay alumnos con un estado distinto de X, se abre un `Modal`: «N estudiantes ya tienen estado. ¿Cambiarlos también a X?». **Mantener** no pisa a nadie; **Cambiar** sí.
- Los alumnos con `justificationStatus === 'APROBADA'` nunca se modifican (el backend responde 409), tampoco a mano: su selector queda deshabilitado con la insignia «Justificación aprobada».
- El aviso «N estudiantes con justificación aprobada no se modificaron» cuenta solo a los bloqueados cuyo estado efectivo difiere del estado masivo.

## Reglas de motivo y causa (RF-16 / RF-42)
- **Primera toma** (algún alumno sin registro guardado): `contingencyCause` y `reason` obligatorios.
- **Corrección** (hay cambios sobre lo guardado): solo `reason`; no se envía `contingencyCause`.
- `reason` admite hasta 255 caracteres y se envía recortado.
- «Guardar» está desactivado si no hay cambios reales (algún estado efectivo distinto del guardado), si quedan pendientes o si el motivo exigido no es válido.
- El aviso de éxito aparece solo tras la respuesta 2xx del PUT; después se limpia el motivo. Con error se conserva.
- La fecha inicial (`fecha`) solo vale si existe en el calendario; `2026-02-31` vuelve a hoy en Lima. El curso inicial solo vale si es del docente.

## Errores
| Caso | Qué muestra la vista |
|---|---|
| GET 400 (fuera del periodo académico) | «La fecha elegida está fuera del periodo académico o no es válida. Elige otra fecha.» con «Reintentar» (nunca el texto del servidor). En el inicio equivale a un día sin clases. |
| GET 403 | «No tienes permiso para registrar asistencia.» |
| PUT 400 `ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED` | Causa de contingencia obligatoria. |
| PUT 400 `ATTENDANCE_REASON_REQUIRED` | Motivo obligatorio. |
| PUT 400 (otro) | «No se pudo guardar. Revisa la fecha, el motivo y que todos los estudiantes tengan un estado.» |
| PUT 409 `ATTENDANCE_JUSTIFICATION_APPROVED` | «Esta asistencia tiene una justificación aprobada y ya no se puede cambiar; solo Dirección puede corregirla.» |
| PUT 409 (otro) | «Conflicto al guardar la asistencia. Puede que los datos hayan cambiado. Vuelve a consultar.» |

En el PUT, el cuerpo debe traer la lista completa de matrículas activas, sin duplicados; si no, el backend responde 400.

## Fuera de periodo y medianoche
- **Fuera de periodo:** si todos los cursos responden 400 al pedir hoy, el inicio muestra «Sin clases programadas hoy». Un curso que falla por otro motivo (500, 403, red) queda como «No se pudo cargar» y el resto se muestra igual, con «Reintentar».
- **Medianoche:** cada tick (60 s por defecto) recalcula «Termina en N min». Si la fecha de Lima cambió respecto de la consultada, el hook vuelve a pedir las sesiones del día nuevo. El intervalo se limpia al desmontar.

## Mocks temporales
- `GET .../attendance` calcula sesiones dinámicas en días hábiles del periodo (`shared.ts`). Cada alumno trae `justificationStatus` derivado de las justificaciones sembradas; Ana (matrícula 501) tiene una APROBADA en un día pasado.
- El `PUT` del mock replica las reglas del backend: lista completa y sin duplicados, causa y motivo en la primera toma, motivo en las correcciones, tope de 255 sobre el texto sin recortar, causa inválida rechazada siempre, y 409 `ATTENDANCE_JUSTIFICATION_APPROVED`.

## Decisiones técnicas
- `DECISION(FRONT #157)`: un 400 al consultar el día es «fuera de periodo» y no un error.
- `DECISION(FRONT #158)`: «Todos X» no pisa estados sin confirmación y nunca toca justificaciones aprobadas.
- Los pendientes del horario no se muestran en bloques futuros (todos estarían pendientes).
- La paleta de colores de curso y de estados usa solo tokens de `globals.css` (R7). Contrastes: blanco sobre `accent` 6,29, sobre `success-ink` 5,02 y sobre `warning-ink` 4,92.

## Pendientes
- [ ] R2 en la vista de asistencia: `vistaAsistenciaDocente` todavía llama a `teacherAttendanceService` e importa tipos `*Api.ts`. Falta extraer un hook. Aún no hay issue.
- [ ] Foco del `Modal` compartido (`@/components/ui/Modal`): no atrapa el foco ni lo devuelve al botón que lo abrió. Es compartido con otros módulos y no se modificó.
