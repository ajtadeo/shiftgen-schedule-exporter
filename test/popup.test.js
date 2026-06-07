/**
 * @file popup.test.js
 * @brief Tests for extension popup behaviors
 */

import { jest } from '@jest/globals';
import { MESSAGE_TYPE } from '../src/shiftgen/common.js';
import { makeShift, defaultStorage } from "./testHelpers.js";
import fs from 'fs';
import path from 'path';

// ─── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  const html = fs.readFileSync(path.resolve('src/popup/popup.html'), "utf8");
  document.documentElement.innerHTML = html;

  chrome.storage.local.get.mockReset();
  chrome.storage.local.set.mockReset();
  chrome.action.setBadgeText.mockReset();
  chrome.action.setBadgeBackgroundColor.mockReset();
  chrome.runtime.sendMessage.mockReset();
  chrome.tabs.query.mockReset();
  chrome.storage.onChanged.addListener.mockReset?.();

  chrome.storage.local.get.mockImplementation((keys, callback) => {
    const result = defaultStorage();
    if (callback) { callback(result); return undefined; }
    return Promise.resolve(result);
  });
  chrome.storage.local.set.mockResolvedValue(undefined);
  chrome.runtime.sendMessage.mockResolvedValue(undefined);
  chrome.tabs.query.mockImplementation((query, callback) => callback([]));
});

afterEach(() => {
  document.documentElement.innerHTML = '';
  jest.restoreAllMocks();
});

// Dynamically import popup.js after DOM is set up so module-level code runs
async function loadPopup() {
  jest.resetModules();
  await import('../src/popup/popup.js');
  // Trigger onload
  window.dispatchEvent(new Event('load'));
  // Flush microtasks
  await new Promise(r => setTimeout(r, 0));
}

// ─── displayMessages ────────────────────────────────────────────────────────

describe('displayMessages on load', () => {
  test('renders stored error messages and clears storage', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({
        messages: [{ type: MESSAGE_TYPE.ERROR, message: 'Something broke' }]
      });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();

    expect(document.querySelector('.error-message-text').textContent)
      .toBe('Something broke');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ messages: [] });
  });

  test('renders stored info messages and clears storage', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({
        messages: [{ type: MESSAGE_TYPE.INFO, message: 'All done!' }]
      });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();

    expect(document.querySelector('.info-message-text').textContent)
      .toBe('All done!');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ messages: [] });
  });

  test('does nothing when messages array is empty', async () => {
    await loadPopup();
    expect(document.querySelectorAll('.error-message').length).toBe(0);
    expect(document.querySelectorAll('.info-message').length).toBe(0);
  });

  test('renders multiple messages', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({
        messages: [
          { type: MESSAGE_TYPE.ERROR, message: 'Error one' },
          { type: MESSAGE_TYPE.INFO,  message: 'Info two' },
        ]
      });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();

    expect(document.querySelectorAll('.error-message').length).toBe(1);
    expect(document.querySelectorAll('.info-message').length).toBe(1);
  });
});

// ─── clearBadge on load ─────────────────────────────────────────────────────

describe('clearBadge on load', () => {
  test('clears the badge when popup opens', async () => {
    await loadPopup();
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});

// ─── shifts table population ─────────────────────────────────────────────────

describe('shifts table', () => {
  test('populates rows for each shift in storage', async () => {
    const shift = makeShift();
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { 'shift-1': shift } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();

    const rows = document.querySelectorAll('#shift-tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('.shift-location').textContent).toBe('CHOC Main');
    expect(rows[0].querySelector('.shift-provider-name').textContent).toBe('Dr. Smith');
  });

  test('shows "Doctor" for DOCTOR providerType', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift({ providerType: 1 }) } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('.shift-provider-type').textContent).toBe('Doctor');
  });

  test('shows "PA" for PA providerType', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift({ providerType: 2 }) } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('.shift-provider-type').textContent).toBe('PA');
  });

  test('shows "Unknown" for USER providerType', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift({ providerType: 0 }) } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('.shift-provider-type').textContent).toBe('Unknown');
  });

  test('shows "Invalid Type" for unknown providerType', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift({ providerType: 99 }) } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('.shift-provider-type').textContent).toBe('Invalid Type');
  });

  test('hides no-shifts message when shifts exist', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift() } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('#no-shifts-message').style.display).toBe('none');
  });

  test('shows no-shifts message when shifts is empty', async () => {
    await loadPopup();
    const msg = document.querySelector('#no-shifts-message');
    expect(msg.style.display).not.toBe('none');
  });
});

