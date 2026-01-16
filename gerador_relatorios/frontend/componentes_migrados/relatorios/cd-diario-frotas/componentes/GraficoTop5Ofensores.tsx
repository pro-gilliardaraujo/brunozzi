import React from 'react'

interface ItemOfensor {
  nome: string
  percentual: number // %
  duracao: number // horas decimais
}

interface GraficoTop5OfensoresProps {
  dados: ItemOfensor[]
}

export function GraficoTop5Ofensores({ dados }: GraficoTop5OfensoresProps) {
  // Ordenar por percentual decrescente e pegar top 5
  const dadosProcessados = [...dados]
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 5)

  const maxPercentual = Math.max(...dadosProcessados.map(d => d.percentual), 0)
  
  // Altura de referência para o cálculo das barras (ajustado para caber no container)
  const ALTURA_REFERENCIA = 410
  
  // CONFIGURAÇÃO DE POSICIONAMENTO (Baseada em GraficoToneladasPorFrota)
  const PADDING_BOTTOM_LABEL = 20     
  const ALTURA_AREA_LABEL = 35        // Aumentado para acomodar nomes longos (wrap)
  const GAP_LABEL_COLUNA = 10         
  
  const BASE_COLUNA = PADDING_BOTTOM_LABEL + ALTURA_AREA_LABEL + GAP_LABEL_COLUNA

  // ESPAÇO SUPERIOR RESERVADO PARA OS TEXTOS (Porcentagem + Duração)
  const ESPACO_TEXTO_SUPERIOR = 60 

  const larguraColunaPx = 120
  
  const calcAlturaPx = (val: number) => {
    const alturaDisponivelColuna = ALTURA_REFERENCIA - BASE_COLUNA - ESPACO_TEXTO_SUPERIOR
    const h = (val / (maxPercentual || 1)) * alturaDisponivelColuna
    return Math.max(h, 6)
  }
  
  const DISTANCIA_TEXTO_COLUNA = 8  
  const GAP_ENTRE_TEXTOS = 2        

  const formatarHoras = (decimal: number) => {
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  return (
    <div className="h-full flex items-center">
      <div className="w-full h-full flex items-end justify-center gap-6">
        {dadosProcessados.map((item, index) => {
          const alturaPx = calcAlturaPx(item.percentual)
          
          const topoColuna = BASE_COLUNA + alturaPx
          
          const duracaoBottom = topoColuna + DISTANCIA_TEXTO_COLUNA
          const percBottom = duracaoBottom + 13 + GAP_ENTRE_TEXTOS
          
          const labelBottom = PADDING_BOTTOM_LABEL

          return (
            <div key={index} className="flex flex-col items-center h-full justify-end">
              <div className="relative h-full w-full" style={{ width: `${larguraColunaPx}px` }}>
                {/* Valor Porcentagem (Vermelho, Grande) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-bold whitespace-nowrap z-10 text-center"
                  style={{ 
                    color: '#E53E3E', 
                    bottom: `${percBottom}px`,
                    fontSize: '16px',
                    width: `${larguraColunaPx}px`,
                    lineHeight: '1'
                  }}
                >
                  {item.percentual.toFixed(2)}%
                </div>
                
                {/* Duração (Preto/Cinza, Pequeno) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-medium text-black whitespace-nowrap z-10 text-center"
                  style={{ 
                    bottom: `${duracaoBottom}px`,
                    fontSize: '11px',
                    width: `${larguraColunaPx}px`,
                    lineHeight: '1'
                  }}
                >
                  {formatarHoras(item.duracao)}
                </div>

                {/* Coluna Vermelha */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bg-[#E53E3E] rounded-sm transition-all duration-500 z-0"
                  style={{ width: `${larguraColunaPx}px`, bottom: `${BASE_COLUNA}px`, height: `${alturaPx}px` }}
                />

                {/* Rótulo do Ofensor */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-[10px] text-black text-center leading-tight flex items-start justify-center"
                  style={{ 
                    bottom: `${labelBottom}px`,
                    width: `${larguraColunaPx}px`,
                    height: `${ALTURA_AREA_LABEL}px`
                  }}
                >
                  {item.nome}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
