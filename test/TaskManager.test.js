/**
 * @file TaskManager.test.js
 * @brief Tests task manager class
 */

import { jest } from '@jest/globals';
import { TaskManager } from '../src/shiftgen/TaskManager.js';
import { TASKS, STATE } from '../src/shiftgen/common.js';

/** @brief Returns a fresh IDLE workflow object */
function idleWorkflow() {
  return {
    state: STATE.IDLE,
    taskStates: {
      0: { status: 'idle', tabId: null, result: null },
      1: { status: 'idle', tabId: null, result: null },
      2: { status: 'idle', tabId: null, result: null }
    },
    pendingSchedules: []
  };
}

/** @brief Returns a new TaskManager seeded with the given workflow (default: idle) */
function makeManager(workflow = idleWorkflow()) {
  return new TaskManager(workflow);
}

beforeEach(() => {
  chrome.tabs.create.mockReset();
  chrome.tabs.update.mockReset();
  chrome.tabs.sendMessage.mockReset();
  chrome.storage.local.get.mockReset();
  chrome.storage.local.set.mockReset();
  chrome.notifications.create.mockReset();

  chrome.storage.local.get.mockResolvedValue({
    workflow: idleWorkflow(),
    target_month: 'March',
    target_year: 2026
  });
  chrome.storage.local.set.mockResolvedValue(undefined);
  chrome.tabs.sendMessage.mockResolvedValue(undefined);
  chrome.tabs.update.mockResolvedValue(undefined);
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
    expect(m.taskStates[0].tabId).toBe(42);
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

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
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
    chrome.tabs.create.mockResolvedValue({ id: 77 });
    const m = makeManager();
    await m.createTab(TASKS.USER.id, TASKS.USER.url);

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: TASKS.USER.url });
    expect(m.taskStates[TASKS.USER.id].status).toBe('tab_created');
    expect(m.taskStates[TASKS.USER.id].tabId).toBe(77);
  });

  test('saves workflow after creating tab', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 77 });
    const m = makeManager();
    await m.createTab(TASKS.DOCTOR.id, TASKS.DOCTOR.url);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});

// ===========================================================================
// handleStart
// ===========================================================================

describe('handleStart', () => {
  test('resets all taskStates to pending and creates USER tab', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 123 });
    const m = makeManager();
    await m.handleStart();

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: TASKS.USER.url });
    expect(m.taskStates[TASKS.USER.id].status).toBe('tab_created');
    expect(m.taskStates[TASKS.USER.id].tabId).toBe(123);
  });

  test('clears pendingSchedules', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 1 });
    const wf = { ...idleWorkflow(), pendingSchedules: ['https://leftover.com'] };
    const m = makeManager(wf);
    await m.handleStart();
    expect(m.pendingSchedules).toHaveLength(0);
  });

  test('clears shifts in storage', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 1 });
    const m = makeManager();
    await m.handleStart();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ shifts: {} });
  });
});

// ===========================================================================
// handleTaskRunning
// ===========================================================================

describe('handleTaskRunning', () => {
  test('sets task status to running', async () => {
    const m = makeManager();
    m.taskStates[0] = { status: 'triggered', tabId: 55, result: null };
    await m.handleTaskRunning(0, 55);
    expect(m.taskStates[0].status).toBe('running');
  });

  test('saves workflow', async () => {
    const m = makeManager();
    await m.handleTaskRunning(0, 55);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});

// ===========================================================================
// handleTaskFailed
// ===========================================================================

describe('handleTaskFailed', () => {
  test('sets task status to failed with error message', async () => {
    const m = makeManager();
    await m.handleTaskFailed(1, 'something broke');
    expect(m.taskStates[1].status).toBe('failed');
    expect(m.taskStates[1].error).toBe('something broke');
  });

  test('fires a notification', async () => {
    const m = makeManager();
    await m.handleTaskFailed(0, 'oops');
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'basic' })
    );
  });
});

// ===========================================================================
// handlePendingSchedules
// ===========================================================================

