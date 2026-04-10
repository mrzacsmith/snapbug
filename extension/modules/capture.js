/**
 * Capture the visible tab and store the screenshot data URL.
 * Returns a promise that resolves with { success: true } or rejects with an error.
 */
export async function captureAndOpen(chrome) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!dataUrl) {
        reject(new Error('No screenshot data received'))
        return
      }
      chrome.storage.local.set({ pendingScreenshot: dataUrl }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('annotate.html') }, () => {
          resolve({ success: true })
        })
      })
    })
  })
}

/**
 * Load pending screenshot from storage.
 * Returns the data URL or null if none exists.
 */
export async function loadPendingScreenshot(chrome) {
  return new Promise((resolve) => {
    chrome.storage.local.get('pendingScreenshot', (result) => {
      resolve(result.pendingScreenshot || null)
    })
  })
}

/**
 * Clean up pending screenshot from storage.
 */
export async function clearPendingScreenshot(chrome) {
  return new Promise((resolve) => {
    chrome.storage.local.remove('pendingScreenshot', resolve)
  })
}
