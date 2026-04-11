export function createToast(container, { doc = document } = {}) {
  let currentToast = null
  let dismissTimer = null

  function remove() {
    if (currentToast && currentToast.parentNode) {
      currentToast.parentNode.removeChild(currentToast)
    }
    currentToast = null
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  }

  function show(message, { type = 'error', duration = 5000 } = {}) {
    remove()

    const el = doc.createElement('div')
    el.className = `toast toast-${type}`
    el.textContent = message

    const closeBtn = doc.createElement('button')
    closeBtn.className = 'toast-close'
    closeBtn.textContent = '\u00D7'
    closeBtn.addEventListener('click', remove)
    el.appendChild(closeBtn)

    container.appendChild(el)
    currentToast = el

    dismissTimer = setTimeout(remove, duration)
  }

  return { show }
}
