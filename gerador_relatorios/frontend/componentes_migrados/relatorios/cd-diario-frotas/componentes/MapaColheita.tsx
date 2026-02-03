'use client';

interface MapaColheitaProps {
  tipo: 'equipamento' | 'rtk';
  dadosExternos?: any[];
}

export default function MapaColheita({ tipo, dadosExternos }: MapaColheitaProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-50 rounded-lg border border-zinc-200 p-4">
      <div className="text-zinc-400 mb-2">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.806-.98l-3.747-1.549M15 17V7m0 0L9 7" />
        </svg>
      </div>
      <p className="text-sm text-zinc-500 font-medium">Visualização de Mapa Indisponível</p>
      <p className="text-xs text-zinc-400 mt-1">Componente de mapa desativado temporariamente.</p>
    </div>
  );
}
