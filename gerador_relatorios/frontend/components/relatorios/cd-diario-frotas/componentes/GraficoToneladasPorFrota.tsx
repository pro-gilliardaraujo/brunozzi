import React from 'react'

interface ItemProducao {
  id: string | number
  nome: string
  producao: number
}

interface GraficoToneladasPorFrotaProps {
  dados: ItemProducao[]
}

export function GraficoToneladasPorFrota({ dados }: GraficoToneladasPorFrotaProps) {
  const lista = Array.isArray(dados) ? dados : []
  const dadosOrdenados = [...lista].sort((a, b) => b.producao - a.producao)
  const total = dadosOrdenados.reduce((acc, cur) => acc + (cur.producao || 0), 0)
  const maxValor = Math.max(...dadosOrdenados.map(d => d.producao), 0)

  // Altura de referência para o cálculo das barras (não define altura do container, apenas a escala interna)
  // Reduzido para garantir que caiba no espaço disponível (~300-340px) com folga superior
  const ALTURA_REFERENCIA = 410
  
  // CONFIGURAÇÃO DE POSICIONAMENTO
  // A label (nome da frota) é ancorada no fundo do container (respeitando padding)
  // A coluna começa ACIMA da label + gap
  const PADDING_BOTTOM_LABEL = 20     // Distância fixa da label para o fundo do container
  const ALTURA_AREA_LABEL = 20        // Espaço vertical reservado para a label (altura da fonte aprox)
  const GAP_LABEL_COLUNA = 10         // Espaço entre o topo da label e o início da coluna
  
  // Onde a coluna começa (Base) = Padding + AlturaLabel + Gap
  const BASE_COLUNA = PADDING_BOTTOM_LABEL + ALTURA_AREA_LABEL + GAP_LABEL_COLUNA

  // ESPAÇO SUPERIOR RESERVADO PARA OS TEXTOS (Produção + Porcentagem + Gaps)
  const ESPACO_TEXTO_SUPERIOR = 60 

  // Largura visual de cada coluna (ajusta proporção e espaçamento)
  // Removido largura fixa (120px) em favor de layout flexível
  const calcAlturaPx = (val: number) => {
    // Altura da barra em pixels, proporcional ao máximo
    const alturaDisponivelColuna = ALTURA_REFERENCIA - BASE_COLUNA - ESPACO_TEXTO_SUPERIOR
    const h = (val / (maxValor || 1)) * alturaDisponivelColuna
    return Math.max(h, 6)
  }
  
  // Distâncias FIXAS em relação ao topo da coluna
  const DISTANCIA_TEXTO_COLUNA = 8  // Distância do bloco de texto para o topo da coluna
  const GAP_ENTRE_TEXTOS = 2        // Distância entre valor e porcentagem

  const formatarTon = (val: number) => `${val.toFixed(2).replace('.', ',')} t`
  const formatarPerc = (val: number) => `${val.toFixed(1).replace('.', ',')}%`
  
  // Ajustes dinâmicos baseados na quantidade de itens
  const qtdItens = dadosOrdenados.length
  const isCrowded = qtdItens > 8
  const fontSizeValor = isCrowded ? '12px' : '16px'
  const fontSizePerc = isCrowded ? '10px' : '13px'
  const fontSizeLabel = isCrowded ? '10px' : '12px'

  return (
    <div className="h-full w-full flex items-center px-4">
      {/* Container flexível que ocupa a altura disponível e distribui itens */}
      <div className="w-full h-full flex items-end justify-between gap-2">
        {dadosOrdenados.map((item) => {
          const perc = total > 0 ? (item.producao / total) * 100 : 0
          const alturaPx = calcAlturaPx(item.producao)
          
          // Posição base: Topo da coluna
          const topoColuna = BASE_COLUNA + alturaPx
          
          // Posicionamento FIXO relativo ao topo da coluna
          const percBottom = topoColuna + DISTANCIA_TEXTO_COLUNA
          const valorBottom = percBottom + (isCrowded ? 10 : 13) + GAP_ENTRE_TEXTOS
          
          // A label tem posição fixa relativa ao fundo do container
          const labelBottom = PADDING_BOTTOM_LABEL

          return (
            // Flex-1 permite que as colunas ocupem espaço igual. Max-width impede que fiquem gigantes.
            <div key={item.id} className="flex flex-col items-center h-full justify-end flex-1 max-w-[120px]">
              {/* Container da coluna relativo ao item flex */}
              <div className="relative h-full w-full">
                {/* Valor final em verde */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-bold whitespace-nowrap z-10 text-center"
                  style={{ 
                    color: '#48BB78', 
                    bottom: `${valorBottom}px`,
                    fontSize: fontSizeValor,
                    width: '100%',
                    lineHeight: '1'
                  }}
                >
                  {formatarTon(item.producao)}
                </div>
                {/* Porcentagem relativa ao total */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-medium text-slate-600 whitespace-nowrap z-10 text-center"
                  style={{ 
                    bottom: `${percBottom}px`,
                    fontSize: fontSizePerc,
                    width: '100%',
                    lineHeight: '1'
                  }}
                >
                  {formatarPerc(perc)}
                </div>
                {/* Coluna única (sem fundo fantasma) preenchendo do rodapé até a altura calculada */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bg-[#48BB78] rounded-sm transition-all duration-500 z-0"
                  style={{ width: '80%', bottom: `${BASE_COLUNA}px`, height: `${alturaPx}px` }}
                />
                {/* Rótulo da frota fora da coluna, próximo à base (ligeiramente abaixo da base) */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-bold text-black whitespace-nowrap"
                  style={{ bottom: `${labelBottom}px`, fontSize: fontSizeLabel }}
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

