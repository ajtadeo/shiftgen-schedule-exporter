/**
 * @file jest.config.js
 * @brief Jest config
 */

module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  preset: "jest-puppeteer",
  testMatch: ["**/tests/src/*.test.js"]
};