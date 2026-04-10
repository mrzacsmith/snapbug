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

// Handle keyboard shortcut (Alt+Shift+S)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      captureWithMetadata(tabs[0], () => {})
    })
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
})
