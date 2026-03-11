/**
 * @file jest.config.js
 * @brief Jest config
 */

export default {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["./jest.setup.js"],
  testMatch: ["**/test/**/*.test.js"],
  transform: {},
};