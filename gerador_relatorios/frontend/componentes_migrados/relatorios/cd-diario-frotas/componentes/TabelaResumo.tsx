import React from 'react';

interface DadosFrota {
  frota: string;
  eficiencia: number;
  horasElevador: number; // em horas decimais
  producao: number;
  velocidade: number;
  gps: number;
  manobra: number; // em minutos ou horas? Metas.manobras = 60 (provavelmente minutos)
  ocioso: number; // porcentagem
  disponibilidade: number; // porcentagem
}

interface TabelaResumoProps {
  dados: DadosFrota[];
  metas: {
    eficienciaEnergetica: number;
    horaElevador: number;
    mediaVelocidade: number;
    usoGPS: number;
    manobras: number; // minutos
    motorOcioso: number;
    disponibilidadeMecanica: number;
  };
}

export function TabelaResumo({ dados, metas }: TabelaResumoProps) {
  
  // Função auxiliar para formatar horas decimais em HH:MM
  const formatHour = (decimalHours: number) => {
    if (decimalHours === undefined || decimalHours === null || isNaN(decimalHours)) return '00:00';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDecimal = (val: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return val.toFixed(2);
  }

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
            <th className="border border-slate-300 p-2">Frota</th>
            <th className="border border-slate-300 p-2">Eficiência</th>
            <th className="border border-slate-300 p-2">Elevador</th>
            <th className="border border-slate-300 p-2">Produção (t)</th>
            <th className="border border-slate-300 p-2">Vel Efetiva</th>
            <th className="border border-slate-300 p-2">GPS</th>
            <th className="border border-slate-300 p-2">Manobra</th>
            <th className="border border-slate-300 p-2">Ocioso</th>
            <th className="border border-slate-300 p-2">Disponibilidade</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i} className="hover:bg-slate-50 even:bg-slate-50">
              <td className="border border-slate-300 p-2 font-bold">{d.frota}</td>
              
              {/* Eficiência (Maior melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.eficiencia, metas.eficienciaEnergetica, 'asc')}`}>
                {formatDecimal(d.eficiencia)}%
              </td>

              {/* Elevador (Maior melhor? Meta 15h) */}
              {/* Assumindo que Meta 15h é o alvo, então Maior é melhor até o limite, ou quanto mais próximo melhor.
                  Na imagem 07:50 é Laranja (metade da meta). 04:06 Vermelho. 
                  Parece Ascendente. */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.horasElevador, metas.horaElevador, 'asc', 0.5)}`}>
                {formatHour(d.horasElevador)}
              </td>

              {/* Produção (Preto padrão) */}
              <td className="border border-slate-300 p-2 font-bold">
                {formatDecimal(d.producao)}
              </td>

              {/* Velocidade (Maior melhor - Meta 7) */}
              {/* Imagem mostra tudo verde mesmo abaixo da meta (4.92 < 7). 
                  Isso sugere que ou a meta é um Limite (Menor é melhor) ou há uma tolerância.
                  Como no Card usamos 'desc' para ficar Verde, vamos usar 'desc' aqui também para consistência. */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidade, metas.mediaVelocidade, 'desc')}`}>
                {formatDecimal(d.velocidade)}
              </td>

              {/* GPS (Maior melhor - Meta 90) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.gps, metas.usoGPS, 'asc')}`}>
                {formatDecimal(d.gps)}%
              </td>

              {/* Manobra (Menor melhor - Meta 60 min) */}
              {/* d.manobra deve estar em minutos para comparar com 60 */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.manobra, metas.manobras, 'desc')}`}>
                {formatHour(d.manobra / 60)}
              </td>

              {/* Ocioso (Menor melhor - Meta 4%) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.ocioso, metas.motorOcioso, 'desc')}`}>
                {formatDecimal(d.ocioso)}%
              </td>

              {/* Disponibilidade (Maior melhor - Meta 90%) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.disponibilidade, metas.disponibilidadeMecanica, 'asc')}`}>
                {formatDecimal(d.disponibilidade)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
