import React from 'react'
import { corPorMeta } from './cores'

interface ItemDisponibilidade {
  id: string | number
  nome: string
  disponibilidade: number // %
  horasMotor: number // horas
  tempoManutencao: number // horas
}

interface GraficoDisponibilidadeMecanicaProps {
  dados: ItemDisponibilidade[]
  meta: number
}

export function GraficoDisponibilidadeMecanica({ dados, meta }: GraficoDisponibilidadeMecanicaProps) {
  const dadosOrdenados = [...dados].sort((a, b) => b.disponibilidade - a.disponibilidade)
  const MAX_ROWS = 7
  const itensVisiveis = dadosOrdenados.slice(0, MAX_ROWS)

  const formatarHoras = (decimal: number) => {
    const horas = Math.floor(decimal || 0)
    const minutos = Math.round(((decimal || 0) - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  const mediaTotal = (dados.filter(d => (d.horasMotor || 0) > 0).reduce((acc, curr) => acc + (curr.disponibilidade || 0), 0) / (dados.filter(d => (d.horasMotor || 0) > 0).length || 1)) || 0
  const corMedia = mediaTotal >= meta ? '#48BB78' : '#E53E3E'

  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-slate-50 border border-slate-200 rounded-md p-2 mb-2 text-center shrink-0">
        <div className="text-sm font-semibold text-slate-700">
          <span className="text-black">Meta: </span>
          <span className="text-[#48BB78] font-bold">{meta.toFixed(2)}%</span>
          <span className="mx-2 text-slate-400">|</span>
          <span className="text-black">Média: </span>
          <span className="font-bold" style={{ color: corMedia }}>
            {mediaTotal.toFixed(2)}%
          </span>
        </div>
        <div className="text-[10px] text-slate-500 italic mt-0.5">
          * Média calculada excluindo valores 0h0m
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {itensVisiveis.map((item, index) => {
          const valorPerc = Math.max(Math.min(item.disponibilidade || 0, 100), 0)
          const corBarra = corPorMeta(valorPerc, meta, false)
          return (
            <div key={item.id ?? index} className="flex flex-col">
              <div className="font-bold text-xs mb-1 text-black">{item.nome}</div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center" style={{ width: '100px', minWidth: '100px' }}>
                  <span className="font-bold text-xs" style={{ color: corBarra }}>
                    {formatarHoras(item.horasMotor || 0)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Horas Motor
                  </span>
                </div>
                <div className="flex-1 relative">
                  <div className="w-full h-6 bg-slate-100 rounded-md overflow-hidden border border-slate-200">
                    <div
                      className="h-full transition-all duration-500 rounded-l-md"
                      style={{ width: `${valorPerc}%`, backgroundColor: corBarra }}
                    />
                  </div>
                  <div
                    className="absolute top-0 w-[3px] bg-black/60 z-10"
                    style={{ left: `${meta}%`, height: '24px' }}
                  />
                  <div
                    className="absolute -top-4 text-[11px] font-bold whitespace-nowrap"
                    style={{ left: `calc(${valorPerc}% - 10px)`, color: corBarra }}
                  >
                    {valorPerc.toFixed(2)}%
                  </div>
                </div>
                <div className="flex flex-col items-center" style={{ width: '100px', minWidth: '100px' }}>
                  <span className="font-bold text-xs" style={{ color: corBarra }}>
                    {formatarHoras(item.tempoManutencao || 0)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Tempo Manutenção
                  </span>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <div className="flex-1">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>0%</span>
                    <span>Meta: {meta}%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div style={{ minWidth: '100px' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
