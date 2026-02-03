import React, { useState } from 'react'
import { corPorMeta } from './cores'

interface ItemDisponibilidade {
  id: string | number
  nome: string
  disponibilidade: number // %
  horasMotor: number // horas
  tempoManutencao: number // horas
}

interface GraficoDisponibilidadeMecanicaProps {
  dados: ItemDisponibilidade[]
  meta: number
  compact?: boolean
}

export function GraficoDisponibilidadeMecanica({ dados, meta, compact = false }: GraficoDisponibilidadeMecanicaProps) {
  // Ordenar por disponibilidade (maior para menor)
  const dadosOrdenados = [...dados].sort((a, b) => b.disponibilidade - a.disponibilidade)

  const formatarHoras = (decimal: number) => {
    if (typeof decimal !== 'number' || isNaN(decimal)) return "0h00m"
    const horas = Math.floor(decimal)
    const minutos = Math.round((decimal - horas) * 60)
    return `${horas}h${minutos.toString().padStart(2, '0')}m`
  }

  // Filtrar valores zerados para média se necessário, ou manter lógica atual. 
  // O usuário pediu o texto "excluindo valores 0h0m", então vamos filtrar.
  // Assumindo que "valores 0h0m" se refere a horasMotor ou disponibilidade? 
  // Geralmente disponibilidade mecânica é calculada baseada em horas.
  // Se horasMotor == 0, talvez não deva entrar na conta?
  // O código anterior fazia média simples. Vamos ajustar para filtrar se horasMotor > 0 ou disponibilidade > 0?
  // O texto diz "excluindo valores 0h0m", que parece formato de hora. 
  // Vou filtrar itens com horasMotor > 0.
  const dadosValidos = dados.filter(d => d.horasMotor > 0)

  const formatarPercentual = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00'
    return val.toFixed(2)
  }

  // Média total (agora filtrada)
  const mediaTotal = dadosValidos.length > 0 
    ? dadosValidos.reduce((acc, curr) => acc + curr.disponibilidade, 0) / dadosValidos.length 
    : 0

  return (
    <div className="flex flex-col w-full">
      {/* Cabeçalho */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-2 mb-4 text-center">
        <div className="text-sm font-semibold text-slate-700">
          <span className="text-black">Meta: </span>
          <span className="text-[#48BB78] font-bold">{formatarPercentual(meta)}%</span>
          <span className="mx-2 text-slate-400">|</span>
          <span className="text-black">Média: </span>
          <span className="font-bold" style={{ color: mediaTotal >= meta ? '#48BB78' : mediaTotal >= meta * 0.9 ? '#ECC94B' : '#E53E3E' }}>
            {formatarPercentual(mediaTotal)}%
          </span>
        </div>
        <div className="text-[10px] text-slate-500 italic mt-0.5">
          * Média calculada excluindo valores 0h0m
        </div>
      </div>

      <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-6'}`}>
        {dadosOrdenados.map((item, index) => {
          const corItem = corPorMeta(item.disponibilidade, meta, false)
          const larguraBarra = Math.min(item.disponibilidade, 100)
          
          // Padrão Zebra:
          // Item par (0): Fundo Cinza (slate-100)
          // Item ímpar (1): Fundo Branco
          const bgContainer = index % 2 === 0 ? "bg-slate-100" : "bg-white"
          const bgBarra = index % 2 === 0 ? "bg-white" : "bg-slate-100"

          return (
            <div key={item.id} className={`flex flex-col ${bgContainer} rounded-sm px-2 ${compact ? 'py-1' : 'py-2'}`}>
              {/* Nome da Frota: Se compacto, inline (à esquerda) se possível ou menor? O user pediu "à esquerda do item". 
                  Isso implica mudar o layout de coluna (nome em cima) para linha (nome ao lado).
              */}
              {!compact && <div className="font-bold text-xs mb-1">{item.nome}</div>}
              
              <div className="flex items-center gap-4">
                {/* Se compacto, nome à esquerda */}
                {compact && (
                   <div className="font-bold text-xs w-10 text-center flex-shrink-0 self-center">{item.nome}</div>
                )}

                {/* Lado Esquerdo: Horas Motor */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corItem }}>
                    {formatarHoras(item.horasMotor)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Horas Motor
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className={`flex-1 relative ${compact ? 'mt-3 mb-3' : 'mt-4 mb-4'}`}> 
                  {/* Container da Barra */}
                  <div className={`h-6 ${bgBarra} rounded-sm relative border border-slate-200 overflow-visible`}>
                    {/* Barra Colorida */}
                    <div 
                      className="h-full rounded-l-sm transition-all duration-500 relative"
                      style={{ 
                        width: `${larguraBarra}%`,
                        backgroundColor: corItem
                      }}
                    >
                      {/* Linha vertical no fim da barra preenchida (opcional) */}
                      <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-black/20" />
                    </div>
                    
                    {/* Linha da Meta */}
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-black/40 z-0"
                      style={{ left: `${meta}%` }}
                    />

                    {/* Valor Porcentagem Acompanhando (Sempre Ativo) */}
                    <div 
                      className="absolute bottom-[100%] mb-1 font-bold text-[13px] whitespace-nowrap"
                      style={{ 
                        left: `${larguraBarra}%`,
                        color: corItem 
                      }}
                    >
                      {formatarPercentual(item.disponibilidade).replace('.', ',')}%
                    </div>
                  </div>

                  {/* Labels da Barra (0%, Meta, 100%) */}
                  <div className="absolute top-full mt-1 w-full text-[9px] font-medium text-slate-400 h-4 pointer-events-none">
                    <span className="absolute left-0">0%</span>
                    {/* Meta alinhada à esquerda da linha (translateX -100% menos um paddingzinho se quiser, mas -100% cola o final do texto na linha) */}
                    {/* O usuário pediu para o % alinhar à esquerda da barra de meta. 
                        Isso significa que o texto deve ficar inteiramente à esquerda da linha.
                        style={{ left: `${meta}%`, transform: 'translateX(-100%)' }} faz exatamente isso.
                        Adicionando um pequeno margin-right para não colar na linha se desejar, mas o user disse "alinhe a esquerda da barra de meta".
                    */}
                    <span 
                      className="absolute transform -translate-x-full pr-1 whitespace-nowrap" 
                      style={{ left: `${meta}%` }}
                    >
                      Meta: {meta}%
                    </span>
                    <span className="absolute right-0">100%</span>
                  </div>
                </div>

                {/* Lado Direito: Tempo Manutenção */}
                <div className="flex flex-col items-center w-24 min-w-[90px]">
                  <span className="font-bold text-xs" style={{ color: corItem }}>
                    {formatarHoras(item.tempoManutencao)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 text-center">
                    Tempo Manutenção
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
