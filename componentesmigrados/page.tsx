"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, Terminal, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { FrenteUploadCard, FrenteUploadCardHandle } from "./componentes/FrenteUploadCard"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function PainelRelatoriosPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("Frotas")
  const [processedReports, setProcessedReports] = useState<Record<string, boolean>>({})
  
  // Refs para controlar os cards
  const cardRefs = useRef<Record<string, FrenteUploadCardHandle | null>>({})

  // Console e Modal
  const [showConsoleModal, setShowConsoleModal] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<{timestamp: string, message: string, type: 'info' | 'error' | 'success', frente?: string}[]>([])
  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll do console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [consoleLogs])

  const addLog = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info', frente?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, { timestamp, message, type, frente }]);
  }, []);

  const handleProcessStart = useCallback((frente: string) => {
    setShowConsoleModal(true);
    addLog(`Iniciando fluxo para ${frente}...`, 'info', frente);
  }, [addLog]);

  const handleProcessError = useCallback((err: string, frente: string) => {
    addLog(err, 'error', frente);
  }, [addLog]);

  const handleProcessLog = useCallback((msg: string, frente: string) => {
    let type: 'info' | 'error' | 'success' = 'info';
    if (msg.toLowerCase().includes('erro') || msg.toLowerCase().includes('fail')) type = 'error';
    if (msg.toLowerCase().includes('sucesso') || msg.toLowerCase().includes('concluído')) type = 'success';
    addLog(msg, type, frente);
  }, [addLog]);

  const handleProcessComplete = useCallback((data: any, frente: string) => {
    addLog(`Processamento finalizado para ${frente}!`, 'success', frente);
    console.log(`Dados processados para ${frente}:`, data)
    // Salvar no localStorage para ser consumido pela página de detalhes
    localStorage.setItem('dadosRelatorioRecente', JSON.stringify(data))
    
    // Marcar como disponível
    setProcessedReports(prev => ({
      ...prev,
      [frente]: true
    }))
  }, [addLog]);

  const handleBatchProcess = () => {
    // Iterar sobre todos os refs e acionar o processamento se houver arquivo
    Object.values(cardRefs.current).forEach(cardRef => {
      if (cardRef && cardRef.hasFile()) {
        cardRef.process();
      }
    });
  }

  const handleVerRelatorio = (frente: string) => {
    // Navegar para a página de detalhes
    router.push('/gerenciamento/painel/relatorios/cd-diario-frotas')
  }

  const handleVerRelatorioOperadores = (tipo: "cd" | "tt") => {
    router.push(tipo === "cd" ? "/gerenciamento/painel/relatorios/cd-diario-op" : "/gerenciamento/painel/relatorios/tt-diario-op")
  }

  const yesterday = addDays(new Date(), -1)
  const weekStart = addDays(new Date(), -7)

  const [periodFrotas, setPeriodFrotas] = useState<"diario" | "semanal">("diario")
  const [rangeFrotas, setRangeFrotas] = useState<DateRange>({ from: yesterday, to: yesterday })

  const [periodOperadores, setPeriodOperadores] = useState<"diario" | "semanal">("diario")
  const [rangeOperadores, setRangeOperadores] = useState<DateRange>({ from: yesterday, to: yesterday })

  const handleFrotasPeriodChange = (val: "diario" | "semanal") => {
    setPeriodFrotas(val)
    setRangeFrotas(val === "diario" ? { from: yesterday, to: yesterday } : { from: weekStart, to: yesterday })
  }

  const handleOperadoresPeriodChange = (val: "diario" | "semanal") => {
    setPeriodOperadores(val)
    setRangeOperadores(val === "diario" ? { from: yesterday, to: yesterday } : { from: weekStart, to: yesterday })
  }

