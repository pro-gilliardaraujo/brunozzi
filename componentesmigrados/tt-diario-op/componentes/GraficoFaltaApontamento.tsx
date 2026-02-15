import React from 'react'
import { corPorMeta } from '../../tt-diario-frotas/componentes/cores'

interface ItemFaltaApontamento {
  id: string | number
  nome: string
  percentual: number
  tempoLigado: number
  tempoOcioso: number
}

interface GraficoFaltaApontamentoProps {
  dados: ItemFaltaApontamento[]
  meta: number
  compact?: boolean
  listrado?: boolean
  maxRows?: number
  density?: 'auto' | 'normal' | 'tight'
}

export function GraficoFaltaApontamento({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows,
  density = 'auto',
}: GraficoFaltaApontamentoProps) {
  const calcularPercentual = (item: ItemFaltaApontamento) => {
    const ligado = item.tempoLigado || 0
    const semApontar = item.tempoOcioso || 0
    if (ligado <= 0) return 0
    return (semApontar / ligado) * 100
  }
  const dadosOrdenados = [...dados].sort((a, b) => calcularPercentual(a) - calcularPercentual(b))
  const itens = typeof maxRows === 'number' ? dadosOrdenados.slice(0, Math.max(0, maxRows)) : dadosOrdenados
  const densidade = typeof maxRows === 'number' && maxRows > 0 ? itens.length / maxRows : 0
  const isTight = density === 'tight' || (density === 'auto' && typeof maxRows === 'number' && densidade >= 0.75)
  const isConstrained = compact || typeof maxRows === 'number'

  const formatarHorasMinutos = (decimal: number) => {
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  const dadosValidos = dados.filter(d => (d.tempoLigado || 0) > 0)
  const mediaTotal = dadosValidos.length > 0 
    ? dadosValidos.reduce((acc, curr) => acc + calcularPercentual(curr), 0) / dadosValidos.length 
    : 0

  const isBom = mediaTotal <= meta
  const corMedia = isBom ? '#48BB78' : '#E53E3E'

  return (
    <div className="flex flex-col w-full h-full">
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? 'p-2 mb-2' : 'p-3 mb-4'}`}>
        <div className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-slate-700`}>
          Meta: <span className="text-[#48BB78]">{meta.toFixed(2)}%</span> | 
          Média: <span style={{ color: corMedia }}>{mediaTotal.toFixed(2)}%</span>
        </div>
        <div className={`${compact ? 'text-[10px]' : 'text-xs'} text-slate-500 italic mt-1`}>
          * Média calculada excluindo valores 0 h motor
        </div>
      </div>
      <div className={`flex flex-col ${isConstrained ? 'flex-1 overflow-hidden' : ''} ${compact ? (isTight ? 'gap-1' : 'gap-2') : 'gap-4'}`}>
        {itens.map((item, index) => {
          const percentualCalc = calcularPercentual(item)
          const corValor = corPorMeta(percentualCalc, meta, true)
          const corBarra = '#E53E3E'
          const percentualSemApontar = Math.min(percentualCalc, 100)
          const percentualApontado = 100 - percentualSemApontar
          
          return (
            <div
              key={item.id}
              className={`flex flex-col min-w-0 ${
                listrado ? `${index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm ${isTight ? 'px-1 py-0.5' : 'px-2 py-1'}` : ''
              }`}
            >
              <div className={`font-bold ${isTight ? 'text-[11px] leading-tight truncate' : 'text-xs'} ${compact ? 'mb-0.5' : 'mb-1'}`}>
                {item.nome}
              </div>
              
              <div className="flex items-center gap-2">
                {isTight ? (
                  <div className="flex items-center justify-between w-[120px] min-w-[120px] gap-2">
                    <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">Horas s/apontar:</span>
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoOcioso)}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[40px]' : 'w-20 min-w-[40px]'}`}>
                    <span className={`font-bold ${isTight ? 'text-[10px] leading-none' : 'text-xs'}`} style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoOcioso)}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Horas s/apontar: </span>
                  </div>
                )}
                <div
                  className={`${isTight ? 'w-[410px] flex-none' : 'flex-1'} ${compact ? (isTight ? 'h-4' : 'h-5') : 'h-6'} bg-slate-100 rounded-sm relative border border-slate-200 flex overflow-hidden`}
                >
                  <div className="h-full transition-all duration-500" style={{ width: `${percentualSemApontar}%`, backgroundColor: corBarra }} />
                  <div className="h-full bg-[#48BB78] transition-all duration-500" style={{ width: `${percentualApontado}%` }} />
                  <div className="absolute top-0 bottom-0 w-[3px] bg-black/60 z-10" style={{ left: `${meta}%` }} />
                </div>
                {isTight ? (
                  <div className="flex items-center justify-between w-[90px] min-w-[90px] gap-2">
                    <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">Horas Motor: </span>
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoLigado)}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[64px]'}`}>
                    <span className={`font-bold ${isTight ? 'text-[10px] leading-none' : 'text-xs'}`} style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoLigado)}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Horas Motor: </span>
                  </div>
                )}
                <div className={`${isTight ? 'text-xs' : 'text-sm'} font-bold w-16 text-right`} style={{ color: corValor }}>
                  {percentualCalc.toFixed(2)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

