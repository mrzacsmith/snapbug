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

// Display version + update check
const versionDisplay = document.getElementById('version-display')
const manifest = chrome.runtime.getManifest()
const currentVersion = manifest.version
versionDisplay.textContent = `v${currentVersion}`

function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na < nb) return -1
    if (na > nb) return 1
  }
  return 0
}

async function checkForUpdate() {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/mrzacsmith/snapbug/main/extension/manifest.json',
      { cache: 'no-store' }
    )
    if (!res.ok) return
    const remote = await res.json()
    const latestVersion = remote.version

    // Clear and rebuild version display using safe DOM methods
    versionDisplay.textContent = ''

    const versionText = document.createTextNode(`v${currentVersion} — `)
    versionDisplay.appendChild(versionText)

    if (compareVersions(currentVersion, latestVersion) < 0) {
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
  } catch {
    // Network error — silently ignore
  }
}

checkForUpdate()
