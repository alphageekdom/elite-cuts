// Fetches `url` and triggers a browser download of the response body. Reads
// the filename from `Content-Disposition` when the server provides one,
// otherwise falls back to `fallbackName`. Returns `true` on success so the
// caller can decide which toast to fire — the verb varies per dashboard
// ("Customers exported", "Orders exported", etc.).
//
// Consumed by the four export buttons on the customers, products,
// inventory, and orders dashboards, which previously each carried this same
// ~25-line blob-and-anchor dance inline.

const FILENAME_RE = /filename="([^"]+)"/;

export async function downloadCsvFromUrl(
  url: string,
  fallbackName: string,
): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const filename = disposition.match(FILENAME_RE)?.[1] ?? fallbackName;

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
    return true;
  } catch (error) {
    console.warn('[downloadCsvFromUrl] failed', error);
    return false;
  }
}
