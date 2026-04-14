let recorder = null
let chunks = []

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return

  if (message.action === 'start-recording') {
    startRecording(message.streamId).then(() => sendResponse({ ok: true })).catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === 'stop-recording') {
    stopRecording().then(blob => {
      const reader = new FileReader()
      reader.onloadend = () => sendResponse({ dataUrl: reader.result })
      reader.readAsDataURL(blob)
    }).catch(err => sendResponse({ error: err.message }))
    return true
  }
})

async function startRecording(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  })

  chunks = []
  recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  recorder.start()
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === 'inactive') {
      return reject(new Error('No active recording'))
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      chunks = []

      recorder.stream.getTracks().forEach(track => track.stop())
      recorder = null

      resolve(blob)
    }

    recorder.stop()
  })
}
