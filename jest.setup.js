/**
 * @file jest.setup.js
 * @brief Sets up global Jest variables
 */

import { jest } from '@jest/globals';
import { chrome } from 'jest-chrome';
Object.assign(global, { chrome });

// Mock chrome
chrome.action = {
  setBadgeText: jest.fn(),
  setBadgeBackgroundColor: jest.fn()
};
chrome.tabs.remove = jest.fn();

// Suppress console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});