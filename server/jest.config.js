// Konfigurasi Jest untuk native ES Modules.
// Test dijalankan via:
//   node --experimental-vm-modules node_modules/jest/bin/jest.js
// (sudah di-set di package.json script 'test').
export default {
  testEnvironment: 'node',
  // Native ESM — nonaktifkan babel/swc transform.
  transform: {},
  // Lokasi test
  testMatch: ['**/__tests__/**/*.test.js'],
  // Coverage opsional, jalankan dengan: npm test -- --coverage
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/middleware/**/*.js',
    'src/controllers/**/*.js',
  ],
  verbose: true,
};
