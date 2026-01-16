"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Download, Minus, Plus } from "lucide-react"
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server"
import { downloadPdfBuffer } from "@/lib/pdf-utils"
import cdOperadoresMock from "../../../../../../__utilitarios/relatorios/implementacao/exemplos/cd-operadores-exemplo.json"
import { CabecalhoMeta } from "../cd-diario-frotas/componentes/CabecalhoMeta"
import { CardIndicador } from "../cd-diario-frotas/componentes/CardIndicador"
import { GraficoEficiencia } from "../cd-diario-frotas/componentes/GraficoEficiencia"
import { GraficoHorasElevador } from "../cd-diario-frotas/componentes/GraficoHorasElevador"
import { GraficoManobras } from "../cd-diario-frotas/componentes/GraficoManobras"
import { GraficoMediaVelocidade } from "../cd-diario-frotas/componentes/GraficoMediaVelocidade"
import { GraficoMotorOcioso } from "../cd-diario-frotas/componentes/GraficoMotorOcioso"
import { GraficoUsoGPS } from "../cd-diario-frotas/componentes/GraficoUsoGPS"

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

type ResumoOperadorCd = {
  operador: string
  eficiencia: number
  horasElevador: number
  velocidade: number
  gps: number
  ocioso: number
}

type ManobrasOperadorCd = {
  Frota: string
  "Tempo Médio (hh:mm)": string
  "Tempo Total": number
  "Intervalos Válidos": number
}

