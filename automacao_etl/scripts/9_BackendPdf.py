import io
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter


def gerar_pdf_relatorio_bytes(url: str, wait_ms: int = 4000) -> bytes:
    """
    Abre a URL do relatório (Next.js) e gera um PDF página a página.
    Cada div marcada com [data-pdf-page] vira uma página A4 no PDF final.
    Retorna o PDF final como bytes.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            device_scale_factor=1.5,
        )
        page = context.new_page()

        print(f"Acessando URL do relatório: {url}")
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(wait_ms)

        page.wait_for_timeout(1000)
        page.evaluate(
            """
            () => {
              document.documentElement.style.background = "#ffffff";
              document.body.style.background = "#ffffff";
              document.body.style.margin = "0";
              document.body.style.padding = "0";
            }
            """
        )

        locator = page.locator("[data-pdf-page]")
        page_count = locator.count()
        if page_count == 0:
            raise RuntimeError("Nenhum elemento [data-pdf-page] encontrado na página.")

        print(f"Encontradas {page_count} páginas no relatório.")

        pdf_parts: List[bytes] = []

        for idx in range(page_count):
            print(f"Gerando PDF da página {idx + 1}/{page_count}...")

            page.evaluate(
                """
                (index) => {
                  const pages = Array.from(document.querySelectorAll('[data-pdf-page]'));
                  pages.forEach((el, i) => {
                    el.style.display = i === index ? 'block' : 'none';
                  });
                  window.scrollTo(0, 0);
                }
                """,
                idx,
            )

            page.wait_for_timeout(500)

            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
            )
            pdf_parts.append(pdf_bytes)

        writer = PdfWriter()
        for part in pdf_parts:
            reader = PdfReader(io.BytesIO(part))
            for p in reader.pages:
                writer.add_page(p)

        buffer = io.BytesIO()
        writer.write(buffer)

        context.close()
        browser.close()

        print("PDF final gerado em memória.")

    return buffer.getvalue()


class PdfRequest(BaseModel):
    url: str
    filename: Optional[str] = None
    wait_ms: int = 4000


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/pdf")
def gerar_pdf(req: PdfRequest):
    try:
        pdf_bytes = gerar_pdf_relatorio_bytes(req.url, wait_ms=req.wait_ms)
        filename = req.filename or "relatorio.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=9000)


if __name__ == "__main__":
    main()
