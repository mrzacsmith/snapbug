const DEFAULT_MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export function createRecorder(chrome, { maxDurationMs = DEFAULT_MAX_DURATION_MS } = {}) {
  let recording = false
  let startedAt = null
  let autoStopTimer = null

  const recorder = {
    onAutoStop: null,

    isRecording() {
      return recording
    },

    getElapsed() {
      if (!startedAt) return 0
      return Date.now() - startedAt
    },

    async start(tabId, { audio = false } = {}) {
      if (recording) throw new Error('Already recording')

      const hasDoc = await chrome.offscreen.hasDocument()
      if (!hasDoc) {
        await chrome.offscreen.createDocument({
          url: chrome.runtime.getURL('offscreen.html'),
          reasons: [chrome.offscreen.Reason.USER_MEDIA],
          justification: 'Recording tab video via MediaRecorder',
        })
      }

      const streamId = await new Promise((resolve) => {
        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, resolve)
      })

      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { target: 'offscreen', action: 'start-recording', streamId, audio },
          (res) => {
            if (res.error) reject(new Error(res.error))
            else resolve()
          }
        )
      })

      recording = true
      startedAt = Date.now()

      chrome.action.setBadgeText({ text: 'REC' })
      chrome.action.setBadgeBackgroundColor({ color: '#e53e3e' })

      autoStopTimer = setTimeout(async () => {
        const dataUrl = await recorder.stop()
        if (recorder.onAutoStop) recorder.onAutoStop(dataUrl)
      }, maxDurationMs)
    },

    async stop() {
      if (!recording) throw new Error('Not recording')

      if (autoStopTimer) {
        clearTimeout(autoStopTimer)
        autoStopTimer = null
      }

      const dataUrl = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { target: 'offscreen', action: 'stop-recording' },
          (res) => {
            if (res.error) reject(new Error(res.error))
            else resolve(res.dataUrl)
          }
        )
      })

      recording = false
      startedAt = null

      chrome.action.setBadgeText({ text: '' })

      return dataUrl
    },
  }

  return recorder
}
