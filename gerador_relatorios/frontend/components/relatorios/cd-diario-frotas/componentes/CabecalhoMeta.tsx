import React from 'react'
import { corPorMeta } from './cores'

interface CabecalhoMetaProps {
  meta: number
  media: number
  tipo: 'porcentagem' | 'horas'
  sufixoMedia?: string
  compact?: boolean
}

export function CabecalhoMeta({ meta, media, tipo, sufixoMedia = 'Média calculada excluindo valores 0%', compact = false }: CabecalhoMetaProps) {
  const formatarValor = (val: number) => {
    if (tipo === 'porcentagem') return `${val.toFixed(2)}%`
    // Para horas, assume que o valor vem em decimal (ex: 4.91 horas -> 4h55)
    const horas = Math.floor(val)
    const minutos = Math.round((val - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}`
  }

  const getCorMedia = () => {
    const c = corPorMeta(media, meta, false)
    if (c === '#48BB78') return 'text-[#48BB78]'
    if (c === '#9ACD32') return 'text-[#9ACD32]'
    if (c === '#FF8C00') return 'text-[#FF8C00]'
    return 'text-[#E53E3E]'
  }

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-md text-center ${compact ? "p-1 mb-2" : "p-2 mb-4"}`}>
      <div className="text-sm font-semibold text-slate-700">
        <span className="text-black">Meta: </span>
        <span className="text-[#008080] font-bold">{formatarValor(meta)}</span>
        <span className="mx-2 text-slate-400">|</span>
        <span className="text-black">Média: </span>
        <span className={`${getCorMedia()} font-bold`}>{formatarValor(media)}</span>
      </div>
      {sufixoMedia && (
        <div className={`${compact ? "text-[10px] text-slate-500 italic mt-0" : "text-[10px] text-slate-500 italic mt-0.5"}`}>
          * {sufixoMedia}
        </div>
      )}
    </div>
  )
}
