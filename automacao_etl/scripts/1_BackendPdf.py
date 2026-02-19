import io
import os
from threading import Lock
from time import time
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter


_generation_lock = Lock()
_generation_started_at: float | None = None


def _ensure_pdf_url(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    if query.get("pdf", [None])[0] != "1":
        query["pdf"] = ["1"]
    new_query = urlencode(query, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


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

        target_url = _ensure_pdf_url(url)
        print(f"Acessando URL do relatório: {target_url}")
        page.goto(target_url, wait_until="networkidle")
        page.wait_for_timeout(wait_ms)
        page.emulate_media(media="screen")
        page.wait_for_selector("[data-pdf-page]")

        last_count = -1
        stable_ticks = 0
        for _ in range(10):
            count_now = page.locator("[data-pdf-page]").count()
            if count_now == last_count:
                stable_ticks += 1
            else:
                stable_ticks = 0
                last_count = count_now
            if stable_ticks >= 2:
                break
            page.wait_for_timeout(400)

        page.wait_for_timeout(1000)
        page.evaluate(
            """
            () => {
              document.documentElement.style.background = "#ffffff";
              document.body.style.background = "#ffffff";
            }
            """
        )
        try:
            page.wait_for_function(
                "document.fonts && document.fonts.status === 'loaded'", timeout=5000
            )
        except Exception:
            pass

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
                    if (!el.dataset.originalDisplay) {
                      const computed = getComputedStyle(el).display || 'block';
                      el.dataset.originalDisplay = computed;
                    }
                    el.style.display = 'none';
                  });
                  const current = pages[index];
                  if (current) {
                    const original = current.dataset.originalDisplay || 'block';
                    current.style.display = original;
                  }
                  const utilPanel = document.querySelector('[data-utilities-panel]');
                  if (utilPanel) utilPanel.style.display = 'none';
                  const scrollWrap = document.querySelector('.report-scroll');
                  if (scrollWrap) scrollWrap.style.overflow = 'visible';
                  window.scrollTo(0, 0);
                }
                """,
                idx,
            )

            try:
                page.wait_for_function(
                    """
                    (index) => {
                      const pages = Array.from(document.querySelectorAll('[data-pdf-page]'));
                      const el = pages[index];
                      if (!el) return false;
                      const rect = el.getBoundingClientRect();
                      if (!rect || rect.height < 20) return false;
                      const imgs = Array.from(el.querySelectorAll('img'));
                      return imgs.every(img => img.complete && img.naturalWidth > 0);
                    }
                    """,
                    idx,
                    timeout=15000,
                )
            except Exception:
                pass
            page.wait_for_timeout(200)

            pdf_bytes = page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
                page_ranges="1",
            )
            pdf_parts.append(pdf_bytes)

        writer = PdfWriter()
        for idx, part in enumerate(pdf_parts):
            reader = PdfReader(io.BytesIO(part))
            if len(reader.pages) == 0:
                continue
            if len(reader.pages) > 1:
                print(
                    f"Aviso: parte {idx + 1} gerou {len(reader.pages)} páginas; mantendo apenas a primeira."
                )
            writer.add_page(reader.pages[0])

        buffer = io.BytesIO()
        writer.write(buffer)

        context.close()
        browser.close()

        print(f"PDF final gerado em memória com {len(writer.pages)} páginas.")

    return buffer.getvalue()


class PdfRequest(BaseModel):
    url: str
    filename: Optional[str] = None
    wait_ms: int = 4000


app = FastAPI()

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/pdf")
def gerar_pdf(req: PdfRequest):
    acquired = _generation_lock.acquire(blocking=False)
    if not acquired:
        raise HTTPException(status_code=429, detail="Geração já em andamento. Aguarde finalizar.")
    global _generation_started_at
    _generation_started_at = time()
    try:
        pdf_bytes = gerar_pdf_relatorio_bytes(req.url, wait_ms=req.wait_ms)
        filename = (req.filename or "relatorio.pdf").strip() or "relatorio.pdf"
        safe_filename = filename.replace("/", "_").replace("\\", "_")
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        pdfs_dir = os.path.join(root_dir, "pdfs")
        os.makedirs(pdfs_dir, exist_ok=True)
        output_path = os.path.join(pdfs_dir, safe_filename)
        with open(output_path, "wb") as f:
            f.write(pdf_bytes)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        _generation_started_at = None
        _generation_lock.release()


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=9000)


if __name__ == "__main__":
    main()
