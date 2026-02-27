import React from 'react'
import { corPorMeta } from '../shared/cores'

interface ItemTransbordo {
  nome: string // ou Frota
  quantidade: number
  tempoTotal: number // em horas
}

interface GraficoTransbordoProps {
  dados: ItemTransbordo[]
  // Não tem meta clara no excel para transbordo, usaremos 0 apenas para não dar erro
  meta?: number 
  compact?: boolean
  listrado?: boolean
}

function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

function secondsToMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function minutesToHm(minutes: number): string {
  const totalMinutes = Math.round(minutes || 0)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h${m.toString().padStart(2, '0')}m`
}

export function GraficoTransbordo({ dados, compact = true, listrado = true }: GraficoTransbordoProps) {
  // Filtrar apenas quem fez transbordo
  const dadosValidos = dados.filter(d => (d.quantidade || 0) > 0)
  
  // Calcular média de tempo por transbordo
  // tempoTotal vem em horas (ex: 1.5h), precisamos em minutos para a conta base
  const temposPorItem = dadosValidos.map(d => {
    const minTotais = (d.tempoTotal || 0) * 60
    const segTotais = minTotais * 60
    const media = segTotais / (d.quantidade || 1)
    return { ...d, segMedia: media, segTotal: segTotais }
  })

  const somaSegMedios = temposPorItem.reduce((acc, curr) => acc + curr.segMedia, 0)
  const mediaGeralSeconds = temposPorItem.length > 0 ? somaSegMedios / temposPorItem.length : 0

  const dadosOrdenados = temposPorItem.sort((a, b) => a.segMedia - b.segMedia)

  const maiorTempoMedio = Math.max(...temposPorItem.map(d => d.segMedia), 0)
  // Se não temos meta, vamos escalar baseando-se no pior
  const maxEscala = maiorTempoMedio * 1.2 || 1
  
  // Cor do Header - Transbordo não é inerentemente ruim, usaremos cor neutra ou azul
  const corPadrao = '#3182CE'

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          Média por Transbordo: <span style={{ color: corPadrao }}>{secondsToMmSs(mediaGeralSeconds)}</span>
        </div>
        <div className={`text-slate-500 italic ${compact ? "text-[10px] mt-0.5" : "text-xs mt-1"}`}>
          * Média calculada apenas sobre tratores que transbordaram
        </div>
      </div>

      {/* Lista */}
      <div className={`flex flex-col flex-1 ${compact ? "gap-2 overflow-hidden" : "gap-4 overflow-visible"}`}>
        {dadosOrdenados.map((item, index) => {
          const valorSeconds = item.segMedia
          const larguraBarra = Math.min((valorSeconds / maxEscala) * 100, 100)
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={index}
              className={`flex flex-col ${
                listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""
              }`}
            >
              {!compact && <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-1"}`}>{item.nome}</div>}

              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-4"}`}>
                
                {compact && (
                   <div className="font-bold text-xs w-10 text-center flex-shrink-0 self-center">{item.nome}</div>
                )}

                {/* Left: Quantidade */}
                <div className="flex flex-col items-center w-16 min-w-[64px]">
                  <span className="font-bold text-xs" style={{ color: corPadrao }}>
                    {item.quantidade}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600 text-center leading-tight">
                    Qtd
                  </span>
                </div>

                {/* Center: Bar */}
                <div
                  className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200 ${
                    compact ? "" : "my-1"
                  }`}
                >
                  <div 
                    className="h-full rounded-l-sm transition-all duration-500"
                    style={{ 
                      width: `${larguraBarra}%`,
                      backgroundColor: corPadrao
                    }}
                  />
                </div>

                {/* Right: Total Time */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corPadrao }}>
                    {minutesToHm(item.segTotal / 60)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600 text-center leading-tight">
                    Total
                  </span>
                </div>

                {/* Final Value (Average in mm:ss) */}
                <div className="flex flex-col items-center w-16 min-w-[64px]">
                  <span className="font-bold text-xs" style={{ color: corPadrao }}>
                    {secondsToMmSs(valorSeconds)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600 text-center leading-tight">
                    Média
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