const FRENTES = [
    'Frente Alexandrita', 
    'Frente BP Ituiutaba', 
    'Frente CMAA Canápolis', 
    'Frente Zirleno'
  ]

  return (
    <div className="h-full flex flex-col p-0 bg-white overflow-hidden">
      <div className="h-full flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 flex-none">
            <TabsTrigger value="Frotas" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              Frotas
            </TabsTrigger>
            <TabsTrigger value="Operadores" className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              Operadores
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-2 pr-2">
            <TabsContent value="Frotas" className="m-0 p-0 data-[state=active]:flex flex-col gap-4">
              <div className="w-full flex flex-col gap-4">
                {/* Linha 1: Opções de Filtro (Período/Data) */}
                <Card>
                  <CardContent className="p-2 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-semibold">Período:</Label>
                      <RadioGroup value={periodFrotas} onValueChange={(v) => handleFrotasPeriodChange(v as "diario" | "semanal")} className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem id="frotas-diario" value="diario" />
                          <Label htmlFor="frotas-diario" className="text-sm">Diário</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem id="frotas-semanal" value="semanal" />
                          <Label htmlFor="frotas-semanal" className="text-sm">Semanal</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-semibold">Data:</Label>
                      <DateRangePicker className="w-[240px]" value={rangeFrotas} onChange={(v) => v && setRangeFrotas(v)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Linha 2: Cards de Upload das Frentes */}
                <div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                    {FRENTES.map((title)=> (
                      <FrenteUploadCard 
                        key={title} 
                        ref={(el) => { cardRefs.current[title] = el; }}
                        title={title} 
                        onProcessComplete={handleProcessComplete}
                        onProcessStart={() => handleProcessStart(title)}
                        onProcessError={(err) => handleProcessError(err, title)}
                        onLog={(msg) => handleProcessLog(msg, title)}
                      />
                    ))}
                  </div>
                  <Button 
                    className="w-full mt-2" 
                    onClick={handleBatchProcess}
                  >
                    Gerar (Processamento em Lote)
                  </Button>
                  {/* Botão de Debug para abrir console manualmente caso necessário */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs text-muted-foreground h-6"
                    onClick={() => setShowConsoleModal(true)}
                  >
                    Abrir Console (Visualizar Logs)
                  </Button>
                </div>

                {/* Linha 3: Área de Resultados (se houver) */}
                <div className="mt-4">
                  {Object.keys(processedReports).length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Relatórios Disponíveis
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {FRENTES.map((frente, index) => {
                          const isAvailable = processedReports[frente];
                          if (!isAvailable) return null;

                          return (
                            <Card key={`col-${index}`} className="border-l-4 border-l-green-500 shadow-sm">
                              <CardContent className="p-3 flex flex-col gap-2">
                                <div className="space-y-1">
                                  <div className="font-semibold text-sm">{frente}</div>
                                  <div className="text-xs text-muted-foreground">Relatório de Colhedoras Gerado</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="w-full text-xs h-8"
                                    onClick={() => handleVerRelatorio(frente)}
                                  >
                                    Ver Relatório
                                  </Button>
                                  <Button variant="secondary" size="sm" className="w-full border border-input text-xs h-8" disabled>Download</Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50/50">
                      <AlertCircle className="h-8 w-8 opacity-20" />
                      <p className="mt-2 text-sm font-medium">Nenhum relatório processado ainda</p>
                      <p className="text-xs">Selecione os arquivos acima e clique em "Gerar".</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Operadores" className="m-0 p-0 data-[state=active]:flex">
              <div className="w-full flex flex-col gap-4">
                {/* Linha 1: Opções de Filtro (Período/Data) */}
                <Card>
                  <CardContent className="p-4 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-semibold">Período:</Label>
                      <RadioGroup value={periodOperadores} onValueChange={(v) => handleOperadoresPeriodChange(v as "diario" | "semanal")} className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem id="operadores-diario" value="diario" />
                          <Label htmlFor="operadores-diario" className="text-sm">Diário</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem id="operadores-semanal" value="semanal" />
                          <Label htmlFor="operadores-semanal" className="text-sm">Semanal</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-semibold">Data:</Label>
                      <DateRangePicker className="w-[240px]" value={rangeOperadores} onChange={(v) => v && setRangeOperadores(v)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Linha 2: Vazia por enquanto (placeholder) */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Relatórios Disponíveis
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <Card className="shadow-sm">
                      <CardContent className="p-4 flex flex-col gap-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-base">Operadores - Colhedoras (CD)</div>
                          <div className="text-sm text-muted-foreground">Relatório diário (base)</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                          <Button variant="outline" size="sm" className="w-full" onClick={() => handleVerRelatorioOperadores("cd")}>
                            Ver
                          </Button>
                          <Button size="sm" className="w-full" onClick={() => handleVerRelatorioOperadores("cd")}>
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardContent className="p-4 flex flex-col gap-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-base">Operadores - Transbordos (TT)</div>
                          <div className="text-sm text-muted-foreground">Relatório diário (base)</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                          <Button variant="outline" size="sm" className="w-full" onClick={() => handleVerRelatorioOperadores("tt")}>
                            Ver
                          </Button>
                          <Button size="sm" className="w-full" onClick={() => handleVerRelatorioOperadores("tt")}>
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Linha 3: Lista de Relatórios Gerados */}
                <div className="space-y-4">
                  <div className="text-lg font-semibold">Relatórios Gerados</div>
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50/50">
                    <AlertCircle className="h-8 w-8 opacity-20" />
                    <p className="mt-2 text-sm font-medium">Nenhum relatório de operadores gerado ainda</p>
                    <p className="text-xs">Assim que o fluxo e os dados estiverem prontos, eles aparecerão aqui.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modal de Console */}
      <Dialog open={showConsoleModal} onOpenChange={setShowConsoleModal}>
        <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Console de Processamento
            </DialogTitle>
            <DialogDescription>
              Acompanhe o processamento dos arquivos em tempo real.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 bg-black text-green-400 font-mono text-xs p-4 rounded-md overflow-hidden flex flex-col border border-slate-800 shadow-inner">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-1">
                {consoleLogs.length === 0 && (
                  <div className="text-slate-500 italic">Aguardando início do processamento...</div>
                )}
                {consoleLogs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-300 font-bold' : 
                    'text-green-400'
                  }`}>
                    <span className="opacity-50 select-none">[{log.timestamp}]</span>
                    <span className="font-semibold select-none">[{log.frente || 'Geral'}]</span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
