/**
 * @file jest.setup.js
 * @brief Sets up global Jest variables
 */

import { chrome } from 'jest-chrome';
Object.assign(global, { chrome });