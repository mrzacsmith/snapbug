export function formatClipboardOutput({ imageUrl, pageUrl, timestamp, consoleOutput }) {
  let output = `![screenshot](${imageUrl})`
  if (pageUrl) output += `\nURL: ${pageUrl}`
  if (timestamp) output += `\nCaptured: ${timestamp}`
  if (consoleOutput) output += `\n${consoleOutput}`
  return output
}

export function formatUrlOnly({ imageUrl }) {
  return imageUrl
}

export function formatVideoClipboardOutput({ videoUrl, pageUrl, timestamp }) {
  let output = `[Video recording](${videoUrl})`
  if (pageUrl) output += `\nURL: ${pageUrl}`
  if (timestamp) output += `\nRecorded: ${timestamp}`
  output += `\n(expires in 14 days)`
  return output
}

export function formatVideoUrlOnly({ videoUrl }) {
  return videoUrl
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}
