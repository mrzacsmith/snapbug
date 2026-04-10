export async function getSettings(chrome) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['workerUrl', 'apiKey'], (result) => {
      resolve({
        workerUrl: result.workerUrl || '',
        apiKey: result.apiKey || '',
      })
    })
  })
}

export async function saveSettings(chrome, { workerUrl, apiKey }) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ workerUrl, apiKey }, resolve)
  })
}

export async function isConfigured(chrome) {
  const { workerUrl, apiKey } = await getSettings(chrome)
  return Boolean(workerUrl && apiKey)
}

export function validateWorkerUrl(url) {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
