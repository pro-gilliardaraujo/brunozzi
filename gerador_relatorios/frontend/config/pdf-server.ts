export async function generateRelatorioPdfFromUrl(
  url: string,
  filename: string,
  _context?: unknown
): Promise<Uint8Array> {
  const backendUrl =
    process.env.NEXT_PUBLIC_PDF_BACKEND_URL || "http://127.0.0.1:9000/pdf"

  const response = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, filename }),
  })

  if (!response.ok) {
    throw new Error("Falha ao gerar PDF")
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}
