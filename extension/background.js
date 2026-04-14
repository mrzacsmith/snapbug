import { createRecorder } from './modules/recorder.js'
import { uploadVideo, dataUrlToBlob } from './modules/upload.js'
import { formatVideoClipboardOutput } from './modules/output.js'
import { injectCursorHighlight, removeCursorHighlight } from './modules/cursor-highlight.js'

const recorder = createRecorder(chrome)
let recordingTabId = null

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

recorder.onAutoStop = (dataUrl) => {
  if (recordingTabId) removeCursorHighlight(chrome, recordingTabId).catch(() => {})
  chrome.storage.local.get('recordingPageUrl', (result) => {
    uploadAndStoreResult(dataUrl, result.recordingPageUrl).then(({ watchUrl }) => {
      chrome.action.setBadgeText({ text: 'DONE' })
      chrome.action.setBadgeBackgroundColor({ color: '#38a169' })
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000)
    }).catch(() => {
      chrome.storage.local.set({ pendingVideo: dataUrl })
    })
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
      recorder.stop().then((dataUrl) => {
        chrome.storage.local.get('recordingPageUrl', (result) => {
          uploadAndStoreResult(dataUrl, result.recordingPageUrl).catch(() => {
            chrome.storage.local.set({ pendingVideo: dataUrl })
          })
        })
      })
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        recordingTabId = tab.id
        chrome.storage.local.get('recordAudio', (result) => {
          const audio = result.recordAudio || false
          chrome.storage.local.set({ recordingPageUrl: tab.url || '' })
          injectCursorHighlight(chrome, tab.id).catch(() => {})
          recorder.start(tab.id, { audio }).catch(() => {})
        })
      })
    }
  }
})

// Handle popup message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      captureWithMetadata(tabs[0], sendResponse)
    })
    return true
  }

  if (message.action === 'start-recording') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      recordingTabId = tab.id
      const audio = message.audio !== undefined ? message.audio : false
      chrome.storage.local.set({ recordingPageUrl: tab.url || '', recordAudio: audio })
      injectCursorHighlight(chrome, tab.id).catch(() => {})
      recorder.start(tab.id, { audio })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ error: err.message }))
    })
    return true
  }

  if (message.action === 'stop-recording') {
    if (recordingTabId) removeCursorHighlight(chrome, recordingTabId).catch(() => {})
    recorder.stop()
      .then((dataUrl) => {
        chrome.storage.local.get('recordingPageUrl', (result) => {
          uploadAndStoreResult(dataUrl, result.recordingPageUrl)
            .then(({ watchUrl, clipboardText }) => {
              sendResponse({ success: true, watchUrl, clipboardText })
            })
            .catch((err) => sendResponse({ error: err.message }))
        })
      })
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === 'recording-status') {
    sendResponse({
      isRecording: recorder.isRecording(),
      elapsed: recorder.getElapsed(),
    })
    return false
  }
})
