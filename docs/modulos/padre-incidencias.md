# Padre · Incidencias y asistencia

## Objetivo
Restaura las vistas de incidencias y de asistencia del Portal del Apoderado con datos reales del backend (FRONT #163, épica #151). Solo lectura, siempre del hijo activo del selector global.
- **Incidencias**: KPI (total y por gravedad), filtros de rango y de gravedad, tarjetas con «Ver detalle» y modal.
- **Asistencia**: resumen de cuatro tarjetas y una tarjeta por día, conservando «Justificar» y «Ver justificación».

## Rutas
- `/padre/incidencias` -> `vistaIncidencias`, bajo `Suspense` porque los filtros viven en la URL: `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&gravedad=LEVE|MODERADA|GRAVE`. Sin parámetros se usan los últimos 30 días y todas las gravedades.
- `/padre/asistencia` -> `vistaPrincipalAsistencia`.

## Componentes principales
- `feature/padre/vistas/incidencias/component/`: `incidenciasKpiBanner`, `incidenciasFiltros` (botones de gravedad, «Actualizar», «Limpiar filtros»), `incidenciaCard` (encabezado = curso, borde izquierdo por gravedad) y `modalDetalleIncidencia` (cierra con «Cerrar», la «X», el fondo o Escape).
- `feature/padre/vistas/asistencia/component/`: `resumenAsistencia` y `diaAsistenciaCard`.

## Estado/contexto
`usePadre()` entrega `hijoActivo`. No existe el modo «Todos mis hijos». La gravedad y el rango están en la URL; el detalle abierto es estado local.

## Hooks, adapters y servicios
- `useGuardianIncidents(studentId)`: una petición por (hijo, rango, recarga) con `size = 100` y `AbortController`; escribe los filtros con `router.replace`.
- `guardianIncidentsAdapter` (puro): modelo de vista, etiquetas y clases por token, KPI y filtro TODAS/LEVE/MODERADA/GRAVE. Total = `totalElements`.
- `guardianIncidentsService.list` y `getGuardianAttendance`: sin cambios.

## Integración backend
- `GET /v1/guardian/students/{studentId}/incidents?from&to&page&size` (BACK #117). El contrato entrega `id`, `occurredAt`, `severity`, `description` y `courseName`; no hay docente, lugar ni acciones tomadas, por eso no se muestran.
- `GET /v1/guardian/students/{studentId}/attendance?from&to` (BACK #55 y #57).
- 401, 403 y 404 se muestran con mensajes propios, nunca con el texto del servidor.

## Mocks temporales
En MOCK, el hijo 58 (Luis Arias Demo) tiene una incidencia GRAVE y otra MODERADA registradas por el docente 202. El hijo 57 conserva sus incidencias originales.

## Decisiones técnicas
- DECISION(#163): KPI y filtro de gravedad se calculan en cliente sobre la primera página de 100; no se pagina. Si `totalPages > 1` se avisa «Conteo de las primeras 100 incidencias». Evita ampliar el contrato con un filtro de gravedad en el backend.
- DECISION(#163): el filtro de gravedad no vuelve a consultar; solo cambiar de hijo, de rango o recargar lo hace.
- DECISION(#163): se omiten el banner de estadísticas de justificaciones y el modo «Todos mis hijos» del diseño de referencia.
- Colores solo con tokens de `globals.css` (`success`, `warning-ink`, `accent`, `neutral`, `line`).

## Pendientes
- [ ] Filtro de gravedad y conteos por gravedad en el backend, para no limitar los KPI a las primeras 100.
- [ ] Mostrar docente, lugar y acciones tomadas si el contrato de incidencias del apoderado los incorpora.
