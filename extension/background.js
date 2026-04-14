import { createRecorder } from './modules/recorder.js'
import { uploadVideo, dataUrlToBlob } from './modules/upload.js'
import { formatVideoClipboardOutput } from './modules/output.js'
import { injectCursorHighlight, removeCursorHighlight } from './modules/cursor-highlight.js'
import { injectConsoleCapture, removeConsoleCapture, collectConsoleMessages, formatConsoleMessages } from './modules/console-capture.js'
import { summarizeConsole } from './modules/ai-summary.js'

const recorder = createRecorder(chrome)
let recordingTabId = null
let consoleActive = false

async function getConsoleOutput(tabId) {
  const messages = await collectConsoleMessages(chrome, tabId)
  const raw = formatConsoleMessages(messages)
  if (!raw) return ''

  const { openrouterKey } = await new Promise(resolve => {
    chrome.storage.local.get('openrouterKey', resolve)
  })

  if (openrouterKey) {
    const summary = await summarizeConsole(raw, openrouterKey)
    if (summary) return `\nConsole Summary (AI):\n${summary}`
  }

  return raw
}

async function uploadAndStoreResult(dataUrl, pageUrl) {
  const blob = dataUrlToBlob(dataUrl)
  const { workerUrl, apiKey } = await new Promise((resolve) => {
    chrome.storage.local.get(['workerUrl', 'apiKey'], resolve)
  })

  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  const result = await uploadVideo(blob, { workerUrl, apiKey })
  const originEnd = result.url.indexOf('/', result.url.indexOf('//') + 2)
  const watchUrl = result.url.slice(0, originEnd) + '/watch' + result.url.slice(originEnd)
  const clipboardText = formatVideoClipboardOutput({ videoUrl: watchUrl, pageUrl, timestamp })

  chrome.storage.local.set({
    lastVideoUrl: watchUrl,
    lastVideoClipboard: clipboardText,
  })
  chrome.storage.local.remove('pendingVideo')

  return { watchUrl, clipboardText }
}

recorder.onAutoStop = async (dataUrl) => {
  if (recordingTabId) removeCursorHighlight(chrome, recordingTabId).catch(() => {})
  if (consoleActive && recordingTabId) {
    try {
      const output = await getConsoleOutput(recordingTabId)
      if (output) chrome.storage.local.set({ pendingConsole: output })
      await removeConsoleCapture(chrome, recordingTabId).catch(() => {})
    } catch {}
    consoleActive = false
  }
  chrome.storage.local.set({ pendingVideo: dataUrl }, () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('video-preview.html') })
  })
}

function captureWithMetadata(tab, callback) {
  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  const pageUrl = tab?.url || ''

  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      callback({ error: chrome.runtime.lastError.message })
      return
    }
    chrome.storage.local.set({
      pendingScreenshot: dataUrl,
      pendingPageUrl: pageUrl,
      pendingTimestamp: timestamp,
    }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('annotate.html') }, () => {
        callback({ success: true })
      })
    })
  })
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      captureWithMetadata(tabs[0], () => {})
    })
  }

  if (command === 'toggle-recording') {
    if (recorder.isRecording()) {
      if (recordingTabId) removeCursorHighlight(chrome, recordingTabId).catch(() => {})
      recorder.stop().then(async (dataUrl) => {
        let consoleOutput = ''
        if (consoleActive && recordingTabId) {
          try {
            consoleOutput = await getConsoleOutput(recordingTabId)
            await removeConsoleCapture(chrome, recordingTabId).catch(() => {})
          } catch {}
          consoleActive = false
        }
        chrome.storage.local.set({ pendingVideo: dataUrl, pendingConsole: consoleOutput || '' }, () => {
          chrome.tabs.create({ url: chrome.runtime.getURL('video-preview.html') })
        })
      })
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        recordingTabId = tab.id
        chrome.storage.local.get(['recordAudio', 'captureConsole'], (result) => {
          const audio = result.recordAudio || false
          consoleActive = result.captureConsole || false
          chrome.storage.local.set({ recordingPageUrl: tab.url || '' })
          injectCursorHighlight(chrome, tab.id).catch(() => {})
          if (consoleActive) injectConsoleCapture(chrome, tab.id).catch(() => {})
          recorder.start(tab.id, { audio }).catch(() => {})
        })
      })
    }
  }
})

// Handle popup message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0]

      if (message.captureConsole) {
        try {
          const consoleOutput = await getConsoleOutput(tab.id)
          if (consoleOutput) chrome.storage.local.set({ pendingConsole: consoleOutput })
          await removeConsoleCapture(chrome, tab.id).catch(() => {})
        } catch {}
      }

      captureWithMetadata(tab, sendResponse)
    })
    return true
  }

  if (message.action === 'start-recording') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      recordingTabId = tab.id
      const audio = message.audio !== undefined ? message.audio : false
      consoleActive = message.captureConsole || false
      chrome.storage.local.set({ recordingPageUrl: tab.url || '', recordAudio: audio, captureConsole: consoleActive })
      injectCursorHighlight(chrome, tab.id).catch(() => {})
      if (consoleActive) injectConsoleCapture(chrome, tab.id).catch(() => {})
      recorder.start(tab.id, { audio })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ error: err.message }))
    })
    return true
  }

  if (message.action === 'stop-recording') {
    if (recordingTabId) removeCursorHighlight(chrome, recordingTabId).catch(() => {})
    recorder.stop()
      .then(async (dataUrl) => {
        let consoleOutput = ''
        if (consoleActive && recordingTabId) {
          try {
            consoleOutput = await getConsoleOutput(recordingTabId)
            await removeConsoleCapture(chrome, recordingTabId).catch(() => {})
          } catch {}
          consoleActive = false
        }
        chrome.storage.local.set({ pendingVideo: dataUrl, pendingConsole: consoleOutput || '' }, () => {
          chrome.tabs.create({ url: chrome.runtime.getURL('video-preview.html') }, () => {
            sendResponse({ success: true, preview: true })
          })
        })
      })
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === 'inject-console') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) injectConsoleCapture(chrome, tabs[0].id).catch(() => {})
    })
    return false
  }

  if (message.action === 'remove-console') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) removeConsoleCapture(chrome, tabs[0].id).catch(() => {})
    })
    return false
  }

  if (message.action === 'recording-status') {
    sendResponse({
      isRecording: recorder.isRecording(),
      elapsed: recorder.getElapsed(),
    })
    return false
  }
})
