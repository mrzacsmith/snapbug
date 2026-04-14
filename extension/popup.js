import { checkForUpdate } from './modules/version-check.js'

const captureBtn = document.getElementById('capture-btn')
const recordBtn = document.getElementById('record-btn')
const recordingIndicator = document.getElementById('recording-indicator')
const recTimer = document.getElementById('rec-timer')
const stopBtn = document.getElementById('stop-btn')
const videoResult = document.getElementById('video-result')
const copyUrlBtn = document.getElementById('copy-url-btn')
const copyMdBtn = document.getElementById('copy-md-btn')
const audioCheckbox = document.getElementById('audio-checkbox')
const consoleCheckbox = document.getElementById('console-checkbox')
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

// Load preferences and inject console capture if enabled
chrome.storage.local.get(['recordAudio', 'captureConsole'], (result) => {
  audioCheckbox.checked = result.recordAudio || false
  consoleCheckbox.checked = result.captureConsole || false
  if (result.captureConsole) {
    chrome.runtime.sendMessage({ action: 'inject-console' })
  }
})

audioCheckbox.addEventListener('change', () => {
  chrome.storage.local.set({ recordAudio: audioCheckbox.checked })
})

consoleCheckbox.addEventListener('change', () => {
  chrome.storage.local.set({ captureConsole: consoleCheckbox.checked })
  chrome.runtime.sendMessage({
    action: consoleCheckbox.checked ? 'inject-console' : 'remove-console'
  })
})

// Check if configured on popup open
chrome.storage.local.get(['workerUrl', 'apiKey'], (result) => {
  if (!result.workerUrl || !result.apiKey) {
    warning.style.display = 'block'
    captureBtn.disabled = true
    recordBtn.disabled = true
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

  chrome.runtime.sendMessage({ action: 'capture', captureConsole: consoleCheckbox.checked }, (response) => {
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

// --- Video Recording ---

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

let timerInterval = null

function showRecordingUI() {
  recordBtn.style.display = 'none'
  captureBtn.style.display = 'none'
  recordingIndicator.style.display = 'flex'
}

function hideRecordingUI() {
  recordBtn.style.display = ''
  captureBtn.style.display = ''
  recordingIndicator.style.display = 'none'
  recTimer.textContent = '0:00'
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function startTimerPolling() {
  timerInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'recording-status' }, (response) => {
      if (response?.isRecording) {
        recTimer.textContent = formatTime(response.elapsed)
      } else {
        hideRecordingUI()
      }
    })
  }, 500)
}

// Check recording status on popup open
chrome.runtime.sendMessage({ action: 'recording-status' }, (response) => {
  if (response?.isRecording) {
    showRecordingUI()
    recTimer.textContent = formatTime(response.elapsed)
    startTimerPolling()
  }
})

// Show last video result if available
chrome.storage.local.get(['lastVideoUrl', 'lastVideoClipboard'], (result) => {
  if (result.lastVideoUrl) {
    showVideoResult(result.lastVideoUrl, result.lastVideoClipboard)
  }
})

recordBtn.addEventListener('click', () => {
  recordBtn.disabled = true
  statusMsg.textContent = 'Starting recording...'

  chrome.runtime.sendMessage({ action: 'start-recording', audio: audioCheckbox.checked, captureConsole: consoleCheckbox.checked }, (response) => {
    if (response?.error) {
      statusMsg.textContent = `Error: ${response.error}`
      recordBtn.disabled = false
      return
    }
    statusMsg.textContent = ''
    showRecordingUI()
    startTimerPolling()
  })
})

let lastVideoUrl = null
let lastClipboardText = null

function showVideoResult(watchUrl, clipboardText) {
  lastVideoUrl = watchUrl
  lastClipboardText = clipboardText
  videoResult.style.display = 'block'
  statusMsg.textContent = ''
}

copyUrlBtn.addEventListener('click', () => {
  if (lastVideoUrl) {
    navigator.clipboard.writeText(lastVideoUrl).then(() => {
      statusMsg.textContent = 'URL copied!'
    })
  }
})

copyMdBtn.addEventListener('click', () => {
  if (lastClipboardText) {
    navigator.clipboard.writeText(lastClipboardText).then(() => {
      statusMsg.textContent = 'Markdown copied!'
    })
  }
})

stopBtn.addEventListener('click', () => {
  stopBtn.disabled = true
  statusMsg.textContent = 'Stopping...'

  chrome.runtime.sendMessage({ action: 'stop-recording' }, (response) => {
    hideRecordingUI()
    stopBtn.disabled = false
    if (response?.error) {
      statusMsg.textContent = `Error: ${response.error}`
      return
    }
    // Preview page opens in a new tab
    window.close()
  })
})
