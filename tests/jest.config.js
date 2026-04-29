module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/migrations/**",
    "!src/config/passport.js",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  setupFilesAfterEnv: ["./tests/setup.js", "./tests/mocks/externalApis.js"],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: false,
  maxWorkers: 1,
};
