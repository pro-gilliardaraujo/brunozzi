"use client"
import React from "react"
import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"
import { DADOS_MOCK } from "./dados"
import { CabecalhoMeta } from "./componentes/CabecalhoMeta"
import { CabecalhoProducao } from "./componentes/CabecalhoProducao"
import { GraficoEficiencia } from "./componentes/GraficoEficiencia"
import { GraficoHorasElevador } from "./componentes/GraficoHorasElevador"
import { GraficoToneladasPorFrota } from "./componentes/GraficoToneladasPorFrota"
import { GraficoUsoGPS } from "./componentes/GraficoUsoGPS"
import { GraficoMediaVelocidade } from "./componentes/GraficoMediaVelocidade"
import { GraficoManobras } from "./componentes/GraficoManobras"
import { TabelaLavagem } from "./componentes/TabelaLavagem"
import { TabelaRoletes } from "./componentes/TabelaRoletes"
import { GraficoMotorOcioso } from "./componentes/GraficoMotorOcioso"
import { GraficoTop5Ofensores } from "./componentes/GraficoTop5Ofensores"
import { GraficoDisponibilidadeMecanica } from "./componentes/GraficoDisponibilidadeMecanica"
import { GraficoIntervalos, Intervalo } from "./componentes/GraficoIntervalos"
import { CardIndicador } from "./componentes/CardIndicador"
import { CardProducao } from "./componentes/CardProducao"
import { TabelaResumo } from "./componentes/TabelaResumo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server"
import { downloadPdfBuffer } from "@/lib/pdf-utils"

const MapaColheita = dynamic(() => import('./componentes/MapaColheita'), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-100">Carregando Mapa...</div>
});

const LOGO_URL = "https://kjlwqezxzqjfhacmjhbh.supabase.co/storage/v1/object/public/sourcefiles/Logo%20IB%20Full.png"

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
  return (
    <div className="text-center text-base font-bold text-black mb-2">{title}</div>
  )
}

