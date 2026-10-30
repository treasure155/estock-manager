/** Runtime platform checks. The Android app runs the same pages in Android's WebView. */
export const isAndroid = /Android/i.test(navigator.userAgent);
export const isMobile = isAndroid || /iPhone|iPad/i.test(navigator.userAgent);
export const RELEASES_URL = 'https://github.com/treasure155/estock-manager/releases/latest';

export async function openExternal(url: string) {
  try { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(url); }
  catch { window.open(url, '_blank', 'noopener'); }
}
