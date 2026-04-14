export function formatClipboardOutput({ imageUrl, pageUrl, timestamp }) {
  let output = `![screenshot](${imageUrl})`
  if (pageUrl) output += `\nURL: ${pageUrl}`
  if (timestamp) output += `\nCaptured: ${timestamp}`
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

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}
