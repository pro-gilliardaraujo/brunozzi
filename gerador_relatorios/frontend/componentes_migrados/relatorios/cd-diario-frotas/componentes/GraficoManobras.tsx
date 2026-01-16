import React from 'react'
import { corPorMeta } from './cores'

interface ItemManobra {
  Frota: number | string
  "Tempo Total (hh:mm)": string
  "Tempo Médio (hh:mm)": string
  "Intervalos Válidos": number
}

interface GraficoManobrasProps {
  dados: ItemManobra[]
  meta: number // em segundos (ex: 60 para 01:00)
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

function excelLikeToMinutes(timeStr: string): number {
  const m = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return 0
  const day = Number(m[3])
  const h = Number(m[4])
  const min = Number(m[5])
  const sec = Number(m[6])
  return day * 24 * 60 + h * 60 + min + Math.round(sec / 60)
}

export function GraficoManobras({ dados, meta, compact = true, listrado = true }: GraficoManobrasProps) {
  // Filtrar dados válidos
  const dadosValidos = dados.filter(d => d["Intervalos Válidos"] > 0)
  
  // Calcular média dos tempos médios
  const somaTemposMedios = dadosValidos.reduce((acc, curr) => acc + timeStringToSeconds(curr["Tempo Médio (hh:mm)"]), 0)
  const mediaGeralSeconds = dadosValidos.length > 0 ? somaTemposMedios / dadosValidos.length : 0

  // Ordenar por tempo médio crescente (menor é melhor)
  const dadosOrdenados = [...dados].sort((a, b) => {
    const timeA = timeStringToSeconds(a["Tempo Médio (hh:mm)"])
    const timeB = timeStringToSeconds(b["Tempo Médio (hh:mm)"])
    return timeA - timeB
  })

  // Escala do gráfico
  const maiorTempoMedio = Math.max(...dados.map(d => timeStringToSeconds(d["Tempo Médio (hh:mm)"])), 0)
  const maxEscala = Math.max(meta * 1.5, maiorTempoMedio * 1.1)
  
  // Posição da meta
  const posMeta = (meta / maxEscala) * 100

  // Cor do Header
  // Meta Manobras: Menor é melhor? 
  // Se média geral > meta -> ruim (vermelho). Se média < meta -> bom (verde).
  const isBom = mediaGeralSeconds <= meta
  const corMedia = isBom ? '#48BB78' : '#E53E3E'

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          Meta: <span className="text-[#48BB78]">{secondsToMmSs(meta)}</span> | 
          Média: <span style={{ color: corMedia }}>{secondsToMmSs(mediaGeralSeconds)}</span>
        </div>
        <div className={`text-slate-500 italic ${compact ? "text-[10px] mt-0.5" : "text-xs mt-1"}`}>
          * Média calculada excluindo valores 0 min
        </div>
      </div>

      {/* Lista */}
      <div className={`flex flex-col flex-1 ${compact ? "gap-2 overflow-hidden" : "gap-4 overflow-auto"}`}>
        {dadosOrdenados.map((item, index) => {
          const valorSeconds = timeStringToSeconds(item["Tempo Médio (hh:mm)"])
          // Menor é melhor (inverso = true)
          const corItem = corPorMeta(valorSeconds, meta, true)
          const larguraBarra = (valorSeconds / maxEscala) * 100
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={index}
              className={`flex flex-col ${
                listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""
              }`}
            >
              {/* Nome da Frota: Se compacto, inline (à esquerda) */}
              {!compact && <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-1"}`}>{item.Frota}</div>}

              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                
                {/* Se compacto, nome à esquerda */}
                {compact && (
                   <div className="font-bold text-xs w-10 text-center flex-shrink-0 self-center">{item.Frota}</div>
                )}

                {/* Lado Esquerdo: Quantidade de Manobras */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span 
                    className="font-bold text-xs"
                    style={{ color: corItem }}
                  >
                    {item["Intervalos Válidos"]}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Manobras
                  </span>
                </div>

                {/* Centro: Barra */}
                <div
                  className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200 ${
                    compact ? "" : "mt-3 mb-1"
                  }`}
                >
                  {/* Barra Colorida */}
                  <div 
                    className="h-full rounded-l-sm transition-all duration-500"
                    style={{ 
                      width: `${larguraBarra}%`,
                      backgroundColor: corItem
                    }}
                  />
                   {/* Linha da Meta */}
                   <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10"
                      style={{ left: `${posMeta}%` }}
                    />
                    
                </div>

                {/* Lado Direito: Tempo Total */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span 
                    className="font-bold text-xs"
                    style={{ color: corItem }}
                  >
                    {typeof (item as any)["Tempo Total"] === 'number' && isFinite((item as any)["Tempo Total"])
                      ? minutesToHm((item as any)["Tempo Total"])
                      : (typeof (item as any)["Tempo Total (hh:mm)"] === 'string' && (item as any)["Tempo Total (hh:mm)"].length > 0
                        ? minutesToHm(excelLikeToMinutes((item as any)["Tempo Total (hh:mm)"]))
                        : minutesToHm(0))}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Tempo Total
                  </span>
                </div>

                {/* Valor Final (Tempo Médio em minutos, sem label) */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span 
                    className="font-bold text-xs"
                    style={{ color: corItem }}
                  >
                    {secondsToMmSs(valorSeconds)}
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
