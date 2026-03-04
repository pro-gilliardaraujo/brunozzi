import React from 'react'
import { corPorMeta } from '../shared/cores'

interface ItemVelocidadeTrator {
  id: number | string
  nome: string
  velocidade: number
}

interface GraficoVelocidadeTratorProps {
  dados: ItemVelocidadeTrator[]
  meta: number // km/h
  compact?: boolean
  listrado?: boolean
  maxRows?: number
  tipo: 'vazio' | 'carregado'
}

export function GraficoVelocidadeTrator({
  dados,
  meta,
  compact = true,
  listrado = true,
  maxRows = 10,
  tipo
}: GraficoVelocidadeTratorProps) {
  
  // Ordenar por velocidade decrescente
  const dadosOrdenados = [...dados]
    .filter(d => d.velocidade > 0)
    .sort((a, b) => b.velocidade - a.velocidade)
  
  const maiorVelocidade = Math.max(...dados.map(d => d.velocidade), 0)
  const maxEscala = Math.max(meta * 1.2, maiorVelocidade * 1.1) || 10
  const posMeta = Math.min((meta / maxEscala) * 100, 100)
  
  const somaVelocidades = dadosOrdenados.reduce((acc, curr) => acc + curr.velocidade, 0)
  const mediaGeral = dadosOrdenados.length > 0 ? somaVelocidades / dadosOrdenados.length : 0
  
  // Cores: Vazio (rápido é bom até certo ponto, mas vamos assumir que queremos atingir a meta)
  // Carregado (lento é ruim, rápido é bom)
  // Na verdade, velocidade costuma ser "quanto maior melhor" até o limite de segurança
  // Vamos usar verde se > meta
  const isBom = mediaGeral >= meta
  const corMedia = isBom ? '#48BB78' : '#E53E3E'

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className={`bg-slate-50 border border-slate-200 rounded-lg text-center ${compact ? "p-2 mb-2" : "p-3 mb-4"}`}>
        <div className={`font-bold text-slate-700 ${compact ? "text-xs" : "text-sm"}`}>
          Meta: <span className="text-[#48BB78]">{meta} km/h</span> | 
          Média: <span style={{ color: corMedia }}>{mediaGeral.toFixed(1)} km/h</span>
        </div>
      </div>

      {/* Lista */}
      <div className={`flex flex-col flex-1 overflow-hidden relative ${compact ? "gap-2" : "gap-4"}`}>
        {/* Linha da Meta */}
        <div 
          className="absolute top-0 bottom-0 w-px border-l border-dashed border-red-500 z-10 opacity-60" 
          style={{ left: `${posMeta}%` }} 
        />

        <div className="flex-1 overflow-y-auto pr-1">
          {dadosOrdenados.slice(0, maxRows).map((item, index) => {
            const valor = item.velocidade
            const larguraBarra = Math.min((valor / maxEscala) * 100, 100)
            const corBarra = valor >= meta ? '#48BB78' : '#F6AD55' // Verde se > meta, Laranja se < meta

            return (
              <div
                key={index}
                className={`flex flex-col mb-2 ${
                  listrado ? `${index % 2 === 0 ? "bg-slate-50" : "bg-white"} rounded-sm px-2 py-1` : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-bold text-xs truncate w-24 text-right" title={item.nome}>{item.nome}</div>
                  <div className="flex-1 h-4 bg-gray-100 rounded-sm relative">
                    <div
                      className="h-full rounded-sm flex items-center justify-end px-1 transition-all duration-500"
                      style={{ width: `${larguraBarra}%`, backgroundColor: corBarra }}
                    >
                      <span className="text-[9px] font-bold text-white drop-shadow-md">
                        {valor.toFixed(1)}
                      </span>
                    </div>
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