// ─── clear shifts button ─────────────────────────────────────────────────────

describe('clear shifts button', () => {
  test('clears shifts in storage', async () => {
    await loadPopup();
    document.querySelector('#clear-shifts').click();
    await new Promise(r => setTimeout(r, 0));
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ shifts: {} });
  });

  test('shows no-shifts message after clearing', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift() } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    document.querySelector('#clear-shifts').click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('#no-shifts-message').style.display).toBe('block');
  });

  test('removes shift rows from table', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ shifts: { s1: makeShift() } });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelectorAll('#shift-tbody tr').length).toBe(1);

    document.querySelector('#clear-shifts').click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelectorAll('#shift-tbody tr').length).toBe(0);
  });
});

// ─── calendar ID form ────────────────────────────────────────────────────────

describe('calendar ID form', () => {
  test('pre-fills input when calendar_id is already set', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ calendar_id: 'my-cal-123' });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('#calendar-id-input').value).toBe('my-cal-123');
  });

  test('saves calendar_id to storage on submit', async () => {
    await loadPopup();
    document.querySelector('#calendar-id-input').value = 'new-cal-456';
    document.querySelector('#calendar-id-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ calendar_id: 'new-cal-456' }),
      expect.any(Function)
    );
  });

  test('disables save button after successful save', async () => {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await loadPopup();
    document.querySelector('#calendar-id-input').value = 'cal-id';
    document.querySelector('#calendar-id-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('#calendar-id-button').disabled).toBe(true);
  });

  test('shows saved message after successful save', async () => {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await loadPopup();
    document.querySelector('#calendar-id-input').value = 'cal-id';
    document.querySelector('#calendar-id-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('#calendar-id-message').style.visibility).toBe('visible');
  });

  test('enables export button after saving calendar ID', async () => {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await loadPopup();
    document.querySelector('#calendar-id-input').value = 'cal-id';
    document.querySelector('#calendar-id-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('#google-calendar-export-button').disabled).toBe(false);
  });
});

// ─── target month form ───────────────────────────────────────────────────────

describe('target month form', () => {
  test('pre-selects month when target_month is already set', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ target_month: 'March' });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('#target-month-select').value).toBe('March');
  });

  test('saves target_month on submit', async () => {
    await loadPopup();
    document.querySelector('#target-month-select').value = 'June';
    document.querySelector('#target-month-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ target_month: 'June' }),
      expect.any(Function)
    );
  });

  test('disables save button and shows saved message after save', async () => {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await loadPopup();
    document.querySelector('#target-month-select').value = 'June';
    document.querySelector('#target-month-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('#target-month-button').disabled).toBe(true);
    expect(document.querySelector('#target-month-message').style.visibility).toBe('visible');
  });
});

// ─── target year form ────────────────────────────────────────────────────────

