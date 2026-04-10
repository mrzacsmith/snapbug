export function formatClipboardOutput({ imageUrl, pageUrl, timestamp }) {
  let output = `![screenshot](${imageUrl})`
  if (pageUrl) output += `\nURL: ${pageUrl}`
  if (timestamp) output += `\nCaptured: ${timestamp}`
  return output
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text)
}