describe('handlePendingSchedules', () => {
  test('pops a schedule and navigates to it', async () => {
    const m = makeManager();
    m.pendingSchedules = ['https://example.com/s2', 'https://example.com/s1'];
    m.taskStates[0] = { status: 'tab_created', tabId: 200, result: null };

    await m.handlePendingSchedules(0, 200);

    expect(m.pendingSchedules).toHaveLength(1);
    expect(chrome.tabs.update).toHaveBeenCalledWith(200, { url: 'https://example.com/s1' });
    expect(m.taskStates[0].status).toBe('navigating');
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
    m.taskStates[0] = { status: 'running', tabId: 10, result: null };

    await m.handleTaskCompleted(0, 10, {});

    expect(m.state).toBe(STATE.NAVIGATING);
    expect(chrome.tabs.update).toHaveBeenCalledWith(10, { url: 'https://example.com/next' });
  });

  test('creates DOCTOR tab when USER is all completed and DOCTOR is pending', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 88 });
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'running',  tabId: 10, result: null },
      [TASKS.DOCTOR.id]: { status: 'pending',  tabId: null, result: null },
      [TASKS.PA.id]:     { status: 'pending',  tabId: null, result: null }
    };

    await m.handleTaskCompleted(TASKS.USER.id, 10, {});

    expect(m.state).toBe(STATE.CREATE_TAB_PROVIDER);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: TASKS.DOCTOR.url });
    expect(m.taskStates[TASKS.DOCTOR.id].status).toBe('tab_created');
  });

  test('creates PA tab when USER and DOCTOR are all completed and PA is pending', async () => {
    chrome.tabs.create.mockResolvedValue({ id: 99 });
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'all completed', tabId: 10,  result: null },
      [TASKS.DOCTOR.id]: { status: 'running',       tabId: 20,  result: null },
      [TASKS.PA.id]:     { status: 'pending',        tabId: null, result: null }
    };

    await m.handleTaskCompleted(TASKS.DOCTOR.id, 20, {});

    expect(m.state).toBe(STATE.CREATE_TAB_PROVIDER);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: TASKS.PA.url });
    expect(m.taskStates[TASKS.PA.id].status).toBe('tab_created');
  });

  test('returns to IDLE and fires notification when all tasks are all completed', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'all completed', tabId: 10, result: null },
      [TASKS.DOCTOR.id]: { status: 'all completed', tabId: 20, result: null },
      [TASKS.PA.id]:     { status: 'running',       tabId: 30, result: null }
    };

    await m.handleTaskCompleted(TASKS.PA.id, 30, {});

    expect(m.state).toBe(STATE.IDLE);
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Completed') })
    );
  });

  test('fails with invalid completion state when no branch matches', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.pendingSchedules = [];
    // USER is not 'all completed', so no branch matches
    m.taskStates = {
      [TASKS.USER.id]:   { status: 'pending', tabId: null, result: null },
      [TASKS.DOCTOR.id]: { status: 'pending', tabId: null, result: null },
      [TASKS.PA.id]:     { status: 'running', tabId: 30,   result: null }
    };

    await m.handleTaskCompleted(TASKS.PA.id, 30, {});

    expect(m.taskStates[TASKS.PA.id].status).toBe('failed');
    expect(chrome.notifications.create).toHaveBeenCalled();
  });
});

// ===========================================================================
// triggerTask
// ===========================================================================

describe('triggerTask', () => {
  test('sends TRIGGER_TASK message to correct tab', async () => {
    const m = makeManager();
    m.taskStates[1] = { status: 'tab_created', tabId: 101, result: null };
    await m.triggerTask(1, 101);

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(101, {
      type: 'TRIGGER_TASK',
      taskId: 1
    });
    expect(m.taskStates[1].status).toBe('triggered');
  });
});

// ===========================================================================
// triggerChangeSite
// ===========================================================================

