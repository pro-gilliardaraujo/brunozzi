"use client"
import React from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { CabecalhoMeta } from "../cd-diario-frotas/componentes/CabecalhoMeta"
import { GraficoHorasElevador } from "../cd-diario-frotas/componentes/GraficoHorasElevador"
import { GraficoUsoGPS } from "../cd-diario-frotas/componentes/GraficoUsoGPS"
import { GraficoMediaVelocidade } from "../cd-diario-frotas/componentes/GraficoMediaVelocidade"
import { GraficoManobras } from "../cd-diario-frotas/componentes/GraficoManobras"
import { GraficoMotorOcioso } from "../cd-diario-frotas/componentes/GraficoMotorOcioso"
import { GraficoTop5Ofensores } from "../cd-diario-frotas/componentes/GraficoTop5Ofensores"
import { GraficoDisponibilidadeMecanica } from "../cd-diario-frotas/componentes/GraficoDisponibilidadeMecanica"
import { GraficoIntervalos, Intervalo } from "../cd-diario-frotas/componentes/GraficoIntervalos"
import { CardIndicador } from "../cd-diario-frotas/componentes/CardIndicador"
import { TabelaResumo } from "../cd-diario-frotas/componentes/TabelaResumo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server"
import { downloadPdfBuffer } from "@/lib/pdf-utils"
import { GraficoEficienciaTrator } from "./GraficoEficienciaTrator"
import { GraficoEficienciaOperacionalTrator } from "./GraficoEficienciaOperacionalTrator"
import { MapaIframe } from "../cd-diario-frotas/componentes/MapaIframe"
import { GraficoTemperaturaCase } from "../../trator/GraficoTemperaturaCase"
import { GraficoTransbordo } from "../../trator/GraficoTransbordo"

const LOGO_URL = "/logo.png"

function Header({ tituloCompleto, date, fonte }: { tituloCompleto: string; date: string; fonte?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 mb-2">
      <img src={LOGO_URL} alt="Logo Empresa" className="h-12 object-contain" />
      <div className="text-center">
        <div className="text-lg font-bold text-black">{tituloCompleto}</div>
        <div className="text-sm font-medium text-gray-700 mt-1 flex items-center justify-center gap-2">
          <span>{date}</span>
          {fonte && (
            <>
              <span className="text-gray-400">•</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                fonte === 'solinftec' ? 'bg-green-100 text-green-700' :
                fonte === 'case' ? 'bg-blue-100 text-blue-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {fonte === 'solinftec' ? 'Solinftec' : fonte === 'case' ? 'Case IH' : 'OPC'}
              </span>
            </>
          )}
        </div>
      </div>
      <img src={LOGO_URL} alt="Logo Empresa" className="h-12 object-contain" />
    </div>
  )
}


function SectionTitle({ title }: { title: string }) {
  return (
    <div className="text-center text-base font-bold text-black mb-2">{title}</div>
  )
}