describe('target year form', () => {
  test('populates current year and next year options', async () => {
    await loadPopup();
    const options = document.querySelectorAll('#target-year-select option:not([disabled])');
    expect(options.length).toBe(2);
    const currentYear = new Date().getFullYear();
    expect(options[0].value).toBe(String(currentYear));
    expect(options[1].value).toBe(String(currentYear + 1));
  });

  test('pre-selects year when target_year is already set', async () => {
    const currentYear = String(new Date().getFullYear());
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ target_year: currentYear });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('#target-year-select').value).toBe(currentYear);
  });

  test('saves target_year on submit', async () => {
    await loadPopup();
    const currentYear = String(new Date().getFullYear());
    document.querySelector('#target-year-select').value = currentYear;
    document.querySelector('#target-year-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ target_year: currentYear }),
      expect.any(Function)
    );
  });

  test('disables save button and shows saved message after save', async () => {
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await loadPopup();
    const currentYear = String(new Date().getFullYear());
    document.querySelector('#target-year-select').value = currentYear;
    document.querySelector('#target-year-form').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('#target-year-button').disabled).toBe(true);
    expect(document.querySelector('#target-year-message').style.visibility).toBe('visible');
  });
});

// ─── scrape button ───────────────────────────────────────────────────────────

describe('scrape button', () => {
  test('sends START message when month and year are set', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ target_month: 'March', target_year: '2026' });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    document.querySelector('#scrape-button').click();
    await new Promise(r => setTimeout(r, 0));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'START' });
  });

  test('shows error and does not send START when target_month is empty', async () => {
    await loadPopup();
    document.querySelector('#scrape-button').click();
    await new Promise(r => setTimeout(r, 0));

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'START' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'ERR' });
  });

  test('shows error and does not send START when target_year is empty', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ target_month: 'March', target_year: '' });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    document.querySelector('#scrape-button').click();
    await new Promise(r => setTimeout(r, 0));

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'START' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'ERR' });
  });
});

// ─── google calendar export button ──────────────────────────────────────────

describe('google calendar export button', () => {
  test('is disabled by default when no calendar_id is set', async () => {
    await loadPopup();
    expect(document.querySelector('#google-calendar-export-button').disabled).toBe(true);
  });

  test('is enabled when calendar_id is set in storage', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ calendar_id: 'my-cal' });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });
    chrome.tabs.query.mockImplementation((query, callback) => callback([]));

    await loadPopup();
    expect(document.querySelector('#google-calendar-export-button').disabled).toBe(false);
  });

  test('shows error message when calendar_id is empty on click', async () => {
    await loadPopup();
    document.querySelector('#google-calendar-export-button').disabled = false;
    document.querySelector('#google-calendar-export-button').click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('.error-message-text')).not.toBeNull();
  });
});

// ─── message close button ────────────────────────────────────────────────────

describe('message close button', () => {
  test('removes error message when close button is clicked', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({
        messages: [{ type: MESSAGE_TYPE.ERROR, message: 'Remove me' }]
      });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('.error-message')).not.toBeNull();

    document.querySelector('.message-close-btn').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(document.querySelector('.error-message')).toBeNull();
  });

  test('removes info message when close button is clicked', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({
        messages: [{ type: MESSAGE_TYPE.INFO, message: 'Remove me' }]
      });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });

    await loadPopup();
    expect(document.querySelector('.info-message')).not.toBeNull();

    document.querySelector('.message-close-btn').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );

    expect(document.querySelector('.info-message')).toBeNull();
  });
});

// ─── chrome.tabs.query (export button enable on load) ───────────────────────

describe('chrome.tabs.query on load', () => {
  test('enables export button if calendar_id is set in storage', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const result = defaultStorage({ calendar_id: 'cal-123' });
      if (callback) { callback(result); return undefined; }
      return Promise.resolve(result);
    });
    chrome.tabs.query.mockImplementation((query, callback) => callback([]));

    await loadPopup();
    expect(document.querySelector('#google-calendar-export-button').disabled).toBe(false);
  });

  test('leaves export button disabled if calendar_id is empty', async () => {
    chrome.tabs.query.mockImplementation((query, callback) => callback([]));

    await loadPopup();
    expect(document.querySelector('#google-calendar-export-button').disabled).toBe(true);
  });
});