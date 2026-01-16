import React from 'react';

interface DadosFrota {
  frota: string;
  eficiencia: number;
  horasProdutivas: number; // em horas decimais
  producao: number;
  velocidadeCarregado: number;
  velocidadeVazio: number;
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
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Formatar minutos para mm:ss
  const formatMmSsFromMinutes = (minutes: number) => {
    const mm = Math.floor(minutes || 0);
    const ss = Math.round(((minutes || 0) - mm) * 60);
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
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
            <th className="border border-slate-300 p-2">Frota</th>
            <th className="border border-slate-300 p-2">Produção (t)</th>
            <th className="border border-slate-300 p-2">Eficiência</th>
            <th className="border border-slate-300 p-2">Produtivas</th>
            <th className="border border-slate-300 p-2">Vel Carregado</th>
            <th className="border border-slate-300 p-2">Vel Vazio</th>
            <th className="border border-slate-300 p-2">Manobra</th>
            <th className="border border-slate-300 p-2">Ocioso</th>
            <th className="border border-slate-300 p-2">Disp</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-slate-50" : "bg-white"} hover:bg-slate-100`}>
              <td className="border border-slate-300 p-2 font-bold">{d.frota}</td>
              
              {/* Produção (Preto padrão) */}
              <td className="border border-slate-300 p-2 font-bold">
                {d.producao.toFixed(2)}
              </td>

              {/* Eficiência (Maior melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.eficiencia, metas.eficienciaEnergetica, 'asc')}`}>
                {d.eficiencia.toFixed(2)}%
              </td>

              {/* Horas Produtivas (Maior melhor? Usando meta de Elevador como referência provisória ou sem cor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.horasProdutivas, metas.horaElevador, 'asc', 0.5)}`}>
                {formatHour(d.horasProdutivas)}
              </td>

              {/* Velocidade Carregado (Menor melhor - Meta) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidadeCarregado, metas.mediaVelocidade, 'desc')}`}>
                {d.velocidadeCarregado.toFixed(2)}
              </td>

              {/* Velocidade Vazio (Menor melhor - Meta) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidadeVazio, metas.mediaVelocidade, 'desc')}`}>
                {d.velocidadeVazio.toFixed(2)}
              </td>

              {/* Manobra (Menor melhor - Meta 60 min) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.manobra, metas.manobras, 'desc')}`}>
                {formatMmSsFromMinutes(d.manobra / 60)}
              </td>


              {/* Ocioso (Menor melhor - Meta 4%) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.ocioso, metas.motorOcioso, 'desc')}`}>
                {d.ocioso.toFixed(2)}%
              </td>

              {/* Disponibilidade (Maior melhor - Meta 90%) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.disponibilidade, metas.disponibilidadeMecanica, 'asc')}`}>
                {d.disponibilidade.toFixed(2)}%
              </td>

              {/* GPS (Maior melhor - Meta 90) */}
              {/* removido */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
