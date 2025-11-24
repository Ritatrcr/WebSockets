// backend/jest.config.mjs
export default {
  testEnvironment: 'node',
  // Busca tests en la carpeta test con sufijo .test.js
  testMatch: ['**/test/**/*.test.js'],
  // No usamos Babel ni transformers
  transform: {},
};
