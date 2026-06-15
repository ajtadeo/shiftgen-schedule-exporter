/**
 * @file TaskManager.test.js
 * @brief Tests task manager class
 */

import { jest } from '@jest/globals';
import { TaskManager } from '../src/shiftgen/TaskManager.js';
import { TASKS, STATE, MESSAGE_TYPE, defaultTaskStates, MESSAGE_IDS } from '../src/shiftgen/common.js';

/** @brief Returns a fresh IDLE workflow object */
function idleWorkflow() {
  return {
    state: STATE.IDLE,
    taskStates: defaultTaskStates(),
    pendingSchedules: []
  };
}

/** @brief Returns a new TaskManager seeded with the given workflow (default: idle) */
function makeManager(workflow = idleWorkflow()) {
  return new TaskManager(workflow);
}

beforeEach(() => {
  browser.tabs.create.mockReset();
  browser.tabs.update.mockReset();
  browser.tabs.sendMessage.mockReset();
  browser.storage.local.get.mockReset();
  browser.storage.local.set.mockReset();
  browser.action.setBadgeText.mockReset();
  browser.action.setBadgeBackgroundColor.mockReset();

  browser.storage.local.set.mockResolvedValue(undefined);
  browser.tabs.sendMessage.mockResolvedValue(undefined);
  browser.tabs.update.mockResolvedValue(undefined);
  browser.tabs.remove.mockResolvedValue(undefined);

  browser.storage.local.get.mockImplementation((keys, callback) => {
    const result = {
      workflow: idleWorkflow(),
      target_month: 'March',
      target_year: 2026,
      messages: []
    };
    if (callback) {
      callback(result);
      return undefined;
    }
    return Promise.resolve(result);
  })
});

afterEach(() => {
  document.documentElement.innerHTML = "";
});

// ===========================================================================
// Constructor
// ===========================================================================

describe('constructor', () => {
  test('restores state from workflow object', () => {
    const wf = {
      state: STATE.RUNNING,
      taskStates: {
        0: { status: 'running', tabId: 42, result: null },
        1: { status: 'idle', tabId: null, result: null },
        2: { status: 'idle', tabId: null, result: null }
      },
      pendingSchedules: ['https://example.com/s1']
    };
    const m = makeManager(wf);
    expect(m.state).toBe(STATE.RUNNING);
    expect(m.taskStates[TASKS.USER.id].tabId).toBe(42);
    expect(m.pendingSchedules).toHaveLength(1);
  });
});

// ===========================================================================
// saveWorkflow
// ===========================================================================

describe('saveWorkflow', () => {
  test('persists current state, taskStates, and pendingSchedules', async () => {
    const m = makeManager();
    m.state = STATE.NAVIGATING;
    m.pendingSchedules = ['https://example.com/x'];
    await m.saveWorkflow();

    expect(browser.storage.local.set).toHaveBeenCalledWith({
      workflow: expect.objectContaining({
        state: STATE.NAVIGATING,
        pendingSchedules: ['https://example.com/x']
      })
    });
  });
});

// ===========================================================================
// createTab
// ===========================================================================

describe('createTab', () => {
  test('creates a tab at the given URL and updates taskStates', async () => {
    browser.tabs.create.mockResolvedValue({ id: 77 });
    const m = makeManager();
    await m.createTab(TASKS.USER.id, TASKS.USER.url);

    expect(browser.tabs.create).toHaveBeenCalledWith({ url: TASKS.USER.url });
    expect(m.taskStates[TASKS.USER.id].status).toBe('tab_created');
    expect(m.taskStates[TASKS.USER.id].tabId).toBe(77);
  });

  test('saves workflow after creating tab', async () => {
    browser.tabs.create.mockResolvedValue({ id: 77 });
    const m = makeManager();
    await m.createTab(TASKS.DOCTOR.id, TASKS.DOCTOR.url);
    expect(browser.storage.local.set).toHaveBeenCalled();
  });
});

// ===========================================================================
// handleStart
// ===========================================================================

