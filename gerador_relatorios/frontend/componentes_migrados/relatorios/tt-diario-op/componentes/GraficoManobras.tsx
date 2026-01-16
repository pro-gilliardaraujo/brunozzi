import React from 'react'
import { corPorMeta } from '../../tt-diario-frotas/componentes/cores'

interface ItemManobra {
  Frota: number | string
  "Tempo Total (hh:mm)": string
  "Tempo Médio (hh:mm)": string
  "Intervalos Válidos": number
}

interface GraficoManobrasProps {
  dados: ItemManobra[]
  meta: number
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

function excelLikeToHours(timeStr: string): number {
  const m = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return 0
  const day = Number(m[3])
  const h = Number(m[4])
  const min = Number(m[5])
  const sec = Number(m[6])
  const totalHours = day * 24 + h + min / 60 + sec / 3600
  return totalHours
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

export function GraficoManobras({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows = 7,
  density = 'auto',
}: GraficoManobrasProps) {
  const dadosValidos = dados.filter(d => d["Intervalos Válidos"] > 0)
  const getMedioMinutes = (item: any): number => {
    const medioNum = item?.["Tempo Médio"]
    const medioStr = item?.["Tempo Médio (hh:mm)"]
    if (typeof medioNum === 'number' && isFinite(medioNum)) return medioNum
    if (typeof medioStr === 'string' && medioStr.length > 0) return Math.round(timeStringToSeconds(medioStr) / 60)
    return 0
  }
  const somaTemposMediosMin = dadosValidos.reduce((acc, curr) => acc + getMedioMinutes(curr), 0)
  const mediaGeralSeconds = dadosValidos.length > 0 ? (somaTemposMediosMin / dadosValidos.length) * 60 : 0
  const dadosOrdenados = [...dados].sort((a, b) => {
    const minA = getMedioMinutes(a as any)
    const minB = getMedioMinutes(b as any)
    return minA - minB
  })
  const maiorTempoMedio = Math.max(...dados.map(d => getMedioMinutes(d as any) * 60), 0)
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
  const BAR_H = compact ? (isTight ? 16 : 20) : 24
  const rowGapClass = compact ? (isTight ? 'gap-1' : 'gap-2') : 'gap-4'

  return (
    <div className="flex flex-col h-full">
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className="text-xs font-bold text-slate-700">
          Meta: <span className="text-[#48BB78]">{secondsToMmSs(meta)}</span> | 
          Média: <span style={{ color: corMedia }}>{secondsToMmSs(mediaGeralSeconds)}</span>
        </div>
        <div className="text-[10px] text-slate-500 italic mt-1">
          * Média calculada excluindo valores 0 min
        </div>
      </div>
      <div className={`flex flex-col flex-1 overflow-hidden ${rowGapClass}`}>
        {itensVisiveis.map((item, index) => {
          const valorSeconds = getMedioMinutes(item as any) * 60
          const corItem = corPorMeta(valorSeconds, meta, true)
          const larguraBarra = (valorSeconds / maxEscala) * 100
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"
          return (
            <div
              key={index}
              className={`flex flex-col min-w-0 ${
                listrado
                  ? `${index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm ${isTight ? 'px-1 py-0.5' : 'px-2 py-1'}`
                  : ''
              }`}
            >
              <div className={`font-bold ${isTight ? 'text-[11px] leading-tight truncate' : 'text-xs'} ${compact ? 'mb-0.5' : 'mb-1'}`}>
                {item.Frota}
              </div>
              <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
                {isTight ? (
                  <div className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                    Manobras:{' '}
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corItem }}>
                      {item['Intervalos Válidos']}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                    <span className={`font-bold ${isTight ? 'text-[10px] leading-none' : 'text-xs'}`} style={{ color: corItem }}>
                      {item['Intervalos Válidos']}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Manobras</span>
                  </div>
                )}
                <div
                  className={`${isTight ? 'w-[480px] flex-none' : 'flex-1'} ${compact ? (isTight ? 'h-4' : 'h-5') : 'h-6'} ${bgBarra} rounded-sm relative border border-slate-200`}
                >
                  <div className="h-full rounded-l-sm transition-all duration-500" style={{ width: `${larguraBarra}%`, backgroundColor: corItem }} />
                  <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${posMeta}%` }} />
                </div>
                {isTight ? (
                  <div className="text-[10px] font-medium text-slate-600 whitespace-nowrap">
                    Tempo Total:{' '}
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corItem }}>
                      {typeof (item as any)['Tempo Total'] === 'number' && isFinite((item as any)['Tempo Total'])
                        ? minutesToHm((item as any)['Tempo Total'])
                        : typeof (item as any)['Tempo Total (hh:mm)'] === 'string' &&
                          (item as any)['Tempo Total (hh:mm)'].length > 0
                        ? minutesToHm(excelLikeToMinutes((item as any)['Tempo Total (hh:mm)']))
                        : minutesToHm(0)}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                    <span className={`font-bold ${isTight ? 'text-[10px] leading-none' : 'text-xs'}`} style={{ color: corItem }}>
                      {typeof (item as any)['Tempo Total'] === 'number' && isFinite((item as any)['Tempo Total'])
                        ? minutesToHm((item as any)['Tempo Total'])
                        : typeof (item as any)['Tempo Total (hh:mm)'] === 'string' &&
                          (item as any)['Tempo Total (hh:mm)'].length > 0
                        ? minutesToHm(excelLikeToMinutes((item as any)['Tempo Total (hh:mm)']))
                        : minutesToHm(0)}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Tempo Total</span>
                  </div>
                )}
                <div className={`${isTight ? 'text-xs' : 'text-sm'} font-bold w-16 text-right`} style={{ color: corItem }}>
                  {secondsToMmSs(valorSeconds)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

