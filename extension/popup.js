const captureBtn = document.getElementById('capture-btn')
const status = document.getElementById('status')

captureBtn.addEventListener('click', async () => {
  captureBtn.disabled = true
  status.textContent = 'Capturing...'

  chrome.runtime.sendMessage({ action: 'capture' }, (response) => {
    if (chrome.runtime.lastError) {
      status.textContent = `Error: ${chrome.runtime.lastError.message}`
      captureBtn.disabled = false
      return
    }
    if (response?.error) {
      status.textContent = `Error: ${response.error}`
      captureBtn.disabled = false
      return
    }
    status.textContent = 'Screenshot captured!'
    // Close popup after short delay so user sees the status
    setTimeout(() => window.close(), 500)
  })
})