describe('handleStart', () => {
  test('resets all taskStates to pending and creates USER tab', async () => {
    browser.tabs.create.mockResolvedValue({ id: 123 });
    const m = makeManager();
    await m.handleStart();

    expect(browser.tabs.create).toHaveBeenCalledWith({ url: TASKS.USER.url });
    expect(m.taskStates[TASKS.USER.id].status).toBe('tab_created');
    expect(m.taskStates[TASKS.USER.id].tabId).toBe(123);
  });

  test('clears pendingSchedules', async () => {
    browser.tabs.create.mockResolvedValue({ id: 1 });
    const wf = { ...idleWorkflow(), pendingSchedules: ['https://leftover.com'] };
    const m = makeManager(wf);
    await m.handleStart();
    expect(m.pendingSchedules).toHaveLength(0);
  });

  test('clears shifts in storage', async () => {
    browser.tabs.create.mockResolvedValue({ id: 1 });
    const m = makeManager();
    await m.handleStart();
    expect(browser.storage.local.set).toHaveBeenCalledWith({ shifts: {} });
  });
});

// ===========================================================================
// handleTaskRunning
// ===========================================================================

describe('handleTaskRunning', () => {
  test('sets task status to running', async () => {
    const m = makeManager();
    m.taskStates[TASKS.USER.id] = { status: 'triggered', tabId: 55, result: null };
    await m.handleTaskRunning(TASKS.USER.id, 55);
    expect(m.taskStates[TASKS.USER.id].status).toBe('running');
  });

  test('saves workflow', async () => {
    const m = makeManager();
    await m.handleTaskRunning(TASKS.USER.id, 55);
    expect(browser.storage.local.set).toHaveBeenCalled();
  });
});

// ===========================================================================
// handleTaskFailed
// ===========================================================================

describe('handleTaskFailed', () => {
  test('sets task status to failed with error message', async () => {
    const m = makeManager();
    await m.handleTaskFailed(TASKS.DOCTOR.id, 'something broke');
    expect(m.taskStates[TASKS.DOCTOR.id].status).toBe('failed');
    expect(m.taskStates[TASKS.DOCTOR.id].error).toBe('something broke');
  });

  test('fires a notification', async () => {
    const m = makeManager();
    await m.handleTaskFailed(TASKS.USER.id, 'oops');
    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "ERR" });
    expect(browser.storage.local.set).toHaveBeenLastCalledWith({
      messages: [{ message: 'Scraping User failed: oops', type: MESSAGE_TYPE.ERROR }]
    });
  });
});

// ===========================================================================
// handlePendingSchedules
// ===========================================================================

describe('handlePendingSchedules', () => {
  test('pops a schedule and navigates to it', async () => {
    const m = makeManager();
    m.pendingSchedules = ['https://example.com/s2', 'https://example.com/s1'];
    m.taskStates[TASKS.USER.id] = { status: 'tab_created', tabId: 200, result: null };

    await m.handlePendingSchedules(TASKS.USER.id, 200);

    expect(m.pendingSchedules).toHaveLength(1);
    expect(browser.tabs.update).toHaveBeenCalledWith(200, { url: 'https://example.com/s1' });
    expect(m.taskStates[TASKS.USER.id].status).toBe('navigating');
  });
});

// ===========================================================================
// handleTaskCompleted
// ===========================================================================

