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
- [ ] Probado con: <!-- mocks (NEXT_PUBLIC_USE_MOCKS ≠ false) / backend real local -->

## Seguridad
- [ ] Sin `.env`, secretos ni credenciales en el diff
- [ ] Sin datos reales de alumnos, apoderados ni docentes
- [ ] Rama creada desde `dev` actualizado y PR dirigido a `dev`
