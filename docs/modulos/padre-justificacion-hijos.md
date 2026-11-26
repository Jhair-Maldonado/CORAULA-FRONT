# Padre · Justificación (calendario) y resumen por hijo

## Objetivo
Recupera dos piezas del Portal del Apoderado con datos reales del backend (FRONT #160 y #161, épica #151):
- **Justificación**: tarjeta «estado de hoy» y calendario mensual de asistencia encima de las pestañas de solicitudes, con detalle por día y «Justificar ahora».
- **Estudiantes a cargo**: franja de rendimiento (promedio, aprobados, en riesgo) del último bimestre publicado en cada tarjeta de hijo.

## Rutas
- `/padre/justificacion` -> `vistaPrincipalJustificacion`. Sigue aceptando `?studentId=&attendanceId=…` (abre el formulario) y `?studentId=&justificationId=` (solicitud destacada).
- `/padre/hijos` -> `hijosMatriculados`.

## Componentes principales
- `calendarioAsistencia` (props: semanas, mes, estados y acciones; no importa services): cabecera con flechas, leyenda, cuadrícula `grid-cols-7` de lunes a domingo, celdas-botón y detalle del día.
- `estadoHoyCard`: «¡Todo en orden hoy!», «Hoy registra N tardanza(s)/inasistencia(s)» con «Justificar ahora», o «Aún no hay asistencia registrada hoy».
- `resumenRendimientoHijo`: promedio, aprobados, en riesgo y «Bimestre N»; esqueleto, «Sin libreta publicada» y error con «Reintentar».
- `tarjetaHijoVinculado`: nueva prop opcional `resumen` (franja propia entre la cabecera y Grado/Sección/Código). Grado, Sección, Código y accesos no cambian.
- El hijo se elige en el selector global del layout; no hay selector local.

## Estado/contexto
`usePadre()` entrega `hijoActivo`. El mes visible y el día abierto son estado local de la vista; el día abierto va ligado al hijo y se descarta al cambiarlo.

## Hooks, adapters y utilidades
- `useGuardianAttendanceMonth(studentId, year, month)`: un `AbortController` por efecto, valida el rango con `attendanceRangeError`, ignora respuestas canceladas o tardías y devuelve `{weeks, loading, error, reload}`. Un mes futuro no consulta.
- `useGuardianAttendanceToday(studentId)`: consulta propia con `from = to = hoy` (Lima), cancelable.
- `guardianAttendanceCalendarAdapter` (puro): `buildMonthCalendar`, `monthRange`, `todayStatus`, `canJustifyRecord`, `shiftMonth`, `monthLabel`.
- `src/lib/justificationDeadline.ts` (puro): `justificationDeadline` e `isWithinJustificationDeadline`.
- `useGuardianChildrenSummary(ids)`: un `AbortController` para todos los hijos; `Promise.allSettled`; devuelve `{byId, retry(id)}`.
- `guardianChildSummaryAdapter` (puro): `latestPublishedBimester` y `childGradeSummary`.

## Servicios
- `getGuardianAttendance(studentId, from, to, signal?)`: `GET /v1/guardian/students/{id}/attendance`. Con `signal`, cancelar relanza el error original sin envolverlo.
- `guardianReportService.published(id, signal)` y `.report(id, bimesterId, signal)`: sin cambios.
- Sin endpoints nuevos ni cambios en la matriz de permisos (solo APODERADO).

## Origen de cada dato (R3)

### Calendario y tarjeta de hoy
| Elemento de UI | Campo del backend | Endpoint |
|---|---|---|
| Color y estado del día | el peor `records[].status` de sus sesiones (falta, tardanza, presente) | `GET .../attendance?from&to` |
| Fin de semana, futuro, sin registro | Cálculo en el cliente (calendario y fecha de Lima) | — |
| Cantidad de sesiones del día | `records[]` con esa `date` | `GET .../attendance` |
| Detalle: curso y horario «08:00–09:30» | `courseName`, `startTime`, `endTime` | `GET .../attendance` |
| Detalle: estado de la sesión | `status` | `GET .../attendance` |
| Detalle: justificación (aprobada, pendiente, observada, rechazada) | `justified`, `justification.status` (D4: de `attendance`, no de `/justifications`) | `GET .../attendance` |
| «Justificar ahora» | `attendanceId`, `status`, `justified`, `justification` y el plazo calculado | `GET .../attendance` + regla del plazo |
| «Ver justificación» | `justification.id` | `GET .../attendance` |
| Tarjeta de hoy | `records[]` de `from = to = hoy` | `GET .../attendance?from=hoy&to=hoy` |
| Lista de solicitudes, filtros, paginación | sin cambios | `GET .../justifications` |

### Resumen por hijo
| Elemento de UI | Campo del backend | Endpoint |
|---|---|---|
| «Bimestre N» | `bimester.number` de la libreta | `GET .../bimesters/{id}/report` |
| Bimestre elegido | primer elemento de la lista (el más reciente) | `GET .../bimesters/published` |
| Promedio | media de `courses[].grade` no nulos, un decimal y coma | `GET .../report` |
| Aprobados / En riesgo | `courses[].grade` ≥ 11 / < 11 | `GET .../report` |
| «Sin libreta publicada» | lista vacía, o 409 `REPORT_NOT_PUBLISHED` | `published` / `report` |

## Regla del plazo
Fuente: `docs/guardian-attendance-justifications.md` (#57). El backend no expone el vencimiento.
- Vence al terminar el **segundo día hábil posterior a la sesión**, en America/Lima.
- Día hábil: lunes a viernes; los feriados cuentan como días hábiles (no se descuentan).
- Una sesión en sábado o domingo (no ocurre en el calendario escolar) vence igual el martes siguiente.
- Tras una solicitud RECHAZADA se puede volver a presentar, pero solo dentro del plazo original.
- Ejemplo: sesión del viernes, plazo hasta el martes; el miércoles queda fuera.
- «Se puede justificar» exige: INASISTENCIA o TARDANZA, `justified` falso, sin solicitud o con la última RECHAZADA, y hoy dentro del plazo. La última palabra la tiene el backend (409 `JUSTIFICATION_DEADLINE_EXPIRED`).
- El mock ya aplica la misma regla en `shared.ts` (`justificationDeadlineExpired`); no se tocó.

## Umbral de riesgo
Nota menor que 11 (`isFailingGrade`), sin redondear antes de comparar: 10,5 está en riesgo. El mismo umbral está en el backend: `EvaluationResultsService.java:311` y `EarlyWarningsService.java:73`.

## Errores
| Caso | Qué muestra la vista |
|---|---|
| Fallo al cargar el mes | Mensaje del servicio de asistencia con «Reintentar» (`role="alert"`). |
| Fallo al cargar hoy | Mensaje con «Reintentar» en la tarjeta; no afecta al calendario. |
| Rango no válido | El mensaje de `attendanceRangeError` (máximo 92 días; un mes siempre cabe). |
| Fallo de la libreta de un hijo | Mensaje y «Reintentar» solo en esa tarjeta. |
| 409 `REPORT_NOT_PUBLISHED` | «Sin libreta publicada». |

## Decisiones técnicas
- `DECISION(FRONT #160 D1)`: las celdas con sesiones son botones; el clic abre el detalle. Nada depende del hover (375 de ancho y teclado).
- `DECISION(FRONT #160 D2)`: el estado del día es el peor de sus sesiones.
- `DECISION(FRONT #160 D3)`: la tarjeta de hoy tiene consulta propia, independiente del mes visible.
- `DECISION(FRONT #160 D4)`: la justificación de cada día sale de `attendance`, no de `/justifications`.
- `DECISION(FRONT #160 D8)`: se puede retroceder sin tope y avanzar solo hasta el mes actual.
- `DECISION(FRONT #160 D9)`: las fechas de la lista de solicitudes se muestran con `formatDayLong` (es-PE).
- `DECISION(FRONT #160 D10)`: `todayStatus` se prueba con registros inyectados; el mock no cambia.
- `DECISION(FRONT #161 D5)`: promedio con un decimal y coma.
- `DECISION(FRONT #161 D6)`: se pide la libreta de `published[0]`.
- `DECISION(FRONT #161 D7)`: el resumen es una franja propia de la tarjeta, mediante la prop `resumen`.
- Contraste: los tokens se validaron contra blanco. `text-muted` (4,83) en días futuros y `bg-neutral/50` + `text-muted` en fines de semana (≈4,6). `text-accent` sobre `accent-soft` ≈5,3; blanco sobre `accent` 6,29.
- Los tokens de color del calendario no dependen solo del color: cada estado lleva icono y el número de sesiones, y la celda tiene `aria-label` en es-PE.

## No se restaura (R9 y R3a)
- Mayo de 2026 fijo, la hora «07:45», `MOCK_CALENDARIO` y `MOCK_HISTORIAL`.
- «Retraso de N minutos» (el backend no manda hora de llegada).
- El selector de hijo local (se usa el global del layout).
- `cardJustificacion.tsx` (lo sustituye `renderCard`) y `formularioInasistencia.tsx`.
- `12 - cursosBajos`, `promedio || 14.5`, `hijo.tutor` y `nivel`.

## Mocks temporales
Sin cambios de fixtures. El usuario es `padre@demo.local`, con los hijos 57 Ana (libreta del Bimestre 3 con notas 9, 10,5 y 14), 58 Luis y 61 Sofía (sin libreta). El mock no tiene asistencia del día de hoy: la tarjeta muestra «Aún no hay asistencia registrada hoy».

## Pendientes
- [ ] El botón «Justificar» de Asistencia no comprueba el plazo y usa la hora local del navegador en lugar de la de Lima (fuera de alcance de #160).
- [ ] El formulario `modalFormularioJustificacion` y el enlace desde Asistencia siguen mostrando la fecha ISO y el estado crudo cuando se llega por URL; desde el calendario ya se pasan formateados.
- [ ] Colores de `modalFormularioJustificacion` (paletas de Tailwind) pendientes de pasar a tokens.
- [ ] Los feriados no se descuentan: cuentan como días hábiles, igual que en el backend.