describe('handleTaskCompleted', () => {
  test('navigates to next pending schedule when pendingSchedules is non-empty', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = ['https://example.com/next'];
    m.taskStates[TASKS.USER.id] = { status: 'running', tabId: 10, result: null };

    await m.handleTaskCompleted(TASKS.USER.id, 10, {});

    expect(m.state).toBe(STATE.NAVIGATING);
    expect(browser.tabs.update).toHaveBeenCalledWith(10, { url: 'https://example.com/next' });
  });

  test('creates DOCTOR tab when USER is all completed and DOCTOR is pending', async () => {
    browser.tabs.create.mockResolvedValue({ id: 88 });
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'running',  tabId: 10, result: null },
      [TASKS.DOCTOR.id]: { status: 'pending',  tabId: null, result: null },
      [TASKS.PA_NP.id]:     { status: 'pending',  tabId: null, result: null }
    };

    await m.handleTaskCompleted(TASKS.USER.id, 10, {});

    expect(m.state).toBe(STATE.CREATE_TAB_PROVIDER);
    expect(browser.tabs.create).toHaveBeenCalledWith({ url: TASKS.DOCTOR.url });
    expect(m.taskStates[TASKS.DOCTOR.id].status).toBe('tab_created');
  });

  test('creates PA/NP tab when USER and DOCTOR are all completed and PA/NP is pending', async () => {
    browser.tabs.create.mockResolvedValue({ id: 99 });
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'all completed', tabId: 10,  result: null },
      [TASKS.DOCTOR.id]: { status: 'running',       tabId: 20,  result: null },
      [TASKS.PA_NP.id]:     { status: 'pending',        tabId: null, result: null }
    };

    await m.handleTaskCompleted(TASKS.DOCTOR.id, 20, {});

    expect(m.state).toBe(STATE.CREATE_TAB_PROVIDER);
    expect(browser.tabs.create).toHaveBeenCalledWith({ url: TASKS.PA_NP.url });
    expect(m.taskStates[TASKS.PA_NP.id].status).toBe('tab_created');
  });

  test('returns to IDLE and fires notification when all tasks are all completed', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'all completed', tabId: 10, result: null },
      [TASKS.DOCTOR.id]: { status: 'all completed', tabId: 20, result: null },
      [TASKS.PA_NP.id]:     { status: 'running',       tabId: 30, result: null }
    };

    await m.handleTaskCompleted(TASKS.PA_NP.id, 30, {});

    expect(m.state).toBe(STATE.IDLE);
    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "🐻" });
    expect(browser.storage.local.set).toHaveBeenLastCalledWith({
      messages: [{ message: 'Completed scraping shifts', type: MESSAGE_TYPE.INFO }]
    });
  });

  test('fails with invalid completion state when no branch matches', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    // USER is not 'all completed', so no branch matches
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'pending', tabId: null, result: null },
      [TASKS.DOCTOR.id]: { status: 'pending', tabId: null, result: null },
      [TASKS.PA_NP.id]:     { status: 'running', tabId: 30,   result: null }
    };

    await m.handleTaskCompleted(TASKS.PA_NP.id, 30, {});

    expect(m.taskStates[TASKS.PA_NP.id].status).toBe('failed');
    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "ERR" });
    expect(browser.storage.local.set).toHaveBeenLastCalledWith({
      messages: [{ message: 'Scraping PA/NP failed: Invalid completion state', type: MESSAGE_TYPE.ERROR }]
    });
  });
});

// ===========================================================================
// triggerTask
// ===========================================================================

describe('triggerTask', () => {
  test('sends TRIGGER_TASK message to correct tab', async () => {
    const m = makeManager();
    m.taskStates[TASKS.DOCTOR.id] = { status: 'tab_created', tabId: 101, result: null };
    await m.triggerTask(TASKS.DOCTOR.id, 101);

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(101, {
      id: MESSAGE_IDS.TRIGGER_TASK,
      taskId: TASKS.DOCTOR.id
    });
    expect(m.taskStates[TASKS.DOCTOR.id].status).toBe('triggered');
  });
});

// ===========================================================================
// triggerChangeSite
// ===========================================================================

