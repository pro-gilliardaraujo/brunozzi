import React from 'react';

interface DadosOperador {
  frota: string;
  eficiencia: number;
  horasElevador: number;
  velocidade: number;
  eficienciaOperacional: number;
  manobra: number;
  ocioso: number;
  // disponibilidade removido
}

interface TabelaResumoProps {
  dados: DadosOperador[];
  metas: {
    eficienciaEnergetica: number;
    eficienciaOperacional: number;
    horaElevador: number;
    mediaVelocidade: number;
    manobras: number;
    motorOcioso: number;
    // disponibilidadeMecanica removido
  };
}

export function TabelaResumoOperadores({ dados, metas }: TabelaResumoProps) {
  
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
            <th className="border border-slate-300 p-2">Elevador</th>
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

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.horasElevador, metas.horaElevador, 'asc', 0.5)}`}>
                {formatHour(d.horasElevador)}
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidade, metas.mediaVelocidade, 'desc')}`}>
                {d.velocidade.toFixed(2)}
              </td>

              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.manobra / 60, metas.manobras / 60, 'desc')}`}>
                {/* Ajuste: manobra vem em minutos do dadosResumo, formatHour espera horas. 
                    Mas espere, dadosResumo.manobra = Number(man['Tempo Total'] || 0) * 60 (minutos).
                    O componente original dividia por 60: formatHour(d.manobra / 60).
                    Se d.manobra é minutos, /60 vira horas. formatHour imprime HH:MM.
                    Isso mostrava o Tempo Total em horas na tabela.
                    Se o user quer minutos, devemos ajustar.
                    Mas a coluna diz "Manobra".
                    Vamos manter o padrão HH:MM para consistência, ou mudar para minutos.
                    O original era formatHour(d.manobra / 60). d.manobra era minutos.
                    Então mostrava HH:MM.
                    Vamos manter.
                */}
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
