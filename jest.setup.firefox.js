/**
 * @file jest.setup.js
 * @brief Sets up global Jest variables
 */

import { jest } from '@jest/globals';

// Manually mock the browser namespace to match Firefox's API shape
global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onConnect: { addListener: jest.fn() },
    lastError: undefined
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    sendMessage: jest.fn(),
    remove: jest.fn(),
    onUpdated: { addListener: jest.fn() }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  identity: {
    getRedirectURL: jest.fn(),
    launchWebAuthFlow: jest.fn()
  }
};

// Suppress console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});