describe('triggerChangeSite', () => {
  test('with explicit siteId: transitions to CHANGE_SITE_USER and updates USER task', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_USER;
    m.taskStates[0] = { status: 'tab_created', tabId: 101, result: null };

    await m.triggerChangeSite(TASKS.USER.id, 101, TASKS.USER.siteId);

    expect(m.state).toBe(STATE.CHANGE_SITE_USER);
    expect(m.taskStates[TASKS.USER.id].status).toBe('changing site');
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(101, expect.objectContaining({
      type: 'TRIGGER_CHANGE_SITE',
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
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(200, expect.objectContaining({
      siteId: TASKS.DOCTOR.siteId,
      taskToUpdate: TASKS.DOCTOR.id
    }));
  });

  test('siteId=null + DOCTOR taskId: transitions to CHANGE_SITE_PA', async () => {
    const m = makeManager();
    m.taskStates[TASKS.PA.id] = { status: 'pending', tabId: null, result: null };

    await m.triggerChangeSite(TASKS.DOCTOR.id, 300, null);

    expect(m.state).toBe(STATE.CHANGE_SITE_PA);
    expect(m.taskStates[TASKS.PA.id].status).toBe('changing site');
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(300, expect.objectContaining({
      siteId: TASKS.PA.siteId,
      taskToUpdate: TASKS.PA.id
    }));
  });

  test('siteId=null + invalid taskId: fails and returns to IDLE', async () => {
    const m = makeManager();
    await m.triggerChangeSite(TASKS.PA.id, 400, null);

    expect(m.state).toBe(STATE.IDLE);
    expect(m.taskStates[TASKS.PA.id].status).toBe('failed');
    expect(chrome.notifications.create).toHaveBeenCalled();
  });
});

// ===========================================================================
// triggerNavigation
// ===========================================================================

describe('triggerNavigation', () => {
  test('updates tab URL and sets status to navigating', async () => {
    const m = makeManager();
    m.taskStates[2] = { status: 'tab_created', tabId: 500, result: null };
    await m.triggerNavigation(2, 500, 'https://example.com/page');

    expect(chrome.tabs.update).toHaveBeenCalledWith(500, { url: 'https://example.com/page' });
    expect(m.taskStates[2].status).toBe('navigating');
  });
});

// ===========================================================================
// triggerCollectSchedules
// ===========================================================================

describe('triggerCollectSchedules', () => {
  test('sends TRIGGER_COLLECT_SCHEDULES and sets status', async () => {
    const m = makeManager();
    m.taskStates[1] = { status: 'tab_created', tabId: 300, result: null };
    await m.triggerCollectSchedules(1, 300);

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(300, {
      type: 'TRIGGER_COLLECT_SCHEDULES',
      taskId: 1
    });
    expect(m.taskStates[1].status).toBe('collecting schedules');
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
    chrome.tabs.create.mockResolvedValue({ id: 555 });
    const m = makeManager();

    await m.handleMessage({ type: 'START' }, {}, jest.fn());

    expect(m.state).toBe(STATE.CREATE_TAB_USER);
    expect(m.taskStates[TASKS.USER.id].status).toBe('tab_created');
  });

  test('START when not IDLE is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;

    await m.handleMessage({ type: 'START' }, {}, jest.fn());

    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(m.state).toBe(STATE.RUNNING);
  });

  // --- CONTENT_SCRIPT_READY ---
  test('CONTENT_SCRIPT_READY in CREATE_TAB_USER triggers site change to USER', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_USER;

    await m.handleMessage({ type: 'CONTENT_SCRIPT_READY', taskId: TASKS.USER.id }, { tab: { id: 10 } }, jest.fn());

    expect(m.state).toBe(STATE.CHANGE_SITE_USER);
    expect(m.taskStates[TASKS.USER.id].status).toBe('changing site');
  });

  test('CONTENT_SCRIPT_READY in CREATE_TAB_PROVIDER triggers site change', async () => {
    const m = makeManager();
    m.state = STATE.CREATE_TAB_PROVIDER;
    m.taskStates[TASKS.USER.id] = { status: 'tab_created', tabId: 10, result: null };
    m.taskStates[TASKS.DOCTOR.id] = { status: 'pending', tabId: null, result: null };

    await m.handleMessage({ type: 'CONTENT_SCRIPT_READY', taskId: TASKS.USER.id }, { tab: { id: 10 } }, jest.fn());

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(10, expect.objectContaining({
      type: 'TRIGGER_CHANGE_SITE'
    }));
  });

  test('CONTENT_SCRIPT_READY in CHANGE_SITE_USER triggers navigation', async () => {
    const m = makeManager();
    m.state = STATE.CHANGE_SITE_USER;
    m.taskStates[0] = { status: 'changing site', tabId: 10, result: null };

    await m.handleMessage({ type: 'CONTENT_SCRIPT_READY', taskId: 0 }, { tab: { id: 10 } }, jest.fn());

    expect(m.state).toBe(STATE.NAVIGATING);
    expect(chrome.tabs.update).toHaveBeenCalled();
  });

  test('CONTENT_SCRIPT_READY in CHANGE_SITE_PA triggers collectSchedules for PA', async () => {
    const m = makeManager();
    m.state = STATE.CHANGE_SITE_PA;
    m.taskStates[TASKS.PA.id] = { status: 'changing site', tabId: 20, result: null };

    await m.handleMessage({ type: 'CONTENT_SCRIPT_READY', taskId: TASKS.PA.id }, { tab: { id: 20 } }, jest.fn());

    expect(m.state).toBe(STATE.COLLECT_SCHEDULES);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(20, expect.objectContaining({
      type: 'TRIGGER_COLLECT_SCHEDULES',
      taskId: TASKS.PA.id
    }));
  });

  test('CONTENT_SCRIPT_READY in CHANGE_SITE_DOCTOR triggers collectSchedules for DOCTOR', async () => {
    const m = makeManager();
    m.state = STATE.CHANGE_SITE_DOCTOR;
    m.taskStates[TASKS.DOCTOR.id] = { status: 'changing site', tabId: 30, result: null };

    await m.handleMessage({ type: 'CONTENT_SCRIPT_READY', taskId: TASKS.DOCTOR.id }, { tab: { id: 30 } }, jest.fn());

    expect(m.state).toBe(STATE.COLLECT_SCHEDULES);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(30, expect.objectContaining({
      type: 'TRIGGER_COLLECT_SCHEDULES',
      taskId: TASKS.DOCTOR.id
    }));
  });

  test('CONTENT_SCRIPT_READY in NAVIGATING triggers task', async () => {
    const m = makeManager();
    m.state = STATE.NAVIGATING;
    m.taskStates[0] = { status: 'navigating', tabId: 40, result: null };

    await m.handleMessage({ type: 'CONTENT_SCRIPT_READY', taskId: 0 }, { tab: { id: 40 } }, jest.fn());

    expect(m.state).toBe(STATE.RUNNING);
    expect(m.taskStates[0].status).toBe('triggered');
  });

  // --- SCHEDULES ---
  test('SCHEDULES with schedules sets state to NAVIGATING and navigates', async () => {
    const m = makeManager();
    m.state = STATE.COLLECT_SCHEDULES;
    m.taskStates[0] = { status: 'collecting schedules', tabId: 50, result: null };

    await m.handleMessage({
      type: 'SCHEDULES', taskId: 0,
      data: { pendingSchedules: ['https://example.com/s1'], targetMonth: 'March', targetYear: 2026 }
    }, { tab: { id: 50 } }, jest.fn());

    expect(m.state).toBe(STATE.NAVIGATING);
    expect(chrome.tabs.update).toHaveBeenCalled();
  });

  test('SCHEDULES with empty list fails the task', async () => {
    const m = makeManager();
    m.state = STATE.COLLECT_SCHEDULES;
    m.taskStates[0] = { status: 'collecting schedules', tabId: 50, result: null };

    await m.handleMessage({
      type: 'SCHEDULES', taskId: 0,
      data: { pendingSchedules: [], targetMonth: 'March', targetYear: 2026 }
    }, { tab: { id: 50 } }, jest.fn());

    expect(m.state).toBe(STATE.IDLE);
    expect(m.taskStates[0].status).toBe('failed');
  });

  test('SCHEDULES when not in COLLECT_SCHEDULES state is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;

    await m.handleMessage({
      type: 'SCHEDULES', taskId: 0,
      data: { pendingSchedules: ['https://x.com'], targetMonth: 'March', targetYear: 2026 }
    }, { tab: { id: 50 } }, jest.fn());

    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  // --- TASK_RUNNING ---
  test('TASK_RUNNING when RUNNING sets status to running', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.taskStates[0] = { status: 'triggered', tabId: 60, result: null };

    await m.handleMessage({ type: 'TASK_RUNNING', taskId: 0 }, { tab: { id: 60 } }, jest.fn());

    expect(m.taskStates[0].status).toBe('running');
  });

  test('TASK_RUNNING when not RUNNING is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.IDLE;
    m.taskStates[0] = { status: 'idle', tabId: null, result: null };

    await m.handleMessage({ type: 'TASK_RUNNING', taskId: 0 }, { tab: { id: 60 } }, jest.fn());

    expect(m.taskStates[0].status).toBe('idle');
  });

  // --- TASK_COMPLETED ---
  test('TASK_COMPLETED when not RUNNING is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.IDLE;

    await m.handleMessage({ type: 'TASK_COMPLETED', taskId: 0, data: {} }, { tab: { id: 60 } }, jest.fn());

    expect(m.state).toBe(STATE.IDLE);
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  // --- TASK_FAILED ---
  test('TASK_FAILED sets state to IDLE and fails the task', async () => {
    const m = makeManager();
    m.state = STATE.RUNNING;
    m.taskStates[0] = { status: 'running', tabId: 70, result: null };

    await m.handleMessage({ type: 'TASK_FAILED', taskId: 0, data: 'network error' }, { tab: { id: 70 } }, jest.fn());

    expect(m.state).toBe(STATE.IDLE);
    expect(m.taskStates[0].status).toBe('failed');
    expect(m.taskStates[0].error).toBe('network error');
  });

  test('TASK_FAILED when already IDLE is a no-op', async () => {
    const m = makeManager();
    m.state = STATE.IDLE;

    await m.handleMessage({ type: 'TASK_FAILED', taskId: 0, data: 'late error' }, { tab: { id: 70 } }, jest.fn());

    expect(m.taskStates[0].status).toBe('idle'); // unchanged
  });

  // --- unknown message type ---
  test('unknown message type is silently ignored', async () => {
    const m = makeManager();
    await expect(
      m.handleMessage({ type: 'TOTALLY_UNKNOWN' }, {}, jest.fn())
    ).resolves.not.toThrow();
    expect(m.state).toBe(STATE.IDLE);
  });
});