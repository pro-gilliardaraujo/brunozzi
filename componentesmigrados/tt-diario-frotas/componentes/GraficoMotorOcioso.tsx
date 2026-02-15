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
  maxRows?: number
  density?: 'auto' | 'normal' | 'tight'
}

export function GraficoMotorOcioso({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows,
  density = 'auto',
}: GraficoMotorOciosoProps) {
  // Ordenar por percentual? Ou por nome? Na imagem parece nome (7038, 7032, 7037, 7036).
  // Vou manter a ordem original ou ordenar por nome se vier desordenado.
  // Vou assumir que já vem ordenado ou ordenar por percentual se fizer sentido. 
  // Na imagem, 0.38% (7038) -> 0.65% (7032) -> 0.95% (7037) -> 32.55% (7036). Crescente.
  const dadosOrdenados = [...dados].sort((a, b) => a.percentual - b.percentual)

  const formatarHorasMinutos = (decimal: number) => {
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
  const itens = typeof maxRows === 'number' ? dadosOrdenados.slice(0, Math.max(0, maxRows)) : dadosOrdenados
  const densidade = typeof maxRows === 'number' && maxRows > 0 ? itens.length / maxRows : 1
  const isTight = density === 'tight' || (density === 'auto' && typeof maxRows === 'number' && densidade >= 0.75)
  const isSpacious = density === 'auto' && typeof maxRows === 'number' && densidade <= 0.35
  const isConstrained = typeof maxRows === 'number'

  return (
    <div className="flex flex-col w-full h-full">
       {/* Cabeçalho */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className="text-sm font-bold text-slate-700">
          Meta: <span className="text-[#48BB78]">{meta.toFixed(2)}%</span> | 
          Média: <span style={{ color: corMedia }}>{mediaTotal.toFixed(2)}%</span>
        </div>
        <div className="text-xs text-slate-500 italic mt-1">
          * Média calculada excluindo valores 0 h motor
        </div>
      </div>

      <div
        className={`flex flex-col ${isConstrained ? 'flex-1 overflow-hidden' : ''} ${
          compact ? (isTight ? 'gap-1' : isSpacious ? 'gap-3' : 'gap-2') : 'gap-4'
        }`}
      >
        {itens.map((item, index) => {
          // Menor que a meta é melhor (inverso = true)
          const corValor = corPorMeta(item.percentual, meta, true)
          const corBarraOcioso = '#E53E3E'
          const bgBarra = listrado && index % 2 === 0 ? "bg-white" : "bg-slate-100"
          
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
          
          const percentualOcioso = Math.min(item.percentual, 100)
          const percentualProdutivo = 100 - percentualOcioso
          
          // Cor do ocioso:
          // Se percentual <= meta -> cor boa (talvez cinza/laranja suave?) ou o inverso?
          // Geralmente ocioso é ruim.
          // Se > meta -> Vermelho forte.
          // Se <= meta -> Laranja/Amarelo ou Neutro?
          // Vou usar corPorMeta mas invertido?
          // corPorMeta(val, meta, true) retorna Verde se val <= meta, Vermelho se val > meta.
          // Mas eu quero pintar a barra de OCIOSO. Se for verde, parece bom.
          // Se for verde, significa que o "ocioso" é bom? Não.
          // Acho melhor: 
          // Barra Produtiva (Verde)
          // Barra Ociosa (Vermelha se > Meta, Laranja se <= Meta?)
          
          // Vou simplificar: Barra Ociosa sempre vermelha/laranja.
          // Se ocioso <= meta -> Laranja (aceitável).
          // Se ocioso > meta -> Vermelho (ruim).
          
          return (
            <div
              key={item.id}
              className={`flex flex-col min-w-0 ${
                listrado
                  ? `${index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} rounded-sm ${
                      isTight ? 'px-1 py-0.5' : isSpacious ? 'px-3 py-2' : 'px-2 py-1'
                    }`
                  : ''
              }`}
            >
              <div
                className={`font-bold ${
                  isTight ? 'text-[11px] leading-tight truncate' : isSpacious ? 'text-sm leading-tight truncate' : 'text-xs'
                } ${compact ? 'mb-0.5' : 'mb-1'}`}
              >
                {item.nome}
              </div>
              
              <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2"}`}>
                {/* Lado Esquerdo: Tempo Ocioso */}
                {isTight ? (
                  <div className="flex items-center justify-between w-[110px] min-w-[110px] gap-2">
                    <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">Motor Ocioso: </span>
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoOcioso)}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                    <span
                      className={`font-bold ${isTight ? 'text-[10px] leading-none' : 'text-xs'}`}
                      style={{ color: corValor }}
                    >
                      {formatarHorasMinutos(item.tempoOcioso)}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Tempo Ocioso</span>
                  </div>
                )}

                <div
                  className={`flex-1 ${isTight ? 'min-w-[410px] max-w-[410px]' : ''} ${
                    compact ? (isTight ? 'h-4' : isSpacious ? 'h-6' : 'h-5') : 'h-6'
                  } ${bgBarra} rounded-sm relative border border-slate-200 flex overflow-hidden`}
                >
                  <div className="h-full transition-all duration-500" style={{ width: `${percentualOcioso}%`, backgroundColor: corBarraOcioso }} />
                  <div className="h-full bg-[#48BB78] transition-all duration-500" style={{ width: `${percentualProdutivo}%` }} />
                  <div className="absolute top-0 bottom-0 w-[3px] bg-black/60 z-10" style={{ left: `${meta}%` }} />
                </div>

                {/* Lado Direito: Tempo Ligado */}
                {isTight ? (
                  <div className="flex items-center justify-between w-[110px] min-w-[110px] gap-2">
                    <span className="text-[10px] font-medium text-slate-600 whitespace-nowrap">Motor Ligado: </span>
                    <span className="font-bold text-[10px] whitespace-nowrap" style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoLigado)}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center ${isTight ? 'w-16 min-w-[64px]' : 'w-20 min-w-[80px]'}`}>
                    <span className={`font-bold ${isTight ? 'text-[10px] leading-none' : 'text-xs'}`} style={{ color: corValor }}>
                      {formatarHorasMinutos(item.tempoLigado)}
                    </span>
                    <span className="text-[9px] font-medium text-slate-600">Tempo Ligado</span>
                  </div>
                )}

                {/* Valor Final Percentual */}
                <div 
                  className={`${isTight ? 'text-xs' : isSpacious ? 'text-base' : 'text-sm'} font-bold w-16 text-right`}
                  style={{ color: corValor }}
                >
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
