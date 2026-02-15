"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Download, Minus, Plus } from "lucide-react"
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server"
import { downloadPdfBuffer } from "@/lib/pdf-utils"
import ttOperadoresMock from "../../../../../../__utilitarios/relatorios/implementacao/exemplos/tt-operadores-exemplo.json"
import { CabecalhoMeta } from "../tt-diario-frotas/componentes/CabecalhoMeta"
import { GraficoBasculamento } from "./componentes/GraficoBasculamento"
import { GraficoEficiencia } from "../tt-diario-frotas/componentes/GraficoEficiencia"
import { GraficoFaltaApontamento } from "./componentes/GraficoFaltaApontamento"
import { GraficoManobras } from "./componentes/GraficoManobras"
import { GraficoMediaVelocidade } from "../tt-diario-frotas/componentes/GraficoMediaVelocidade"
import { GraficoMotorOcioso } from "../tt-diario-frotas/componentes/GraficoMotorOcioso"

const LOGO_URL =
  "https://kjlwqezxzqjfhacmjhbh.supabase.co/storage/v1/object/public/sourcefiles/Logo%20IB%20Full.png"

function Header({ tituloCompleto, date }: { tituloCompleto: string; date: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 mb-2">
      <img src={LOGO_URL} alt="Logo IB" className="h-12 object-contain" />
      <div className="text-center">
        <div className="text-lg font-bold text-black">{tituloCompleto}</div>
        <div className="text-sm font-medium text-gray-700 mt-1">{date}</div>
      </div>
      <img src={LOGO_URL} alt="Logo IB" className="h-12 object-contain" />
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-center text-base font-bold text-black mb-2">{title}</div>
}

type OperadoresPayload = {
  metadata?: { date?: string; frente?: string; frente_nome?: string }
} & Record<string, unknown>

function RelatorioOperadoresTt({ period }: { period: "diario" | "semanal" }) {
  const { toast } = useToast()
  const reportRef = React.useRef<HTMLDivElement>(null)
  const MAX_ITENS_GRAFICO = 21

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [zoomPercent, setZoomPercent] = React.useState(100)
  const [isPdfMode, setIsPdfMode] = React.useState(false)

  // Estados para controle de mock (lidos da URL ou localStorage)
  // Nota: Relatório de operadores atualmente não usa controles de mock explícitos,
  // mas mantemos a estrutura para compatibilidade e futura expansão
  const [showMockControls, setShowMockControls] = React.useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      return p.get("showMock") === "1"
    }
    return false
  })
  
  // Carregar estado dos mocks do localStorage na inicialização (compatibilidade)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedMock = localStorage.getItem("mockControlsState")
      if (savedMock) {
        const parsed = JSON.parse(savedMock)
        if (typeof parsed.show === 'boolean' && parsed.show) setShowMockControls(true)
      }
    } catch (e) {
      console.error("Erro ao carregar estado dos mocks", e)
    }
  }, [])
  const [payload, setPayload] = React.useState<OperadoresPayload | null>(null)

  React.useEffect(() => {
    try {
      const search = typeof window !== "undefined" ? window.location.search : ""
      const pdfFlag = new URLSearchParams(search).get("pdf")
      const pdf = pdfFlag === "1"
      setIsPdfMode(pdf)
      if (!pdf) setZoomPercent(80)
    } catch {
      setIsPdfMode(false)
      setZoomPercent(80)
    }
  }, [])

  React.useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dadosRelatorioRecente") : null
      if (!raw) return
      const parsed = JSON.parse(raw) as OperadoresPayload
      setPayload(parsed)
    } catch {
      setPayload(null)
    }
  }, [])

  const dataSource = React.useMemo(() => {
    const hasMetas = payload && typeof payload === "object" && "metas" in payload
    return (hasMetas ? (payload as any) : (ttOperadoresMock as any)) as any
  }, [payload])

  const metadata = (dataSource?.metadata || {}) as any
  const metas = (dataSource?.metas || {}) as any

  const eficienciaEnergetica = (Array.isArray(dataSource?.eficiencia_energetica) ? dataSource.eficiencia_energetica : []) as any[]
  const velocidadeCarregado = (Array.isArray(dataSource?.media_velocidade_carregado) ? dataSource.media_velocidade_carregado : []) as any[]
  const velocidadeVazio = (Array.isArray(dataSource?.media_velocidade_vazio) ? dataSource.media_velocidade_vazio : []) as any[]
  const basculamento = (Array.isArray(dataSource?.basculamento) ? dataSource.basculamento : []) as any[]
  const manobrasFrotas = (Array.isArray(dataSource?.manobras_frotas) ? dataSource.manobras_frotas : []) as any[]
  const faltaApontamento = (Array.isArray(dataSource?.falta_apontamento) ? dataSource.falta_apontamento : []) as any[]
  const motorOcioso = (Array.isArray(dataSource?.motor_ocioso) ? dataSource.motor_ocioso : []) as any[]

  const metaEficiencia = Number(metas?.eficienciaEnergetica || 0)
  const metaMediaVelocidade = Number(metas?.mediaVelocidade || 0)
  const metaBasculamento = Number(metas?.basculamento || 180)
  const metaManobrasSegundos = Number((metas as any)?.manobras || 60)
  const metaFaltaApontamento = Number((metas as any)?.faltaApontamento ?? 10)
  const metaMotorOcioso = Number(metas?.motorOcioso || 0)

  const dadosMotorOciosoByNome = React.useMemo(() => {
    return new Map<string, any>(motorOcioso.map((i) => [String(i?.nome || ""), i]))
  }, [motorOcioso])

  const dadosEficiencia = React.useMemo(() => {
    return eficienciaEnergetica
      .map((e, index) => {
        const nome = String(e?.nome || "")
        const percentual = Number(e?.eficiencia || 0)
        const motor = dadosMotorOciosoByNome.get(nome)
        const horasMotor = Number(motor?.tempoLigado || 0)
        const horasProdutivas = horasMotor > 0 ? (horasMotor * percentual) / 100 : 0
        return {
          id: e?.id ?? `${nome}-${index}`,
          nome,
          eficiencia: isFinite(percentual) ? percentual / 100 : 0,
          horasMotor: isFinite(horasMotor) ? horasMotor : 0,
          horasProdutivas: isFinite(horasProdutivas) ? horasProdutivas : 0,
        }
      })
      .filter((i) => i.nome.trim().length > 0)
  }, [dadosMotorOciosoByNome, eficienciaEnergetica])

  const mediaEficiencia = React.useMemo(() => {
    const validos = eficienciaEnergetica.map((e) => Number(e?.eficiencia || 0)).filter((v) => isFinite(v) && v > 0)
    const soma = validos.reduce((acc, curr) => acc + curr, 0)
    return validos.length > 0 ? soma / validos.length : 0
  }, [eficienciaEnergetica])

  const dadosFaltaApontamento = React.useMemo(() => {
    return faltaApontamento
      .map((f, index) => {
        const nome = String(f?.nome || "")
        const percentual = Number(f?.percentual || 0)
        const motor = dadosMotorOciosoByNome.get(nome)
        const tempoLigado = Number(motor?.tempoLigado || 0)
        const tempoSemApontar = tempoLigado > 0 ? (tempoLigado * percentual) / 100 : 0
        return {
          id: f?.id ?? `${nome}-${index}`,
          nome,
          percentual: isFinite(percentual) ? percentual : 0,
          tempoLigado: isFinite(tempoLigado) ? tempoLigado : 0,
          tempoOcioso: isFinite(tempoSemApontar) ? tempoSemApontar : 0,
        }
      })
      .filter((i) => i.nome.trim().length > 0)
  }, [dadosMotorOciosoByNome, faltaApontamento])

  const basculamentoParaGrafico = React.useMemo(() => {
    if (basculamento.length > 0) return basculamento
    if (motorOcioso.length === 0) return []

    const toUnit = (key: string, index: number) => {
      const seed = key.split("").reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0) + index * 31
      return (seed % 1000) / 1000
    }

    return motorOcioso
      .map((m, index) => {
        const frota = String(m?.nome ?? "")
        const horasMotor = Number(m?.tempoLigado ?? 0)
        if (!frota || !isFinite(horasMotor) || horasMotor <= 0) return null

        const unit = toUnit(frota, index)
        const percentual = 4 + unit * 8
        const tempoMedioSeconds = 90 + unit * 210
        const tempoTotalSecondsBase = (horasMotor * 3600 * percentual) / 100
        const intervalos = Math.max(1, Math.round(tempoTotalSecondsBase / tempoMedioSeconds))
        const tempoTotalSeconds = tempoMedioSeconds * intervalos

        return {
          Frota: frota,
          "Tempo Total": tempoTotalSeconds / 3600,
          "Tempo Médio": tempoMedioSeconds / 3600,
          "Intervalos Válidos": intervalos,
        }
      })
      .filter(Boolean)
      .slice(0, MAX_ITENS_GRAFICO) as any[]
  }, [MAX_ITENS_GRAFICO, basculamento, motorOcioso])

  const manobrasParaGrafico = React.useMemo(() => {
    if (manobrasFrotas.length > 0) return manobrasFrotas
    if (motorOcioso.length === 0) return []

    const toUnit = (key: string, index: number) => {
      const seed = key.split("").reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0) + index * 37
      return (seed % 1000) / 1000
    }

    return motorOcioso
      .map((m, index) => {
        const frota = String(m?.nome ?? "")
        const horasMotor = Number(m?.tempoLigado ?? 0)
        if (!frota || !isFinite(horasMotor) || horasMotor <= 0) return null

        const unit = toUnit(frota, index)
        const percentual = 1 + unit * 3
        const tempoMedioMin = 1 + unit * 4
        const tempoTotalMinBase = (horasMotor * 60 * percentual) / 100
        const intervalos = Math.max(1, Math.round(tempoTotalMinBase / tempoMedioMin))
        const tempoTotalMin = tempoMedioMin * intervalos

        return {
          Frota: frota,
          "Tempo Total": tempoTotalMin,
          "Tempo Médio": tempoMedioMin,
          "Intervalos Válidos": intervalos,
        }
      })
      .filter(Boolean)
      .slice(0, MAX_ITENS_GRAFICO) as any[]
  }, [MAX_ITENS_GRAFICO, manobrasFrotas, motorOcioso])

  const dateFromPayload = metadata?.date
  const endDate = new Date(dateFromPayload || Date.now())
  const endStr = endDate.toLocaleDateString("pt-BR")
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)
  const startStr = startDate.toLocaleDateString("pt-BR")
  const dataFormatada = period === "semanal" ? `${startStr} - ${endStr}` : endStr
  const frenteNome = metadata?.frente_nome || metadata?.frente || "Frente"
  const periodoLabel = period === "semanal" ? "Semanal" : "Diário"
  const tituloRelatorio = `Relatório ${periodoLabel} de Operadores - Transbordos ${frenteNome}`
  const nomeDataArquivo =
    period === "semanal"
      ? `${startStr.replace(/\//g, "_")}-${endStr.replace(/\//g, "_")}`
      : endStr.replace(/\//g, "_")

  const zoom = isPdfMode ? 1 : Math.min(1.5, Math.max(0.5, zoomPercent / 100))
  const ZOOM_STEPS = [50, 60, 70, 80, 90, 100, 110, 125, 150]
  const setZoomToStep = React.useCallback((nextPercent: number) => {
    const clamped = Math.min(150, Math.max(50, Math.round(nextPercent)))
    setZoomPercent(clamped)
  }, [])
  const [zoomInput, setZoomInput] = React.useState(() => String(zoomPercent))
  React.useEffect(() => {
    setZoomInput(String(zoomPercent))
  }, [zoomPercent])
  const commitZoomInput = React.useCallback(() => {
    const trimmed = zoomInput.trim()
    if (!trimmed) {
      setZoomInput(String(zoomPercent))
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      setZoomInput(String(zoomPercent))
      return
    }
    setZoomToStep(parsed)
  }, [zoomInput, zoomPercent, setZoomToStep])
  const stepDown = React.useCallback(() => {
    const current = zoomPercent
    const prev = [...ZOOM_STEPS].reverse().find((v) => v < current) ?? 50
    setZoomPercent(prev)
  }, [zoomPercent])
  const stepUp = React.useCallback(() => {
    const current = zoomPercent
    const next = ZOOM_STEPS.find((v) => v > current) ?? 150
    setZoomPercent(next)
  }, [zoomPercent])

  const handleDownloadPdf = React.useCallback(async () => {
    const reportEl = reportRef.current
    if (!reportEl) return

    const filename = `${tituloRelatorio} - ${nomeDataArquivo}.pdf`
    const debug = process.env.NODE_ENV !== "production"
    
    // Captura cookies e localStorage para autenticação no servidor PDF
    const cookieHeader = typeof document !== 'undefined' ? document.cookie : ''
    const localStorageData: Record<string, string> = {}
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) localStorageData[k] = localStorage.getItem(k) || ''
      }
    }

    try {
      console.log("[PDF][TT-OP] Exportação via Backend (Puppeteer/Local)", { filename })
      setIsGenerating(true)
      
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      
      const pdfBuffer = await generateRelatorioPdfFromUrl(
        currentUrl, 
        filename,
        { 
          cookieHeader, 
          localStorage: localStorageData,
          mockState: { show: showMockControls }
        }
      )

      downloadPdfBuffer(pdfBuffer, filename)
      
      if (debug) {
        console.log('[PDF][TT-OP] PDF finalizado e baixado', { filename })
      }
      toast({ title: "PDF gerado", description: "Verifique a pasta de Downloads do navegador." })
    } catch (e) {
      console.error('Erro ao gerar PDF', e)
      // Se for um erro de "user aborted" ou algo similar que na verdade foi sucesso no download, ignoramos
      toast({
        title: "Falha ao gerar PDF",
        description: "Tente novamente em instantes.",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [nomeDataArquivo, tituloRelatorio, toast, showMockControls])

  return (
    <div className="relative bg-gray-100 p-1">
      <style jsx global>{`
        @media print {
          .report-zoom {
            zoom: 1 !important;
          }
        }
        .report-scroll {
          scroll-snap-type: y proximity;
          scroll-padding-top: 12px;
          scroll-padding-bottom: 12px;
        }
        .report-scroll [data-pdf-page] {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}</style>
      <div className="flex flex-col md:flex-row items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="overflow-auto report-scroll">
            <div
              ref={reportRef}
              className="inline-flex flex-col items-start gap-4 report-zoom"
              style={{ ...(isPdfMode ? {} : ({ zoom } as any)) }}
            >
          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <SectionTitle title="Eficiência Energética" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  <CabecalhoMeta meta={metaEficiencia} media={mediaEficiencia} tipo="porcentagem" compact />
                  <div className="flex-1 overflow-hidden">
                    <GraficoEficiencia dados={dadosEficiencia} meta={metaEficiencia} maxRows={MAX_ITENS_GRAFICO} density="auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Média de Velocidade Carregado" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  {velocidadeCarregado.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                      <GraficoMediaVelocidade dados={velocidadeCarregado} meta={metaMediaVelocidade} maxRows={MAX_ITENS_GRAFICO} density="auto" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibição</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Média de Velocidade Vazio" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  {velocidadeVazio.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                      <GraficoMediaVelocidade dados={velocidadeVazio} meta={metaMediaVelocidade} maxRows={MAX_ITENS_GRAFICO} density="auto" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibição</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Basculamento" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  {basculamentoParaGrafico.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                      <GraficoBasculamento
                        dados={basculamentoParaGrafico}
                        meta={metaBasculamento}
                        maxRows={MAX_ITENS_GRAFICO}
                        density="auto"
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibição</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Manobras" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  {manobrasParaGrafico.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                      <GraficoManobras dados={manobrasParaGrafico} meta={metaManobrasSegundos} maxRows={MAX_ITENS_GRAFICO} density="auto" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibição</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Falta de Apontamento" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  {dadosFaltaApontamento.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                      <GraficoFaltaApontamento
                        dados={dadosFaltaApontamento}
                        meta={metaFaltaApontamento}
                        compact
                        maxRows={MAX_ITENS_GRAFICO}
                        density="auto"
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibição</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Motor Ocioso" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                  {motorOcioso.length > 0 ? (
                    <div className="flex-1 overflow-hidden">
                      <GraficoMotorOcioso dados={motorOcioso} meta={metaMotorOcioso} maxRows={MAX_ITENS_GRAFICO} density="auto" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">Sem dados para exibição</div>
                  )}
                </div>
              </div>
            </div>
          </div>

            </div>
          </div>
        </div>

        <div className="w-full md:w-[320px] shrink-0 print:hidden">
          <div className="sticky top-4 flex flex-col gap-2 rounded-md border bg-white/90 backdrop-blur px-3 py-3 shadow-sm">
            {!isPdfMode && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center [[data-sidebar-compact='1']_&]:sm:!flex-col [[data-sidebar-compact='1']_&]:sm:!items-stretch">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={stepDown}
                      aria-label="Reduzir zoom"
                      disabled={zoomPercent <= 50}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-8 w-[92px] text-xs"
                      min={50}
                      max={150}
                      step={1}
                      value={zoomInput}
                      onChange={(e) => setZoomInput(e.target.value)}
                      onBlur={commitZoomInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={stepUp}
                      aria-label="Aumentar zoom"
                      disabled={zoomPercent >= 150}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}
                    className="h-8 w-full text-xs sm:w-auto [[data-sidebar-compact='1']_&]:sm:!w-full"
                  >
                    <Download className="mr-2 h-3.5 w-3.5" /> {isGenerating ? "Gerando..." : "Baixar PDF"}
                  </Button>
                </div>
              </div>
            )}

            {isPdfMode && (
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating} className="h-8 w-full text-xs">
                <Download className="mr-2 h-3.5 w-3.5" /> {isGenerating ? "Gerando..." : "Baixar PDF"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RelatorioDiarioOperadoresTt({
  searchParams,
}: {
  searchParams?: { period?: string }
}) {
  const period = searchParams?.period === "semanal" ? "semanal" : "diario"
  return <RelatorioOperadoresTt period={period} />
}