function RelatorioFrotasCd({ period }: { period: "diario" | "semanal" }) {
  const [dadosMapa, setDadosMapa] = React.useState<any[]>([]);
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
  const [mockQtdLavagemRows, setMockQtdLavagemRows] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      if (p.has("mockQtdLavagem")) return Number(p.get("mockQtdLavagem"))
    }
    return 0
  })
  const [mockQtdRoletesRows, setMockQtdRoletesRows] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search)
      if (p.has("mockQtdRoletes")) return Number(p.get("mockQtdRoletes"))
    }
    return 0
  })

  // Carregar estado dos mocks do localStorage na inicialização
  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedMock = localStorage.getItem("mockControlsState")
      if (savedMock) {
        const parsed = JSON.parse(savedMock)
        if (typeof parsed.qtdFrotas === 'number') setMockQtdFrotas(parsed.qtdFrotas)
        if (typeof parsed.qtdLavagem === 'number') setMockQtdLavagemRows(parsed.qtdLavagem)
        if (typeof parsed.qtdRoletes === 'number') setMockQtdRoletesRows(parsed.qtdRoletes)
        
        // Se houver qualquer configuração salva, forçamos a exibição dos controles (ativação do mock)
        // Isso garante que o PDF gerado use os dados mockados, mesmo se a URL não tiver ID
        if (parsed.show || parsed.qtdLavagem > 0 || parsed.qtdRoletes > 0) {
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
      qtdLavagem: mockQtdLavagemRows,
      qtdRoletes: mockQtdRoletesRows,
      show: showMockControls
    }
    localStorage.setItem("mockControlsState", JSON.stringify(state))
  }, [mockQtdFrotas, mockQtdLavagemRows, mockQtdRoletesRows, showMockControls])

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

  const { 
    metadata,
    metas, 
    imagens, 
    ofensores, 
    disponibilidade_mecanica, 
    eficiencia_energetica, 
    motor_ocioso, 
    uso_gps, 
    media_velocidade, 
    producao,
    producao_total,
    producao_por_frota,
    manobras_frotas,
    horas_elevador,
    lavagem,
    roletes,
    intervalos_operacao
  } = DADOS_MOCK
  
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

  const endDate = new Date(metadata.date)
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
  const tituloRelatorio = `Relatório ${periodoLabel} de Frotas - Colhedoras ${frenteNome}`
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
  const totalLavagemBase = Array.isArray(lavagem) ? lavagem.length : 0
  const totalRoletesBase = Array.isArray(roletes) ? roletes.length : 0

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
    const reportEl = reportRef.current
    if (!reportEl) return

    const filename = `${tituloRelatorio} - ${nomeDataArquivo}.pdf`
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
      
      const pdfBuffer = await generateRelatorioPdfFromUrl(
        currentUrl, 
        filename,
        { 
          cookieHeader, 
          localStorage: localStorageData,
          mockState: {
            qtdFrotas: mockQtdFrotas,
            qtdLavagem: mockQtdLavagemRows,
            qtdRoletes: mockQtdRoletesRows,
            show: showMockControls
          }
        }
      )

      downloadPdfBuffer(pdfBuffer, filename)
      
      if (debug) {
        console.log('[PDF][CD-DIARIO] PDF finalizado e baixado', { filename })
      }
      toast({ title: 'PDF gerado', description: 'Verifique a pasta de Downloads do navegador.' })
    } catch (e) {
      // Se for um erro de "user aborted" ou algo similar que na verdade foi sucesso no download, ignoramos
      console.error('Erro ao gerar PDF', e)
      toast({ title: 'Falha ao gerar PDF', description: 'Tente novamente em instantes.' })
    } finally {
      setIsGenerating(false)
    }
  }, [tituloRelatorio, nomeDataArquivo, toast, mockQtdFrotas, mockQtdLavagemRows, mockQtdRoletesRows, showMockControls])

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
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    pages.forEach((p) => observer.observe(p))

    const onResize = () => computePageMetrics()
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [computePageMetrics, zoomPercent, isPdfMode, showMockControls, mockQtdFrotas, mockQtdLavagemRows, mockQtdRoletesRows, period])

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
    if (!showMockControls) return dadosValidosBase.length
    return clampInt(mockQtdFrotas, 1, MAX_MOCK_QTD_FROTAS)
  }, [showMockControls, mockQtdFrotas, dadosValidosBase.length, clampInt])

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

  const mediaVelocidadeFiltrada = React.useMemo(() => {
    const base = Array.isArray(media_velocidade) ? media_velocidade : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `vel-${idx + 1}`, nome: name, velocidade: 0 })
    )
  }, [buildNamedSeries, media_velocidade, qtdFrotasEfetivo])

  const manobrasFiltradas = React.useMemo(() => {
    const base = Array.isArray(manobras_frotas) ? manobras_frotas : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "Frota",
      (name) => ({ Frota: name, "Tempo Total": 0, "Tempo Médio (hh:mm)": "00:00:00", "Intervalos Válidos": 0 })
    )
  }, [buildNamedSeries, manobras_frotas, qtdFrotasEfetivo])

  const motorOciosoFiltrado = React.useMemo(() => {
    const base = Array.isArray(motor_ocioso) ? motor_ocioso : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `oc-${idx + 1}`, nome: name, percentual: 0 })
    )
  }, [buildNamedSeries, motor_ocioso, qtdFrotasEfetivo])

  const disponibilidadeFiltrada = React.useMemo(() => {
    const base = Array.isArray(disponibilidade_mecanica) ? disponibilidade_mecanica : []
    return buildNamedSeries(
      base,
      qtdFrotasEfetivo,
      "nome",
      (name, idx) => ({ id: `disp-${idx + 1}`, nome: name, disponibilidade: 0 })
    )
  }, [buildNamedSeries, disponibilidade_mecanica, qtdFrotasEfetivo])

  const dadosUsoGPS = React.useMemo(() => {
    const base = Array.isArray(uso_gps) ? uso_gps.filter((d: any) => d?.nome) : []
    return buildNamedSeries(base, qtdFrotasEfetivo, "nome", (name, idx) => ({ id: `gps-${idx + 1}`, nome: name, porcentagem: 0 }))
  }, [buildNamedSeries, uso_gps, qtdFrotasEfetivo])

  // Cálculos para Eficiência Energética
  const metaEficiencia = metas.eficienciaEnergetica
  const dadosEficienciaNaoZero = dadosValidos.filter(d => d.eficiencia > 0)
  const mediaEficiencia = dadosEficienciaNaoZero.reduce((acc, curr) => acc + curr.eficiencia, 0) / (dadosEficienciaNaoZero.length || 1)

  // Cálculos para Horas Elevador
  // Usando os mesmos dados de eficiência energética para consistência
  const metaHorasElevador = metas.horaElevador // ex: 5
  const dadosHorasElevadorNaoZero = dadosValidos.filter(d => d.horasElevador > 0)
  const mediaHorasElevador = dadosHorasElevadorNaoZero.reduce((acc, curr) => acc + curr.horasElevador, 0) / (dadosHorasElevadorNaoZero.length || 1)

  // Preparar dados para o gráfico de horas elevador
  const dadosGraficoHoras = dadosValidos.map(d => ({
    id: d.id,
    nome: d.nome,
    horas: d.horasElevador
  }))
  const isManyFrotas = qtdFrotasEfetivo > 4
  const alturaEficPerc = isManyFrotas ? 50 : 50
  const alturaHorasPerc = 100 - alturaEficPerc
  const headerReservedPx = isManyFrotas ? 36 : 50

  // Página 2 - Toneladas por Frota
  const producaoTotalValor = typeof producao_total?.[0]?.valor === 'number' ? producao_total[0].valor : (typeof producao === 'number' ? producao : 0)
  const somaHorasElevador = dadosValidos.reduce((acc, curr) => acc + (typeof curr.horasElevador === 'number' ? curr.horasElevador : 0), 0)
  const dadosToneladas = somaHorasElevador > 0
    ? dadosValidos.map(d => ({
        id: d.id,
        nome: d.nome,
        producao: producaoTotalValor * ((d.horasElevador || 0) / somaHorasElevador)
      }))
    : dadosValidos.map(d => ({
        id: d.id,
        nome: d.nome,
        producao: 0
      }))
  const itensComProducao = dadosToneladas.filter(d => d.producao > 0)
  const mediaProducaoEquip = itensComProducao.reduce((acc, curr) => acc + curr.producao, 0) / (itensComProducao.length || 1)
  const tphDia = producaoTotalValor / 24

  // Página 2 - Uso GPS
  const metaUsoGPS = metas.usoGPS
  const dadosUsoGPSNaoZero = dadosUsoGPS.filter(d => (d.porcentagem || 0) > 0)
  const mediaUsoGPS = dadosUsoGPSNaoZero.reduce((acc, curr) => acc + curr.porcentagem, 0) / (dadosUsoGPSNaoZero.length || 1)

  // Página 7 - Ofensores e Disponibilidade
  const dadosOfensores = (ofensores || []).map(item => {
    // Tenta extrair o nome após o código (ex: "8040 - MANUTENCAO" -> "MANUTENCAO")
    const parts = item.operacao.split(' - ')
    const nome = parts.length > 1 ? parts.slice(1).join(' - ') : item.operacao
    return {
      nome,
      percentual: item.porcentagem,
      duracao: item.tempo
    }
  })

  // Preparar dados para o Resumo
  const dadosResumo = dadosValidos.map(f => {
    const nome = f.nome;
    const disp = (disponibilidadeFiltrada || []).find((d: any) => d.nome === nome);
    const ocioso = (motorOciosoFiltrado || []).find((d: any) => d.nome === nome);
    const gps = (dadosUsoGPS || []).find((d: any) => d.nome === nome);
    const vel = (mediaVelocidadeFiltrada || []).find((d: any) => d.nome === nome);
    const prod = (producao_por_frota || []).find((d: any) => d.nome === nome);
    const man = (manobrasFiltradas || []).find((d: any) => String(d.Frota) === nome);
    const elev = (horas_elevador || []).filter((d: any) => d.nome === nome).reduce((acc: number, curr: any) => acc + Number(curr?.valor || 0), 0);

    return {
      frota: nome,
      eficiencia: f.eficiencia || 0,
      horasElevador: elev || 0,
      producao: prod?.valor || 0,
      velocidade: vel?.velocidade || 0,
      gps: gps?.porcentagem || 0,
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

  const lavagemForTable = React.useMemo(() => {
    const base = Array.isArray(lavagem) ? lavagem : []
    if (!showMockControls) return base
    return buildRows<any>(
      base,
      mockQtdLavagemRows,
      (idx) => ({
        Data: endStr,
        Equipamento: 8000 + idx,
        Intervalo: "Lavagem",
        "Início": "00:00:00",
        "Fim": "00:00:00",
        "Duração (horas)": 0,
        "Tempo Total do Dia": 0,
      })
    )
  }, [lavagem, showMockControls, buildRows, mockQtdLavagemRows, endStr])

  const roletesForTable = React.useMemo(() => {
    const base = Array.isArray(roletes) ? roletes : []
    if (!showMockControls) return base
    return buildRows<any>(
      base,
      mockQtdRoletesRows,
      (idx) => ({
        Data: endStr,
        Equipamento: 9000 + idx,
        Intervalo: "Aferição",
        "Início": "00:00:00",
        "Fim": "00:00:00",
        "Duração (horas)": 0,
        "Tempo Total do Dia": 0,
      })
    )
  }, [roletes, showMockControls, buildRows, mockQtdRoletesRows, endStr])

  // Lógica de Paginação Dinâmica para Pág 6 (Lavagem/Roletes/Motor)
  // Requisito:
  // - Motor Ocioso deve ser prioridade para mover.
  // - Limite seguro inicial: (lavagem > 10 OU roletes > 2 OU motorOcioso > 7) -> Mover Motor.
  // - Se Motor moveu, verificar se Lavagem + Roletes cabem juntos na Pág 6.
  
  const qtdMotorOcioso = motorOciosoFiltrado ? motorOciosoFiltrado.length : 0
  const qtdLavagem = lavagemForTable.length
  const qtdRoletes = roletesForTable.length
  
  // Se a Tabela de Roletes for muito grande, precisamos paginá-la internamente
  const roletesPaginated = React.useMemo(() => {
    if (roletesForTable.length <= 28) return { page1: roletesForTable, page2: [] }
    
    // Se for maior que 28, a página 7 (onde ela começa se SPLIT_TABLES) fica com 28 itens
    // O restante vai para a página 8 (ou próxima)
    return {
      page1: roletesForTable.slice(0, 28),
      page2: roletesForTable.slice(28)
    }
  }, [roletesForTable])

  const layoutMode = React.useMemo(() => {
    // 1. Verificação Primária: Tudo cabe na Página 6?
    // Limites conservadores para garantir que tudo caiba confortavelmente se estiverem juntos
    const deveMoverMotor = qtdMotorOcioso > 7 || qtdLavagem > 10 || qtdRoletes > 2
    
    if (!deveMoverMotor) {
       // Se não precisa mover motor, tenta manter tudo na mesma página
       // Mas faz uma verificação de segurança total de linhas também (ex: soma total > 18)
       const totalLines = qtdLavagem + qtdRoletes + qtdMotorOcioso
       if (totalLines <= 18) return 'SINGLE_PAGE'
    }
    
    // Se chegou aqui, Motor Ocioso VAI para a próxima página (SPLIT_MOTOR ou além)
    // Agora decidimos se Lavagem e Roletes podem ficar juntos na página 6
    
    // Página 6 terá apenas Lavagem e Roletes.
    const somaTabelas = qtdLavagem + qtdRoletes
    
    // Se a soma das tabelas for muito grande (> 26), PRECISAMOS separar Lavagem e Roletes
    if (somaTabelas > 26) {
      // Roletes vai para a Página 7.
      // Precisamos verificar se ele precisa ser paginado (max 28 itens por página cheia)
      const roletesResto = Math.max(0, qtdRoletes - 28)
      
      // Caso 1: Roletes cabe todo na Página 7 (<= 28 itens)
      if (roletesResto === 0) {
         // Motor cabe junto na P7? (Soma <= 21)
         if (qtdRoletes + qtdMotorOcioso <= 21) {
            return 'SPLIT_TABLES_COMBINED' // P6: Lav, P7: Rol + Mot
         }
         return 'SPLIT_TABLES_SEPARATED' // P6: Lav, P7: Rol, P8: Mot
      }
      
      // Caso 2: Roletes precisa de paginação (tem resto para P8)
      // Pág 7 fica cheia com Roletes Parte 1 (28 itens).
      // Pág 8 recebe Roletes Parte 2.
      // Motor cabe na P8 junto com o resto? (Soma <= 21)
      if (roletesResto + qtdMotorOcioso <= 21) {
         return 'SPLIT_PAGINATED_COMBINED' // P6: Lav, P7: Rol1, P8: Rol2 + Mot
      }
      
      return 'SPLIT_PAGINATED_SEPARATED' // P6: Lav, P7: Rol1, P8: Rol2, P9: Mot
    }
    
    // Se a soma for ok (<= 26), Roletes fica na página 6 junto com Lavagem
    // E o Motor Ocioso vai para a 7 (pois já passou pelo check 'deveMoverMotor' lá em cima)
    return 'SPLIT_MOTOR' // P6: Lav + Rol, P7: Mot
  }, [qtdMotorOcioso, qtdLavagem, qtdRoletes])

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
          <div ref={scrollWrapRef} className="overflow-auto report-scroll">
            <div className="w-fit [[data-sidebar-compact='1']_&]:mx-0 [[data-sidebar-compact='0']_&]:mx-auto">
              <div
                ref={reportRef}
                className="inline-flex flex-col items-start gap-4 report-zoom"
                style={{ ...(isPdfMode ? {} : ({ zoom } as any)) }}
              >
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col" style={{ height: `${alturaEficPerc}%` }}>
              <SectionTitle title="Eficiência Energética" />
              <div className="border border-black rounded-lg p-3 flex-1 flex flex-col">
                <CabecalhoMeta 
                  meta={metaEficiencia} 
                  media={mediaEficiencia} 
                  tipo="porcentagem"
                  compact={isManyFrotas}
                />
                <div className="flex-1 overflow-hidden mt-1">
                  <GraficoEficiencia 
                    dados={dadosValidos} 
                    meta={metaEficiencia} 
                    compact={isManyFrotas}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col" style={{ height: `${alturaHorasPerc}%` }}>
              <SectionTitle title="Horas Elevador" />
              <div className="border border-black rounded-lg p-3 flex-1">
                <CabecalhoMeta 
                  meta={metaHorasElevador} 
                  media={mediaHorasElevador} 
                  tipo="horas"
                  sufixoMedia="Média calculada excluindo valores 0 h"
                  compact={isManyFrotas}
                />
                <div className="overflow-hidden mt-1" style={{ height: `calc(100% - ${headerReservedPx}px)` }}>
                  <GraficoHorasElevador dados={dadosGraficoHoras} meta={metaHorasElevador} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Toneladas / Frota" />
              <div className="border border-black rounded-lg p-3 flex-1">
                <CabecalhoProducao 
                  producaoTotal={producaoTotalValor} 
                  mediaPorEquipamento={mediaProducaoEquip} 
                  tphDia={tphDia}
                />
                <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                  <GraficoToneladasPorFrota dados={dadosToneladas} />
                </div>
              </div>
            </div>
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Uso GPS" />
              <div className="border border-black rounded-lg p-3 flex-1">
                <CabecalhoMeta 
                  meta={metaUsoGPS} 
                  media={mediaUsoGPS} 
                  tipo="porcentagem" 
                  sufixoMedia="Média calculada excluindo valores 0%"
                />
                <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                  <GraficoUsoGPS dados={dadosUsoGPS} meta={metaUsoGPS} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {period === "diario" && (
        <>
          {/* PÁGINA 3 - Mapa GPS */}
          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col min-h-0">
                <SectionTitle title="Mapa de utilização GPS" />
                <div className="border border-black rounded-lg p-1 flex-1 overflow-hidden min-h-0 relative">
                  <MapaColheita tipo="rtk" dadosExternos={dadosMapa} />
                </div>
              </div>
            </div>
          </div>

          {/* PÁGINA 4 - Área Trabalhada */}
          <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
            <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
              <div className="flex-1 flex flex-col min-h-0">
                <SectionTitle title="Área Trabalhada" />
                <div className="border border-black rounded-lg p-1 flex-1 overflow-hidden min-h-0 relative">
                  <MapaColheita tipo="equipamento" dadosExternos={dadosMapa} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PÁGINA 5 - Velocidade e Manobras */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Média de Velocidade" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                 <GraficoMediaVelocidade dados={mediaVelocidadeFiltrada} meta={metas.mediaVelocidade} />
              </div>
            </div>
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Manobras" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoManobras 
                    dados={manobrasFiltradas} 
                    meta={metas.manobras || 60} 
                    compact={isManyFrotas}
                 />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 6 - Lavagem, Roletes e Motor Ocioso */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col justify-between gap-2 overflow-hidden">
             {/* Tabela de Lavagem - Sempre na Página 6 */}
             <div className="flex flex-col">
                <SectionTitle title="Lavagem" />
                <TabelaLavagem dados={lavagemForTable} />
             </div>

             {/* Tabela de Roletes - Apenas se layoutMode permitir (SINGLE_PAGE ou SPLIT_MOTOR) */}
             {(layoutMode === 'SINGLE_PAGE' || layoutMode === 'SPLIT_MOTOR') && (
               <div className="flex flex-col">
                  <SectionTitle title="Aferição de Roletes" />
                  <TabelaRoletes dados={roletesForTable} />
               </div>
             )}

             {/* Gráfico de Motor Ocioso - Apenas se layoutMode === 'SINGLE_PAGE' */}
             {layoutMode === 'SINGLE_PAGE' && (
               <div className="flex flex-col shrink-0">
                 <SectionTitle title="Motor Ocioso" />
                 <div className="border border-black rounded-lg p-3 flex flex-col justify-start">
                    <GraficoMotorOcioso 
                      dados={motorOciosoFiltrado || []} 
                      meta={metas.motorOcioso} 
                      compact={isManyFrotas}
                    />
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* PÁGINA 7 (Condicional) - Roletes e/ou Motor Ocioso */}
      {layoutMode !== 'SINGLE_PAGE' && (
        <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
          <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
            <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              
              {/* Roletes: Aparece aqui se layout for SPLIT_TABLES_*, SPLIT_PAGINATED_* */}
              {(layoutMode.startsWith('SPLIT_TABLES') || layoutMode.startsWith('SPLIT_PAGINATED')) && (
                <div className="flex flex-col">
                   <SectionTitle title="Aferição de Roletes" />
                   {/* Se for paginado, mostra page1. Se não, mostra tudo (que é igual a page1 neste caso pois não tem resto) */}
                   <TabelaRoletes dados={roletesPaginated.page1} />
                </div>
              )}

              {/* Motor Ocioso: Aparece aqui se layout for SPLIT_MOTOR, SPLIT_TABLES_COMBINED */}
              {(layoutMode === 'SPLIT_MOTOR' || layoutMode === 'SPLIT_TABLES_COMBINED') && (
                <div className="flex flex-col overflow-hidden shrink-0">
                  <SectionTitle title="Motor Ocioso" />
                  <div className="border border-black rounded-lg p-3 overflow-hidden flex flex-col justify-start">
                    <GraficoMotorOcioso 
                       dados={motorOciosoFiltrado || []} 
                       meta={metas.motorOcioso} 
                       compact={isManyFrotas}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* PÁGINA 8 (Condicional) - Motor Ocioso Isolado E/OU Resto de Roletes */}
      {(layoutMode === 'SPLIT_TABLES_SEPARATED' || layoutMode.startsWith('SPLIT_PAGINATED')) && (
        <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
          <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
            <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              
              {/* Roletes Parte 2: Aparece aqui se SPLIT_PAGINATED_* */}
              {layoutMode.startsWith('SPLIT_PAGINATED') && roletesPaginated.page2.length > 0 && (
                <div className="flex flex-col">
                   <SectionTitle title="Aferição de Roletes (Continuação)" />
                   <TabelaRoletes dados={roletesPaginated.page2} />
                </div>
              )}

              {/* Motor Ocioso: Aparece aqui se SPLIT_TABLES_SEPARATED ou SPLIT_PAGINATED_COMBINED */}
              {(layoutMode === 'SPLIT_TABLES_SEPARATED' || layoutMode === 'SPLIT_PAGINATED_COMBINED') && (
                <div className="flex flex-col overflow-hidden shrink-0">
                  <SectionTitle title="Motor Ocioso" />
                  <div className="border border-black rounded-lg p-3 overflow-hidden flex flex-col justify-start">
                    <GraficoMotorOcioso 
                       dados={motorOciosoFiltrado || []} 
                       meta={metas.motorOcioso} 
                       compact={isManyFrotas}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PÁGINA 9 (Condicional) - Motor Ocioso Isolado (Overflow total) */}
      {layoutMode === 'SPLIT_PAGINATED_SEPARATED' && (
        <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
          <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
            <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <SectionTitle title="Motor Ocioso" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                <GraficoMotorOcioso 
                   dados={motorOciosoFiltrado || []} 
                   meta={metas.motorOcioso} 
                   compact={isManyFrotas}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PÁGINA 7 - Top 5 Ofensores e Disponibilidade Mecânica */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {/* Top 5 Ofensores - Altura levemente reduzida */}
            <div className="flex flex-col shrink-0" style={{ height: "45%" }}>
              <SectionTitle title="Top 5 Ofensores" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                <GraficoTop5Ofensores dados={dadosOfensores} />
              </div>
            </div>
            
            {/* Disponibilidade Mecânica - Ocupa o restante */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <SectionTitle title="Disponibilidade Mecânica" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoDisponibilidadeMecanica 
                    dados={disponibilidadeFiltrada || []} 
                    meta={metas.disponibilidadeMecanica || 90} 
                    compact={isManyFrotas}
                 />
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
          const totalPages = Math.ceil(intervalosAgrupados.length / 4)
          return Array.from({ length: totalPages }).map((_, pageIndex) => {
            const startIndex = pageIndex * 4
            const pageItems = intervalosAgrupados.slice(startIndex, startIndex + 4)

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

      {/* PÁGINA RESUMO - Resumo do Relatório de Colheita Diário */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-4 overflow-hidden pt-2">
            <h2 className="text-center font-bold text-base">Resumo do Relatório de Colheita {periodoLabel}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <CardIndicador 
                titulo="Eficiência Energética"
                meta={metas.eficienciaEnergetica}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.eficiencia }))}
                tipo="asc"
              />
              <CardIndicador 
                titulo="Uso GPS"
                meta={metas.usoGPS}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.gps }))}
                tipo="asc"
              />
              <CardIndicador 
                titulo="Média Velocidade"
                meta={metas.mediaVelocidade}
                unidade=" km/h"
                dados={dadosResumo.map(d => ({ valor: d.velocidade }))}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Manobras"
                meta={metas.manobras || 60}
                unidade=""
                dados={dadosCardManobras}
                tipo="desc"
                formatarValor={(v) => formatMmSsFromSeconds(v)}
              />
              <CardIndicador 
                titulo="Motor Ocioso"
                meta={metas.motorOcioso}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.ocioso }))}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Disponibilidade Mecânica"
                meta={metas.disponibilidadeMecanica}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.disponibilidade }))}
                tipo="asc"
              />
              <CardProducao 
                valorTotal={producao || 0}
                totalFrotas={dadosResumo.length}
              />
            </div>

            <div className="mt-4">
               <TabelaResumo dados={dadosResumo} metas={metas} />
            </div>

          </div>
        </div>
      </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ajustes de largura/espaçamento do painel ficam aqui (w, px/py, gap, grid-cols, etc). */}
      <div
        className={`fixed top-3 z-[9999] w-[190px] max-w-[calc(100vw-1.5rem)] print:hidden ${utilitiesPanelLeft == null ? "right-3" : ""}`}
        style={utilitiesPanelLeft == null ? undefined : { left: utilitiesPanelLeft }}
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

              {showMockControls && (
                <div className="flex flex-col gap-2 border-t pt-2">
                  <div className="text-[11px] font-semibold text-slate-700">Mocks</div>
                  <div className="grid grid-cols-[1fr_66px] items-center gap-2">
                    <Label className="text-[11px] text-slate-600">Qtd frotas</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      min={1}
                      max={MAX_MOCK_QTD_FROTAS}
                      value={clampInt(mockQtdFrotas, 1, MAX_MOCK_QTD_FROTAS)}
                      onChange={(e) => setMockQtdFrotas(clampInt(e.target.value, 1, MAX_MOCK_QTD_FROTAS))}
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_66px] items-center gap-2">
                    <Label className="text-[11px] text-slate-600">Rows lavagem</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      min={0}
                      max={50}
                      value={clampInt(mockQtdLavagemRows, 0, 50)}
                      onChange={(e) => setMockQtdLavagemRows(clampInt(e.target.value, 0, 50))}
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_66px] items-center gap-2">
                    <Label className="text-[11px] text-slate-600">Rows roletes</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      min={0}
                      max={50}
                      value={clampInt(mockQtdRoletesRows, 0, 50)}
                      onChange={(e) => setMockQtdRoletesRows(clampInt(e.target.value, 0, 50))}
                    />
                  </div>
                </div>
              )}
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

export default function RelatorioDiarioFrotas({
  searchParams,
}: {
  searchParams?: { period?: string }
}) {
  const period = searchParams?.period === "semanal" ? "semanal" : "diario"
  return <RelatorioFrotasCd period={period} />
}
