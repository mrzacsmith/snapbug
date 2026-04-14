const MAX_MESSAGES = 200

export async function injectConsoleCapture(chrome, tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (max) => {
      if (window.__snapbugConsole) return
      window.__snapbugConsole = []

      const levels = ['log', 'warn', 'error']
      window.__snapbugOriginals = {}

      for (const level of levels) {
        window.__snapbugOriginals[level] = console[level]
        console[level] = (...args) => {
          window.__snapbugOriginals[level].apply(console, args)
          const message = args.map(a => {
            try { return typeof a === 'string' ? a : JSON.stringify(a) }
            catch { return String(a) }
          }).join(' ')

          window.__snapbugConsole.push({ level, message, timestamp: new Date().toISOString() })
          if (window.__snapbugConsole.length > max) {
            window.__snapbugConsole.shift()
          }
        }
      }
    },
    args: [MAX_MESSAGES],
  })
}

export async function removeConsoleCapture(chrome, tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (!window.__snapbugOriginals) return
      for (const [level, fn] of Object.entries(window.__snapbugOriginals)) {
        console[level] = fn
      }
      delete window.__snapbugConsole
      delete window.__snapbugOriginals
    },
  })
}

export async function collectConsoleMessages(chrome, tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.__snapbugConsole || [],
  })
  return results?.[0]?.result || []
}

const ICONS = { error: '❌', warn: '⚠️', log: 'ℹ️' }

export function formatConsoleMessages(messages) {
  if (!messages || messages.length === 0) return ''

  const lines = messages.map(m => {
    const icon = ICONS[m.level] || 'ℹ️'
    return `${icon} ${m.message}`
  })

  return `\nConsole (${messages.length} messages):\n${lines.join('\n')}`
}
