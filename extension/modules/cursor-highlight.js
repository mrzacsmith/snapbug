export async function injectCursorHighlight(chrome, tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (document.getElementById('snapbug-cursor-highlight')) return

      const el = document.createElement('div')
      el.id = 'snapbug-cursor-highlight'
      Object.assign(el.style, {
        position: 'fixed',
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'rgba(255, 200, 0, 0.35)',
        border: '2px solid rgba(255, 180, 0, 0.6)',
        pointerEvents: 'none',
        zIndex: '2147483647',
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.05s, top 0.05s',
        left: '-100px',
        top: '-100px',
      })
      document.body.appendChild(el)

      function onMove(e) {
        el.style.left = e.clientX + 'px'
        el.style.top = e.clientY + 'px'
      }
      document.addEventListener('mousemove', onMove)
      el._snapbugCleanup = () => document.removeEventListener('mousemove', onMove)
    },
  })
}

export async function removeCursorHighlight(chrome, tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const el = document.getElementById('snapbug-cursor-highlight')
      if (el) {
        if (el._snapbugCleanup) el._snapbugCleanup()
        el.remove()
      }
    },
  })
}
