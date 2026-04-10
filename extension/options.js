const form = document.getElementById('settings-form')
const workerUrlInput = document.getElementById('worker-url')
const apiKeyInput = document.getElementById('api-key')
const settingsStatus = document.getElementById('settings-status')

// Load saved settings on open
chrome.storage.local.get(['workerUrl', 'apiKey'], (result) => {
  if (result.workerUrl) workerUrlInput.value = result.workerUrl
  if (result.apiKey) apiKeyInput.value = result.apiKey
})

form.addEventListener('submit', (e) => {
  e.preventDefault()

  const workerUrl = workerUrlInput.value.trim()
  const apiKey = apiKeyInput.value.trim()

  if (!workerUrl || !apiKey) {
    settingsStatus.textContent = 'Both fields are required.'
    return
  }

  try {
    new URL(workerUrl)
  } catch {
    settingsStatus.textContent = 'Please enter a valid URL.'
    return
  }

  chrome.storage.local.set({ workerUrl, apiKey }, () => {
    settingsStatus.textContent = 'Settings saved!'
    setTimeout(() => { settingsStatus.textContent = '' }, 2000)
  })
})
