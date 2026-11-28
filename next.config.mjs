import { assertAppModeEnv } from './src/config/buildGuard.mjs';

// Falla antes de compilar si el modo de ejecución no es válido (p. ej., producción en Vercel sin modo PRODUCTION).
assertAppModeEnv(process.env);

const nextConfig = {
  reactStrictMode: true,

  // Las pantallas de acceso por rol se retiraron: el inicio de sesión es /login y enruta por rol (FRONT #32, #170).
  // No son permanentes (307) para que los navegadores no cacheen el destino.
  async redirects() {
    return [
      { source: '/alumno/login', destination: '/login', permanent: false },
      { source: '/docente/login', destination: '/login', permanent: false },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
