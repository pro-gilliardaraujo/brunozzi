"use client"
import React from "react"
import { DADOS_MOCK } from "./dados"
import { CabecalhoMeta } from "./componentes/CabecalhoMeta"
import { CabecalhoProducao } from "./componentes/CabecalhoProducao"
import { GraficoEficiencia } from "./componentes/GraficoEficiencia"
import { GraficoToneladasPorFrota } from "./componentes/GraficoToneladasPorFrota"
import { GraficoUsoGPS } from "./componentes/GraficoUsoGPS"
import { GraficoMediaVelocidade } from "./componentes/GraficoMediaVelocidade"
import { GraficoMotorOcioso } from "./componentes/GraficoMotorOcioso"
import { CardIndicador } from "./componentes/CardIndicador"
import { CardProducao } from "./componentes/CardProducao"
// Removidos: TabelaLavagem, TabelaRoletes (apenas colhedoras)

// Componentes Locais (Customizados ou Cópias)
import { GraficoBasculamento } from "./componentes/GraficoBasculamento"
import { GraficoManobras } from "./componentes/GraficoManobras"
import { GraficoFaltaApontamento } from "./componentes/GraficoFaltaApontamento"
import { GraficoTop5Ofensores } from "./componentes/GraficoTop5Ofensores"
import { GraficoDisponibilidadeMecanica } from "./componentes/GraficoDisponibilidadeMecanica"
import { GraficoIntervalos, Intervalo } from "./componentes/GraficoIntervalos"
import { TabelaResumo } from "./componentes/TabelaResumo"
import ttIntervalosData from '../../../../../../__utilitarios/relatorios/implementacao/exemplos/intervalosTransbordos.json'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Minus, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server"
import { downloadPdfBuffer } from "@/lib/pdf-utils"

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

