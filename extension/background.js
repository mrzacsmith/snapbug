chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message })
        return
      }
      chrome.storage.local.set({ pendingScreenshot: dataUrl }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('annotate.html') }, () => {
          sendResponse({ success: true })
        })
      })
    })
    return true // keep message channel open for async response
  }
})
