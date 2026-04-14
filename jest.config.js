// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/services/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/uploads/',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
};
