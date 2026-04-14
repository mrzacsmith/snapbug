const form = document.getElementById('settings-form')
const workerUrlInput = document.getElementById('worker-url')
const apiKeyInput = document.getElementById('api-key')
const openrouterKeyInput = document.getElementById('openrouter-key')
const settingsStatus = document.getElementById('settings-status')

// Load saved settings on open
chrome.storage.local.get(['workerUrl', 'apiKey', 'openrouterKey'], (result) => {
  if (result.workerUrl) workerUrlInput.value = result.workerUrl
  if (result.apiKey) apiKeyInput.value = result.apiKey
  if (result.openrouterKey) openrouterKeyInput.value = result.openrouterKey
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

  const openrouterKey = openrouterKeyInput.value.trim()
  chrome.storage.local.set({ workerUrl, apiKey, openrouterKey }, () => {
    settingsStatus.textContent = 'Settings saved!'
    setTimeout(() => { settingsStatus.textContent = '' }, 2000)
  })
})

// Display version + update check
import { checkForUpdate } from './modules/version-check.js'

const versionDisplay = document.getElementById('version-display')
const currentVersion = chrome.runtime.getManifest().version
versionDisplay.textContent = `v${currentVersion}`

checkForUpdate(chrome).then(({ updateAvailable, latestVersion, currentVersion: cv }) => {
  versionDisplay.textContent = ''

  const versionText = document.createTextNode(`v${cv} — `)
  versionDisplay.appendChild(versionText)

  if (updateAvailable && latestVersion) {
    const updateSpan = document.createElement('span')
    updateSpan.className = 'update-available'
    updateSpan.textContent = `Update available: v${latestVersion}`
    versionDisplay.appendChild(updateSpan)

    const br = document.createElement('br')
    versionDisplay.appendChild(br)

    const instructionSpan = document.createElement('span')
    instructionSpan.className = 'helper-text'
    instructionSpan.textContent = 'Run git pull and reload the extension.'
    versionDisplay.appendChild(instructionSpan)
  } else {
    const upToDateSpan = document.createElement('span')
    upToDateSpan.className = 'up-to-date'
    upToDateSpan.textContent = 'Up to date'
    versionDisplay.appendChild(upToDateSpan)
  }
})
