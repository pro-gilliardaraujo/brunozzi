"use client"
import React from "react"
import dynamic from 'next/dynamic'
import { Card, CardContent } from "@/components/ui/card"
import { ColhedoraFrotaData } from "@/lib/types"
// Ajuste de imports para usar os componentes existentes em cd-diario-frotas
import { CabecalhoMeta } from "../cd-diario-frotas/componentes/CabecalhoMeta"
import { GraficoEficiencia } from "../cd-diario-frotas/componentes/GraficoEficiencia"
import { GraficoHorasElevador } from "../cd-diario-frotas/componentes/GraficoHorasElevador"
import { GraficoUsoGPS } from "../cd-diario-frotas/componentes/GraficoUsoGPS"
import { GraficoMediaVelocidade } from "../cd-diario-frotas/componentes/GraficoMediaVelocidade"
import { GraficoManobras } from "../cd-diario-frotas/componentes/GraficoManobras"
import { GraficoMotorOcioso } from "../cd-diario-frotas/componentes/GraficoMotorOcioso"
import { GraficoTop5Ofensores } from "../cd-diario-frotas/componentes/GraficoTop5Ofensores"
import { GraficoEficienciaOperacional } from "../cd-diario-frotas/componentes/GraficoEficienciaOperacional"
import { GraficoDisponibilidadeMecanica } from "../cd-diario-frotas/componentes/GraficoDisponibilidadeMecanica"
import { GraficoIntervalos, Intervalo } from "../cd-diario-frotas/componentes/GraficoIntervalos"
import { CardIndicador } from "../cd-diario-frotas/componentes/CardIndicador"
import { TabelaResumoOperadores } from "./TabelaResumoOperadores"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Download, Minus, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server"
import { downloadPdfBuffer } from "@/lib/pdf-utils"

import { MapaIframe } from '../cd-diario-frotas/componentes/MapaIframe'

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

