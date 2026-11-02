import axios, { type AxiosAdapter } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/config/appConfig';

export const PASSWORD_CHANGE_REQUIRED_EVENT = 'auth:password-change-required';

export const LOGIN_URL = '/v1/auth/login';

/**
 * Cliente HTTP estandarizado (Axios).
 * URL base y timeout según el modo de ejecución (src/config/appConfig.ts).
 */
const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Marca del adaptador simulado: permite comprobar que fuera de MOCK no se instala. */
export const MOCK_ADAPTER_MARK = '__coraulaMockAdapter';

// Solo en MOCK. La condición usa acceso literal a NEXT_PUBLIC_*: Next la resuelve en el build y, fuera de MOCK,
// descarta la importación, así que los usuarios y datos de demostración no llegan al bundle.
if (
  process.env.NEXT_PUBLIC_APP_MODE === 'MOCK'
  || (!process.env.NEXT_PUBLIC_APP_MODE && process.env.NEXT_PUBLIC_USE_MOCKS === 'true')
) {
  const adapter: AxiosAdapter = async (config) => (await import('@/mocks/http/mockAdapter')).mockAdapter(config);
  httpClient.defaults.adapter = Object.assign(adapter, { [MOCK_ADAPTER_MARK]: true });
}

/**
 * Interceptor de Solicitudes (Request).
 * Adjunta el Bearer Token a todas las peticiones salientes si existe sesión.
 * El login se envía sin Bearer: el backend valida cualquier token recibido, incluso uno vencido o revocado.
 */
httpClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && config.url !== LOGIN_URL) {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

/**
 * Interceptor de Respuestas (Response).
 * Atrapa los errores HTTP de forma global antes de que lleguen a los servicios.
 */
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      const status = error.response?.status;
      if (status === 401) {
        // Se omite la expulsión si el error proviene del propio intento de login (401 de credenciales erróneas),
        // asegurando que sólo se expulsa cuando falla un token válido previamente asignado.
        const hasAuthHeader = !!error.config?.headers?.Authorization;
        if (hasAuthHeader) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      } else if (status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
        // La sesión sigue vigente: solo se exige el cambio de contraseña antes de continuar.
        window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_REQUIRED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;
