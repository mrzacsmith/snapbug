export function formatClipboardOutput({ imageUrl, pageUrl, timestamp }) {
  let output = `![screenshot](${imageUrl})`
  if (pageUrl) output += `\nURL: ${pageUrl}`
  if (timestamp) output += `\nCaptured: ${timestamp}`
  return output
}

export function formatUrlOnly({ imageUrl }) {
  return imageUrl
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}
