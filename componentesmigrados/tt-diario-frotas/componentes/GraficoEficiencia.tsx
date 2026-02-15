import React from 'react'
import { corPorMeta } from './cores'

interface ItemEficiencia {
  id: string | number
  nome: string
  eficiencia: number
  horasMotor: number
  horasProdutivas: number
}

interface GraficoEficienciaProps {
  dados: ItemEficiencia[]
  meta: number
  compact?: boolean
  listrado?: boolean
  maxRows?: number
  density?: 'auto' | 'normal' | 'tight'
}

export function GraficoEficiencia({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows,
  density = 'auto',
}: GraficoEficienciaProps) {
  // Ordenar por eficiência (maior para menor)
  const dadosOrdenados = [...dados].sort((a, b) => b.eficiencia - a.eficiencia)
  const itens = typeof maxRows === 'number' ? dadosOrdenados.slice(0, Math.max(0, maxRows)) : dadosOrdenados
  const densidade = typeof maxRows === 'number' && maxRows > 0 ? itens.length / maxRows : 1
  const isTight = density === 'tight' || (density === 'auto' && typeof maxRows === 'number' && densidade >= 0.75)
  const isSpacious = density === 'auto' && typeof maxRows === 'number' && densidade <= 0.35

  const formatarHoras = (decimal: number) => {
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  const getCor = (valor: number, metaRef: number) => corPorMeta(valor, metaRef, false)

  return (
    <div className={`flex flex-col ${compact ? (isTight ? 'gap-1' : isSpacious ? 'gap-3' : 'gap-2') : 'gap-4'}`}>
      {itens.map((item, index) => {
        // Converter eficiência de decimal (0-1) para percentual (0-100) se necessário
        // Assumindo que dados.ts vem em decimal (ex: 0.60) e meta em percentual (ex: 70)
        const eficienciaPercentual = item.eficiencia * 100
        
        const corItem = getCor(eficienciaPercentual, meta)
        const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"
        
        // Cálculo da largura da barra (limitado a 100%)
        const larguraBarra = Math.min(eficienciaPercentual, 100)

        return (
          <div
            key={item.id}
            className={`flex flex-col min-w-0 ${
              listrado
                ? `${index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm ${
                    isTight ? 'px-1 py-0.5' : isSpacious ? 'px-3 py-2' : 'px-2 py-1'
                  }`
                : ''
            }`}
          >
            {/* Nome da Frota */}
            <div
              className={`font-bold ${
                isTight ? 'text-[11px] leading-tight truncate' : isSpacious ? 'text-sm leading-tight truncate' : 'text-xs'
              } ${compact ? 'mb-0.5' : 'mb-1'}`}
            >
              {item.nome}
            </div>
            
            <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
              {/* Lado Esquerdo: Horas Produtivas */}
              {isTight ? (
                <div className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                  Horas Produtivas:{" "}
                  <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corItem }}>
                    {formatarHoras(item.horasProdutivas)}
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                  <span
                    className={`font-bold ${
                      isTight ? 'text-[10px] leading-none' : isSpacious ? 'text-sm leading-none' : 'text-xs'
                    }`}
                    style={{ color: corItem }}
                  >
                    {formatarHoras(item.horasProdutivas)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">Horas Produtivas</span>
                </div>
              )}

              {/* Barra de Progresso */}
              <div
                className={`${isTight ? 'w-[420px] flex-none' : 'flex-1'} ${
                  compact ? (isTight ? 'h-4' : isSpacious ? 'h-6' : 'h-5') : 'h-6'
                } ${bgBarra} rounded-sm relative border border-slate-200`}
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
                  style={{ left: `${meta}%` }}
                />
              </div>


              {/* Lado Direito: Horas Motor */}
              {isTight ? (
                <div className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                  Horas Motor:{" "}
                  <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corItem }}>
                    {formatarHoras(item.horasMotor)}
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                  <span
                    className={`font-bold ${
                      isTight ? 'text-[10px] leading-none' : isSpacious ? 'text-sm leading-none' : 'text-xs'
                    }`}
                    style={{ color: corItem }}
                  >
                    {formatarHoras(item.horasMotor)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">Horas Motor</span>
                </div>
              )}

              {/* Valor Final Eficiência */}
              <div 
                className={`${isTight ? 'text-xs' : isSpacious ? 'text-base' : 'text-sm'} font-bold w-16 text-right`}
                style={{ color: corItem }}
              >
                {eficienciaPercentual.toFixed(2)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
