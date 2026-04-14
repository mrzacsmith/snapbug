import { createRecorder } from './modules/recorder.js'

const recorder = createRecorder(chrome)

recorder.onAutoStop = (dataUrl) => {
  chrome.storage.local.set({ pendingVideo: dataUrl }, () => {
    // Auto-stop: video data stored, user can retrieve it
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
      recorder.stop().then((dataUrl) => {
        chrome.storage.local.set({ pendingVideo: dataUrl })
      })
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        recorder.start(tabs[0].id).catch(() => {})
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
      recorder.start(tabs[0].id)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ error: err.message }))
    })
    return true
  }

  if (message.action === 'stop-recording') {
    recorder.stop()
      .then((dataUrl) => {
        chrome.storage.local.set({ pendingVideo: dataUrl }, () => {
          sendResponse({ success: true, dataUrl })
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
