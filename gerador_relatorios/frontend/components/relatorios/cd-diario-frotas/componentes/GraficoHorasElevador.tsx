import React from 'react'
import { corPorMeta } from './cores'

interface ItemHoras {
  id: string | number
  nome: string
  horas: number
}

interface GraficoHorasElevadorProps {
  dados: ItemHoras[]
  meta: number
  compact?: boolean
  listrado?: boolean
}

export function GraficoHorasElevador({ dados, meta, compact = true, listrado = true }: GraficoHorasElevadorProps) {
  // Ordenar por horas (maior para menor)
  const dadosOrdenados = [...dados].sort((a, b) => b.horas - a.horas)

  const formatarHoras = (decimal: number) => {
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}`
  }

  const getCor = (valor: number, metaRef: number) => corPorMeta(valor, metaRef, false)

  // Definir escala máxima (Meta + 20% ou o maior valor + 10%)
  const maiorValor = Math.max(...dados.map(d => d.horas), 0)
  const maxEscala = Math.max(meta * 1.2, maiorValor * 1.1)
  
  // Posição da linha da meta em %
  const posMeta = (meta / maxEscala) * 100

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
      {dadosOrdenados.map((item, index) => {
        const corItem = getCor(item.horas, meta)
        const larguraBarra = (item.horas / maxEscala) * 100
        
        // Padrão Uso GPS:
        // Item par (0): Fundo Cinza (slate-100), Barra Branca
        // Item ímpar (1): Fundo Branco, Barra Cinza (slate-100)
        const bgContainer = listrado ? (index % 2 === 0 ? "bg-slate-100" : "bg-white") : ""
        const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

        return (
          <div
            key={item.id}
            className={`flex flex-col ${bgContainer} rounded-sm px-2 py-1`}
          >
            {/* Nome da Frota */}
            <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-1"}`}>{item.nome}</div>
            
            <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
              {/* Ícone ou Espaço Esquerdo (para alinhar visualmente com o outro gráfico se necessário) */}
              <div className="w-4">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: corItem }}
                />
              </div>

              {/* Barra de Progresso */}
              <div className={`flex-1 ${compact ? "h-5" : "h-6"} ${bgBarra} rounded-sm relative border border-slate-200`}>
                {/* Barra Colorida */}
                <div 
                  className="h-full rounded-l-sm transition-all duration-500"
                  style={{ 
                    width: `${larguraBarra}%`,
                    backgroundColor: corItem
                  }}
                />
                
                {/* Linha da Meta */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10"
                  style={{ left: `${posMeta}%` }}
                />
              </div>

              {/* Valor Final */}
              <div 
                className="font-bold text-sm w-16 text-right"
                style={{ color: corItem }}
              >
                {formatarHoras(item.horas)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
