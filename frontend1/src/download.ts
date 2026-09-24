/** Triggers a browser download of the given blob */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Shows the blob in a tab opened beforehand.
 * The tab must be opened synchronously in the click handler (before any await),
 * otherwise the browser's popup blocker stops it.
 */
export function showBlobInTab(blob: Blob, tab: Window): void {
  const url = URL.createObjectURL(blob)
  tab.location.href = url
  // Give the tab time to load before releasing the blob
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
