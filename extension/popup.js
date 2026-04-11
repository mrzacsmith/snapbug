import { checkForUpdate } from './modules/version-check.js'

const captureBtn = document.getElementById('capture-btn')
const statusMsg = document.getElementById('status-msg')
const warning = document.getElementById('unconfigured-warning')
const openSettingsLink = document.getElementById('open-settings')
const settingsLink = document.getElementById('settings-link')
const updateBanner = document.getElementById('update-banner')

function openSettings() {
  chrome.runtime.openOptionsPage()
}

openSettingsLink.addEventListener('click', (e) => {
  e.preventDefault()
  openSettings()
})

settingsLink.addEventListener('click', (e) => {
  e.preventDefault()
  openSettings()
})

updateBanner.addEventListener('click', (e) => {
  e.preventDefault()
  openSettings()
})

// Check if configured on popup open
chrome.storage.local.get(['workerUrl', 'apiKey'], (result) => {
  if (!result.workerUrl || !result.apiKey) {
    warning.style.display = 'block'
    captureBtn.disabled = true
  }
})

// Check for updates
checkForUpdate(chrome).then(({ updateAvailable, latestVersion }) => {
  if (updateAvailable && latestVersion) {
    updateBanner.textContent = `Update available: v${latestVersion}`
    updateBanner.style.display = 'block'
  }
})

captureBtn.addEventListener('click', async () => {
  captureBtn.disabled = true
  statusMsg.textContent = 'Capturing...'

  chrome.runtime.sendMessage({ action: 'capture' }, (response) => {
    if (chrome.runtime.lastError) {
      statusMsg.textContent = `Error: ${chrome.runtime.lastError.message}`
      captureBtn.disabled = false
      return
    }
    if (response?.error) {
      statusMsg.textContent = `Error: ${response.error}`
      captureBtn.disabled = false
      return
    }
    statusMsg.textContent = 'Screenshot captured!'
    setTimeout(() => window.close(), 500)
  })
})
