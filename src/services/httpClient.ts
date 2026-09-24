import axios from 'axios';

/**
 * Cliente HTTP estandarizado (Axios).
 * Configurado con la URL base del entorno.
 */
const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de Solicitudes (Request).
 * Adjunta el Bearer Token a todas las peticiones salientes si existe sesión.
 */
httpClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
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
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Se omite la expulsión si el error proviene del propio intento de login (401 de credenciales erróneas),
        // asegurando que sólo se expulsa cuando falla un token válido previamente asignado.
        const hasAuthHeader = !!error.config?.headers?.Authorization;
        if (hasAuthHeader) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;