// Adaptador para transformar dados de Operadores (Objeto) em formato de Frotas (Arrays)
const adaptarDadosOperadores = (data: any): ColhedoraFrotaData => {
  // Se já tiver a estrutura de arrays (metadata, eficiencia_energetica array), retorna como está
  if (data.eficiencia_energetica && Array.isArray(data.eficiencia_energetica)) {
    return data as ColhedoraFrotaData;
  }

  // Caso contrário, assume que é o objeto de Operadores
  // Estrutura esperada: { "Nome Operador": { Metricas... }, ... }
  
  const entries = Object.entries(data).filter(([k]) => k !== 'metadata' && k !== 'metas');
  
  // Extrair metadados se existirem soltos ou criar default
  const metadata = data.metadata || {
    date: new Date().toISOString(),
    type: 'cd_diario_operadores',
    frente: 'Desconhecida',
    generated_at: new Date().toISOString(),
    fontes: ['solinftec']
  };

  const metas = data.metas || {
    eficienciaEnergetica: 90,
    eficienciaOperacional: 60,
    horaElevador: 10,
    usoGPS: 95,
    mediaVelocidade: 5,
    manobras: 180, // segundos (3 min)
    motorOcioso: 20,
    disponibilidadeMecanica: 90,
  };

  // Arrays de destino
  const eficiencia_energetica: any[] = [];
  const eficiencia_operacional: any[] = [];
  const horas_elevador: any[] = [];
  const media_velocidade: any[] = [];
  const motor_ocioso: any[] = [];
  const manobras_frotas: any[] = [];
  const disponibilidade_mecanica: any[] = [];
  // Operadores geralmente não tem uso_gps detalhado no JSON atual, mas vamos prever
  const uso_gps: any[] = []; 
  const horas_por_frota: any[] = [];

  entries.forEach(([nomeKey, metrics]: [string, any], idx) => {
    // Tentar limpar o nome "ID - NOME" para apenas "NOME" ou manter curto
    const parts = nomeKey.split(' - ');
    const nomeDisplay = parts.length > 1 ? parts[1] : nomeKey; // Exibe o nome
    // Ou se preferir exibir o ID para economizar espaço: parts[0]
    
    // IDs únicos
    const id = idx + 1;

    // Métricas
    const horasMotor = Number(metrics.Horas_Motor_Ligado || 0);
    const horasProdutivas = Number(metrics.Horas_Produtivas || 0);
    const horasManutencao = Number(metrics.Horas_Manutencao || 0);

    // Eficiência Energética
    let efEnergetica = Number(metrics.Eficiencia_Energetica || 0);
    if (efEnergetica <= 1 && efEnergetica > 0) efEnergetica *= 100; // Converter 0.9 para 90
    
    eficiencia_energetica.push({
      id,
      nome: nomeDisplay,
      eficiencia: efEnergetica,
      horasMotor,
      horasElevador: horasProdutivas,
      fonte: 'solinftec'
    });

    // Eficiência Operacional
    let efOperacional = Number(metrics.Eficiencia_Operacional || 0);
    if (efOperacional <= 1 && efOperacional > 0) efOperacional *= 100;

    eficiencia_operacional.push({
      id,
      nome: nomeDisplay,
      eficiencia: efOperacional,
      horasMotor: Number(metrics.Horas_Registradas || 0), // Base para operacional geralmente é horas totais/registradas
      horasElevador: horasProdutivas,
      fonte: 'solinftec'
    });

    // Horas Elevador
    horas_elevador.push({
      id,
      nome: nomeDisplay,
      valor: horasProdutivas,
      fonte: 'solinftec'
    });

    // Velocidade
    media_velocidade.push({
      id,
      nome: nomeDisplay,
      velocidade: Number(metrics.Vel_Colheita_media || metrics.Velocidade_Media || 0),
      fonte: 'solinftec'
    });

    // Motor Ocioso
    motor_ocioso.push({
      id,
      nome: nomeDisplay,
      percentual: Number(metrics.Porcentagem_Motor_Ocioso || 0),
      tempoLigado: horasMotor,
      tempoOcioso: Number(metrics.Horas_Motor_Ocioso || 0),
      fonte: 'solinftec'
    });

    // Manobras
    // Converter horas/minutos para string HH:MM:SS para o componente
    const totalHours = Number(metrics.Tempo_Total_Manobras_h || 0);
    const totalSecs = Math.round(totalHours * 3600);
    const tH = Math.floor(totalSecs / 3600);
    const tM = Math.floor((totalSecs % 3600) / 60);
    const tS = totalSecs % 60;
    const totalStr = `${tH.toString().padStart(2, '0')}:${tM.toString().padStart(2, '0')}:${tS.toString().padStart(2, '0')}`;

    const avgMins = Number(metrics.Tempo_Medio_Manobras_min || 0);
    const avgSecs = Math.round(avgMins * 60);
    const aH = Math.floor(avgSecs / 3600);
    const aM = Math.floor((avgSecs % 3600) / 60);
    const aS = avgSecs % 60;
    const avgStr = `${aH.toString().padStart(2, '0')}:${aM.toString().padStart(2, '0')}:${aS.toString().padStart(2, '0')}`;

    manobras_frotas.push({
      Frota: nomeDisplay, // Componente usa chave 'Frota'
      "Tempo Total": totalHours,
      "Tempo Médio": avgMins,
      "Intervalos Válidos": Number(metrics.Quantidade_Manobras || 0),
      "Tempo Total (hh:mm)": totalStr, 
      "Tempo Médio (hh:mm)": avgStr,
      fonte: 'solinftec'
    });

    // Disponibilidade (Operadores geralmente não tem disponibilidade mecânica própria, é da máquina)
    // Mas se tivermos dados, preenchemos. Se não, 100% ou 0.
    // Vamos assumir 100% se não tiver dados de manutenção, ou calcular base 100 - (manut/total)
    let disp = 100;
    if (horasMotor + horasManutencao > 0) {
       // Cálculo aproximado se não vier pronto
       // Disponibilidade = (Horas Totais - Horas Manutenção) / Horas Totais
       // Mas operador não "quebra". Isso é métrica de máquina.
       // Vou deixar 0 ou oculto se não fizer sentido.
       // Pelo JSON, temos Horas_Manutencao. Talvez o operador parou para manutenção.
       disp = 100; 
    }
    disponibilidade_mecanica.push({
      id,
      nome: nomeDisplay,
      disponibilidade: disp,
      horasMotor,
      tempoManutencao: horasManutencao,
      fonte: 'solinftec'
    });

    // Horas por Frota (Operador)
    horas_por_frota.push({
        id,
        nome: nomeDisplay,
        frota: nomeDisplay,
        horas: horasMotor,
        fonte: 'solinftec'
    });

  });

  return {
    metadata,
    metas,
    eficiencia_energetica,
    eficiencia_operacional,
    horas_elevador,
    horas_por_frota,
    uso_gps: [], // Sem dados para operadores
    media_velocidade,
    manobras_frotas,
    motor_ocioso,
    disponibilidade_mecanica,
    intervalos_operacao: [], // Sem linha do tempo para operadores por enquanto
    ofensores: [], // Top 5 ofensores geralmente é geral, não por operador individual no detalhe
    imagens: { mapaGPS: "", areaTrabalhada: "" }
  };
};

