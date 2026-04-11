const GITHUB_MANIFEST_URL = 'https://raw.githubusercontent.com/mrzacsmith/snapbug/main/extension/manifest.json'
const CACHE_KEY = 'versionCheckCache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na < nb) return -1
    if (na > nb) return 1
  }
  return 0
}

export async function checkForUpdate(chrome) {
  const currentVersion = chrome.runtime.getManifest().version

  // Check cache first
  const cached = await new Promise((resolve) => {
    chrome.storage.local.get(CACHE_KEY, (result) => resolve(result[CACHE_KEY]))
  })

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      currentVersion,
      latestVersion: cached.latestVersion,
      updateAvailable: compareVersions(currentVersion, cached.latestVersion) < 0,
    }
  }

  // Fetch from GitHub
  try {
    const res = await fetch(GITHUB_MANIFEST_URL, { cache: 'no-store' })
    if (!res.ok) return { currentVersion, latestVersion: null, updateAvailable: false }
    const remote = await res.json()
    const latestVersion = remote.version

    // Cache result
    chrome.storage.local.set({
      [CACHE_KEY]: { latestVersion, timestamp: Date.now() },
    })

    return {
      currentVersion,
      latestVersion,
      updateAvailable: compareVersions(currentVersion, latestVersion) < 0,
    }
  } catch {
    return { currentVersion, latestVersion: null, updateAvailable: false }
  }
}
