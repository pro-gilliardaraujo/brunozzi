import React from 'react'
import { corPorMeta } from '../shared/cores'

interface ItemTemperaturaCase {
  Frota: number | string
  temperaturaTransmissao: number
  temperaturaArrefecimento: number
  temperaturaArAdmissao?: number
}

interface GraficoTemperaturaCaseProps {
  dados: ItemTemperaturaCase[]
  meta: number
  compact?: boolean
  listrado?: boolean
  maxRows?: number
  /** Se fornecido, mostra apenas essa temperatura */
  campo?: 'temperaturaTransmissao' | 'temperaturaArrefecimento' | 'temperaturaArAdmissao'
  labelCampo?: string
}

export function GraficoTemperaturaCase({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows,
  campo,
  labelCampo,
}: GraficoTemperaturaCaseProps) {
  const dadosValidos = Array.isArray(dados)
    ? dados.filter(d => {
        if (campo) return (Number((d as any)[campo]) || 0) > 0
        return (d.temperaturaTransmissao || 0) > 0 || (d.temperaturaArrefecimento || 0) > 0 || (d.temperaturaArAdmissao || 0) > 0
      })
    : []

  const itens = typeof maxRows === 'number' ? dadosValidos.slice(0, Math.max(0, maxRows)) : dadosValidos

  const getVal = (d: ItemTemperaturaCase) => {
    if (campo) return Number((d as any)[campo]) || 0
    return Math.max(d.temperaturaTransmissao || 0, d.temperaturaArrefecimento || 0, d.temperaturaArAdmissao || 0)
  }

  const maiorTemperatura = itens.length > 0 ? Math.max(...itens.map(getVal)) : 0
  const maxEscala = Math.max(meta * 1.2, maiorTemperatura * 1.1)
  const posMeta = (meta / maxEscala) * 100

  return (
    <div className="flex flex-col w-full h-full">
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`${compact ? "text-xs" : "text-sm"} font-bold text-slate-700`}>
          {labelCampo ? <>{labelCampo} — </> : null}Meta: <span className="text-[#48BB78]">{meta.toFixed(1)} °C</span>
        </div>
      </div>

      <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"} flex-1 overflow-hidden`}>
        {itens.map((item, index) => {
          if (campo) {
            const val = Number((item as any)[campo]) || 0
            const cor = corPorMeta(val, meta, false)
            const largura = Math.min(Math.max(val / maxEscala * 100, 0), 100)
            const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"
            return (
              <div key={`${item.Frota}-${index}`} className={`flex flex-col ${listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""}`}>
                <div className={`font-bold ${compact ? "text-xs" : "text-sm"} ${compact ? "mb-0.5" : "mb-1"}`}>{item.Frota}</div>
                <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                  <div className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200`}>
                    <div className="h-full rounded-l-sm transition-all duration-500" style={{ width: `${largura}%`, backgroundColor: cor }} />
                    <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${posMeta}%` }} />
                  </div>
                  <div className="font-bold text-sm w-20 text-right" style={{ color: cor }}>
                    {val.toFixed(1)} °C
                  </div>
                </div>
              </div>
            )
          }

          // Multi-temperatura (legacy)
          const corTrans = corPorMeta(item.temperaturaTransmissao || 0, meta, false)
          const corArref = corPorMeta(item.temperaturaArrefecimento || 0, meta, false)
          const larguraTrans = Math.min(Math.max((item.temperaturaTransmissao || 0) / maxEscala * 100, 0), 100)
          const larguraArref = Math.min(Math.max((item.temperaturaArrefecimento || 0) / maxEscala * 100, 0), 100)
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={`${item.Frota}-${index}`}
              className={`flex flex-col ${listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""}`}
            >
              <div className={`font-bold ${compact ? "text-xs" : "text-sm"} ${compact ? "mb-0.5" : "mb-1"}`}>{item.Frota}</div>
              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corTrans }}>
                    {(item.temperaturaTransmissao || 0).toFixed(1)} °C
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">Transmissão</span>
                </div>
                <div className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200 flex overflow-hidden`}>
                  <div className="h-full transition-all duration-500" style={{ width: `${larguraTrans}%`, backgroundColor: corTrans }} />
                  <div className="h-full transition-all duration-500" style={{ width: `${larguraArref}%`, backgroundColor: corArref }} />
                  <div className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10" style={{ left: `${posMeta}%` }} />
                </div>
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corArref }}>
                    {(item.temperaturaArrefecimento || 0).toFixed(1)} °C
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">Arrefecimento</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
