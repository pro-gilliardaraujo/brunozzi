import React from 'react';

interface CardIndicadorProps {
  titulo: string;
  meta: number;
  unidade: string;
  dados: { valor: number }[];
  tipo: 'asc' | 'desc'; // asc: maior é melhor (Produtividade), desc: menor é melhor (Ocioso)
  formatarValor?: (v: number) => string;
}

export function CardIndicador({ 
  titulo, 
  meta, 
  unidade, 
  dados, 
  tipo = 'asc',
  formatarValor 
}: CardIndicadorProps) {
  const media = dados.reduce((acc, curr) => acc + curr.valor, 0) / (dados.length || 1);
  
  const atingiramMeta = dados.filter(d => 
    tipo === 'asc' ? d.valor >= meta : d.valor <= meta
  ).length;

  const total = dados.length;
  const porcentagemAtingimento = (atingiramMeta / total) * 100;

  // Determina se a média geral é "boa"
  const mediaAtingiu = tipo === 'asc' ? media >= meta : media <= meta;

  // Cores baseadas no status da média
  const corMedia = mediaAtingiu ? 'text-green-600' : 'text-red-600';
  // O texto descritivo segue a cor da média ou tem lógica própria? 
  // Na imagem, parece seguir a cor da média, exceto Eficiência Energética que é verde mesmo abaixo.
  // Vamos seguir a cor da média para consistência por enquanto.
  const corTextoDescritivo = mediaAtingiu ? 'text-green-500' : 'text-red-500';

  const format = (v: number) => formatarValor ? formatarValor(v) : v.toFixed(2);

  return (
    <div className="border border-black rounded-lg p-3 flex flex-col justify-between h-28 bg-white">
      <h3 className="text-center font-bold text-sm mb-1">{titulo}</h3>
      
      <div className="flex justify-between items-end">
        {/* Lado Esquerdo: Meta */}
        <div className="flex flex-col items-center">
          <span className="text-green-500 font-bold text-base">
            {format(meta)}{unidade}
          </span>
          <span className="text-blue-500 text-[10px] font-medium">Meta</span>
        </div>

        {/* Centro: Texto Descritivo */}
        <div className={`flex-1 text-center text-[10px] px-1 mb-1 ${corTextoDescritivo}`}>
          {atingiramMeta} de {total} atingiram a meta ({porcentagemAtingimento.toFixed(1)}%)
        </div>

        {/* Lado Direito: Média */}
        <div className="flex flex-col items-center">
          <span className={`font-bold text-base ${corMedia}`}>
            {format(media)}{unidade}
          </span>
          <span className="text-blue-500 text-[10px] font-medium">Média</span>
        </div>
      </div>
    </div>
  );
}
