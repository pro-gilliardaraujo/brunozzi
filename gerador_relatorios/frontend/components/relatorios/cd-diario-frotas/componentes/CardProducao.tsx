import React from 'react';

interface CardProducaoProps {
  valorTotal: number;
  totalFrotas: number;
  horasConsideradas?: number; // Default 24
}

export function CardProducao({ 
  valorTotal, 
  totalFrotas, 
  horasConsideradas = 24 
}: CardProducaoProps) {
  const porFrota = valorTotal / (totalFrotas || 1);
  const porHora = valorTotal / (horasConsideradas || 1);

  return (
    <div className="border border-black rounded-lg p-3 flex flex-col items-center justify-center h-28 bg-white">
      <h3 className="font-bold text-sm mb-1">Produção</h3>
      <div className="text-xl font-bold mb-1">
        {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t
      </div>
      <div className="text-slate-600 text-xs">
        {porFrota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t/frota • {porHora.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t/h
      </div>
    </div>
  );
}
