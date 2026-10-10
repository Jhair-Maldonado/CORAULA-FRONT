const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Proveer la ruta a la aplicación Next.js
  dir: './',
});

// Configuración personalizada de Jest
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Manejar alias como @/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
