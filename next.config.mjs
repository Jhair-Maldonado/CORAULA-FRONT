import { assertAppModeEnv } from './src/config/buildGuard.mjs';

// Falla antes de compilar si el modo de ejecución no es válido (p. ej., producción en Vercel sin modo PRODUCTION).
assertAppModeEnv(process.env);

const nextConfig = {
  reactStrictMode: true,

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
