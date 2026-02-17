import { NextRequest } from "next/server"
import { spawn } from "child_process"
import { randomBytes } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export const dynamic = "force-dynamic"

async function runPythonPdfGenerator(url: string, filename: string) {
  const rootDir = path.join(process.cwd(), "..", "..")
  const scriptsDir = path.join(rootDir, "automacao_etl", "scripts")
  const scriptPath = path.join(scriptsDir, "9_BackendPdf.py")

  const tmpDir = path.join(rootDir, "automacao_etl", "pdfs_tmp")
  await fs.mkdir(tmpDir, { recursive: true })

  const id = randomBytes(8).toString("hex")
  const outputPath = path.join(tmpDir, `${id}.pdf`)

  await new Promise<void>((resolve, reject) => {
    const pythonCmd = process.env.PYTHON || "python"

    const child = spawn(
      pythonCmd,
      [scriptPath, "--url", url, "--output", outputPath],
      { cwd: rootDir }
    )

    let stderr = ""

    child.stderr.on("data", (data) => {
      stderr += data.toString()
      // Opcional: logar em tempo real no servidor
      console.error("[pdf-backend][py]", data.toString())
    })

    child.on("error", (err) => {
      reject(err)
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr || `Python exited with code ${code}`))
      }
    })
  })

  const pdfBuffer = await fs.readFile(outputPath)
  try {
    await fs.unlink(outputPath)
  } catch {
    // Se não conseguir apagar, seguimos assim mesmo
  }

  return pdfBuffer
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = typeof body?.url === "string" ? body.url : null
    const filename = typeof body?.filename === "string" && body.filename.trim() !== "" 
      ? body.filename.trim() 
      : "relatorio.pdf"

    if (!url) {
      return new Response("Parâmetro 'url' é obrigatório", { status: 400 })
    }

    const pdfBuffer = await runPythonPdfGenerator(url, filename)

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[api/pdf] Erro ao gerar PDF:", error)
    return new Response("Erro ao gerar PDF", { status: 500 })
  }
}

