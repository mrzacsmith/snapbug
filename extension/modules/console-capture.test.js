import { describe, it, expect, vi } from 'vitest'
import { injectConsoleCapture, removeConsoleCapture, collectConsoleMessages, formatConsoleMessages } from './console-capture.js'

function makeChromeStub(executeResult = [{}]) {
  return {
    scripting: {
      executeScript: vi.fn(() => Promise.resolve(executeResult)),
    },
  }
}

describe('injectConsoleCapture', () => {
  it('calls scripting.executeScript with the target tab', async () => {
    const chrome = makeChromeStub()
    await injectConsoleCapture(chrome, 42)
    expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    const call = chrome.scripting.executeScript.mock.calls[0][0]
    expect(call.target.tabId).toBe(42)
  })

  it('injects a function', async () => {
    const chrome = makeChromeStub()
    await injectConsoleCapture(chrome, 1)
    const call = chrome.scripting.executeScript.mock.calls[0][0]
    expect(call.func).toBeInstanceOf(Function)
  })
})

describe('removeConsoleCapture', () => {
  it('calls scripting.executeScript to clean up', async () => {
    const chrome = makeChromeStub()
    await removeConsoleCapture(chrome, 42)
    expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    const call = chrome.scripting.executeScript.mock.calls[0][0]
    expect(call.target.tabId).toBe(42)
  })
})

describe('collectConsoleMessages', () => {
  it('returns messages from executeScript result', async () => {
    const messages = [
      { level: 'error', message: 'TypeError: x is undefined', timestamp: '10:30:01' },
    ]
    const chrome = makeChromeStub([{ result: messages }])
    const result = await collectConsoleMessages(chrome, 1)
    expect(result).toEqual(messages)
  })

  it('returns empty array when no messages', async () => {
    const chrome = makeChromeStub([{ result: null }])
    const result = await collectConsoleMessages(chrome, 1)
    expect(result).toEqual([])
  })
})

describe('formatConsoleMessages', () => {
  it('formats error messages with icon', () => {
    const messages = [
      { level: 'error', message: 'TypeError: x is undefined' },
    ]
    const output = formatConsoleMessages(messages)
    expect(output).toContain('TypeError: x is undefined')
    expect(output).toMatch(/❌|error/i)
  })

  it('formats warning messages with icon', () => {
    const messages = [
      { level: 'warn', message: 'Deprecation warning' },
    ]
    const output = formatConsoleMessages(messages)
    expect(output).toContain('Deprecation warning')
    expect(output).toMatch(/⚠️|warn/i)
  })

  it('formats log messages', () => {
    const messages = [
      { level: 'log', message: 'hello world' },
    ]
    const output = formatConsoleMessages(messages)
    expect(output).toContain('hello world')
  })

  it('includes a header with message count', () => {
    const messages = [
      { level: 'error', message: 'err1' },
      { level: 'warn', message: 'warn1' },
      { level: 'log', message: 'log1' },
    ]
    const output = formatConsoleMessages(messages)
    expect(output).toMatch(/console/i)
    expect(output).toContain('3')
  })

  it('returns empty string for no messages', () => {
    expect(formatConsoleMessages([])).toBe('')
    expect(formatConsoleMessages(null)).toBe('')
  })
})
