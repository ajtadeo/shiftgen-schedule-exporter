/**
 * @file Scraper.test.js
 * @brief Tests base scraper class
 */

describe("Scraper", () => {
  test("should receive Chrome Extension messages", () => {
    const listenerSpy = jest.fn()
    chrome.runtime.onMessage.addListener(listenerSpy)

    const message = { type: 'TEST_MESSAGE', payload: 'hello' };
    const sender = { tab: { id: 123 } };
    const sendResponse = jest.fn();

    chrome.runtime.onMessage.callListeners(message, sender, sendResponse);

    expect(listenerSpy).toHaveBeenCalledTimes(1);
    expect(listenerSpy).toHaveBeenCalledWith(message, sender, sendResponse);
    expect(sendResponse).not.toHaveBeenCalled();
  })
})