describe('triggerChangeSite', () => {
  test('with explicit siteId: transitions to CHANGE_SITE_USER and updates USER task', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_USER;
    m.taskStates[TASKS.USER.id] = { status: 'tab_created', tabId: 101, result: null };

    await m.triggerChangeSite(TASKS.USER.id, 101, TASKS.USER.siteId);

    expect(m.state).toBe(STATE.CHANGE_SITE_USER);
    expect(m.taskStates[TASKS.USER.id].status).toBe('changing site');
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(101, expect.objectContaining({
      id: MESSAGE_IDS.TRIGGER_CHANGE_SITE,
      siteId: TASKS.USER.siteId
    }));
  });

  test('siteId=null + USER taskId: transitions to CHANGE_SITE_DOCTOR', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_PROVIDER;
    m.taskStates[TASKS.USER.id] = { status: 'tab_created', tabId: 200, result: null };
    m.taskStates[TASKS.DOCTOR.id] = { status: 'pending', tabId: null, result: null };

    await m.triggerChangeSite(TASKS.USER.id, 200, null);

    expect(m.state).toBe(STATE.CHANGE_SITE_DOCTOR);
    expect(m.taskStates[TASKS.DOCTOR.id].status).toBe('changing site');
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(200, expect.objectContaining({
      id: MESSAGE_IDS.TRIGGER_CHANGE_SITE,
      siteId: TASKS.DOCTOR.siteId,
      taskToUpdate: TASKS.DOCTOR.id
    }));
  });

  test('siteId=null + DOCTOR taskId: transitions to CHANGE_SITE_PA', async () => {
    const m = makeManager();
    m.taskStates[TASKS.PA_NP.id] = { status: 'pending', tabId: null, result: null };

    await m.triggerChangeSite(TASKS.DOCTOR.id, 300, null);

    expect(m.state).toBe(STATE.CHANGE_SITE_PA);
    expect(m.taskStates[TASKS.PA_NP.id].status).toBe('changing site');
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(300, expect.objectContaining({
      id: MESSAGE_IDS.TRIGGER_CHANGE_SITE,
      siteId: TASKS.PA_NP.siteId,
      taskToUpdate: TASKS.PA_NP.id
    }));
  });

  test('siteId=null + invalid taskId: fails and returns to IDLE', async () => {
    const m = makeManager();
    await m.triggerChangeSite(TASKS.PA_NP.id, 400, null);

    expect(m.state).toBe(STATE.IDLE);
    expect(m.taskStates[TASKS.PA_NP.id].status).toBe('failed');
    expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: "ERR" });
    expect(browser.storage.local.set).toHaveBeenLastCalledWith({
      messages: [{ message: 'Scraping PA/NP failed: Invalid site change trigger', type: MESSAGE_TYPE.ERROR }]
    });
  });
});

// ===========================================================================
// triggerNavigation
// ===========================================================================

describe('triggerNavigation', () => {
  test('updates tab URL and sets status to navigating', async () => {
    const m = makeManager();
    m.taskStates[TASKS.PA_NP.id] = { status: 'tab_created', tabId: 500, result: null };
    await m.triggerNavigation(TASKS.PA_NP.id, 500, 'https://example.com/page');

    expect(browser.tabs.update).toHaveBeenCalledWith(500, { url: 'https://example.com/page' });
    expect(m.taskStates[TASKS.PA_NP.id].status).toBe('navigating');
  });
});

// ===========================================================================
// triggerCollectSchedules
// ===========================================================================

describe('triggerCollectSchedules', () => {
  test('sends TRIGGER_COLLECT_SCHEDULES and sets status', async () => {
    const m = makeManager();
    m.taskStates[TASKS.DOCTOR.id] = { status: 'tab_created', tabId: 300, result: null };
    await m.triggerCollectSchedules(TASKS.DOCTOR.id, 300);

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(300, {
      id: MESSAGE_IDS.TRIGGER_COLLECT_SCHEDULES,
      taskId: TASKS.DOCTOR.id
    });
    expect(m.taskStates[TASKS.DOCTOR.id].status).toBe('collecting schedules');
  });
});

// ===========================================================================
// getTargetUrl
// ===========================================================================

describe('getTargetUrl', () => {
  test('builds URL with correct month_id and year_id', async () => {
    const m = makeManager();
    const url = await m.getTargetUrl();
    expect(url).toContain('month_id=3');
    expect(url).toContain('year_id=2026');
  });

  test('URL starts with the USER base URL', async () => {
    const m = makeManager();
    const url = await m.getTargetUrl();
    expect(url).toContain(TASKS.USER.url);
  });
});

// ===========================================================================
// handleMessage
// ===========================================================================

