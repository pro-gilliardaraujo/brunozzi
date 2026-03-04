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
  unidade?: string
  tipoMeta?: 'asc' | 'desc'
}

export function GraficoMediaVelocidade({ 
  dados, 
  meta, 
  compact = true, 
  listrado = true, 
  unidade = 'km/h',
  tipoMeta = 'desc' // Default: Menor é melhor (padrão antigo de velocidade colhedora?) ou maior?
  // O original estava corPorMeta(..., true) -> Menor que meta = Verde.
  // Se tipoMeta = 'asc' -> Maior que meta = Verde.
}: GraficoMediaVelocidadeProps) {
  // Filtrar valores válidos (excluindo 0)
  const dadosValidos = dados.filter(d => d.velocidade > 0)
  
  // Calcular média total
  const somaVelocidades = dadosValidos.reduce((acc, curr) => acc + curr.velocidade, 0)
  const mediaTotal = dadosValidos.length > 0 ? somaVelocidades / dadosValidos.length : 0

  // Ordenar
  const dadosOrdenados = [...dados].sort((a, b) => {
      // Se maior é melhor, ordena descrescente (maior em cima)
      // Se menor é melhor, ordena crescente (menor em cima)
      // Mas o original ordenava a-b (crescente). Vamos manter flexivel ou padrão
      if (tipoMeta === 'asc') return b.velocidade - a.velocidade
      return a.velocidade - b.velocidade
  })

  const formatarValor = (val: number) => val.toFixed(2).replace('.', ',')

  // Definir escala máxima
  const maiorValor = Math.max(...dados.map(d => d.velocidade), 0)
  const maxEscala = Math.max(meta * 1.2, maiorValor * 1.1)
  
  // Posição da linha da meta em %
  const posMeta = Math.min((meta / maxEscala) * 100, 100)

  // Cor do cabeçalho baseada na média vs meta
  const isMetaAtingida = tipoMeta === 'desc' 
      ? mediaTotal <= meta 
      : mediaTotal >= meta

  const corMedia = isMetaAtingida ? '#48BB78' : '#E53E3E' // Verde ou Vermelho

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho de Metas */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          Meta: <span className="text-[#48BB78]">{formatarValor(meta)} {unidade}</span> | 
          Média: <span style={{ color: corMedia }}> {formatarValor(mediaTotal)} {unidade}</span>
        </div>
        <div className={`text-slate-500 italic ${compact ? "text-[10px] mt-0.5" : "text-xs mt-1"}`}>
          * Média calculada excluindo valores 0 {unidade}
        </div>
      </div>

      {/* Lista de Barras */}
      <div className={`flex flex-col flex-1 overflow-hidden relative ${compact ? "gap-1" : "gap-3"}`}>
        <div className="absolute top-0 bottom-0 left-0 right-0 overflow-y-auto pr-1">
        {dadosOrdenados.map((item, index) => {
          // Menor que a meta é melhor (inverso = true) se tipoMeta == 'desc'
          const corItem = corPorMeta(item.velocidade, meta, tipoMeta === 'desc')
          const larguraBarra = Math.min((item.velocidade / maxEscala) * 100, 100)
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div
              key={item.id}
              className={`flex flex-col mb-2 ${
                listrado ? `${index % 2 === 0 ? "bg-slate-100" : "bg-white"} rounded-sm px-2 py-1` : ""
              }`}
            >
              {/* Nome da Frota */}
              <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-0.5"}`}>{item.nome}</div>
              
              <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
                {/* Barra de Progresso */}
                <div className={`flex-1 ${compact ? "h-4" : "h-5"} ${bgBarra} rounded-sm relative border border-slate-200`}>
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
                  className="font-bold text-xs w-16 text-right"
                  style={{ color: corItem }}
                >
                  {formatarValor(item.velocidade)} {unidade}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