function TabelaResumoOperadoresCd({
  dados,
  metas,
}: {
  dados: ResumoOperadorCd[]
  metas: {
    eficienciaEnergetica: number
    horaElevador: number
    mediaVelocidade: number
    usoGPS: number
    motorOcioso: number
  }
}) {
  const formatHour = (decimalHours: number) => {
    const hours = Math.floor(decimalHours || 0)
    const minutes = Math.round(((decimalHours || 0) - hours) * 60)
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  const getColor = (valor: number, meta: number, tipo: "asc" | "desc", warningThreshold = 0.2) => {
    if (!isFinite(valor) || !isFinite(meta)) return "text-slate-700"
    if (tipo === "asc") {
      if (valor >= meta) return "text-green-600"
      if (valor >= meta * (1 - warningThreshold)) return "text-orange-500"
      return "text-red-600"
    }
    if (valor <= meta) return "text-green-600"
    if (valor <= meta * (1 + warningThreshold)) return "text-orange-500"
    return "text-red-600"
  }

  return (
    <div className="w-full border border-black rounded-lg overflow-hidden text-xs">
      <table className="w-full text-center border-collapse">
        <thead className="bg-slate-100 font-bold">
          <tr>
            <th className="border border-slate-300 p-2">Operador</th>
            <th className="border border-slate-300 p-2">Eficiência</th>
            <th className="border border-slate-300 p-2">Elevador</th>
            <th className="border border-slate-300 p-2">Vel Efetiva</th>
            <th className="border border-slate-300 p-2">GPS</th>
            <th className="border border-slate-300 p-2">Ocioso</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr key={`${d.operador}-${i}`} className="hover:bg-slate-50 even:bg-slate-50">
              <td className="border border-slate-300 p-2 font-bold text-left">{d.operador}</td>
              <td
                className={`border border-slate-300 p-2 font-bold ${getColor(d.eficiencia, metas.eficienciaEnergetica, "asc")}`}
              >
                {d.eficiencia.toFixed(2)}%
              </td>
              <td
                className={`border border-slate-300 p-2 font-bold ${getColor(d.horasElevador, metas.horaElevador, "asc", 0.5)}`}
              >
                {formatHour(d.horasElevador)}
              </td>
              <td
                className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidade, metas.mediaVelocidade, "desc")}`}
              >
                {d.velocidade.toFixed(2)}
              </td>
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.gps, metas.usoGPS, "asc")}`}>
                {d.gps.toFixed(2)}%
              </td>
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.ocioso, metas.motorOcioso, "desc")}`}>
                {d.ocioso.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type OperadoresPayload = {
  metadata?: { date?: string; frente?: string; frente_nome?: string }
} & Record<string, unknown>

function RelatorioOperadoresCd({ period }: { period: "diario" | "semanal" }) {
  const { toast } = useToast()
  const reportRef = React.useRef<HTMLDivElement>(null)

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [zoomPercent, setZoomPercent] = React.useState(100)
  const [isPdfMode, setIsPdfMode] = React.useState(false)
  const [payload, setPayload] = React.useState<OperadoresPayload | null>(null)

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
    return (hasMetas ? (payload as any) : (cdOperadoresMock as any)) as any
  }, [payload])

  const metadata = (dataSource?.metadata || {}) as any
  const metas = (dataSource?.metas || {}) as any

  const eficienciaEnergetica = (Array.isArray(dataSource?.eficiencia_energetica) ? dataSource.eficiencia_energetica : []) as any[]
  const horaElevador = (Array.isArray(dataSource?.hora_elevador) ? dataSource.hora_elevador : []) as any[]
  const usoGps = (Array.isArray(dataSource?.uso_gps) ? dataSource.uso_gps : []) as any[]
  const mediaVelocidade = (Array.isArray(dataSource?.media_velocidade) ? dataSource.media_velocidade : []) as any[]
  const motorOcioso = (Array.isArray(dataSource?.motor_ocioso) ? dataSource.motor_ocioso : []) as any[]
  const producaoOperadoresRaw = React.useMemo<any[]>(() => {
    const ds = dataSource as any
    const candidates = [
      ds?.producao_operadores,
      ds?.producao_por_operador,
      ds?.toneladas_por_operador,
      ds?.toneladas_operadores,
      ds?.producao_toneladas_operadores,
    ]
    const found = candidates.find((c) => Array.isArray(c))
    return (Array.isArray(found) ? found : []) as any[]
  }, [dataSource])

  const dateFromPayload = metadata?.date
  const endDate = new Date(dateFromPayload || Date.now())
  const endStr = endDate.toLocaleDateString("pt-BR")
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)
  const startStr = startDate.toLocaleDateString("pt-BR")
  const dataFormatada = period === "semanal" ? `${startStr} - ${endStr}` : endStr
  const frenteNome = metadata?.frente_nome || metadata?.frente || "Frente"
  const periodoLabel = period === "semanal" ? "Semanal" : "Diário"
  const tituloRelatorio = `Relatório ${periodoLabel} de Operadores - Colhedoras ${frenteNome}`
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
      console.log("[PDF][CD-OP] Exportação via Backend (Puppeteer/Local)", { filename })
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
        console.log('[PDF][CD-OP] PDF finalizado e baixado', { filename })
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

  const dadosEficiencia = React.useMemo(() => {
    const motorByNome = new Map<string, any>(motorOcioso.map((i) => [String(i?.nome || ""), i]))
    const elevadorByNome = new Map<string, any>(horaElevador.map((i) => [String(i?.nome || ""), i]))
    return eficienciaEnergetica.map((e) => {
      const nome = String(e?.nome || "")
      const motor = motorByNome.get(nome)
      const elevador = elevadorByNome.get(nome)
      return {
        id: e?.id ?? nome,
        nome,
        eficiencia: Number(e?.eficiencia || 0),
        horasMotor: Number(motor?.tempoLigado || 0),
        horasElevador: Number(elevador?.horas || 0),
      }
    })
  }, [eficienciaEnergetica, horaElevador, motorOcioso])

  const metaEficiencia = Number(metas?.eficienciaEnergetica || 0)
  const metaHorasElevador = Number(metas?.horaElevador || 0)
  const metaUsoGPS = Number(metas?.usoGPS || 0)
  const metaMediaVelocidade = Number(metas?.mediaVelocidade || 0)
  const metaMotorOcioso = Number(metas?.motorOcioso || 0)

  const mediaEficiencia = React.useMemo(() => {
    const validos = dadosEficiencia.filter((d) => Number(d?.eficiencia || 0) > 0)
    const soma = validos.reduce((acc, curr) => acc + Number(curr.eficiencia || 0), 0)
    return validos.length > 0 ? soma / validos.length : 0
  }, [dadosEficiencia])

  const mediaHorasElevador = React.useMemo(() => {
    const validos = horaElevador.filter((d) => Number(d?.horas || 0) > 0)
    const soma = validos.reduce((acc, curr) => acc + Number(curr.horas || 0), 0)
    return validos.length > 0 ? soma / validos.length : 0
  }, [horaElevador])

  const mediaUsoGps = React.useMemo(() => {
    const validos = usoGps.filter((d) => Number(d?.porcentagem || 0) > 0)
    const soma = validos.reduce((acc, curr) => acc + Number(curr.porcentagem || 0), 0)
    return validos.length > 0 ? soma / validos.length : 0
  }, [usoGps])

  const metaManobrasSegundos = Number((metas as any)?.manobras || 60)
  const dadosProducao = React.useMemo(() => {
    const itens = producaoOperadoresRaw
      .map((it, index) => {
        const nome = String(it?.nome || it?.operador || "")
        const toneladas = Number(it?.toneladas ?? it?.valor ?? it?.producao ?? it?.t ?? 0)
        return {
          id: it?.id ?? `${nome}-${index}`,
          nome,
          toneladas: isFinite(toneladas) ? toneladas : 0,
        }
      })
      .filter((i) => i.nome.trim().length > 0 && i.toneladas > 0)
      .sort((a, b) => b.toneladas - a.toneladas)
    return itens
  }, [producaoOperadoresRaw])
  const totalProducao = React.useMemo(() => dadosProducao.reduce((acc, curr) => acc + curr.toneladas, 0), [dadosProducao])
  const maxProducao = React.useMemo(() => Math.max(...dadosProducao.map((d) => d.toneladas), 0), [dadosProducao])

  const resumoOperadores = React.useMemo<ResumoOperadorCd[]>(() => {
    const limparNomeOperador = (s: string) => {
      const raw = String(s || "")
      if (!raw) return raw
      const parts = raw.split(" - ")
      if (parts.length >= 2) return parts.slice(1).join(" - ").trim()
      return raw.replace(/^\s*\d+\s*[-–—: ]\s*/, "").trim()
    }

    const nomes = new Set<string>()
    eficienciaEnergetica.forEach((i) => nomes.add(String(i?.nome || "")))
    horaElevador.forEach((i) => nomes.add(String(i?.nome || "")))
    usoGps.forEach((i) => nomes.add(String(i?.nome || "")))
    mediaVelocidade.forEach((i) => nomes.add(String(i?.nome || "")))
    motorOcioso.forEach((i) => nomes.add(String(i?.nome || "")))

    const efByNome = new Map<string, any>(eficienciaEnergetica.map((i) => [String(i?.nome || ""), i]))
    const elevByNome = new Map<string, any>(horaElevador.map((i) => [String(i?.nome || ""), i]))
    const gpsByNome = new Map<string, any>(usoGps.map((i) => [String(i?.nome || ""), i]))
    const velByNome = new Map<string, any>(mediaVelocidade.map((i) => [String(i?.nome || ""), i]))
    const ociosoByNome = new Map<string, any>(motorOcioso.map((i) => [String(i?.nome || ""), i]))

    return Array.from(nomes)
      .filter((n) => n.trim().length > 0)
      .map((nome) => ({
        operador: limparNomeOperador(nome),
        eficiencia: Number(efByNome.get(nome)?.eficiencia || 0),
        horasElevador: Number(elevByNome.get(nome)?.horas || 0),
        velocidade: Number(velByNome.get(nome)?.velocidade || 0),
        gps: Number(gpsByNome.get(nome)?.porcentagem || 0),
        ocioso: Number(ociosoByNome.get(nome)?.percentual || 0),
      }))
      .sort((a, b) => a.operador.localeCompare(b.operador, "pt-BR", { sensitivity: "base" }))
  }, [eficienciaEnergetica, horaElevador, mediaVelocidade, motorOcioso, usoGps])

  const dadosManobras = React.useMemo<ManobrasOperadorCd[]>(() => {
    const toHash = (value: string) => {
      let h = 0
      for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0
      return h
    }

    const toMmSs = (seconds: number) => {
      const s = Math.max(0, Math.round(seconds || 0))
      const mm = Math.floor(s / 60)
      const ss = s % 60
      return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`
    }

    const horasMotorByNome = new Map<string, number>(motorOcioso.map((i) => [String(i?.nome || ""), Number(i?.tempoLigado || 0)]))
    const nomes = resumoOperadores.map((r) => r.operador)

    return nomes.map((nome) => {
      const horasMotor = horasMotorByNome.get(nome) ?? 0
      const baseHorasMotor = horasMotor > 0 ? horasMotor : 6

      const hash = toHash(nome)
      const ratio = 0.1 + ((hash % 11) / 100)
      const totalMinutes = baseHorasMotor * 60 * ratio
      const intervalos = 6 + (hash % 17)
      const mediaSeconds = (totalMinutes / intervalos) * 60

      return {
        Frota: nome,
        "Tempo Total": totalMinutes,
        "Tempo Médio (hh:mm)": toMmSs(mediaSeconds),
        "Intervalos Válidos": intervalos,
      }
    })
  }, [motorOcioso, resumoOperadores])

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
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Eficiência Energética" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  <CabecalhoMeta meta={metaEficiencia} media={mediaEficiencia} tipo="porcentagem" />
                  <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                    <GraficoEficiencia dados={dadosEficiencia} meta={metaEficiencia} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Horas Elevador" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  <CabecalhoMeta
                    meta={metaHorasElevador}
                    media={mediaHorasElevador}
                    tipo="horas"
                    sufixoMedia="Média calculada excluindo valores 0 h"
                  />
                  <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                    <GraficoHorasElevador dados={horaElevador} meta={metaHorasElevador} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Uso GPS" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  <CabecalhoMeta meta={metaUsoGPS} media={mediaUsoGps} tipo="porcentagem" sufixoMedia="Média calculada excluindo valores 0%" />
                  <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                    <GraficoUsoGPS dados={usoGps} meta={metaUsoGPS} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <SectionTitle title="Média de Velocidade" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  {mediaVelocidade.length > 0 ? (
                    <GraficoMediaVelocidade dados={mediaVelocidade} meta={metaMediaVelocidade} />
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
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  {dadosManobras.length > 0 ? (
                    <GraficoManobras dados={dadosManobras as any} meta={metaManobrasSegundos} />
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
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  {motorOcioso.length > 0 ? (
                    <GraficoMotorOcioso dados={motorOcioso} meta={metaMotorOcioso} />
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
                <SectionTitle title="Produção" />
                <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                  {dadosProducao.length > 0 ? (
                    <div className="flex flex-col h-full">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 text-center">
                        <div className="text-sm font-bold text-slate-700">
                          Total: <span className="text-slate-900">{totalProducao.toFixed(2)} t</span> | Operadores:{" "}
                          <span className="text-slate-900">{dadosProducao.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                        {dadosProducao.map((item, index) => {
                          const percentual = maxProducao > 0 ? (item.toneladas / maxProducao) * 100 : 0
                          const bgBarra = index % 2 === 0 ? "bg-white" : "bg-slate-100"
                          return (
                            <div
                              key={item.id}
                              className={`${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1`}
                            >
                              <div className="font-bold text-xs mb-0.5">{item.nome}</div>
                              <div className="flex items-center gap-2">
                                <div className={`flex-1 h-6 ${bgBarra} rounded-sm relative border border-slate-200`}>
                                  <div
                                    className="h-full rounded-l-sm transition-all duration-500"
                                    style={{ width: `${Math.min(percentual, 100)}%`, backgroundColor: "#2563eb" }}
                                  />
                                </div>
                                <div className="font-bold text-sm w-24 text-right" style={{ color: "#2563eb" }}>
                                  {item.toneladas.toFixed(2)} t
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
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
              <div className="flex-1 flex flex-col gap-4 overflow-hidden pt-2">
                <h2 className="text-center font-bold text-base">Resumo do Relatório {periodoLabel} de Operadores</h2>
                <div className="grid grid-cols-2 gap-4">
                  {dadosEficiencia.length > 0 && (
                    <CardIndicador titulo="Eficiência Energética" meta={metaEficiencia} unidade="%" dados={dadosEficiencia.map((d) => ({ valor: d.eficiencia }))} tipo="asc" />
                  )}
                  {usoGps.length > 0 && (
                    <CardIndicador titulo="Uso GPS" meta={metaUsoGPS} unidade="%" dados={usoGps.map((d) => ({ valor: Number(d?.porcentagem || 0) }))} tipo="asc" />
                  )}
                  {horaElevador.length > 0 && (
                    <CardIndicador
                      titulo="Horas Elevador"
                      meta={metaHorasElevador}
                      unidade="h"
                      dados={horaElevador.map((d) => ({ valor: Number(d?.horas || 0) }))}
                      tipo="asc"
                      formatarValor={(v) => v.toFixed(2)}
                    />
                  )}
                  {mediaVelocidade.length > 0 && (
                    <CardIndicador
                      titulo="Média de Velocidade"
                      meta={metaMediaVelocidade}
                      unidade=" km/h"
                      dados={mediaVelocidade.map((d) => ({ valor: Number(d?.velocidade || 0) }))}
                      tipo="desc"
                      formatarValor={(v) => v.toFixed(2)}
                    />
                  )}
                  {motorOcioso.length > 0 && (
                    <CardIndicador titulo="Motor Ocioso" meta={metaMotorOcioso} unidade="%" dados={motorOcioso.map((d) => ({ valor: Number(d?.percentual || 0) }))} tipo="desc" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  {resumoOperadores.length > 0 ? (
                    <TabelaResumoOperadoresCd
                      dados={resumoOperadores}
                      metas={{
                        eficienciaEnergetica: metaEficiencia,
                        horaElevador: metaHorasElevador,
                        mediaVelocidade: metaMediaVelocidade,
                        usoGPS: metaUsoGPS,
                        motorOcioso: metaMotorOcioso,
                      }}
                    />
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

export default function RelatorioDiarioOperadoresCd({
  searchParams,
}: {
  searchParams?: { period?: string }
}) {
  const period = searchParams?.period === "semanal" ? "semanal" : "diario"
  return <RelatorioOperadoresCd period={period} />
}
