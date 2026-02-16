import React from 'react'

interface CabecalhoProducaoProps {
  producaoTotal: number
  mediaPorEquipamento: number
  tphDia: number
  sufixoMedia?: string
}

export function CabecalhoProducao({ producaoTotal, mediaPorEquipamento, tphDia, sufixoMedia = 'Média calculada excluindo valores 0 t' }: CabecalhoProducaoProps) {
  // Mantém formatação numérica fixando 2 casas e evitando quebra de linha
  const formatarToneladas = (val: number) => `${val.toFixed(2).replace('.', ',')} t`
  const formatarTPH = (val: number) => `${val.toFixed(2).replace('.', ',')} T/h`

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-2 mb-4 text-center">
      {/* Linha principal sem quebra de texto para manter tudo em uma única linha */}
      <div className="text-sm font-semibold text-slate-700 whitespace-nowrap">
        <span className="text-black">Produção: </span>
        <span className="text-[#008080] font-bold">{formatarToneladas(producaoTotal)}</span>
        <span className="mx-2 text-slate-400">|</span>
        <span className="text-black">Média: </span>
        <span className="text-black font-bold">{formatarToneladas(mediaPorEquipamento)}</span>
        <span className="mx-2 text-slate-400">|</span>
        <span className="text-black">T/h: </span>
        <span className="text-black font-bold">{formatarTPH(tphDia)}</span>
      </div>
      {sufixoMedia && (
        // Observação secundária separada, podendo quebrar linha
        <div className="text-[10px] text-slate-500 italic mt-0.5">
          * {sufixoMedia}
        </div>
      )}
    </div>
  )
}