export function RelatorioPrintView({ data: rawData, period = "diario" }: { data: any; period?: "diario" | "semanal" }) {
  // ADAPTAÇÃO DE DADOS (Hook para garantir que só rode na renderização)
  const data = React.useMemo(() => adaptarDadosOperadores(rawData), [rawData]);

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
    intervalos_operacao
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

  const endDate = React.useMemo(() => {
    if (metadata?.date) {
      // Tenta parsear formato brasileiro DD-MM-YYYY
      if (typeof metadata.date === 'string' && metadata.date.includes('-')) {
         const parts = metadata.date.split('-');
         if (parts.length === 3) {
             // Assumindo formato DD-MM-YYYY vindo do JSON/URL
             if (parts[0].length === 2 && parts[2].length === 4) {
                 return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
             }
             // Assumindo formato YYYY-MM-DD
             if (parts[0].length === 4) {
                 return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
             }
         }
      }
      return new Date(metadata.date)
    }
    return new Date()
  }, [metadata?.date])
  
  // Detectar fonte primária dos dados
  const fontePrimaria = React.useMemo(() => {
    const fontes = metadata?.fontes || []
    // Prioridade: solinftec > case > opc
    if (fontes.includes('solinftec')) return 'solinftec'
    if (fontes.includes('case')) return 'case'
    if (fontes.includes('opc')) return 'opc'
    return undefined
  }, [metadata])

  const dataFormatada = React.useMemo(() => {
    // Se o metadado já vier formatado (DD-MM-YYYY ou DD/MM/YYYY), usa ele direto
    if (period === 'diario' && metadata?.date && /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(metadata.date)) {
        return metadata.date.replace(/-/g, '/');
    }
    // Caso contrário, usa a data convertida
    const endStr = endDate.toLocaleDateString("pt-BR")
    const startDateCalc = new Date(endDate)
    startDateCalc.setDate(startDateCalc.getDate() - 6)
    const startStr = startDateCalc.toLocaleDateString("pt-BR")
    return period === "semanal" ? `${startStr} - ${endStr}` : endStr
  }, [endDate, metadata?.date, period])

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
  // Ajuste Título para Operadores
  const tituloRelatorio = `Relatório ${periodoLabel} de Operadores - Colhedoras`
  const nomeDataArquivo =
    period === "semanal"
      ? dataFormatada.replace(/ - /g, "_").replace(/\//g, "_")
      : dataFormatada.replace(/\//g, "_")

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
      
      // Ativa flag de scroll manual e desabilita snap
      isManualScrolling.current = true
      if (scrollWrapRef.current) {
        scrollWrapRef.current.style.scrollSnapType = 'none'
        scrollWrapRef.current.style.overflow = 'hidden' // Força parada de inércia
      }
      setCurrentPage(targetPage)

      // Garante que o estilo foi aplicado antes de scrollar
      requestAnimationFrame(() => {
          if (scrollWrapRef.current) {
             scrollWrapRef.current.style.overflow = '' // Restaura overflow
          }
          el.scrollIntoView({ behavior: "smooth", block: "start" })
      })
      
      // Reseta flag e reabilita snap após tempo estimado da animação
      setTimeout(() => {
        isManualScrolling.current = false
        if (scrollWrapRef.current) {
          scrollWrapRef.current.style.scrollSnapType = ''
        }
      }, 1500)
    },
    [computePageMetrics]
  )

  // Desabilita IntersectionObserver quando o usuário clica manualmente para navegar
  // Isso evita que o observer "sobrescreva" a página atual durante a animação de scroll
  const isManualScrolling = React.useRef(false)

  React.useEffect(() => {
    computePageMetrics()

    const pages = pagesRef.current
    if (!pages || pages.length === 0) return

    const ratioByEl = new Map<Element, number>()
    pages.forEach((p) => ratioByEl.set(p, 0))

    let rafId = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrolling.current) return // Ignora se for scroll manual

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
  }, [computePageMetrics, zoomPercent, isPdfMode, showMockControls, mockQtdFrotas, period])

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
    return Array.from({ length: qtdFrotasEfetivo }, (_, idx) => base[idx] || `Operador ${idx + 1}`)
  }, [dadosValidosBase, qtdFrotasEfetivo])

  const buildNamedSeries = React.useCallback(
    (baseRows: any[], count: number, nameKey: "nome" | "Frota", makeFallback: (name: string, idx: number) => any) => {
      const safeCount = clampInt(count, 0, MAX_MOCK_QTD_FROTAS)
      if (safeCount === 0) return []
      
      return Array.from({ length: safeCount }, (_, idx) => {
        const mockName = `Operador ${idx + 1}`
        const name = nomesFrotas[idx] || mockName
        
        const base = (idx < baseRows.length) ? baseRows[idx] : undefined
        const next = { ...(base ?? makeFallback(name, idx)) } as any
        
        if (typeof next.eficiencia === 'undefined' || isNaN(next.eficiencia)) next.eficiencia = 0
        if (typeof next.horasMotor === 'undefined' || isNaN(next.horasMotor)) next.horasMotor = 0
        if (typeof next.horasElevador === 'undefined' || isNaN(next.horasElevador)) next.horasElevador = 0
        if (typeof next.velocidade === 'undefined' || isNaN(next.velocidade)) next.velocidade = 0
        if (typeof next.percentual === 'undefined' || isNaN(next.percentual)) next.percentual = 0
        if (typeof next.tempoManutencao === 'undefined' || isNaN(next.tempoManutencao)) next.tempoManutencao = 0
        if (typeof next.disponibilidade === 'undefined' || isNaN(next.disponibilidade)) next.disponibilidade = 0
        if (typeof next.porcentagem === 'undefined' || isNaN(next.porcentagem)) next.porcentagem = 0
        
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
      (name, idx) => ({ id: `oc-${idx + 1}`, nome: name, percentual: 0, tempoLigado: 0, tempoOcioso: 0 })
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

  const metaEficienciaOperacional = metasSafe.eficienciaOperacional
  const dadosEficienciaOperacionalNaoZero = dadosValidosOperacional.filter(d => d.eficiencia > 0)
  const mediaEficienciaOperacional = dadosEficienciaOperacionalNaoZero.reduce((acc, curr) => acc + curr.eficiencia, 0) / (dadosEficienciaOperacionalNaoZero.length || 1)

  // Cálculos para Horas Elevador
  // Usando os mesmos dados de eficiência energética para consistência
  const metaHorasElevador = metasSafe.horaElevador
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

  // Página 2 - Uso GPS
  const metaUsoGPS = metasSafe.usoGPS
  const dadosUsoGPSNaoZero = dadosUsoGPS.filter(d => (d.porcentagem || 0) > 0)
  const mediaUsoGPS = dadosUsoGPSNaoZero.reduce((acc, curr) => acc + curr.porcentagem, 0) / (dadosUsoGPSNaoZero.length || 1)

  // Página 7 - Ofensores e Disponibilidade
  const dadosOfensores = (ofensores || []).map(item => {
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
  const dadosResumoUnsorted = dadosValidos.map(f => {
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

  const dadosResumo = dadosResumoUnsorted.sort((a, b) => {
    const isNC_A = a.frota.toLowerCase().includes("não cadastrado")
    const isNC_B = b.frota.toLowerCase().includes("não cadastrado")
    if (isNC_A && !isNC_B) return 1
    if (!isNC_A && isNC_B) return -1
    return a.frota.localeCompare(b.frota)
  })
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
      {/* PÁGINA 2 - Eficiência Energética */}
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
                  <GraficoEficiencia 
                    dados={dadosValidos} 
                    meta={metaEficiencia} 
                    compact={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 3 - Eficiência Operacional */}
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
                  <GraficoEficienciaOperacional 
                    dados={dadosValidosOperacional} 
                    meta={metaEficienciaOperacional} 
                    compact={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 3 - Horas Elevador */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Horas Elevador${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1">
                <CabecalhoMeta 
                  meta={metaHorasElevador} 
                  media={mediaHorasElevador} 
                  tipo="horas"
                  sufixoMedia="Média calculada excluindo valores 0 h"
                  compact={false}
                />
                <div className="overflow-hidden mt-1" style={{ height: `calc(100% - ${headerReservedPx}px)` }}>
                  <GraficoHorasElevador dados={dadosGraficoHoras} meta={metaHorasElevador} compact={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* PÁGINA - Uso GPS (NUNCA mostrar para Solinftec - não tem dados reais de GPS) */}
      {fontePrimaria !== 'solinftec' && dadosUsoGPS.some(d => d.porcentagem > 0) && (
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
              <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col flex-1">
              <SectionTitle title={`Uso GPS${fontePrimaria ? ` - ${fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1">
                <CabecalhoMeta 
                  meta={metaUsoGPS} 
                  media={mediaUsoGPS} 
                  tipo="porcentagem" 
                  sufixoMedia="Média calculada excluindo valores 0%"
                />
                <div className="h-[calc(100%-50px)] overflow-hidden mt-1">
                  <GraficoUsoGPS dados={dadosUsoGPS} meta={metaUsoGPS} compact={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* PÁGINA 5 - Velocidade e Manobras */}
      {/* PÁGINA 5 - Média de Velocidade */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Média de Velocidade${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden">
                 <GraficoMediaVelocidade dados={mediaVelocidadeFiltrada} meta={metasSafe.mediaVelocidade} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINA 6 - Manobras */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Manobras${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoManobras 
                    dados={manobrasFiltradas} 
                    meta={metasSafe.manobras} 
                    compact={false}
                 />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* PÁGINA 7 - Motor Ocioso */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex flex-col h-full">
              <SectionTitle title={`Motor Ocioso${fontePrimaria ? ` - ${fontePrimaria === 'solinftec' ? 'Solinftec' : fontePrimaria === 'case' ? 'Case IH' : 'OPC'}` : ''}`} />
              <div className="border border-black rounded-lg p-3 flex-1 overflow-hidden flex flex-col justify-start">
                 <GraficoMotorOcioso 
                    dados={motorOciosoFiltrado} 
                    meta={metasSafe.motorOcioso} 
                    compact={false}
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

      {/* PÁGINA RESUMO - Resumo do Relatório de Colheita Diário */}
      <div data-pdf-page className="bg-white shadow-lg print:shadow-none" style={{ width: "210mm", height: "297mm" }}>
        <div className="flex flex-col border border-black m-2 p-2 rounded-sm" style={{ height: "calc(297mm - 16px)" }}>
          <Header tituloCompleto={tituloRelatorio} date={dataFormatada} />
          <div className="flex-1 flex flex-col gap-4 overflow-hidden pt-2">
            <h2 className="text-center font-bold text-base">Resumo do Relatório de Colheita {periodoLabel}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <CardIndicador 
                titulo="Eficiência Energética"
                meta={metasSafe.eficienciaEnergetica}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.eficiencia }))}
                tipo="asc"
              />
              <CardIndicador 
                titulo="Eficiência Operacional"
                meta={metasSafe.eficienciaOperacional}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.eficienciaOperacional }))}
                tipo="asc"
              />
              <CardIndicador 
                titulo="Horas Elevador"
                meta={metasSafe.horaElevador}
                unidade=" h"
                dados={dadosResumo.map(d => ({ valor: d.horasElevador }))}
                tipo="asc"
              />
              
              {fontePrimaria !== 'solinftec' && dadosUsoGPS.some(d => d.porcentagem > 0) && (
                <CardIndicador 
                  titulo="Uso GPS"
                  meta={metasSafe.usoGPS}
                  unidade="%"
                  dados={dadosUsoGPS.map(d => ({ valor: d.porcentagem }))}
                  tipo="asc"
                />
              )}
              <CardIndicador 
                titulo="Média Velocidade"
                meta={metasSafe.mediaVelocidade}
                unidade=" km/h"
                dados={dadosResumo.map(d => ({ valor: d.velocidade }))}
                tipo="desc"
              />
              <CardIndicador 
                titulo="Manobras"
                meta={metasSafe.manobras}
                unidade=" min"
                dados={dadosCardManobras}
                tipo="desc"
                formatarValor={(v) => formatMmSsFromSeconds(v)}
              />
              <CardIndicador 
                titulo="Motor Ocioso"
                meta={metasSafe.motorOcioso}
                unidade="%"
                dados={dadosResumo.map(d => ({ valor: d.ocioso }))}
                tipo="desc"
              />
              </div>

            <div className="mt-4">
               <TabelaResumoOperadores dados={dadosResumo} metas={metasSafe} />
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
