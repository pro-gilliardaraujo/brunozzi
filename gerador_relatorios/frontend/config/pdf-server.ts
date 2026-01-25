export async function generateRelatorioPdfFromUrl(
  url: string,
  filename: string,
  _context?: unknown
): Promise<Uint8Array> {
  const response = await fetch(url)
  const html = await response.text()
  const encoder = new TextEncoder()
  return encoder.encode(html)
}

