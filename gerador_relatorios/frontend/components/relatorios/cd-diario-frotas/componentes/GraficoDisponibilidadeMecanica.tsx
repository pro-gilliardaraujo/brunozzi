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

  // Média total (agora filtrada)
  const mediaTotal = dadosValidos.length > 0 
    ? dadosValidos.reduce((acc, curr) => acc + curr.disponibilidade, 0) / dadosValidos.length 
    : 0

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
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
              
              <div className="flex items-center gap-2">
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
                <div className={`flex-1 ${compact ? 'h-5' : 'h-6'} ${bgBarra} rounded-sm relative border border-slate-200`}>
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
                    style={{ left: `${meta}%` }}
                  />
                </div>

                {/* Lado Direito: Tempo Manutenção */}
                <div className="flex flex-col items-center w-20 min-w-[80px]">
                  <span className="font-bold text-xs" style={{ color: corItem }}>
                    {formatarHoras(item.tempoManutencao)}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600">
                    Tempo Manutenção
                  </span>
                </div>

                {/* Valor Final Disponibilidade */}
                <div 
                  className="font-bold text-sm w-16 text-right"
                  style={{ color: corItem }}
                >
                  {item.disponibilidade.toFixed(2)}%
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}
