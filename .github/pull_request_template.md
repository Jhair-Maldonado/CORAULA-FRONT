## Issue
Closes #<!-- n.º --> <!-- o «Refs #n» si es un avance parcial -->

## Qué cambia y por qué
<!-- Resumen breve del cambio y su motivo. -->

## Zona tocada
- [ ] Docente (`feature/docente/`)
- [ ] Apoderado (`feature/padre/`)
- [ ] Alumno (`feature/alumno/`)
- [ ] Admin y compartido (`feature/admin/`, auth, `httpClient`, `src/lib/`, `src/types/`, `src/adapters/`, configuración, matriz de permisos). Avisado en el issue: <!-- sí / no aplica -->

## Capturas o GIF
<!-- Obligatorio si cambia la UI. Solo datos ficticios. -->

## Verificación
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Probado con: <!-- mocks (`npm run dev:mock`) / backend real local -->

## Contrato UI (#151)
<!-- Si el PR no toca vistas ni services, escribe «no aplica». -->
- [ ] R3: tabla elemento de UI → campo del backend → endpoint en el issue o aquí, o «no aplica»
- [ ] R5: fixtures nuevos en `src/mocks/http/fixtures/`; la vista se ve completa en `npm run dev:mock`, sin «no tiene datos simulados»
- [ ] R12: capturas antes (commit de referencia) y después (`dev:mock`) a 1440×900, y clases del diseño que no se conservaron con su motivo

## Seguridad
- [ ] Sin `.env`, secretos ni credenciales en el diff
- [ ] Sin datos reales de alumnos, apoderados ni docentes
- [ ] Rama creada desde `dev` actualizado y PR dirigido a `dev`
