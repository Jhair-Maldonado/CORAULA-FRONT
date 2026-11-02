// Login del modo MOCK. Estos usuarios solo existen dentro del adaptador simulado, que no se incluye fuera de MOCK.
import type { BackendRole } from '@/types';
import { asObject, fail, ok, type MockRoute, type MockSession } from './mockHttp';

export const MOCK_USERS: Readonly<Record<string, BackendRole>> = {
  'admin@demo.local': 'ADMINISTRADOR',
  'secretaria@demo.local': 'DIRECTIVO',
  'docente@demo.local': 'DOCENTE',
  'padre@demo.local': 'APODERADO',
};
export const MOCK_LOCKED_USER = 'bloqueado@demo.local';
export const MOCK_MIN_PASSWORD = 8;
const SESSION_SECONDS = 8 * 60 * 60;

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

/** JWT sin firma válida (alg "none"), decodificable por jwtDecode: rol y expiración a 8 h. */
export function createMockToken(email: string, role: BackendRole, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ sub: email, role, mock: true, iat, exp: iat + SESSION_SECONDS }));
  return `${header}.${payload}.sin-firma`;
}

/** Sesión del encabezado Authorization; null si falta, no es un token simulado o expiró. */
export function sessionFromAuthorization(header: unknown, now = Date.now()): MockSession | null {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  try {
    const payload = asObject(JSON.parse(fromBase64Url(header.slice(7).split('.')[1] ?? '')));
    const email = typeof payload.sub === 'string' ? payload.sub : '';
    const role = MOCK_USERS[email];
    if (!role || payload.role !== role || typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return null;
    return { email, role };
  } catch {
    return null;
  }
}

const loginResponse = (email: string, role: BackendRole) => ({ token: createMockToken(email, role), tokenType: 'Bearer', role, passwordChangeRequired: false });

export const authRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/v1/auth/login',
    handler: ({ body }) => {
      const { email, password } = asObject(body);
      const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (correo === MOCK_LOCKED_USER) return fail(423, 'Cuenta temporalmente bloqueada.', 'ACCOUNT_LOCKED');
      const role = MOCK_USERS[correo];
      if (!role || typeof password !== 'string' || password.length < MOCK_MIN_PASSWORD) return fail(401, 'Credenciales inválidas.');
      return ok(loginResponse(correo, role));
    },
  },
  {
    method: 'POST',
    pattern: '/v1/auth/change-password',
    roles: ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'APODERADO'],
    handler: ({ body, session }) => {
      const { newPassword } = asObject(body);
      if (typeof newPassword !== 'string' || newPassword.length < MOCK_MIN_PASSWORD) {
        return fail(400, 'La nueva contraseña no cumple la política.', 'VALIDATION_ERROR');
      }
      return ok(loginResponse(session!.email, session!.role));
    },
  },
];
