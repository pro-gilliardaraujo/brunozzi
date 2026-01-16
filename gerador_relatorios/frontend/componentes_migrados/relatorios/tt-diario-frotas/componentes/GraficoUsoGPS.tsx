import React from 'react'
import { corPorMeta } from './cores'

interface ItemUsoGPS {
  id: string | number
  nome: string
  porcentagem: number
}

interface GraficoUsoGPSProps {
  dados: ItemUsoGPS[]
  meta: number
  compact?: boolean
  listrado?: boolean
}

export function GraficoUsoGPS({ dados, meta, compact = true, listrado = true }: GraficoUsoGPSProps) {
  const lista = Array.isArray(dados) ? dados : []
  const dadosOrdenados = [...lista].sort((a, b) => b.porcentagem - a.porcentagem)
  
  // Função para garantir que o valor da barra esteja entre 0 e 100 para o width
  const larguraBarra = (val: number) => Math.min(Math.max(val, 0), 100)

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>

      {dadosOrdenados.map((item, index) => {
        const corItem = corPorMeta(item.porcentagem, meta, false)
        const largura = larguraBarra(item.porcentagem)
        const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

        return (
          <div
            key={item.id}
            className={`flex flex-col ${
              listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""
            }`}
          >
            <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-1"}`}>{item.nome}</div>
            <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
              <div className="w-4">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: corItem }} />
              </div>
              <div
                className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200 ${
                  compact ? "" : "mt-3 mb-1"
                }`}
              >
                <div
                  className="h-full rounded-l-sm transition-all duration-500"
                  style={{
                    width: `${largura}%`,
                    backgroundColor: corItem
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10"
                  style={{ left: `${meta}%` }}
                />
              </div>
              <div className="font-bold text-sm w-16 text-right" style={{ color: corItem }}>
                {item.porcentagem.toFixed(2)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
