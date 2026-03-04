import React from 'react';

interface DadosOperadorTrator {
  frota: string;
  eficiencia: number;
  horasProdutivas: number; // Substitui Elevador
  velocidade: number;
  eficienciaOperacional: number;
  manobra: number;
  ocioso: number;
}

interface TabelaResumoOperadoresTratorProps {
  dados: DadosOperadorTrator[];
  metas: {
    eficienciaEnergetica: number;
    eficienciaOperacional: number;
    horaElevador: number; // Mantido nome para compatibilidade, mas representa Horas Produtivas
    mediaVelocidade: number;
    manobras: number;
    motorOcioso: number;
  };
}

export function TabelaResumoOperadoresTrator({ dados, metas }: TabelaResumoOperadoresTratorProps) {
  
  // Função auxiliar para formatar horas decimais em HH:MM
  const formatHour = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Função para determinar cor baseada na meta
  const getColor = (valor: number, meta: number, tipo: 'asc' | 'desc', warningThreshold = 0.2) => {
    if (tipo === 'asc') {
      if (valor >= meta) return 'text-green-600';
      if (valor >= meta * (1 - warningThreshold)) return 'text-orange-500';
      return 'text-red-600';
    } else {
      if (valor <= meta) return 'text-green-600';
      if (valor <= meta * (1 + warningThreshold)) return 'text-orange-500';
      return 'text-red-600';
    }
  };

  return (
    <div className="w-full border border-black rounded-lg overflow-hidden text-xs">
      <table className="w-full text-center border-collapse">
        <thead className="bg-slate-100 font-bold">
          <tr>
            <th className="border border-slate-300 p-2 text-left">Operador</th>
            <th className="border border-slate-300 p-2">Ef Energética</th>
            <th className="border border-slate-300 p-2">Ef Operacional</th>
            <th className="border border-slate-300 p-2">H. Produtivas</th>
            <th className="border border-slate-300 p-2">Vel Efetiva</th>
            <th className="border border-slate-300 p-2">Manobra</th>
            <th className="border border-slate-300 p-2">Ocioso</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i} className="hover:bg-slate-50 even:bg-slate-50">
              <td className="border border-slate-300 p-2 font-bold text-left">{d.frota}</td>
              
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.eficiencia, metas.eficienciaEnergetica, 'asc')}`}>
                {d.eficiencia.toFixed(2)}%
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.eficienciaOperacional, metas.eficienciaOperacional, 'asc')}`}>
                {d.eficienciaOperacional.toFixed(2)}%
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.horasProdutivas, metas.horaElevador, 'asc', 0.5)}`}>
                {formatHour(d.horasProdutivas)}
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidade, metas.mediaVelocidade, 'desc')}`}>
                {d.velocidade.toFixed(2)}
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.manobra / 60, metas.manobras / 60, 'desc')}`}>
                {formatHour(d.manobra / 60)}
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.ocioso, metas.motorOcioso, 'desc')}`}>
                {d.ocioso.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
