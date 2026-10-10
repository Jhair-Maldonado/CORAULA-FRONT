# N1.5-F: apertura administrativa de bimestres

La pantalla existente `/administrador/bimestres` habilita apertura para ADMINISTRADOR y DIRECTIVO bajo el AuthGuard y Axios compartidos. Solo muestra Abrir para PLANIFICADO; ABIERTO, EN_REVISION y CERRADO no permiten apertura. Conserva CRUD y diseño administrativo. No incorpora cierre, reapertura ni deshacer.

## Contrato

`evaluationService.openBimester(id): Promise<Bimester>` valida entero positivo y usa POST `/api/v1/management/bimesters/{id}/open`, sin body. Exige HTTP 200, DTO BimesterResponse válido, ID coincidente y ABIERTO. La pantalla también verifica el periodo de la respuesta. Las listas se validan con el parser existente y se rechazan registros de otro periodo.

## Confirmación y consistencia

Se reutiliza ScheduleDialog (foco, teclado, Escape y etiquetas accesibles), sin modificar el componente. La confirmación muestra nombre y periodo, habilitación de notas y ausencia de deshacer. Cancelar invalida la confirmación síncronamente sin POST. Durante edición, apertura o recuperación pendiente se bloquean acciones incompatibles. Los errores y mensajes usan regiones alert/status.

Un lock síncrono impide doble POST. Después de cualquier intento de apertura, incluso 409 o pérdida de conexión, se vuelve a consultar GET `/api/v1/management/academic-periods/{periodId}/bimesters`. Solo se muestra éxito si POST fue coherente y la consulta devuelve el mismo bimestre ABIERTO. No hay actualización optimista ni retry automático.

409 explica que otro administrador o un cambio de periodo/estado pudo provocar el conflicto; la lista refrescada muestra el estado real sin atribuir la apertura a esta operación. 400/401/403/404 se muestran con mensajes fijos y sin detalles sensibles. 401 conserva el interceptor global de sesión. Una respuesta ambigua exige consultar el estado antes de otro intento; si falla GET, las mutaciones quedan bloqueadas hasta Actualizar correctamente.

Cambiar periodo o actualizar invalida confirmaciones anteriores. Una generación de contexto y controles de montaje descartan lecturas, respuestas y mensajes tardíos. Si POST fue aceptado pero GET falla o no confirma ABIERTO, se explica la falta de confirmación visual y se ofrece Actualizar.

## Verificación

- `npm ci`: PASS usando lockfile existente, sin nuevas dependencias.
- `npm test`: 37/37 PASS (25 regresiones anteriores + 12 nuevas de servicio/componentes).
- `npm run lint`: PASS, cero errores y 17 advertencias preexistentes fuera del módulo.
- `npm run build`: PASS, TypeScript y páginas.
- `git diff --check`: PASS.

Tests usan adapters Axios, fixtures completas y el componente real montado con react-test-renderer. Cubren estado permitido/prohibidos, confirmación/cancelación, POST sin body/200/ID/estado, GET posterior, doble clic, bloqueos de edición, 400/401/403/404/409, ambigüedad, fallo de recarga, periodo inconsistente y respuestas tardías. Son pruebas unitarias/componentes, no evidencia de persistencia en una base real ni de concurrencia PostgreSQL; se utiliza la validación backend ya informada por el proyecto.

`BROWSER_E2E: NOT_RUN`: no hay navegador automatizado ni entorno PostgreSQL aislado con sesión administrativa disponible en esta tarea. Pendiente recorrido real abrir → recargar página y revisión visual/responsive/foco con ambos roles. No hubo escrituras en Supabase compartido, cambios backend o intervención en N3. No hay cierre/reapertura.

Decisión: READY_FOR_REVIEW técnica, con validación visual/E2E pendiente documentada.