describe('handleMessage', () => {

  // --- START ---
  test('START when IDLE transitions to CREATE_TAB_USER and calls handleStart', async () => {
    browser.tabs.create.mockResolvedValue({ id: 555 });
    const m = makeManager();

    await m.handleMessage({ id: MESSAGE_IDS.START }, {}, jest.fn());

    expect(m.state).toBe(STATE.CREATE_TAB_USER);
    expect(m.taskStates[TASKS.USER.id].status).toBe('tab_created');
  });

  test('START when not IDLE is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;

    await m.handleMessage({ id: MESSAGE_IDS.START }, {}, jest.fn());

    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(m.state).toBe(STATE.RUNNING);
  });

  // --- CONTENT_SCRIPT_READY ---
  test('CONTENT_SCRIPT_READY in CREATE_TAB_USER triggers site change to USER', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_USER;

    await m.handleMessage({ id: MESSAGE_IDS.CONTENT_SCRIPT_READY, taskId: TASKS.USER.id }, { tab: { id: 10 } }, jest.fn());

    expect(m.state).toBe(STATE.CHANGE_SITE_USER);
    expect(m.taskStates[TASKS.USER.id].status).toBe('changing site');
  });

  test('CONTENT_SCRIPT_READY in CREATE_TAB_PROVIDER triggers site change', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_PROVIDER;
    m.taskStates[TASKS.USER.id] = { status: 'tab_created', tabId: 10, result: null };
    m.taskStates[TASKS.DOCTOR.id] = { status: 'pending', tabId: null, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.CONTENT_SCRIPT_READY, taskId: TASKS.USER.id }, { tab: { id: 10 } }, jest.fn());

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(10, expect.objectContaining({
      id: MESSAGE_IDS.TRIGGER_CHANGE_SITE
    }));
  });

  test('CONTENT_SCRIPT_READY in CHANGE_SITE_USER triggers navigation', async () => {
    const m = makeManager();
    m.state = STATE.CHANGE_SITE_USER;
    m.taskStates[TASKS.USER.id] = { status: 'changing site', tabId: 10, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.CONTENT_SCRIPT_READY, taskId: TASKS.USER.id }, { tab: { id: 10 } }, jest.fn());

    expect(m.state).toBe(STATE.NAVIGATING);
    expect(browser.tabs.update).toHaveBeenCalled();
  });

  test('CONTENT_SCRIPT_READY in CHANGE_SITE_PA triggers collectSchedules for PA', async () => {
    const m = makeManager();
    m.state = STATE.CHANGE_SITE_PA;
    m.taskStates[TASKS.PA_NP.id] = { status: 'changing site', tabId: 20, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.CONTENT_SCRIPT_READY, taskId: TASKS.PA_NP.id }, { tab: { id: 20 } }, jest.fn());

    expect(m.state).toBe(STATE.COLLECT_SCHEDULES);
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(20, expect.objectContaining({
      id: MESSAGE_IDS.TRIGGER_COLLECT_SCHEDULES,
      taskId: TASKS.PA_NP.id
    }));
  });

  test('CONTENT_SCRIPT_READY in CHANGE_SITE_DOCTOR triggers collectSchedules for DOCTOR', async () => {
    const m = makeManager();
    m.state = STATE.CHANGE_SITE_DOCTOR;
    m.taskStates[TASKS.DOCTOR.id] = { status: 'changing site', tabId: 30, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.CONTENT_SCRIPT_READY, taskId: TASKS.DOCTOR.id }, { tab: { id: 30 } }, jest.fn());

    expect(m.state).toBe(STATE.COLLECT_SCHEDULES);
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(30, expect.objectContaining({
      id: MESSAGE_IDS.TRIGGER_COLLECT_SCHEDULES,
      taskId: TASKS.DOCTOR.id
    }));
  });

  test('CONTENT_SCRIPT_READY in NAVIGATING triggers task', async () => {
    const m = makeManager();
    m.state = STATE.NAVIGATING;
    m.taskStates[TASKS.USER.id] = { status: 'navigating', tabId: 40, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.CONTENT_SCRIPT_READY, taskId: TASKS.USER.id }, { tab: { id: 40 } }, jest.fn());

    expect(m.state).toBe(STATE.RUNNING);
    expect(m.taskStates[TASKS.USER.id].status).toBe('triggered');
  });

  // --- SCHEDULES ---
  test('SCHEDULES with schedules sets state to NAVIGATING and navigates', async () => {
    const m = makeManager();
    m.state = STATE.COLLECT_SCHEDULES;
    m.taskStates[TASKS.USER.id] = { status: 'collecting schedules', tabId: 50, result: null };

    await m.handleMessage({
      id: MESSAGE_IDS.SCHEDULES,
      taskId: TASKS.USER.id,
      data: { pendingSchedules: ['https://example.com/s1'], targetMonth: 'March', targetYear: 2026 }
    }, { tab: { id: 50 } }, jest.fn());

    expect(m.state).toBe(STATE.NAVIGATING);
    expect(browser.tabs.update).toHaveBeenCalled();
  });

  test('SCHEDULES with empty list fails the task', async () => {
    const m = makeManager();
    m.state = STATE.COLLECT_SCHEDULES;
    m.taskStates[TASKS.USER.id] = { status: 'collecting schedules', tabId: 50, result: null };

    await m.handleMessage({
      id: MESSAGE_IDS.SCHEDULES,
      taskId: TASKS.USER.id,
      data: { pendingSchedules: [], targetMonth: 'March', targetYear: 2026 }
    }, { tab: { id: 50 } }, jest.fn());

    expect(m.state).toBe(STATE.IDLE);
    expect(m.taskStates[TASKS.USER.id].status).toBe('failed');
  });

  test('SCHEDULES when not in COLLECT_SCHEDULES state is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;

    await m.handleMessage({
      id: MESSAGE_IDS.SCHEDULES,
      taskId: TASKS.USER.id,
      data: { pendingSchedules: ['https://x.com'], targetMonth: 'March', targetYear: 2026 }
    }, { tab: { id: 50 } }, jest.fn());

    expect(browser.tabs.update).not.toHaveBeenCalled();
  });

  // --- TASK_RUNNING ---
  test('TASK_RUNNING when RUNNING sets status to running', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.taskStates[TASKS.USER.id] = { status: 'triggered', tabId: 60, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.TASK_RUNNING, taskId: TASKS.USER.id }, { tab: { id: 60 } }, jest.fn());

    expect(m.taskStates[TASKS.USER.id].status).toBe('running');
  });

  test('TASK_RUNNING when not RUNNING is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.IDLE;
    m.taskStates[TASKS.USER.id] = { status: 'idle', tabId: null, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.TASK_RUNNING, taskId: TASKS.USER.id }, { tab: { id: 60 } }, jest.fn());

    expect(m.taskStates[TASKS.USER.id].status).toBe('idle');
  });

  // --- TASK_COMPLETED ---
  test('TASK_COMPLETED when not RUNNING is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.IDLE;

    await m.handleMessage({ id: MESSAGE_IDS.TASK_COMPLETED, taskId: TASKS.USER.id, data: {} }, { tab: { id: 60 } }, jest.fn());

    expect(m.state).toBe(STATE.IDLE);
    expect(browser.tabs.create).not.toHaveBeenCalled();
  });

  // --- TASK_FAILED ---
  test('TASK_FAILED sets state to IDLE and fails the task', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.taskStates[TASKS.USER.id] = { status: 'running', tabId: 70, result: null };

    await m.handleMessage({ id: MESSAGE_IDS.TASK_FAILED, taskId: TASKS.USER.id, data: 'network error' }, { tab: { id: 70 } }, jest.fn());

    expect(m.state).toBe(STATE.IDLE);
    expect(m.taskStates[TASKS.USER.id].status).toBe('failed');
    expect(m.taskStates[TASKS.USER.id].error).toBe('network error');
  });

  test('TASK_FAILED when already IDLE is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.IDLE;

    await m.handleMessage({ id: MESSAGE_IDS.TASK_FAILED, taskId: TASKS.USER.id, data: 'late error' }, { tab: { id: 70 } }, jest.fn());

    expect(m.taskStates[TASKS.USER.id].status).toBe('idle'); // unchanged
  });

  // --- unknown message type ---
  test('unknown message type is silently ignored', async () => {
    const m = makeManager();
    await expect(
      m.handleMessage({ id: 'TOTALLY_UNKNOWN' }, {}, jest.fn())
    ).resolves.not.toThrow();
    expect(m.state).toBe(STATE.IDLE);
  });
});