import React from 'react'
import { corPorMeta } from './cores'

interface ItemMotorOcioso {
  id: string | number
  nome: string
  percentual: number // %
  tempoLigado: number // horas
  tempoOcioso: number // horas
}

interface GraficoMotorOciosoProps {
  dados: ItemMotorOcioso[]
  meta: number // %
  compact?: boolean
  listrado?: boolean
}

export function GraficoMotorOcioso({ dados, meta, compact = true, listrado = true }: GraficoMotorOciosoProps) {
  // Ordenar por percentual crescente (menor é melhor)
  const dadosOrdenados = [...dados].sort((a, b) => a.percentual - b.percentual)

  const formatarHorasMinutos = (decimal: number) => {
    if (typeof decimal !== 'number' || isNaN(decimal)) return "0h00m"
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  // Média total
  const mediaTotal = dados.length > 0 
    ? dados.reduce((acc, curr) => acc + curr.percentual, 0) / dados.length 
    : 0

  const isBom = mediaTotal <= meta
  const corMedia = isBom ? '#48BB78' : '#E53E3E'

  return (
    <div className="flex flex-col w-full">
       {/* Cabeçalho */}
       <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className="text-sm font-bold text-slate-700">
          Meta: <span className="text-[#48BB78]">{meta.toFixed(2)}%</span> | 
          Média: <span style={{ color: corMedia }}>{mediaTotal.toFixed(2)}%</span>
        </div>
        <div className="text-xs text-slate-500 italic mt-1">
          * Média calculada excluindo valores 0 h motor
        </div>
      </div>

      <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
        {dadosOrdenados.map((item, index) => {
          // Menor que a meta é melhor (inverso = true)
          const corItem = corPorMeta(item.percentual, meta, true)
          
          // Largura da barra = percentual (limitado a 100%)
          const larguraOcioso = Math.min(Math.max(item.percentual, 0), 100)
          
          // Padrão listrado
          const bgContainer = listrado ? (index % 2 === 0 ? "bg-slate-100" : "bg-white") : ""
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={item.id}
              className={`flex flex-col ${bgContainer} rounded-sm px-2 py-1`}
            >
              {/* Nome da Frota: Se compacto, inline (à esquerda) */}
              {!compact && <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-1"}`}>{item.nome}</div>}
              
              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                
                {/* Se compacto, nome à esquerda */}
                {compact && (
                   <div className="font-bold text-xs w-10 text-center flex-shrink-0 self-center">{item.nome}</div>
                )}

                {/* Lado Esquerdo: Tempo Ocioso */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corItem }}>
                    {formatarHorasMinutos(item.tempoOcioso)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Tempo Ocioso
                  </span>
                </div>

                {/* Barra Combinada */}
                <div className={`flex-1 ${compact ? "h-5" : "h-6"} bg-[#48BB78] rounded-sm relative border border-slate-200 overflow-hidden`}>
                   {/* Barra Ocioso */}
                   <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${larguraOcioso}%`,
                        backgroundColor: 'red'
                      }}
                   />
                   
                   {/* Linha da Meta */}
                   <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10"
                      style={{ left: `${meta}%` }}
                    />
                </div>

                {/* Lado Direito: Tempo Ligado */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: '#48BB78' }}>
                    {formatarHorasMinutos(item.tempoLigado)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500">
                    Tempo Ligado
                  </span>
                </div>

                {/* Valor Final Percentual */}
                <div className="font-bold text-sm w-16 text-right" style={{ color: corItem }}>
                  {item.percentual.toFixed(2)}%
                </div>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
