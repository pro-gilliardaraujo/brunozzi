import React from 'react'
import { corPorMeta } from './cores'

interface ItemVelocidade {
  id: string | number
  nome: string
  velocidade: number
}

interface GraficoMediaVelocidadeProps {
  dados: ItemVelocidade[]
  meta: number
  compact?: boolean
  listrado?: boolean
  maxRows?: number
  density?: 'auto' | 'normal' | 'tight'
}

export function GraficoMediaVelocidade({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows,
  density = 'auto',
}: GraficoMediaVelocidadeProps) {
  // Filtrar valores válidos (excluindo 0)
  const dadosValidos = dados.filter(d => d.velocidade > 0)
  
  // Calcular média total
  const somaVelocidades = dadosValidos.reduce((acc, curr) => acc + curr.velocidade, 0)
  const mediaTotal = dadosValidos.length > 0 ? somaVelocidades / dadosValidos.length : 0

  // Ordenar por nome da frota (crescente) ou por velocidade? 
  // O layout parece estar ordenado por nome (7036, 7037, 7038, 7032) ou valor?
  // Na imagem: 7036 (3.69), 7037 (5.01), 7038 (5.28), 7032 (5.71). 
  // Parece ordenado por valor crescente.
  const dadosOrdenados = [...dados].sort((a, b) => a.velocidade - b.velocidade)
  const itens = typeof maxRows === 'number' ? dadosOrdenados.slice(0, Math.max(0, maxRows)) : dadosOrdenados
  const densidade = typeof maxRows === 'number' && maxRows > 0 ? itens.length / maxRows : 0
  const isTight = density === 'tight' || (density === 'auto' && typeof maxRows === 'number' && densidade >= 0.75)

  const formatarValor = (val: number) => val.toFixed(2).replace('.', ',')

  // Definir escala máxima
  const maiorValor = Math.max(...dados.map(d => d.velocidade), 0)
  const maxEscala = Math.max(meta * 1.2, maiorValor * 1.1)
  
  // Posição da linha da meta em %
  const posMeta = (meta / maxEscala) * 100

  // Cor do cabeçalho baseada na média vs meta
  // Se média < meta -> verde (bom), pois "menor que a meta melhor"
  const isMetaAtingida = mediaTotal <= meta
  const corMedia = isMetaAtingida ? '#48BB78' : '#E53E3E' // Verde ou Vermelho

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho de Metas */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          Meta: <span className="text-[#48BB78]">{formatarValor(meta)} km/h</span> | 
          Média: <span style={{ color: corMedia }}> {formatarValor(mediaTotal)} km/h</span>
        </div>
        <div className={`text-slate-500 italic ${compact ? "text-[10px] mt-0.5" : "text-xs mt-1"}`}>
          * Média calculada excluindo valores 0 km/h
        </div>
      </div>

      {/* Lista de Barras */}
      <div className={`flex flex-col flex-1 ${compact ? `${isTight ? 'gap-1' : 'gap-2'} overflow-hidden` : 'gap-4 overflow-auto'}`}>
        {itens.map((item, index) => {
          // Menor que a meta é melhor (inverso = true)
          const corItem = corPorMeta(item.velocidade, meta, true)
          const larguraBarra = (item.velocidade / maxEscala) * 100
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={item.id}
              className={`flex flex-col min-w-0 ${
                listrado
                  ? `${index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm ${isTight ? 'px-1 py-0.5' : 'px-2 py-1'}`
                  : ''
              }`}
            >
              {/* Nome da Frota */}
              <div className={`font-bold ${isTight ? 'text-[11px] leading-tight truncate' : 'text-xs'} ${compact ? 'mb-0.5' : 'mb-1'}`}>
                {item.nome}
              </div>
              
              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                {/* Barra de Progresso */}
                <div className={`flex-1 ${compact ? (isTight ? 'h-4' : 'h-5') : 'h-6'} ${bgBarra} rounded-sm relative border border-slate-200`}>
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
                  className={`${isTight ? 'text-xs' : 'text-sm'} font-bold w-20 text-right`}
                  style={{ color: corItem }}
                >
                  {formatarValor(item.velocidade)} km/h
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