function RelatorioFrotasTt({ period }: { period: "diario" | "semanal" }) {
  const { 
    metadata,
    metas, 
    ofensores, 
    disponibilidade_mecanica, 
    eficiencia_energetica, 
    motor_ocioso, 
    media_velocidade,
    media_velocidade_detalhada, 
    producao,
    producao_total,
    manobras_frotas,
    intervalos_operacao,
    horas_elevador,
    uso_gps,
    producao_por_frota,
    lavagem,
    roletes,
    falta_apontamento,
    basculamento_frotas
  } = DADOS_MOCK
  
  // Agrupar intervalos por equipamento
  const intervalosAgrupados = React.useMemo(() => {
    const source: any[] = Array.isArray(intervalos_operacao) && intervalos_operacao.length > 0
      ? (intervalos_operacao as any[])
      : (((ttIntervalosData as any)?.intervalos) || [])
    if (!source || source.length === 0) return []
    const grouped: Record<string, Intervalo[]> = {}
    source.forEach((item: any) => {
      const equip = String(item.equipamento)
      if (!grouped[equip]) grouped[equip] = []
      grouped[equip].push({
        tipo: item.tipo,
        inicio: item.inicio,
        duracaoHoras: item.duracaoHoras
      })
    })
    return Object.entries(grouped)
      .map(([equipamento, intervalos]) => ({ equipamento, intervalos }))
      .sort((a, b) => a.equipamento.localeCompare(b.equipamento))
  }, [intervalos_operacao])

  const endDate = new Date(metadata.date)
  const endStr = endDate.toLocaleDateString("pt-BR")
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 6)
  const startStr = startDate.toLocaleDateString("pt-BR")
  const dataFormatada = period === "semanal" ? `${startStr} - ${endStr}` : endStr
  const reportRef = React.useRef<HTMLDivElement>(null)
  const scrollWrapRef = React.useRef<HTMLDivElement>(null)
  const utilitiesPanelRef = React.useRef<HTMLDivElement>(null)
  const [utilitiesPanelLeft, setUtilitiesPanelLeft] = React.useState<number | null>(null)

  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [zoomPercent, setZoomPercent] = React.useState(100)
  const [isPdfMode, setIsPdfMode] = React.useState(false)
  const [frenteNomeStorage, setFrenteNomeStorage] = React.useState<string | null>(null)
  
  // Estados para controle de mock (lidos da URL ou localStorage)
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
  // Estados não usados neste relatório mas mantidos para compatibilidade se necessário
  const [mockQtdLavagemRows, setMockQtdLavagemRows] = React.useState<number>(0)
  const [mockQtdRoletesRows, setMockQtdRoletesRows] = React.useState<number>(0)

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
  const frenteCodigo = metadata?.frente
  const MAP_FRENTES: Record<string, string> = { 'frente5': 'Frente BP Ituiutaba' }
  const frenteNome = frenteNomeStorage || MAP_FRENTES[frenteCodigo] || (frenteCodigo?.startsWith('Frente') ? frenteCodigo : (frenteCodigo ? `Frente ${frenteCodigo}` : 'Frente Desconhecida'))
  const periodoLabel = period === "semanal" ? "Semanal" : "Diário"
  const tituloRelatorio = `Relatório ${periodoLabel} de Frotas - Transbordos ${frenteNome}`
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
      const raw = typeof window !== "undefined" ? localStorage.getItem("dadosRelatorioRecente") : null
      if (!raw) return
      const parsed = JSON.parse(raw)
      setFrenteNomeStorage(parsed?.frente_nome || parsed?.frente || null)
    } catch {
      setFrenteNomeStorage(null)
    }
  }, [])

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
      console.log("[PDF][TT-DIARIO] Exportação via Backend (Puppeteer/Local)", { filename })
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
        console.log('[PDF][TT-DIARIO] PDF finalizado e baixado', { filename })
      }
      toast({ title: 'PDF gerado', description: 'Verifique a pasta de Downloads do navegador.' })
    } catch (e) {
      console.error('Erro ao gerar PDF', e)
      toast({ title: 'Falha ao gerar PDF', description: 'Tente novamente em instantes.' })
    } finally {
      setIsGenerating(false)
    }
  }, [tituloRelatorio, nomeDataArquivo, toast, mockQtdFrotas, mockQtdLavagemRows, mockQtdRoletesRows, showMockControls])
  
  type TTItemEficiencia = { id: number | string; nome: string; eficiencia: number; horasMotor: number; horasProdutivas: number }
  type TTItemDisponibilidade = { id?: number | string; nome: string; disponibilidade: number; tempoManutencao?: number }
  type TTItemMotorOcioso = { id?: number | string; nome: string; percentual: number; tempoLigado?: number; tempoOcioso?: number }
  type TTItemUsoGps = { id: number | string; nome: string; porcentagem: number }
  type TTItemVelocidade = { id?: number | string; nome: string; velocidade: number }
  type TTItemManobra = { Frota: number | string; ["Tempo Total"]: number }
  type TTItemOfensor = { id: string | number; tempo: number; operacao: string; porcentagem: number }
  type TTResumoItem = { frota: string; eficiencia: number; horasProdutivas: number; producao: number; velocidadeCarregado: number; velocidadeVazio: number; gps: number; manobra: number; ocioso: number; disponibilidade: number }
  type TTItemProducaoPorFrota = { id?: number | string; nome: string; valor: number }

  

  React.useEffect(() => {
    // Debug simples para confirmar a origem dos dados no navegador
    // Mostra produção total, tipo e contagem de intervalos
    console.log('[TT-DIARIO] Fonte de dados', {
      tipo: metadata?.type,
      producao_total: typeof producao_total?.[0]?.valor === 'number' ? producao_total?.[0]?.valor : producao,
      ofensores_operacao: (ofensores || []).map((o: TTItemOfensor) => o.operacao),
      intervalos_count: Array.isArray(intervalos_operacao) ? intervalos_operacao.length : 0,
    });
  }, []);
  // Filtrar dados válidos
  const dadosValidos: TTItemEficiencia[] = (eficiencia_energetica || []).filter((d: TTItemEficiencia) => !!d.nome)

  // Cálculos para Eficiência Energética
  const metaEficiencia = metas?.eficienciaEnergetica || 70
  const dadosEficienciaNaoZero: TTItemEficiencia[] = dadosValidos.filter((d: TTItemEficiencia) => d.eficiencia > 0)
  const mediaEficiencia = (dadosEficienciaNaoZero.reduce((acc: number, curr: TTItemEficiencia) => acc + curr.eficiencia, 0) / (dadosEficienciaNaoZero.length || 1)) * 100

  // Cálculos para Horas Elevador
  const metaHorasElevador = metas?.horaElevador || 5
  const dadosGraficoHoras: Array<{ id?: number | string; nome: string; valor: number }> = (horas_elevador || []).map((d: { id?: number | string; nome: string; valor: number }) => ({
    ...d,
    nome: String(d.nome) // Garantir string
  }))
  const dadosHorasNaoZero: Array<{ id?: number | string; nome: string; valor: number }> = dadosGraficoHoras.filter((d: { id?: number | string; nome: string; valor: number }) => d.valor > 0)
  const mediaHorasElevador = dadosHorasNaoZero.reduce((acc: number, curr: { id?: number | string; nome: string; valor: number }) => acc + curr.valor, 0) / (dadosHorasNaoZero.length || 1)

  // Cálculos para Toneladas por Frota
  const producaoTotalValor = typeof producao_total?.[0]?.valor === 'number' ? producao_total[0].valor : (typeof producao === 'number' ? producao : 0)
  
  const somaHorasProdutivas = (eficiencia_energetica || []).reduce((acc: number, curr: TTItemEficiencia) => acc + (curr.horasProdutivas || 0), 0)
  const dadosToneladas = somaHorasProdutivas > 0
    ? (eficiencia_energetica || []).map((d: TTItemEficiencia) => ({
        id: d.id ?? d.nome,
        nome: d.nome,
        producao: producaoTotalValor * ((d.horasProdutivas || 0) / somaHorasProdutivas)
      }))
    : (eficiencia_energetica || []).map((d: TTItemEficiencia) => ({
        id: d.id ?? d.nome,
        nome: d.nome,
        producao: 0
      }))
  
  const itensComProducao: Array<{ id: string | number; nome: string; producao: number }> = dadosToneladas.filter((d: { id: string | number; nome: string; producao: number }) => d.producao > 0)
  const mediaProducaoEquip = itensComProducao.reduce((acc: number, curr: { id: string | number; nome: string; producao: number }) => acc + curr.producao, 0) / (itensComProducao.length || 1)
  const tphDia = producaoTotalValor / 24

  // Cálculos para Uso GPS
  const metaUsoGPS = metas?.usoGPS || 90
  const dadosUsoGPS: Array<{ id: string | number; nome: string; porcentagem: number }> = (uso_gps || []).map((d: TTItemUsoGps) => ({
    id: d.id,
    nome: d.nome,
    porcentagem: d.porcentagem
  }))
  const dadosGPSNaoZero: Array<{ id: string | number; nome: string; porcentagem: number }> = dadosUsoGPS.filter((d: { id: string | number; nome: string; porcentagem: number }) => d.porcentagem > 0)
  const mediaUsoGPS = dadosGPSNaoZero.reduce((acc: number, curr: { id: string | number; nome: string; porcentagem: number }) => acc + curr.porcentagem, 0) / (dadosGPSNaoZero.length || 1)

  // Mapeamento Ofensores (garantir campos corretos)
  const somenteDescricao = (s: string) => {
    if (!s) return s
    const parts = s.split(' - ')
    if (parts.length >= 2) return parts.slice(1).join(' - ').trim()
    return s.replace(/^\s*\d+\s*[-–—: ]\s*/,'').trim()
  }
  function timeStringToSeconds(timeStr: string) {
    if (!timeStr) return 0
    const parts = timeStr.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return 0
  }
  function getManobraMediaMinutos(man: any) {
    if (!man) return 0
    const medioStr = (man as any)["Tempo Médio (hh:mm)"]
    if (typeof medioStr === 'string' && medioStr.length > 0) return Math.round(timeStringToSeconds(medioStr) / 60)
    const medioNum = (man as any)["Tempo Médio"]
    if (typeof medioNum === 'number' && isFinite(medioNum)) return Math.round(medioNum * 60)
    return 0
  }
  const dadosOfensores = (ofensores || []).map((o: TTItemOfensor) => ({
    id: String(o.id),
    nome: somenteDescricao(o.operacao),
    percentual: o.porcentagem, // Mapeando 'porcentagem' para 'percentual'
    duracao: o.tempo
  }))

  // Disponibilidade Mecânica: combinar com horas de motor (quando existir)
  const dadosDisponibilidade = (disponibilidade_mecanica || []).map((d: TTItemDisponibilidade) => ({
    id: d.id ?? d.nome,
    nome: d.nome,
    disponibilidade: d.disponibilidade,
    horasMotor: (eficiencia_energetica || []).find((e: TTItemEficiencia) => e.nome === d.nome)?.horasMotor || 0,
    tempoManutencao: (d as any).tempoManutencao || 0
  }))

  // Cálculos para Resumo
  const dadosResumo: TTResumoItem[] = (eficiencia_energetica || []).map((f: TTItemEficiencia) => {
    const nome = f.nome;
    const disp = (disponibilidade_mecanica || []).find((d: TTItemDisponibilidade) => d.nome === nome);
    const ocioso = (motor_ocioso || []).find((d: TTItemMotorOcioso) => d.nome === nome);
    const gps = (uso_gps || []).find((d: TTItemUsoGps) => d.nome === nome);
    const velCar = (((DADOS_MOCK as any).media_velocidade_carregado || []) as Array<TTItemVelocidade>).find((d: TTItemVelocidade) => d.nome === nome);
    const velVaz = (((DADOS_MOCK as any).media_velocidade_vazio || []) as Array<TTItemVelocidade>).find((d: TTItemVelocidade) => d.nome === nome);
    const prod = ((producao_por_frota || []) as Array<TTItemProducaoPorFrota>).find((d: TTItemProducaoPorFrota) => d.nome === nome);
    const man = (manobras_frotas || []).find((d: TTItemManobra) => String(d.Frota) === nome);
    
    const manobraMinutos = man ? getManobraMediaMinutos(man) : 0;

    return {
      frota: nome,
      eficiencia: (f.eficiencia || 0) * 100,
      horasProdutivas: f.horasProdutivas || 0, 
      producao: prod?.valor || 0,
      velocidadeCarregado: velCar?.velocidade || 0,
      velocidadeVazio: velVaz?.velocidade || 0,
      gps: gps?.porcentagem || 0,
      manobra: manobraMinutos,
      ocioso: ocioso?.percentual || 0,
      disponibilidade: disp?.disponibilidade || 0
    };
  });

  // Metas complementares
  const metaBasculamento = (metas as any)?.basculamento ?? 180
  const metaManobras = (metas as any)?.manobras ?? 60
  const metasResumo = { ...(metas || {}), basculamento: metaBasculamento, manobras: metaManobras }
  const formatHmFromMinutes = (m: number) => {
    const mm = Math.round(m || 0)
    const h = Math.floor(mm / 60)
    const min = mm % 60
    return `${h}h${min.toString().padStart(2, '0')}m`
  }
  const formatMmSsFromSeconds = (s: number) => {
    const ss = Math.round(s || 0)
    const mm = Math.floor(ss / 60)
    const rem = ss % 60
    return `${mm.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }
  const dadosCardVelocidadeCarregado = (((DADOS_MOCK as any).media_velocidade_carregado || []) as Array<any>).map((it: any) => ({ valor: it.velocidade || 0 }))
  const dadosCardVelocidadeVazio = (((DADOS_MOCK as any).media_velocidade_vazio || []) as Array<any>).map((it: any) => ({ valor: it.velocidade || 0 }))
  const dadosCardBasculamento = (((DADOS_MOCK as any).basculamento || []) as Array<any>).map((it: any) => {
    const medioStr = it?.["Tempo Médio (hh:mm)"]
    const medioNum = it?.["Tempo Médio"]
    const seconds = typeof medioStr === 'string' && medioStr.length > 0 ? timeStringToSeconds(medioStr) : typeof medioNum === 'number' && isFinite(medioNum) ? Math.round(medioNum * 3600) : 0
    return { valor: seconds }
  })
  const dadosCardManobras = (((manobras_frotas || []) as Array<any>)).map((it: any) => {
    const medioStr = it?.["Tempo Médio (hh:mm)"]
    const medioNum = it?.["Tempo Médio"]
    const seconds = typeof medioStr === 'string' && medioStr.length > 0 
      ? timeStringToSeconds(medioStr) 
      : typeof medioNum === 'number' && isFinite(medioNum) 
        ? Math.round(medioNum /60) // medioNum em horas -> segundos
        : 0
    return { valor: seconds }
  })

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
    window.addEventListener("resize", compute)
    
    // Observer para mudanças no tamanho do report (zoom, conteudo) e mudanças no atributo da sidebar
    const resizeObserver = new ResizeObserver(compute)
    resizeObserver.observe(reportEl)
    
    const mutationObserver = new MutationObserver(compute)
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar-compact"] })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", compute)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

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
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div ref={scrollWrapRef} className="overflow-auto report-scroll">
            <div
              ref={reportRef}
              className="inline-flex flex-col items-start gap-4 report-zoom [[data-sidebar-compact='1']_&]:mx-0 [[data-sidebar-compact='0']_&]:mx-auto"
              style={{ ...(isPdfMode ? {} : ({ zoom } as any)) }}
            >
      
      {/* PÁGINA 1: Eficiência Energética + Basculamento/Falta de Apontamento */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header 
            tituloCompleto={tituloRelatorio}
            date={dataFormatada} 
          />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Eficiência Energética" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col">
                <CabecalhoMeta meta={metaEficiencia} media={mediaEficiencia} tipo="porcentagem" compact />
                <div className="flex-1 overflow-hidden">
                  <GraficoEficiencia 
                    dados={dadosValidos} 
                    meta={metaEficiencia} 
                    density="auto"
                    compact 
                  />
                </div>
              </div>
            </div>
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
          </div>
        </div>
      </div>

      {/* PÁGINA 2: Média Velocidade Carregado + Média Velocidade Vazio */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header 
            tituloCompleto={tituloRelatorio}
            date={dataFormatada} 
          />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Média de Velocidade Carregado" />
              <div className="border border-black rounded-lg p-3 flex-1">
                <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                  <GraficoMediaVelocidade dados={(DADOS_MOCK as any).media_velocidade_carregado || []} meta={metas?.mediaVelocidade || 0} />
                </div>
              </div>
            </div>
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Média de Velocidade Vazio" />
              <div className="border border-black rounded-lg p-3 flex-1">
                <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                  <GraficoMediaVelocidade dados={(DADOS_MOCK as any).media_velocidade_vazio || []} meta={metas?.mediaVelocidade || 0} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 3: Basculamento + Manobras (vertical) */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header 
            tituloCompleto={tituloRelatorio}
            date={dataFormatada} 
          />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Basculamento" />
              <div className="border border-black rounded-lg p-3 flex-1 flex flex-col justify-start">
                <GraficoBasculamento 
                  dados={(DADOS_MOCK as any).basculamento || []} 
                  meta={metaBasculamento} 
                  compact 
                />
              </div>
            </div>
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Manobras" />
              <div className="border border-black rounded-lg p-3 flex-1 flex flex-col justify-start">
                <GraficoManobras 
                  dados={manobras_frotas || []} 
                  meta={metaManobras} 
                  compact 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 4: Falta de Apontamento + Motor Ocioso */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header 
            tituloCompleto={tituloRelatorio}
            date={dataFormatada} 
          />
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Falta de Apontamento" />
              <div className="border border-black rounded-lg p-3 flex-1">
                <GraficoFaltaApontamento dados={falta_apontamento || []} meta={(metas as any)?.faltaApontamento ?? 10} />
              </div>
            </div>
            <div className="flex flex-col" style={{ height: "50%" }}>
              <SectionTitle title="Motor Ocioso" />
              <div className="border border-black rounded-lg p-3 flex-1 flex flex-col justify-start">
                <GraficoMotorOcioso 
                  dados={motor_ocioso || []} 
                  meta={metas?.motorOcioso} 
                  compact 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 5: Top 5 Ofensores e Disponibilidade Mecânica */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header 
            tituloCompleto={tituloRelatorio}
            date={dataFormatada} 
          />
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex flex-col shrink-0" style={{ height: "45%" }}>
              <SectionTitle title="Top 5 Ofensores" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                <GraficoTop5Ofensores dados={dadosOfensores} />
              </div>
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              <SectionTitle title="Disponibilidade Mecânica" />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoDisponibilidadeMecanica dados={dadosDisponibilidade} meta={metas?.disponibilidadeMecanica || 90} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {period === "diario" && (
        <>
          {/* PÁGINAS DINÂMICAS: Intervalos de Operação */}
          {(() => {
            const totalPages = Math.ceil(intervalosAgrupados.length / 5)
            return Array.from({ length: totalPages }).map((_, pageIndex) => {
              const startIndex = pageIndex * 5
              const pageItems = intervalosAgrupados.slice(startIndex, startIndex + 5)

              return (
                <div key={`intervalos-page-${pageIndex}`} data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
                  <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
                    <Header 
                      tituloCompleto={tituloRelatorio}
                      date={dataFormatada} 
                    />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <SectionTitle title={`Intervalos de Operação${totalPages > 1 ? ` - página ${pageIndex + 1}` : ''}`} />
                      
                      <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 text-[10px] leading-tight text-slate-700">
                        <p className="mb-4"><strong className="text-white bg-green-600 border border-green-600 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Produtivo:</strong> Referente aos apontamentos em efetivo.</p>
                        <p className="mb-4"><strong className="text-white bg-blue-500 border border-blue-500 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Disponível:</strong> Todos os outros grupos de apontamento que não em manutenção.</p>
                        <p className="mb-4"><strong className="text-white bg-red-500 border border-red-500 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Manutenção:</strong> Tempo em parada pelo grupo de manutenção.</p>
                        <p><strong className="text-slate-600 bg-white border border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-2 py-1 rounded-sm">Falta de Informação:</strong> Tempo não registrado pela frota.</p>
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

          {intervalosAgrupados.length === 0 && (
            <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
              <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
                <Header 
                  tituloCompleto={tituloRelatorio}
                  date={dataFormatada} 
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <SectionTitle title="Intervalos de Operação" />
                  <div className="border border-black rounded-lg p-3 flex-1 flex items-center justify-center text-slate-600 text-sm">
                    Nenhum intervalo de operação disponível para exibição
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* PÁGINA RESUMO */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header 
            tituloCompleto={tituloRelatorio}
            date={dataFormatada} 
          />
          <div className="flex-1 flex flex-col gap-4 overflow-hidden pt-2">
            <h2 className="text-center font-bold text-base">Resumo do Relatório de Transbordos</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <CardIndicador 
                titulo="Eficiência Energética"
                meta={metas?.eficienciaEnergetica}
                unidade="%"
                dados={dadosResumo.map((d: TTResumoItem) => ({ valor: d.eficiencia }))}
                tipo="asc"
              />
              <CardIndicador 
                titulo="Velocidade Carregado"
                meta={metas?.mediaVelocidade}
                unidade=" km/h"
                dados={dadosCardVelocidadeCarregado}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Velocidade Vazio"
                meta={metas?.mediaVelocidade}
                unidade=" km/h"
                dados={dadosCardVelocidadeVazio}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Basculamento"
                meta={metasResumo.basculamento}
                unidade=""
                dados={dadosCardBasculamento}
                tipo="desc"
                formatarValor={(v) => formatMmSsFromSeconds(v)}
              />
              <CardIndicador 
                titulo="Manobras"
                meta={metasResumo.manobras * 60}
                unidade=""
                dados={dadosCardManobras}
                tipo="desc"
                formatarValor={(v) => formatMmSsFromSeconds(v / 60)}
              />
              <CardIndicador 
                titulo="Motor Ocioso"
                meta={metas?.motorOcioso}
                unidade="%"
                dados={dadosResumo.map((d: TTResumoItem) => ({ valor: d.ocioso }))}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Disponibilidade Mecânica"
                meta={metas?.disponibilidadeMecanica}
                unidade="%"
                dados={dadosResumo.map((d: TTResumoItem) => ({ valor: d.disponibilidade }))}
                tipo="asc"
              />
              <CardProducao 
                valorTotal={producao || 0}
                totalFrotas={dadosResumo.length}
              />
            </div>

            <div className="mt-4">
              <TabelaResumo dados={dadosResumo} metas={metasResumo} />
            </div>

          </div>
        </div>
      </div>
            </div>
          </div>
        </div>

        {/* Painel de Utilitários Flutuante */}
        <div 
          ref={utilitiesPanelRef}
          className={`fixed top-3 z-[9999] w-[190px] max-w-[calc(100vw-1.5rem)] print:hidden ${utilitiesPanelLeft == null ? "right-3" : ""}`}
          style={utilitiesPanelLeft == null ? undefined : { left: utilitiesPanelLeft }}
        >
          <div className="flex flex-col gap-2 rounded-md border bg-white/90 backdrop-blur px-3 py-3 shadow-sm">
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

export default function RelatorioDiarioTransbordos({
  searchParams,
}: {
  searchParams?: { period?: string }
}) {
  const period = searchParams?.period === "semanal" ? "semanal" : "diario"
  return <RelatorioFrotasTt period={period} />
}
