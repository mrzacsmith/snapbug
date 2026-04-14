import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { injectCursorHighlight, removeCursorHighlight } from './cursor-highlight.js'

function makeChromeStub({ executeResult = [{}], removeResult = undefined } = {}) {
  return {
    scripting: {
      executeScript: vi.fn(() => Promise.resolve(executeResult)),
      removeCSS: vi.fn(() => Promise.resolve(removeResult)),
      insertCSS: vi.fn(() => Promise.resolve()),
    },
  }
}

describe('injectCursorHighlight', () => {
  it('calls scripting.executeScript with the target tab', async () => {
    const chrome = makeChromeStub()
    await injectCursorHighlight(chrome, 42)
    expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    const call = chrome.scripting.executeScript.mock.calls[0][0]
    expect(call.target.tabId).toBe(42)
  })

  it('injects a function, not a file', async () => {
    const chrome = makeChromeStub()
    await injectCursorHighlight(chrome, 1)
    const call = chrome.scripting.executeScript.mock.calls[0][0]
    expect(call.func).toBeInstanceOf(Function)
  })
})

describe('removeCursorHighlight', () => {
  it('calls scripting.executeScript to remove the overlay', async () => {
    const chrome = makeChromeStub()
    await removeCursorHighlight(chrome, 42)
    expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    const call = chrome.scripting.executeScript.mock.calls[0][0]
    expect(call.target.tabId).toBe(42)
  })
})
