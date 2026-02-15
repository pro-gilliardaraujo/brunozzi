import React from 'react'
import { corPorMeta } from './cores'

interface ItemBasculamento {
  Frota: number | string
  "Tempo Total (hh:mm)": string
  "Tempo Médio (hh:mm)": string
  "Intervalos Válidos": number
}

interface GraficoBasculamentoProps {
  dados: ItemBasculamento[]
  meta: number // em segundos (ex: 60 para 01:00)
  compact?: boolean
  listrado?: boolean
  maxRows?: number
  density?: 'auto' | 'normal' | 'tight'
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

function hoursToHm(hours: number): string {
  const totalMinutes = Math.round((hours || 0) * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h${m.toString().padStart(2, '0')}m`
}

export function GraficoBasculamento({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows = 7,
  density = 'auto',
}: GraficoBasculamentoProps) {
  const dadosValidos = dados.filter(d => d["Intervalos Válidos"] > 0)
  const getMedioSeconds = (item: any): number => {
    const medioStr = item?.["Tempo Médio (hh:mm)"]
    const medioNum = item?.["Tempo Médio"]
    if (typeof medioStr === 'string' && medioStr.length > 0) return timeStringToSeconds(medioStr)
    if (typeof medioNum === 'number' && isFinite(medioNum)) return medioNum * 3600
    return 0
  }
  const somaTemposMedios = dadosValidos.reduce((acc, curr) => acc + getMedioSeconds(curr), 0)
  const mediaGeralSeconds = dadosValidos.length > 0 ? somaTemposMedios / dadosValidos.length : 0
  const dadosOrdenados = [...dados].sort((a, b) => {
    const timeA = getMedioSeconds(a as any)
    const timeB = getMedioSeconds(b as any)
    return timeA - timeB
  })
  const maiorTempoMedio = Math.max(...dados.map(d => getMedioSeconds(d as any)), 0)
  const maxEscala = Math.max(meta * 1.5, maiorTempoMedio * 1.1)
  const posMeta = (meta / maxEscala) * 100
  const isBom = mediaGeralSeconds <= meta
  const corMedia = isBom ? '#48BB78' : '#E53E3E'
  const itensVisiveis = dadosOrdenados.slice(0, Math.max(0, maxRows))
  const densidade = maxRows > 0 ? itensVisiveis.length / maxRows : 0
  const canTighten = maxRows >= 14
  const isTight = density === 'tight' || (density === 'auto' && canTighten && densidade >= 0.75)
  const isSpacious = density === 'auto' && densidade <= 0.35
  const isNormal = density === 'normal' || (!isTight && !isSpacious)
  const rowGapClass = isTight ? 'gap-1' : isNormal ? 'gap-2' : 'gap-3'

  return (
    <div className="flex flex-col h-full">

      {/* Cabeçalho */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 text-center">
        <div className="text-xs font-bold text-slate-700">
          Meta: <span className="text-[#48BB78]">{secondsToMmSs(meta)}</span> | 
          Média: <span style={{ color: corMedia }}>{secondsToMmSs(mediaGeralSeconds)}</span>
        </div>
        <div className="text-[10px] text-slate-500 italic mt-1">
          * Média calculada excluindo valores 0 min
        </div>
      </div>

      {/* Lista */}
      <div className={`flex flex-col ${rowGapClass} flex-1 overflow-hidden`}>
        {itensVisiveis.map((item, index) => {
          const valorSeconds = getMedioSeconds(item as any)
          const corItem = corPorMeta(valorSeconds, meta, true)
          const larguraBarra = (valorSeconds / maxEscala) * 100
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={index}
              className={`flex flex-col min-w-0 ${
                listrado
                  ? `${index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm ${
                      isTight ? 'px-1 py-0.5' : isSpacious ? 'px-3 py-2' : 'px-2 py-1'
                    }`
                  : ''
              }`}
            >
              <div
                className={`font-bold ${
                  isTight ? 'text-[11px] leading-tight truncate' : isSpacious ? 'text-sm leading-tight truncate' : 'text-xs'
                } ${compact ? 'mb-0.5' : 'mb-1'}`}
              >
                {item.Frota}
              </div>

              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                {isTight ? (
                  <div className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                    Intervalos Válidos:{' '}
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corItem }}>
                      {item["Intervalos Válidos"]}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                    <span
                      className={`font-bold ${isTight ? 'text-[10px] leading-none' : isSpacious ? 'text-sm leading-none' : 'text-xs'}`}
                      style={{ color: corItem }}
                    >
                      {item["Intervalos Válidos"]}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Intervalos Válidos</span>
                  </div>
                )}

                <div
                  className={`${isTight ? 'w-[480px] flex-none' : 'flex-1'} ${compact ? (isTight ? 'h-4' : 'h-5') : 'h-6'} ${bgBarra} rounded-sm relative border border-slate-200`}
                >
                  <div
                    className="h-full rounded-l-sm transition-all duration-500"
                    style={{
                      width: `${larguraBarra}%`,
                      backgroundColor: corItem,
                    }}
                  />
                  <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${posMeta}%` }} />
                </div>

                {isTight ? (
                  <div className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                    Tempo Total:{' '}
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corItem }}>
                      {typeof (item as any)["Tempo Total (hh:mm)"] === 'string' && (item as any)["Tempo Total (hh:mm)"].length > 0
                        ? (item as any)["Tempo Total (hh:mm)"]
                        : hoursToHm(((item as any)["Tempo Total"] || 0))}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                    <span
                      className={`font-bold ${isTight ? 'text-[10px] leading-none' : isSpacious ? 'text-sm leading-none' : 'text-xs'}`}
                      style={{ color: corItem }}
                    >
                      {typeof (item as any)["Tempo Total (hh:mm)"] === 'string' && (item as any)["Tempo Total (hh:mm)"].length > 0
                        ? (item as any)["Tempo Total (hh:mm)"]
                        : hoursToHm(((item as any)["Tempo Total"] || 0))}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Tempo Total</span>
                  </div>
                )}

                <div className={`${isTight ? 'text-xs' : isSpacious ? 'text-base' : 'text-sm'} font-bold w-16 text-right`} style={{ color: corItem }}>
                  {typeof (item as any)["Tempo Médio (hh:mm)"] === 'string' && (item as any)["Tempo Médio (hh:mm)"].length > 0
                    ? (item as any)["Tempo Médio (hh:mm)"]
                    : secondsToMmSs(((item as any)["Tempo Médio"] || 0) * 3600)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
