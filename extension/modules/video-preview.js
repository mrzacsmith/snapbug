export async function loadPendingVideo(chrome) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingVideo', 'recordingPageUrl'], (result) => {
      resolve({
        dataUrl: result.pendingVideo || null,
        pageUrl: result.recordingPageUrl || '',
      })
    })
  })
}

export async function clearPendingVideo(chrome) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['pendingVideo', 'recordingPageUrl'], resolve)
  })
}

export function buildWatchUrl(rawUrl) {
  const originEnd = rawUrl.indexOf('/', rawUrl.indexOf('//') + 2)
  return rawUrl.slice(0, originEnd) + '/watch' + rawUrl.slice(originEnd)
}
