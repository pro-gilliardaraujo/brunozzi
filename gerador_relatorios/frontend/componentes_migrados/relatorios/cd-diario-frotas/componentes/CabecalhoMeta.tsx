import React from 'react'
import { corPorMeta } from './cores'

interface CabecalhoMetaProps {
  meta: number
  media: number
  tipo: 'porcentagem' | 'horas' | 'decimal'
  sufixoMedia?: string
  compact?: boolean
  inverse?: boolean // Se true, menor é melhor (ex: L/t)
}

export function CabecalhoMeta({ meta, media, tipo, sufixoMedia = 'Média calculada excluindo valores 0%', compact = false, inverse = false }: CabecalhoMetaProps) {
  const safeMeta = Number.isFinite(meta) ? meta : 0
  const safeMedia = Number.isFinite(media) ? media : 0

  const formatarValor = (val: number) => {
    const safeVal = Number.isFinite(val) ? val : 0
    if (tipo === 'porcentagem') return `${safeVal.toFixed(2)}%`
    if (tipo === 'decimal') return safeVal.toFixed(2)
    const horas = Math.floor(safeVal)
    const minutos = Math.round((safeVal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}`
  }

  const getCorMedia = () => {
    const c = corPorMeta(safeMedia, safeMeta, inverse)
    if (c === '#48BB78') return 'text-[#48BB78]'
    if (c === '#9ACD32') return 'text-[#9ACD32]'
    if (c === '#FF8C00') return 'text-[#FF8C00]'
    return 'text-[#E53E3E]'
  }

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-md text-center ${compact ? "p-1 mb-2" : "p-2 mb-4"}`}>
      <div className="text-sm font-semibold text-slate-700">
        <span className="text-black">Meta: </span>
        <span className="text-[#008080] font-bold">{formatarValor(safeMeta)}</span>
        <span className="mx-2 text-slate-400">|</span>
        <span className="text-black">Média: </span>
        <span className={`${getCorMedia()} font-bold`}>{formatarValor(safeMedia)}</span>
      </div>
      {sufixoMedia && (
        <div className={`${compact ? "text-[10px] text-slate-500 italic mt-0" : "text-[10px] text-slate-500 italic mt-0.5"}`}>
          * {sufixoMedia}
        </div>
      )}
    </div>
  )
}
