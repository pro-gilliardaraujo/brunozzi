import React from 'react'
import { corPorMeta } from './cores'

interface ItemMotorOcioso {
  id: string | number
  nome: string
  percentual: number // %
  tempoLigado: number // horas
  tempoOcioso: number // horas
}

interface GraficoMotorOciosoProps {
  dados: ItemMotorOcioso[]
  meta: number // %
  compact?: boolean
  listrado?: boolean
}

export function GraficoMotorOcioso({ dados, meta, compact = true, listrado = true }: GraficoMotorOciosoProps) {
  // Ordenar por percentual? Ou por nome? Na imagem parece nome (7038, 7032, 7037, 7036).
  // Vou manter a ordem original ou ordenar por nome se vier desordenado.
  // Vou assumir que já vem ordenado ou ordenar por percentual se fizer sentido. 
  // Na imagem, 0.38% (7038) -> 0.65% (7032) -> 0.95% (7037) -> 32.55% (7036). Crescente.
  const dadosOrdenados = [...dados].sort((a, b) => a.percentual - b.percentual)

  const formatarHorasMinutos = (decimal: number) => {
    if (typeof decimal !== 'number' || isNaN(decimal)) return "0h00m"
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  // Média total
  const mediaTotal = dados.length > 0 
    ? dados.reduce((acc, curr) => acc + curr.percentual, 0) / dados.length 
    : 0

  const isBom = mediaTotal <= meta
  const corMedia = isBom ? '#48BB78' : '#E53E3E'

  const formatarPercentual = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00'
    return val.toFixed(2)
  }

  return (
    <div className="flex flex-col w-full">
       {/* Cabeçalho */}
       <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className="text-sm font-bold text-slate-700">
          Meta: <span className="text-[#48BB78]">{formatarPercentual(meta)}%</span> | 
          Média: <span style={{ color: corMedia }}>{formatarPercentual(mediaTotal)}%</span>
        </div>
        <div className="text-xs text-slate-500 italic mt-1">
          * Média calculada excluindo valores 0 h motor
        </div>
      </div>

      <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
        {dadosOrdenados.map((item, index) => {
          // Menor que a meta é melhor (inverso = true)
          const corItem = corPorMeta(item.percentual, meta, true)
          
          // Largura da barra = percentual (limitado a 100%)
          // Na imagem, a barra preenche proporcionalmente ou é fixa?
          // Parece que a barra verde ocupa tudo se for bom, e vermelho se for ruim?
          // Não, a imagem mostra barras preenchidas.
          // O item 7036 (32.55%) tem uma barra vermelha curta. 
          // O item 7038 (0.38%) tem uma barra verde cheia.
          // ESPERA: Se "menor é melhor", então:
          // Se 0.38% (meta 4%), está excelente. Barra cheia verde?
          // Se 32.55% (meta 4%), está ruim. Barra vermelha curta? Ou barra vermelha longa indicando erro?
          // Observando a imagem fornecida pelo usuário:
          // 7038 (0.38%): Barra verde quase cheia.
          // 7036 (32.55%): Barra vermelha ocupando ~30% da largura.
          // Isso é contra-intuitivo se a barra representasse "eficiência".
          // Talvez represente "Disponibilidade" ou o inverso de ociosidade?
          // O título é "Motor Ocioso".
          // Se fosse ociosidade pura, 32% deveria ser uma barra maior que 0.38%.
          // Na imagem, a barra vermelha (32.55%) é MENOR que a verde (0.38%)?
          // Não, na imagem, a barra vermelha parece ocupar um pedaço da esquerda.
          // Ah, olhando bem a imagem (zoom mental):
          // 7038 (0.38%): Barra verde total.
          // 7036 (32.55%): Barra com um pedaço vermelho na esquerda e o resto verde?
          // Ou será que é "Tempo Produtivo" vs "Tempo Ocioso"?
          // Se "Tempo Ocioso" é ruim, ele deve ser minimizado.
          // Talvez a barra mostre (100% - Ocioso)?
          // 7038 (ocioso 0.38%) -> Produtivo 99.62% -> Barra verde cheia.
          // 7036 (ocioso 32.55%) -> Produtivo 67.45% -> Barra verde menor?
          // Mas na imagem a barra vermelha do 7036 ocupa ~1/3. O resto é verde?
          // Sim! Parece uma barra de progresso empilhada.
          // Vermelho = Ocioso, Verde = Produtivo?
          // E o texto diz "Meta: 4.00%".
          // Se a meta é max 4% ocioso.
          // Vou implementar como: Barra total = 100%.
          // Parte Ociosa = item.percentual (cor vermelha se > meta, ou sempre vermelha/laranja?).
          // Se a meta é ser baixo, talvez a barra represente o "Motor Ligado Útil"?
          // Vamos olhar labels: "Tempo Ocioso" (esq) e "Tempo Ligado" (dir).
          // Tempo Ligado = Tempo Total com motor ligado.
          // Tempo Ocioso = Parte desse tempo que foi ocioso.
          // Percentual = (Tempo Ocioso / Tempo Ligado) * 100.
          
          // Revisitando a imagem:
          // 7036: Barra tem uma parte vermelha à esquerda (~30%) e o resto verde.
          // 7038: Barra tem uma parte minúscula (preta/vermelha?) à esquerda e resto verde.
          // Conclusão: Barra representa o total (100% do tempo ligado).
          // Segmento 1 (Esq): % Ocioso. Cor: Vermelho (ou cor baseada na meta).
          // Segmento 2 (Dir): % Produtivo (ou restante). Cor: Verde.
          
          // Cor do segmento ocioso:
          // Se % <= meta (4%), é aceitável -> talvez verde escuro ou neutro? Ou a barra toda é verde pq está dentro da meta?
          // Na imagem 7038 (0.38% <= 4%) tem um risquinho preto/verde escuro no inicio.
          // Na imagem 7036 (32% > 4%) tem um blocão vermelho.
          // Então: Se ocioso > meta, pinta de vermelho a parte ociosa.
          // Se ocioso <= meta, pinta de neutro/verde a parte ociosa?
          
          // Vou assumir:
          // Barra de fundo: Verde (representando o ideal/produtivo).
          // Barra de sobreposição (esquerda): Ocioso.
          // Cor da sobreposição: Se % > meta -> Vermelho. Se % <= meta -> Verde Escuro ou Cinza?
          // Vou usar Vermelho se estourar a meta, e talvez um Laranja/Amarelo se estiver ok mas existir? Ou Vermelho sempre para "Perda"?
          // Geralmente "Ocioso" é perda, então vermelho faz sentido, mas se for pouco é aceitável.
          // Vou usar a lógica `corPorMeta`.
          
          const larguraOcioso = Math.min(Math.max(item.percentual, 0), 100)
          const isRuim = item.percentual > meta
          
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
              {/* Nome da Frota: Se compacto, inline (à esquerda) */}
              {!compact && <div className={`font-bold text-xs ${compact ? "mb-0.5" : "mb-1"}`}>{item.nome}</div>}
              
              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                
                {/* Se compacto, nome à esquerda */}
                {compact && (
                   <div className="font-bold text-xs w-10 text-center flex-shrink-0 self-center">{item.nome}</div>
                )}

                {/* Lado Esquerdo: Tempo Ocioso */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corItem }}>
                    {formatarHorasMinutos(item.tempoOcioso)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Tempo Ocioso
                  </span>
                </div>

                {/* Barra Combinada */}
                <div className={`flex-1 ${compact ? "h-5" : "h-6"} bg-[#48BB78] rounded-sm relative border border-slate-200 overflow-hidden`}>
                   {/* Barra Ocioso */}
                   <div 
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${larguraOcioso}%`,
                        backgroundColor: 'red'
                      }}
                   />
                   
                   {/* Linha da Meta */}
                   <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-black/60 z-10"
                      style={{ left: `${meta}%` }}
                    />
                </div>

                {/* Lado Direito: Tempo Ligado */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: '#48BB78' }}> {/* Sempre verde pois é tempo ligado? */}
                    {formatarHorasMinutos(item.tempoLigado)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500">
                    Tempo Ligado
                  </span>
                </div>

                {/* Valor Final Percentual */}
                <div className="font-bold text-sm w-16 text-right" style={{ color: corItem }}>
                  {item.percentual.toFixed(2)}%
                </div>

              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
