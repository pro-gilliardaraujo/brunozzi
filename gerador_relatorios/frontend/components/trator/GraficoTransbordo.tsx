import React from 'react'
import { corPorMeta } from '../relatorios/cd-diario-frotas/componentes/cores'

interface ItemTransbordo {
  nome: string // ou Frota
  quantidade: number
  tempoTotal: number // em horas
}

interface GraficoTransbordoProps {
  dados: ItemTransbordo[]
  meta?: number // em minutos
  compact?: boolean
  listrado?: boolean
}

function secondsToMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function hoursToHm(hours: number): string {
  const totalMinutes = Math.round((hours || 0) * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h${m.toString().padStart(2, '0')}m`
}

export function GraficoTransbordo({ dados, meta = 0, compact = true, listrado = true }: GraficoTransbordoProps) {
  // Filtrar apenas quem fez transbordo
  const dadosValidos = dados.filter(d => (d.quantidade || 0) > 0)
  
  // Calcular média de tempo por transbordo
  // tempoTotal vem em horas (ex: 1.5h), precisamos em minutos para a conta base
  const temposPorItem = dadosValidos.map(d => {
    const minTotais = (d.tempoTotal || 0) * 60
    const segTotais = minTotais * 60
    const media = d.quantidade > 0 ? segTotais / d.quantidade : 0
    return { ...d, segMedia: media, segTotal: segTotais }
  })

  // Calcular média geral ponderada ou simples?
  // Média simples das médias:
  const somaSegMedios = temposPorItem.reduce((acc, curr) => acc + curr.segMedia, 0)
  const mediaGeralSeconds = temposPorItem.length > 0 ? somaSegMedios / temposPorItem.length : 0

  const dadosOrdenados = temposPorItem.sort((a, b) => a.segMedia - b.segMedia)

  const maiorTempoMedio = Math.max(...temposPorItem.map(d => d.segMedia), 0)
  // Meta em minutos -> segundos
  const metaSeconds = meta * 60
  const maxEscala = Math.max(metaSeconds * 1.5, maiorTempoMedio * 1.1) || 1
  
  // Posição da meta
  const posMeta = Math.min((metaSeconds / maxEscala) * 100, 100)
  
  // Cor do Header - Transbordo (menor tempo é melhor)
  const isBom = mediaGeralSeconds <= metaSeconds
  const corMedia = isBom ? '#48BB78' : '#E53E3E'

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          Meta: <span className="text-[#48BB78]">{secondsToMmSs(metaSeconds)}</span> | 
          Média: <span style={{ color: corMedia }}>{secondsToMmSs(mediaGeralSeconds)}</span>
        </div>
        <div className={`text-slate-500 italic ${compact ? "text-[10px] mt-0.5" : "text-xs mt-1"}`}>
          * Média calculada apenas sobre tratores que transbordaram
        </div>
      </div>

      {/* Lista */}
      <div className={`flex flex-col flex-1 overflow-hidden relative ${compact ? "gap-1" : "gap-3"}`}>
        <div className="absolute top-0 bottom-0 left-0 right-0 overflow-y-auto pr-1">
        {dadosOrdenados.map((item, index) => {
          const valorSeconds = item.segMedia
          const larguraBarra = Math.min((valorSeconds / maxEscala) * 100, 100)
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"
          
          // Cor baseada na meta (menor é melhor = true)
          const corItem = corPorMeta(valorSeconds, metaSeconds, true)

          return (
            <div
              key={index}
              className={`flex flex-col mb-2 ${
                listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""
              }`}
            >
              {!compact && <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-0.5"}`}>{item.nome}</div>}

              <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
                
                {compact && (
                   <div className="font-bold text-[10px] w-14 text-center flex-shrink-0 self-center truncate" title={item.nome}>{item.nome}</div>
                )}

                {/* Quantidade (Basculamentos) */}
                <div className="flex flex-col items-center w-16 min-w-[60px]">
                  <span 
                    className="font-bold text-xs"
                    style={{ color: corItem }}
                  >
                    {item.quantidade}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Basc.
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className={`flex-1 ${compact ? "h-4" : "h-5"} ${bgBarra} rounded-sm relative border border-slate-200`}>
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

                {/* Tempo Total */}
                <div className="flex flex-col items-center w-16 min-w-[60px]">
                  <span 
                    className="font-bold text-xs"
                    style={{ color: corItem }}
                  >
                    {hoursToHm(item.tempoTotal)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Total
                  </span>
                </div>

                {/* Valor (Tempo Médio) */}
                <div 
                  className="font-bold text-xs w-16 text-right"
                  style={{ color: corItem }}
                >
                  {secondsToMmSs(valorSeconds)}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
