import React from 'react'
import { corPorMeta } from "../cd-diario-frotas/componentes/cores"

interface ItemEficienciaTrator {
  id: string | number
  nome: string
  eficiencia: number
  horasMotor: number
  horasElevador: number
}

interface GraficoEficienciaTratorProps {
  dados: ItemEficienciaTrator[]
  meta: number
  compact?: boolean
  listrado?: boolean
}

export function GraficoEficienciaTrator({ dados, meta, compact = true, listrado = true }: GraficoEficienciaTratorProps) {
  const dadosOrdenados = [...dados].sort((a, b) => b.eficiencia - a.eficiencia)

  const formatarHoras = (decimal: number) => {
    if (typeof decimal !== "number" || isNaN(decimal)) return "0h00m"
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, "0")}m`
  }

  const getCor = (valor: number, metaRef: number) => corPorMeta(valor, metaRef, false)

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
      {dadosOrdenados.map((item, index) => {
        const corItem = getCor(item.eficiencia, meta)
        const bgContainer = listrado ? (index % 2 === 0 ? "bg-slate-100" : "bg-white") : ""
        const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"
        const larguraBarra = Math.min(item.eficiencia, 100)

        return (
          <div
            key={item.id}
            className={`flex flex-col ${bgContainer} rounded-sm px-2 py-1`}
          >
            {!compact && <div className="font-bold text-xs mb-1">{item.nome}</div>}

            <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
              {compact && (
                <div className="font-bold text-xs w-10 text-center flex-shrink-0 self-center">
                  {item.nome}
                </div>
              )}

              <div className="flex flex-col items-center w-20 min-w-[80px]">
                <span
                  className="font-bold text-xs"
                  style={{ color: corItem }}
                >
                  {formatarHoras(item.horasElevador)}
                </span>
                <span className="text-[9px] font-medium text-slate-600">
                  Horas Produtivas
                </span>
              </div>

              <div className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200`}>
                <div
                  className="h-full rounded-l-sm transition-all duration-500"
                  style={{
                    width: `${larguraBarra}%`,
                    backgroundColor: corItem,
                  }}
                />

                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10"
                  style={{ left: `${meta}%` }}
                />
              </div>

              <div className="flex flex-col items-center w-20 min-w-[80px]">
                <span
                  className="font-bold text-xs"
                  style={{ color: corItem }}
                >
                  {formatarHoras(item.horasMotor)}
                </span>
                <span className="text-[9px] font-medium text-slate-600">
                  Horas Motor
                </span>
              </div>

              <div
                className="font-bold text-sm w-16 text-right"
                style={{ color: corItem }}
              >
                {item.eficiencia.toFixed(2)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

