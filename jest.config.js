/**
 * @file jest.config.js
 * @brief Jest config
 */

export default {
  projects: [
    {
      displayName: 'chrome',
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['./jest.setup.chrome.js'],
      testMatch: ['**/test/**/*.test.js'],
      transform: {}
    },
    {
      displayName: 'firefox',
      testEnvironment: 'jest-environment-jsdom',
      setupFilesAfterEnv: ['./jest.setup.firefox.js'],
      testMatch: ['**/test/**/*.test.js'],
      transform: {}
    }
  ]
};