export function RelatorioPrintViewTrator({ data, period = "diario" }: { data: any; period?: "diario" | "semanal" }) {
  const [dadosMapa, setDadosMapa] = React.useState<any[]>([]);
  const [mapasDisponiveis, setMapasDisponiveis] = React.useState<{arquivo: string, data: string, tipo: string, area: string, frotas: string[]}[]>([]);
  const [frenteNomeStorage, setFrenteNomeStorage] = React.useState<string | null>(null)
  const [zoomPercent, setZoomPercent] = React.useState(100)
  const [isPdfMode, setIsPdfMode] = React.useState(false)
  const [showMockControls, setShowMockControls] = React.useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      return p.get("showMock") === "1"
    }
    return false
  })
  const [mockQtdFrotas, setMockQtdFrotas] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      if (p.has("mockQtdFrotas")) return Number(p.get("mockQtdFrotas"))
    }
    return 4
  })

  // Carregar estado dos mocks do localStorage na inicialização
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedMock = localStorage.getItem("mockControlsState")
      if (savedMock) {
        const parsed = JSON.parse(savedMock)
        if (typeof parsed.qtdFrotas === 'number') setMockQtdFrotas(parsed.qtdFrotas)
        
        // Se houver qualquer configuração salva, forçamos a exibição dos controles (ativação do mock)
        // Isso garante que o PDF gerado use os dados mockados, mesmo se a URL não tiver ID
        if (parsed.show) {
           setShowMockControls(true)
        }
      }
    } catch (e) {
      console.error("Erro ao carregar estado dos mocks", e)
    }
  }, [])

  // Salvar estado dos mocks no localStorage sempre que mudar
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const state = {
      qtdFrotas: mockQtdFrotas,
      show: showMockControls
    }
    localStorage.setItem("mockControlsState", JSON.stringify(state))
  }, [mockQtdFrotas, showMockControls])

  React.useEffect(() => {
    // Tenta carregar dados do localStorage se houver
    const storedData = localStorage.getItem('dadosRelatorioRecente');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setFrenteNomeStorage(parsed?.frente_nome || parsed?.frente || null)
        if (parsed.coordenadas) {
          console.log("Carregando mapa do localStorage", parsed.coordenadas.length, "pontos");
          setDadosMapa(parsed.coordenadas);
        }
      } catch (e) {
        console.error("Erro ao ler dados do localStorage", e);
      }
    }
   }, []);

  // Carregar index de mapas disponíveis
  React.useEffect(() => {
    fetch('/mapas/index_mapas.json')
      .then(r => r.ok ? r.json() : [])
      .then(idx => setMapasDisponiveis(Array.isArray(idx) ? idx : []))
      .catch(() => setMapasDisponiveis([]))
  }, []);

  const { 
    metadata,
    metas, 
    imagens, 
    ofensores, 
    disponibilidade_mecanica, 
    eficiencia_energetica, 
    eficiencia_operacional,
    motor_ocioso, 
    uso_gps, 
    media_velocidade, 
    manobras_frotas,
    horas_elevador,
    intervalos_operacao,
    velocidades_detalhadas,
    transbordo,
    falta_apontamento
  } = data
  const metasSafe = {
    eficienciaEnergetica: metas?.eficienciaEnergetica ?? 0,
    eficienciaOperacional: metas?.eficienciaOperacional ?? 60,
    horaElevador: metas?.horaElevador ?? 0,
    usoGPS: metas?.usoGPS ?? 0,
    mediaVelocidade: metas?.mediaVelocidade ?? 0,
    manobras: metas?.manobras ?? 60,
    motorOcioso: metas?.motorOcioso ?? 0,
    disponibilidadeMecanica: metas?.disponibilidadeMecanica ?? 90,
    temperaturaTransmissao: metas?.temperaturaTransmissao ?? 85,
  }
  
  // Agrupar intervalos por equipamento
  const intervalosAgrupados = React.useMemo(() => {
    if (!intervalos_operacao) return []
    const grouped: Record<string, Intervalo[]> = {}
    
    // O tipo 'any' é usado aqui porque intervalos_operacao vem do mock como array plano
    ;(intervalos_operacao as any[]).forEach((item) => {
      if (!grouped[item.equipamento]) {
        grouped[item.equipamento] = []
      }
      grouped[item.equipamento].push({
        tipo: item.tipo,
        inicio: item.inicio,
        duracaoHoras: item.duracaoHoras
      })
    })
    
    return Object.entries(grouped).map(([equipamento, intervalos]) => ({
      equipamento,
      intervalos
    })).sort((a, b) => a.equipamento.localeCompare(b.equipamento))
  }, [intervalos_operacao])

  // Date string without time is parsed as UTC midnight. When converted to Brazil (-3), it shifts to the previous day!
  // Appending T12:00:00Z parses it as noon UTC, ensuring local timezone shift keeps it on the same day.
  const endDate = metadata?.date ? new Date(`${metadata.date}T12:00:00Z`) : new Date()
  
  // Detectar fonte primária dos dados
  const fontePrimaria = React.useMemo(() => {
    const fontes = metadata?.fontes || []
    // Prioridade: solinftec > case > opc
    if (fontes.includes('solinftec')) return 'solinftec'
    if (fontes.includes('case')) return 'case'
    if (fontes.includes('opc')) return 'opc'
    return undefined
  }, [metadata])

  const endStr = endDate.toLocaleDateString("pt-BR")
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)
  const startStr = startDate.toLocaleDateString("pt-BR")
  const dataFormatada = period === "semanal" ? `${startStr} - ${endStr}` : endStr
  const reportRef = React.useRef<HTMLDivElement>(null)
  // Wrapper que faz scroll do relatório; usamos para recalcular a posição do painel ao rolar.
  const scrollWrapRef = React.useRef<HTMLDivElement>(null)
  const pagesRef = React.useRef<HTMLDivElement[]>([])
  // Painel de utilitários (zoom / pdf / mocks); usamos para medir largura real e posicionar como overlay.
  const utilitiesPanelRef = React.useRef<HTMLDivElement>(null)
  // Posição horizontal do painel (left) calculada para encaixar no espaço "sobrando" ao lado do relatório.
  const [utilitiesPanelLeft, setUtilitiesPanelLeft] = React.useState<number | null>(null)
  const [pageCount, setPageCount] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(1)
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const frenteCodigo = metadata?.frente
  const MAP_FRENTES: Record<string, string> = { 'frente5': 'Frente BP Ituiutaba' }
  const frenteNome = frenteNomeStorage || MAP_FRENTES[frenteCodigo] || (frenteCodigo?.startsWith('Frente') ? frenteCodigo : (frenteCodigo ? `Frente ${frenteCodigo}` : 'Frente Desconhecida'))
  const periodoLabel = period === "semanal" ? "Semanal" : "Diário"
  const tituloRelatorio = `Relatório ${periodoLabel} de Frotas - Tratores`
  const nomeDataArquivo =
    period === "semanal"
      ? `${startStr.replace(/\//g, "_")}-${endStr.replace(/\//g, "_")}`
      : endStr.replace(/\//g, "_")

  React.useEffect(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : ''
      const pdfFlag = new URLSearchParams(search).get('pdf')
      const pdf = pdfFlag === '1'
      setIsPdfMode(pdf)
      if (!pdf) setZoomPercent(80)
    } catch {
      setIsPdfMode(false)
      setZoomPercent(80)
    }
  }, [])

  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const hasId = params.has("id")
      setShowMockControls(!hasId)
    } catch {
      setShowMockControls(false)
    }
  }, [])

  const clampInt = React.useCallback((value: unknown, min: number, max: number) => {
    const n = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(n)) return min
    return Math.min(max, Math.max(min, Math.round(n)))
  }, [])

  const MAX_MOCK_QTD_FROTAS = 10
  const MAX_MOCK_TABLE_ROWS = 100

  const totalFrotasBase = (Array.isArray(eficiencia_energetica) ? eficiencia_energetica.filter((d: any) => d?.nome) : []).length

  const buildRows = React.useCallback(<T,>(baseRows: T[], count: number, makeFallback: (idx: number) => T): T[] => {
    const safeCount = clampInt(count, 0, MAX_MOCK_TABLE_ROWS)
    if (safeCount === 0) return []
    const src = Array.isArray(baseRows) ? baseRows : []
    if (src.length === 0) return Array.from({ length: safeCount }, (_, idx) => makeFallback(idx))
    return Array.from({ length: safeCount }, (_, idx) => {
      const row = src[idx % src.length] as any
      return { ...row } as T
    })
  }, [clampInt])

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
    if (isGenerating) return
    const reportEl = reportRef.current
    if (!reportEl) return

    const filename = `${tituloRelatorio} ${nomeDataArquivo}.pdf`
    const debug = process.env.NODE_ENV !== 'production'
    
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
      console.log("[PDF][CD-DIARIO] Exportação via Backend (Puppeteer/Local)", { filename })
      setIsGenerating(true)
      
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      
      await generateRelatorioPdfFromUrl(
        currentUrl, 
        filename,
        { 
          cookieHeader, 
          localStorage: localStorageData,
          mockState: {
            qtdFrotas: mockQtdFrotas,
            show: showMockControls
          }
        }
      )
      
      if (debug) {
        console.log('[PDF][CD-DIARIO] PDF finalizado e salvo no backend', { filename })
      }
      toast({ title: 'PDF gerado', description: 'Arquivo salvo em pasta pdfs na raiz do projeto.' })
    } catch (e) {
      // Se for um erro de "user aborted" ou algo similar que na verdade foi sucesso no download, ignoramos
      console.error('Erro ao gerar PDF', e)
      toast({ title: 'Falha ao gerar PDF', description: 'Tente novamente em instantes.' })
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, tituloRelatorio, nomeDataArquivo, toast, mockQtdFrotas, showMockControls])

  const computePageMetrics = React.useCallback(() => {
    const pagesRoot = reportRef.current
    if (!pagesRoot) return
    const pages = Array.from(pagesRoot.querySelectorAll("[data-pdf-page]")) as HTMLDivElement[]
    pagesRef.current = pages
    setPageCount(pages.length)
    setCurrentPage((prev) => {
      if (pages.length === 0) return 1
      return Math.min(pages.length, Math.max(1, prev))
    })
  }, [])

  const scrollToPage = React.useCallback(
    (targetPage: number) => {
      if (pagesRef.current.length === 0) computePageMetrics()
      const pages = pagesRef.current
      if (!pages || pages.length === 0) return
      const idx = Math.min(pages.length - 1, Math.max(0, targetPage - 1))
      const el = pages[idx]
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    },
    [computePageMetrics]
  )

  React.useEffect(() => {
    computePageMetrics()

    const pages = pagesRef.current
    if (!pages || pages.length === 0) return

    const ratioByEl = new Map<Element, number>()
    pages.forEach((p) => ratioByEl.set(p, 0))

    let rafId = 0
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratioByEl.set(entry.target, entry.intersectionRatio)
        }
        cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
          const currentPages = pagesRef.current
          if (!currentPages || currentPages.length === 0) return

          let bestIndex = 0
          let bestRatio = -1
          for (let i = 0; i < currentPages.length; i++) {
            const page = currentPages[i]
            const ratio = ratioByEl.get(page) ?? 0
            if (ratio > bestRatio + 0.01) {
              bestRatio = ratio
              bestIndex = i
              continue
            }
            if (Math.abs(ratio - bestRatio) <= 0.01) {
              const topA = page.getBoundingClientRect().top
              const topB = currentPages[bestIndex].getBoundingClientRect().top
              if (topA < topB) bestIndex = i
            }
          }

          setCurrentPage(bestIndex + 1)
        })
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], root: scrollWrapRef.current }
    )

    pages.forEach((p) => observer.observe(p))

    const onResize = () => computePageMetrics()
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [computePageMetrics])

  React.useEffect(() => {
    // Mantém o painel de utilitários como overlay, "encaixando" à direita do relatório sem ocupar espaço do corpo.
    // Isso responde ao caso de tela dividida: sidebar recolhe, o relatório vai para a esquerda e o painel entra no espaço livre.
    const reportEl = reportRef.current
    const panelEl = utilitiesPanelRef.current
    if (!reportEl || !panelEl) return

    let rafId = 0
    const gap = 12

    const compute = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const isCompact = document.documentElement.getAttribute("data-sidebar-compact") === "1"
        
        // Se a sidebar estiver compacta, fixamos o painel no canto superior DIREITO
        if (isCompact) {
          // Quando compacta, o painel deve ir para a direita da tela
          // Usamos null para que o style 'left' seja removido e o CSS 'right-3' (do className) entre em ação
          setUtilitiesPanelLeft(null) 
          return
        }

        const rect = reportEl.getBoundingClientRect()
        const panelWidth = panelEl.getBoundingClientRect().width || panelEl.offsetWidth || 0
        if (!panelWidth || !Number.isFinite(panelWidth)) {
          setUtilitiesPanelLeft(null)
          return
        }

        const desiredLeft = rect.right + gap
        const maxLeft = window.innerWidth - gap - panelWidth
        const nextLeft = Math.max(gap, Math.min(desiredLeft, maxLeft))
        setUtilitiesPanelLeft(Number.isFinite(nextLeft) ? nextLeft : null)
      })
    }

    compute()

    const onResize = () => compute()
    window.addEventListener("resize", onResize)

    const onScroll = () => compute()
    const scrollWrap = scrollWrapRef.current
    scrollWrap?.addEventListener("scroll", onScroll, { passive: true } as any)

    const resizeObserver = new ResizeObserver(() => compute())
    resizeObserver.observe(reportEl)
    resizeObserver.observe(panelEl)

    const mutationObserver = new MutationObserver(() => compute())
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-sidebar-compact"],
    })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", onResize)
      scrollWrap?.removeEventListener("scroll", onScroll as any)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
  
  const dadosValidosBase = React.useMemo(() => {
    const lista = Array.isArray(eficiencia_energetica) ? eficiencia_energetica : []
    return lista.filter((d: any) => d?.nome)
  }, [eficiencia_energetica])

  const qtdFrotasEfetivo = React.useMemo(() => {
    // Sempre usar o tamanho real dos dados, sem limitação de mock
    return dadosValidosBase.length
  }, [dadosValidosBase.length])

  const nomesFrotas = React.useMemo(() => {
    const base = dadosValidosBase.map((d: any) => String(d?.nome || "")).filter((s) => s.trim().length > 0)
    // Usar nomes numéricos (70xx) para evitar "Frota 00X" e garantir consistência com o pedido do usuário
    return Array.from({ length: qtdFrotasEfetivo }, (_, idx) => base[idx] || `${7050 + idx}`)
  }, [dadosValidosBase, qtdFrotasEfetivo])

  const buildNamedSeries = React.useCallback(
    (baseRows: any[], count: number, nameKey: "nome" | "Frota", makeFallback: (name: string, idx: number) => any) => {
      const safeCount = clampInt(count, 0, MAX_MOCK_QTD_FROTAS)
      if (safeCount === 0) return []
      
      // Se estiver em modo mock, usamos apenas a quantidade definida pelo mock, ignorando o array original se ele for maior
      // Se não estiver em modo mock (count seria o tamanho real), usamos o array original
      
      return Array.from({ length: safeCount }, (_, idx) => {
        // Nomes realistas para Colhedoras (70xx)
        // Começando de 7050 para evitar conflito com 7032-7038 que já existem no mock base
        const mockName = `${7050 + idx}`
        const name = nomesFrotas[idx] || mockName
        
        // Se temos dados base suficientes para este índice, usamos
        // Caso contrário (se mock > real), usamos fallback ou reciclamos
        const base = (idx < baseRows.length) ? baseRows[idx] : undefined
        
        const next = { ...(base ?? makeFallback(name, idx)) } as any
        
        // Garantir valores numéricos seguros para evitar NaN
        // E gerar valores aleatórios realistas para não ficar tudo zerado se for mock
        const isMocked = !base
        
        if (typeof next.eficiencia === 'undefined' || isNaN(next.eficiencia)) next.eficiencia = isMocked ? Math.random() * 100 : 0
        if (typeof next.horasMotor === 'undefined' || isNaN(next.horasMotor)) next.horasMotor = isMocked ? 5 + Math.random() * 15 : 0
        if (typeof next.horasElevador === 'undefined' || isNaN(next.horasElevador)) next.horasElevador = isMocked ? 3 + Math.random() * 10 : 0
        if (typeof next.velocidade === 'undefined' || isNaN(next.velocidade)) next.velocidade = isMocked ? 3 + Math.random() * 4 : 0
        
        // Percentual Ocioso (Motor Ocioso) - deve ser coerente com horasMotor e horasElevador?
        // Aqui percentual é usado diretamente no gráfico de ocioso.
        if (typeof next.percentual === 'undefined' || isNaN(next.percentual)) next.percentual = isMocked ? Math.random() * 20 : 0
        
        // Garantir tempoManutencao também para o GraficoDisponibilidadeMecanica
        if (typeof next.tempoManutencao === 'undefined' || isNaN(next.tempoManutencao)) next.tempoManutencao = isMocked ? Math.random() * 2 : 0
        
        // Disponibilidade = (horasMotor - tempoManutencao) / horasMotor * 100
        // Se estiver em modo mock e disponibilidade for 0 ou undefined, calcula dinamicamente
        if (typeof next.disponibilidade === 'undefined' || isNaN(next.disponibilidade) || (isMocked && next.disponibilidade === 0)) {
           if (next.horasMotor > 0) {
             const dispCalc = Math.max(0, ((next.horasMotor - (next.tempoManutencao || 0)) / next.horasMotor) * 100)
             next.disponibilidade = dispCalc
           } else {
             next.disponibilidade = isMocked ? 80 + Math.random() * 20 : 0
           }
        }
        
        if (typeof next.porcentagem === 'undefined' || isNaN(next.porcentagem)) next.porcentagem = isMocked ? 70 + Math.random() * 30 : 0
        
        // Ajuste para Motor Ocioso: percentual, tempoLigado, tempoOcioso
        // Garantir coerência: tempoOcioso = tempoLigado * (percentual / 100)
        // O GraficoMotorOcioso usa: percentual, tempoLigado, tempoOcioso
        // Se tempoLigado não existir, usa horasMotor
        if (typeof next.tempoLigado === 'undefined') next.tempoLigado = next.horasMotor
        if (typeof next.tempoOcioso === 'undefined') next.tempoOcioso = next.tempoLigado * (next.percentual / 100)
        
        if (nameKey === "Frota") next.Frota = name
        else next.nome = name
        next.id = next.id ?? `${nameKey}-${idx + 1}`
        return next
      })
    },
    [nomesFrotas, clampInt]
  )

  const dadosValidos = React.useMemo(() => {
    return buildNamedSeries(
      dadosValidosBase,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `ef-${idx + 1}`, nome: name, eficiencia: 0, horasMotor: 0, horasElevador: 0 })
    )
  }, [buildNamedSeries, dadosValidosBase, qtdFrotasEfetivo])

  const dadosEficienciaGrafico = React.useMemo(
    () => dadosValidos.filter(d => (d.eficiencia || 0) > 0),
    [dadosValidos]
  )

  const mediaVelocidadeFiltrada = React.useMemo(() => {
    const base = Array.isArray(media_velocidade) ? media_velocidade : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `vel-${idx + 1}`, nome: name, velocidade: 0 })
    )
  }, [buildNamedSeries, media_velocidade, qtdFrotasEfetivo])

  const mediaVelocidadeGrafico = React.useMemo(
    () => mediaVelocidadeFiltrada.filter(d => (d.velocidade || 0) > 0),
    [mediaVelocidadeFiltrada]
  )

  // Velocidades Detalhadas: Vazio e Carregado (separados)
  const velDetalhadas = React.useMemo(() => {
    const lista = Array.isArray(velocidades_detalhadas) ? velocidades_detalhadas : []
    return lista.filter((d: any) => d?.nome)
  }, [velocidades_detalhadas])

  const velVazioGrafico = React.useMemo(
    () => velDetalhadas.filter((d: any) => (d.vazio || 0) > 0).map((d: any) => ({
      id: d.id, nome: String(d.nome), velocidade: d.vazio
    })),
    [velDetalhadas]
  )

  const velCarregadoGrafico = React.useMemo(
    () => velDetalhadas.filter((d: any) => (d.carregado || 0) > 0).map((d: any) => ({
      id: d.id, nome: String(d.nome), velocidade: d.carregado
    })),
    [velDetalhadas]
  )

  // Transbordo / Basculamento
  const transbordoGrafico = React.useMemo(() => {
    const lista = Array.isArray(transbordo) ? transbordo : []
    return lista.filter((d: any) => (d.quantidade || 0) > 0 || (d.tempoTotal || 0) > 0).map((d: any) => ({
      nome: String(d.nome || d.id),
      quantidade: d.quantidade || 0,
      tempoTotal: d.tempoTotal || 0,
    }))
  }, [transbordo])

  const manobrasFiltradas = React.useMemo(() => {
    const base = Array.isArray(manobras_frotas) ? manobras_frotas : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "Frota",
      (name) => ({ Frota: name, "Tempo Total": 0, "Tempo Médio (hh:mm)": "00:00:00", "Intervalos Válidos": 0 })
    )
  }, [buildNamedSeries, manobras_frotas, qtdFrotasEfetivo])

  const manobrasGrafico = React.useMemo(
    () => manobrasFiltradas.filter(d => (d["Tempo Total"] || 0) > 0),
    [manobrasFiltradas]
  )

  const motorOciosoFiltrado = React.useMemo(() => {
    const base = Array.isArray(motor_ocioso) ? motor_ocioso : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `oc-${idx + 1}`, nome: name, percentual: 0, tempoLigado: 0, tempoOcioso: 0 })
    )
  }, [buildNamedSeries, motor_ocioso, qtdFrotasEfetivo])

  const motorOciosoGrafico = React.useMemo(
    () => motorOciosoFiltrado.filter(d => (d.percentual || 0) > 0),
    [motorOciosoFiltrado]
  )

  const disponibilidadeFiltrada = React.useMemo(() => {
    const base = Array.isArray(disponibilidade_mecanica) ? disponibilidade_mecanica : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `disp-${idx + 1}`, nome: name, disponibilidade: 0 })
    )
  }, [buildNamedSeries, disponibilidade_mecanica, qtdFrotasEfetivo])

  const disponibilidadeGrafico = React.useMemo(
    () => disponibilidadeFiltrada.filter(d => (d.disponibilidade || 0) > 0),
    [disponibilidadeFiltrada]
  )

  const dadosUsoGPSCase = React.useMemo(() => {
    const base = Array.isArray(uso_gps) ? uso_gps.filter((d: any) => d?.nome && d?.fonte === 'case') : []
    return buildNamedSeries(base, base.length, "nome", (name, idx) => ({ id: `gps-${idx + 1}`, nome: name, porcentagem: 0 }))
  }, [buildNamedSeries, uso_gps])

  // Cálculos para Eficiência Energética
  const metaEficiencia = metasSafe.eficienciaEnergetica
  const dadosEficienciaNaoZero = dadosValidos.filter(d => d.eficiencia > 0)
  const mediaEficiencia = dadosEficienciaNaoZero.reduce((acc, curr) => acc + curr.eficiencia, 0) / (dadosEficienciaNaoZero.length || 1)

  // Cálculos para Eficiência Operacional
  const dadosOperacionalBase = React.useMemo(() => {
    const lista = Array.isArray(eficiencia_operacional) ? eficiencia_operacional : []
    return lista.filter((d: any) => d?.nome)
  }, [eficiencia_operacional])

  const dadosValidosOperacional = React.useMemo(() => {
    return buildNamedSeries(
      dadosOperacionalBase,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `ef-op-${idx + 1}`, nome: name, eficiencia: 0, horasMotor: 0, horasElevador: 0 })
    )
  }, [buildNamedSeries, dadosOperacionalBase, qtdFrotasEfetivo])

  const dadosOperacionalGrafico = React.useMemo(
    () => dadosValidosOperacional.filter(d => (d.eficiencia || 0) > 0),
    [dadosValidosOperacional]
  )

  const metaEficienciaOperacional = metasSafe.eficienciaOperacional
  const dadosEficienciaOperacionalNaoZero = dadosValidosOperacional.filter(d => d.eficiencia > 0)
  const mediaEficienciaOperacional = dadosEficienciaOperacionalNaoZero.reduce((acc, curr) => acc + curr.eficiencia, 0) / (dadosEficienciaOperacionalNaoZero.length || 1)

  // Removido: página de Horas Elevador para tratores (gráfico não será exibido)

  // Página 2 - Uso GPS
  const metaUsoGPS = metasSafe.usoGPS
  const dadosUsoGPSNaoZeroCase = dadosUsoGPSCase.filter(d => (d.porcentagem || 0) > 0)
  const mediaUsoGPSCase = dadosUsoGPSNaoZeroCase.reduce((acc, curr) => acc + curr.porcentagem, 0) / (dadosUsoGPSNaoZeroCase.length || 1)

  // Página 7 - Ofensores e Disponibilidade
  const dadosOfensores = (ofensores || []).map((item: any) => {
    // Tenta extrair o nome após o código (ex: "8040 - MANUTENCAO" -> "MANUTENCAO")
    const rawNome = ((item as any)?.nome ?? (item as any)?.operacao ?? '') as string
    const parts = typeof rawNome === 'string' ? rawNome.split(' - ') : []
    const nome = parts.length > 1 ? parts.slice(1).join(' - ') : rawNome
    return {
      nome,
      percentual: (item as any)?.percentual ?? (item as any)?.porcentagem ?? 0,
      duracao: (item as any)?.duracao ?? (item as any)?.tempo ?? 0
    }
  })

  // Preparar dados para o Resumo
  const dadosResumo = dadosValidos.map(f => {
    const nome = f.nome;
    const disp = (disponibilidadeFiltrada || []).find((d: any) => d.nome === nome);
    const ocioso = (motorOciosoFiltrado || []).find((d: any) => d.nome === nome);
    const vel = (mediaVelocidadeFiltrada || []).find((d: any) => d.nome === nome);
    const efop = (dadosValidosOperacional || []).find((d: any) => d.nome === nome);
    const man = (manobrasFiltradas || []).find((d: any) => String(d.Frota) === nome);
    const elev = (horas_elevador || []).filter((d: any) => d.nome === nome).reduce((acc: number, curr: any) => acc + Number(curr?.valor || 0), 0);

    return {
      frota: nome,
      eficiencia: f.eficiencia || 0,
      horasElevador: elev || 0,
      velocidade: vel?.velocidade || 0,
      eficienciaOperacional: efop?.eficiencia || 0,
      manobra: man ? Number(man['Tempo Total'] || 0) * 60 : 0,
      ocioso: ocioso?.percentual || 0,
      disponibilidade: disp?.disponibilidade || 0
    };
  });
  const timeStringToSeconds = (timeStr: string) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return 0
  }
  const formatMmSsFromSeconds = (s: number) => {
    const ss = Math.round(s || 0)
    const mm = Math.floor(ss / 60)
    const rem = ss % 60
    return `${mm.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }
  const dadosCardManobras = (((manobras_frotas || []) as Array<any>)).map((it: any) => {
    const medioStr = it?.["Tempo Médio (hh:mm)"]
    const medioNum = it?.["Tempo Médio"]
    const seconds = typeof medioStr === 'string' && medioStr.length > 0 
      ? timeStringToSeconds(medioStr) 
      : typeof medioNum === 'number' && isFinite(medioNum) 
        ? Math.round(medioNum * 3600)
        : 0
    return { valor: seconds }
  })


  return (
    <div className="relative bg-gray-100 p-1">
      <style jsx global>{`
        @media print {
          .report-zoom {
            zoom: 1 !important;
          }
        }
        .report-scroll {
          scroll-snap-type: y mandatory;
          scroll-padding-top: 12px;
          scroll-padding-bottom: 12px;
        }
        .report-scroll [data-pdf-page] {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}</style>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div ref={scrollWrapRef} className={`${isPdfMode ? "overflow-visible" : "overflow-auto"} report-scroll`}>
            <div className="w-fit mx-auto">
              <div
                ref={reportRef}
                className="inline-flex flex-col items-start gap-4 report-zoom"
                style={{ ...(isPdfMode ? {} : ({ zoom } as any)) }}
              >
      {/* PÁGINA 2 - Eficiência Energética (apenas frotas com valor > 0) */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Eficiência Energética${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 flex flex-col">
                <CabecalhoMeta 
                  meta={metaEficiencia} 
                  media={mediaEficiencia} 
                  tipo="porcentagem"
                  compact={false}
                />
                <div className="flex-1 overflow-hidden mt-1">
                  <GraficoEficienciaTrator 
                    dados={dadosEficienciaGrafico} 
                    meta={metaEficiencia} 
                    compact={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 3 - Eficiência Operacional (apenas frotas com valor > 0) */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Eficiência Operacional${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 flex flex-col">
                <CabecalhoMeta 
                  meta={metaEficienciaOperacional} 
                  media={mediaEficienciaOperacional} 
                  tipo="porcentagem"
                  compact={false}
                />
                <div className="flex-1 overflow-hidden mt-1">
                  <GraficoEficienciaOperacionalTrator 
                    dados={dadosOperacionalGrafico} 
                    meta={metaEficienciaOperacional} 
                    compact={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Removido: Página de Horas Elevador (não aplicável para tratores) */}


      {/* PÁGINA 5A - Velocidade Deslocamento Vazio */}
      {velVazioGrafico.length > 0 && (
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title="Velocidade Deslocamento Vazio - Solinftec" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                 <GraficoMediaVelocidade dados={velVazioGrafico} meta={metasSafe.mediaVelocidade} />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* PÁGINA 5B - Velocidade Deslocamento Carregado */}
      {velCarregadoGrafico.length > 0 && (
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title="Velocidade Deslocamento Carregado - Solinftec" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                 <GraficoMediaVelocidade dados={velCarregadoGrafico} meta={metasSafe.mediaVelocidade} />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* PÁGINA 6 - Manobras (apenas frotas com valor > 0) */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Manobras${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoManobras 
                    dados={manobrasGrafico} 
                    meta={metasSafe.manobras} 
                    compact={false}
                 />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA - Basculamento / Transbordo */}
      {transbordoGrafico.length > 0 && (
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title="Transbordo / Basculamento - Solinftec" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoTransbordo dados={transbordoGrafico} meta={metasSafe.manobras} compact={false} />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* PÁGINA 7 - Motor Ocioso (apenas frotas com valor > 0) */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Motor Ocioso${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoMotorOcioso 
                    dados={motorOciosoGrafico} 
                    meta={metasSafe.motorOcioso} 
                    compact={false}
                 />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 8 - Top 5 Ofensores */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title="Top 5 Ofensores" />
              <div className="border border-black rounded-lg p-3 overflow-hidden flex flex-col" style={{ height: "50%" }}>
                <div className="flex-1 overflow-hidden flex items-stretch justify-start">
                  <GraficoTop5Ofensores dados={dadosOfensores} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 9 - Disponibilidade Mecânica (apenas frotas com valor > 0) */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Disponibilidade Mecânica${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                <CabecalhoMeta 
                  meta={metasSafe.disponibilidadeMecanica} 
                  media={(() => {
                      const vals = (disponibilidadeGrafico || []).map((d: any) => d.disponibilidade).filter((v: number) => v > 0)
                    return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0
                  })()}
                  tipo="porcentagem"
                  compact={false}
                />
                <div className="flex-1 overflow-hidden mt-1">
                  <GraficoDisponibilidadeMecanica 
                    dados={disponibilidadeGrafico || []} 
                    meta={metasSafe.disponibilidadeMecanica} 
                    compact={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* PÁGINAS DINÂMICAS - Intervalos de Operação */}
      {/* 
        Paginação para Intervalos de Operação:
        - Divide a lista de equipamentos em grupos de 4.
        - Cria uma página A4 separada para cada grupo.
        - Inclui cabeçalho explicativo em cada página (conforme solicitado).
      */}
      {period === "diario" &&
        (() => {
          const totalPages = Math.ceil(intervalosAgrupados.length / 5)
          return Array.from({ length: totalPages }).map((_, pageIndex) => {
            const startIndex = pageIndex * 5
            const pageItems = intervalosAgrupados.slice(startIndex, startIndex + 5)

            return (
              <div key={`intervalos-page-${pageIndex}`} data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
                <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
                  <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <SectionTitle title={`Intervalos de Operação${totalPages > 1 ? ` - página ${pageIndex + 1}` : ''}`} />
                    
                    {/* Cabeçalho Descritivo */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 text-[10px] leading-tight text-slate-700">
                      <p className="mb-4"><strong className="text-white bg-green-600 border border-green-600 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Produtivo:</strong> Referente aos apontamentos em efetivo, no caso de colhedoras o apontamento de colheita de cana.</p>
                      <p className="mb-4"><strong className="text-white bg-blue-500 border border-blue-500 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Disponível:</strong> Todos os outros grupos de apontamento que não em manutenção: Manobra, aguardando transbordo, checklist, abastecimento, etc.</p>
                      <p className="mb-4"><strong className="text-white bg-red-500 border border-red-500 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Manutenção:</strong> Tempo em parada pelo grupo de manutenção: corretiva, preventiva, elétrica, etc.</p>
                      <p><strong className="text-slate-600 bg-white border border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Falta de Informação:</strong> Tempo não registrado pela frota, por motivos como chave geral desligada ou problema de comunicação com bordo/gateway.</p>
                    </div>

                    <div className="border border-black rounded-lg p-3 flex-1 flex flex-col gap-4 overflow-hidden">
                      {pageItems.map((item, index) => (
                        <GraficoIntervalos 
                          key={index}
                          equipamento={item.equipamento}
                          intervalos={item.intervalos}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        })()}

      {/* PÁGINA RESUMO - Resumo do Relatório de Tratores */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-4 overflow-hidden pt-2">
            <h2 className="text-center font-bold text-base">Resumo do Relatório de Tratores {periodoLabel}</h2>
            <p className="text-center text-[10px] text-slate-600">
              Até esta página, os indicadores apresentados utilizam dados da fonte Solinftec.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <CardIndicador 
                titulo="Eficiência Energética"
                meta={metasSafe.eficienciaEnergetica}
                unidade="%"
                dados={dadosResumo.filter(d => (d.eficiencia || 0) > 0).map(d => ({ valor: d.eficiencia }))}
                tipo="asc"
              />
              <CardIndicador 
                titulo="Eficiência Operacional"
                meta={metasSafe.eficienciaOperacional}
                unidade="%"
                dados={dadosResumo.filter(d => (d.eficienciaOperacional || 0) > 0).map(d => ({ valor: d.eficienciaOperacional }))}
                tipo="asc"
              />
              {/* Removido: Horas Elevador não se aplica a tratores */}
              
              {dadosUsoGPSCase.some(d => d.porcentagem > 0) && (
                <CardIndicador 
                  titulo="Uso GPS"
                  meta={metasSafe.usoGPS}
                  unidade="%"
                  dados={dadosUsoGPSCase.map(d => ({ valor: d.porcentagem }))}
                  tipo="asc"
                />
              )}
              <CardIndicador 
                titulo="Média Velocidade"
                meta={metasSafe.mediaVelocidade}
                unidade=" km/h"
                dados={dadosResumo.filter(d => (d.velocidade || 0) > 0).map(d => ({ valor: d.velocidade }))}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Manobras"
                meta={metasSafe.manobras}
                unidade=""
                dados={dadosCardManobras.filter(d => (d.valor || 0) > 0)}
                tipo="desc"
                formatarValor={(v) => formatMmSsFromSeconds(v)}
              />
              <CardIndicador 
                titulo="Motor Ocioso"
                meta={metasSafe.motorOcioso}
                unidade="%"
                dados={dadosResumo.filter(d => (d.ocioso || 0) > 0).map(d => ({ valor: d.ocioso }))}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Disponibilidade Mecânica"
                meta={metasSafe.disponibilidadeMecanica}
                unidade="%"
                dados={dadosResumo.filter(d => (d.disponibilidade || 0) > 0).map(d => ({ valor: d.disponibilidade }))}
                tipo="asc"
              />
              </div>

            <div className="mt-4">
               <TabelaResumo dados={dadosResumo} metas={metasSafe} />
            </div>

          </div>
        </div>
      </div>

      {/* SEÇÃO CASE - MAPAS E GRÁFICOS */}

      {/* PÁGINAS DE MAPAS - Carrega HTMLs do index_mapas.json (apenas mapas de tratores CASE) */}
      {period === "diario" && (() => {
        const dataMapas = metadata?.date ? (() => {
          const parts = String(metadata.date).split('-')
          if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
          return null
        })() : null

        if (!dataMapas) return null

        const mapasDoDia = mapasDisponiveis.filter(m => 
          m.data === dataMapas && 
          m.tipo === 'DIARIO' && 
          Array.isArray(m.frotas) && 
          m.frotas.some((f: string) => ['560', '469', '547'].includes(String(f)))
        )
        
        if (mapasDoDia.length === 0) return null

        return mapasDoDia.map((mapa, idx) => (
          <div 
            key={`mapa-${mapa.arquivo}`}
            data-pdf-page 
            className="bg-white shadow-lg print:shadow-none" 
            style={{ width: "210mm", height: "297mm" }}
          >
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} fonte="case" />
              <div className="flex-1 flex flex-col min-h-0">
                <SectionTitle title={`Área Trabalhada - ${mapa.area} (${mapa.frotas.join(', ')}) - Case IH`} />
                <div className="border border-black rounded-lg p-0 flex-1 overflow-hidden min-h-0 relative">
                  <iframe 
                    src={`/mapas/${mapa.arquivo}`}
                    className="w-full h-full border-0"
                    title={`${mapa.area} - ${dataMapas}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ))
      })()}

      {/* PÁGINA 1 Case IH - 4 gráficos empilhados: Temp Arref + Temp Trans + Temp ArAdm + Horas Motor */}
      {(() => {
        const dadosCaseObj = (data?.dados_case || {}) as Record<string, any>
        const frotas = Object.entries(dadosCaseObj).filter(([k]) => !k.startsWith('_'))
        if (frotas.length === 0) return null
        const formatH = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h${mm.toString().padStart(2, '0')}m` }
        const listaTemp = frotas.map(([frota, stats]) => ({
          Frota: frota,
          temperaturaTransmissao: Number(stats?.temperaturaTransmissao || 0),
          temperaturaArrefecimento: Number(stats?.temperaturaArrefecimento || 0),
          temperaturaArAdmissao: Number(stats?.temperaturaArAdmissao || 0),
        }))
        const temps = [
          { campo: 'temperaturaArrefecimento' as const, label: 'Temperatura Arrefecimento' },
          { campo: 'temperaturaTransmissao' as const, label: 'Temperatura Transmissão' },
          { campo: 'temperaturaArAdmissao' as const, label: 'Temperatura Ar Admissão' },
        ]
        return (
          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} fonte="case" />
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {temps.map(t => {
                  const maxT = Math.max(...listaTemp.map(d => Number((d as any)[t.campo]) || 0), 1)
                  const escala = Math.max(metasSafe.temperaturaTransmissao * 1.2, maxT * 1.1)
                  const posMeta = (metasSafe.temperaturaTransmissao / escala) * 100
                  return (
                    <div key={t.campo} className="flex-1 flex flex-col min-h-0">
                      <SectionTitle title={`${t.label} - Case IH`} />
                      <div className="border border-black rounded-lg p-2 flex-1 flex flex-col justify-center">
                        <div className="bg-slate-50 border border-slate-200 rounded text-center p-1 mb-1">
                          <div className="text-[10px] font-bold text-slate-700">Meta: <span className="text-[#48BB78]">{metasSafe.temperaturaTransmissao.toFixed(1)} °C</span></div>
                        </div>
                        {listaTemp.map((d, i) => {
                          const val = Number((d as any)[t.campo]) || 0
                          const w = Math.min((val / escala) * 100, 100)
                          const cor = val > metasSafe.temperaturaTransmissao ? '#E53E3E' : '#48BB78'
                          return (
                            <div key={d.Frota} className={`flex items-center gap-1 ${i % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm px-2 py-1.5`}>
                              <span className="font-bold text-xs w-10">{d.Frota}</span>
                              <div className="flex-1 h-7 bg-white rounded-sm relative border border-slate-200">
                                <div className="h-full rounded-l-sm" style={{ width: `${w}%`, backgroundColor: cor }} />
                                <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${posMeta}%` }} />
                              </div>
                              <span className="font-bold text-xs w-16 text-right" style={{ color: cor }}>{val.toFixed(1)} °C</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {/* Horas Motor */}
                <div className="flex-1 flex flex-col min-h-0">
                  <SectionTitle title="Horas Motor - Case IH" />
                  <div className="border border-black rounded-lg p-2 flex-1 flex flex-col justify-center">
                    <div className="bg-slate-50 border border-slate-200 rounded text-center p-1 mb-1">
                      <div className="text-[10px] font-bold text-slate-700">
                        <span className="text-green-600">Produtivas</span> | <span className="text-orange-500">Ocioso</span> | <span className="text-red-500">Desligado</span>
                      </div>
                    </div>
                    {frotas.map(([frota, stats], idx) => {
                      const hm = Number(stats?.['Horas Motor'] || 0)
                      const oc = Number(stats?.motorOcioso || 0)
                      const ds = Number(stats?.motorDesligado || 0)
                      const pr = Number(stats?.horasProdutivas || 0)
                      const reg = Number(stats?.tempoRegistrado || 0)
                      const pP = reg > 0 ? (pr / reg) * 100 : 0
                      const pO = reg > 0 ? (oc / reg) * 100 : 0
                      const pD = reg > 0 ? (ds / reg) * 100 : 0
                      return (
                        <div key={frota} className={`flex items-center gap-1 ${idx % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm px-2 py-1.5`}>
                          <span className="font-bold text-xs w-10">{frota}</span>
                          <span className="text-[10px] text-orange-500 font-bold w-14 text-center">{formatH(oc)}</span>
                          <div className="flex-1 h-7 bg-slate-200 rounded-sm overflow-hidden flex">
                            <div className="h-full" style={{ width: `${pP}%`, backgroundColor: '#48BB78' }} />
                            <div className="h-full" style={{ width: `${pO}%`, backgroundColor: '#ED8936' }} />
                            <div className="h-full" style={{ width: `${pD}%`, backgroundColor: '#E53E3E' }} />
                          </div>
                          <span className="text-[10px] text-green-600 font-bold w-14 text-center">{formatH(pr)}</span>
                          <span className="text-[10px] font-bold w-14 text-right text-slate-600">{formatH(hm)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* PÁGINA 2 Case IH - RPM + Velocidade + GPS + Resumo */}
      {(() => {
        const dadosCaseObj = (data?.dados_case || {}) as Record<string, any>
        const frotas = Object.entries(dadosCaseObj).filter(([k]) => !k.startsWith('_'))
        if (frotas.length === 0) return null
        const formatH = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh}h${mm.toString().padStart(2, '0')}m` }
        const formatHH = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}` }
        const comRPM = frotas.filter(([, s]) => Number(s?.rpm || 0) > 0)
        const maxRPM = comRPM.length > 0 ? Math.max(...comRPM.map(([, s]) => Number(s?.rpm || 0)), 1) : 1
        const mediaRPM = comRPM.length > 0 ? comRPM.reduce((a, [, s]) => a + Number(s?.rpm || 0), 0) / comRPM.length : 0
        const comVel = frotas.filter(([, s]) => Number(s?.velocidadeMedia || 0) > 0)
        const maxVel = comVel.length > 0 ? Math.max(...comVel.map(([, s]) => Number(s?.velocidadeMedia || 0)), 1) : 1
        const comGPS = frotas.filter(([, s]) => Number(s?.Extras?.percGPSLigado || 0) > 0)
        return (
          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} fonte="case" />
              <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                {/* RPM */}
                {comRPM.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <SectionTitle title="RPM Médio - Case IH" />
                  <div className="border border-black rounded-lg p-2 flex-1 flex flex-col justify-center gap-1">
                    <div className="bg-slate-50 border border-slate-200 rounded text-center p-1">
                      <div className="text-[10px] font-bold text-slate-700">Média: <span className="text-blue-600">{mediaRPM.toFixed(0)} RPM</span></div>
                    </div>
                    {comRPM.map(([frota, stats], idx) => {
                      const rpm = Number(stats?.rpm || 0)
                      const w = Math.min((rpm / (maxRPM * 1.1)) * 100, 100)
                      return (
                        <div key={frota} className={`flex items-center gap-1 ${idx % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm px-2 py-1.5`}>
                          <span className="font-bold text-xs w-10">{frota}</span>
                          <div className="flex-1 h-7 bg-white rounded-sm border border-slate-200">
                            <div className="h-full rounded-l-sm" style={{ width: `${w}%`, backgroundColor: '#3182CE' }} />
                          </div>
                          <span className="font-bold text-xs w-16 text-right text-blue-600">{rpm.toFixed(0)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}
                {/* Velocidade */}
                {comVel.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <SectionTitle title="Velocidade Média - Case IH" />
                  <div className="border border-black rounded-lg p-2 flex-1 flex flex-col justify-center gap-1">
                    {comVel.map(([frota, stats], idx) => {
                      const vel = Number(stats?.velocidadeMedia || 0)
                      const w = Math.min((vel / (maxVel * 1.2)) * 100, 100)
                      const cor = metasSafe.mediaVelocidade > 0 ? (vel <= metasSafe.mediaVelocidade ? '#48BB78' : '#E53E3E') : '#3182CE'
                      return (
                        <div key={frota} className={`flex items-center gap-1 ${idx % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm px-2 py-1.5`}>
                          <span className="font-bold text-xs w-10">{frota}</span>
                          <div className="flex-1 h-7 bg-white rounded-sm border border-slate-200 relative">
                            <div className="h-full rounded-l-sm" style={{ width: `${w}%`, backgroundColor: cor }} />
                            {metasSafe.mediaVelocidade > 0 && (
                              <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${Math.min((metasSafe.mediaVelocidade / (maxVel * 1.2)) * 100, 100)}%` }} />
                            )}
                          </div>
                          <span className="font-bold text-xs w-20 text-right" style={{ color: cor }}>{vel.toFixed(2)} km/h</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}
                {/* GPS */}
                {comGPS.length > 0 && (
                <div className="flex-1 flex flex-col min-h-0">
                  <SectionTitle title="GPS Detalhado - Case IH" />
                  <div className="border border-black rounded-lg p-2 flex-1 flex flex-col justify-center gap-1">
                    <div className="bg-slate-50 border border-slate-200 rounded text-center p-1">
                      <div className="text-[10px] font-bold text-slate-700">Meta: <span className="text-[#48BB78]">{metaUsoGPS}%</span></div>
                    </div>
                    {comGPS.map(([frota, stats], idx) => {
                      const extras = stats?.Extras || {}
                      const pL = Number(extras.percGPSLigado || 0)
                      const pD = Number(extras.percGPSDesligado || 0)
                      const tL = Number(extras.tempoGPSLigado || 0)
                      const tD = Number(extras.tempoGPSDesligado || 0)
                      const hm = Number(stats?.['Horas Motor'] || 0)
                      const corG = pL >= metaUsoGPS ? '#48BB78' : '#E53E3E'
                      return (
                        <div key={frota} className={`${idx % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm px-2 py-1`}>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs w-10">{frota}</span>
                            <div className="flex-1 h-7 bg-white rounded-sm relative border border-slate-200">
                              <div className="h-full rounded-l-sm" style={{ width: `${Math.min(pL, 100)}%`, backgroundColor: corG }} />
                              <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${metaUsoGPS}%` }} />
                            </div>
                            <span className="font-bold text-xs w-14 text-right" style={{ color: corG }}>{pL.toFixed(1)}%</span>
                          </div>
                          <div className="flex gap-3 ml-11 text-[9px] text-slate-500">
                            <span>GPS Lig: <b className="text-green-600">{formatH(tL)}</b></span>
                            <span>GPS Desl: <b className="text-red-500">{formatH(tD)}</b></span>
                            <span>Motor: <b>{formatH(hm)}</b></span>
                            <span>% Desl: <b className="text-red-500">{pD.toFixed(1)}%</b></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}
                {/* Resumo tabela */}
                <div className="flex-1 flex flex-col min-h-0">
                  <SectionTitle title="Resumo - Case IH" />
                  <div className="border border-black rounded-lg flex-1 overflow-hidden">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="border border-slate-300 p-1">Frota</th>
                          <th className="border border-slate-300 p-1">H. Motor</th>
                          <th className="border border-slate-300 p-1">RPM</th>
                          <th className="border border-slate-300 p-1">T. Arref</th>
                          <th className="border border-slate-300 p-1">T. Trans</th>
                          <th className="border border-slate-300 p-1">T. Ar Adm</th>
                          <th className="border border-slate-300 p-1">Ocioso</th>
                          <th className="border border-slate-300 p-1">Deslig.</th>
                          <th className="border border-slate-300 p-1">Produt.</th>
                          <th className="border border-slate-300 p-1">GPS</th>
                          <th className="border border-slate-300 p-1">Vel.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {frotas.map(([frota, stats]) => (
                          <tr key={frota} className="even:bg-slate-50">
                            <td className="border border-slate-300 p-1 font-bold">{frota}</td>
                            <td className="border border-slate-300 p-1 font-bold">{formatHH(Number(stats?.['Horas Motor'] || 0))}</td>
                            <td className="border border-slate-300 p-1 font-bold">{Number(stats?.rpm || 0).toFixed(0)}</td>
                            <td className="border border-slate-300 p-1">{Number(stats?.temperaturaArrefecimento || 0).toFixed(1)}°</td>
                            <td className={`border border-slate-300 p-1 font-bold ${Number(stats?.temperaturaTransmissao || 0) > metasSafe.temperaturaTransmissao ? 'text-red-600' : 'text-green-600'}`}>{Number(stats?.temperaturaTransmissao || 0).toFixed(1)}°</td>
                            <td className="border border-slate-300 p-1">{Number(stats?.temperaturaArAdmissao || 0).toFixed(1)}°</td>
                            <td className="border border-slate-300 p-1 font-bold text-orange-500">{formatHH(Number(stats?.motorOcioso || 0))}</td>
                            <td className="border border-slate-300 p-1 font-bold text-red-600">{formatHH(Number(stats?.motorDesligado || 0))}</td>
                            <td className="border border-slate-300 p-1 font-bold text-green-600">{formatHH(Number(stats?.horasProdutivas || 0))}</td>
                            <td className={`border border-slate-300 p-1 font-bold ${Number(stats?.Extras?.percGPSLigado || 0) >= metaUsoGPS ? 'text-green-600' : 'text-red-600'}`}>{Number(stats?.Extras?.percGPSLigado || 0).toFixed(1)}%</td>
                            <td className="border border-slate-300 p-1 font-bold">{Number(stats?.velocidadeMedia || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ajustes de largura/espaçamento do painel ficam aqui (w, px/py, gap, grid-cols, etc). */}
      <div
        className={`fixed top-3 z-[9999] w-[190px] max-w-[calc(100vw-1.5rem)] print:hidden ${utilitiesPanelLeft == null ? "right-3" : ""}`}
        style={utilitiesPanelLeft == null ? undefined : { left: utilitiesPanelLeft }}
        data-utilities-panel
      >
        <div
          ref={utilitiesPanelRef}
          className="flex max-h-[calc(100svh-1.5rem)] flex-col gap-2 overflow-auto rounded-md border bg-white/90 px-2 py-2 shadow-sm backdrop-blur"
        >
          {pageCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="flex-1 text-center text-[11px] font-medium text-slate-700">{`Pág. ${currentPage}/${pageCount}`}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollToPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {!isPdfMode && (
            <>
              {/* Layout fixo do utilitário: sempre em coluna, sem breakpoints (sm/md) e sem regras condicionais. */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[32px_1fr_32px] items-center gap-2">
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
                    className="h-8 w-full text-xs"
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
                  className="h-8 w-full text-xs"
                >
                  <Download className="mr-2 h-3.5 w-3.5" /> {isGenerating ? "Gerando..." : "Baixar PDF"}
                </Button>
              </div>
            </>
          )}

          {isPdfMode && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isGenerating} className="h-8 w-full text-xs">
              <Download className="mr-2 h-3.5 w-3.5" /> {isGenerating ? "Gerando..." : "Baixar PDF"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
