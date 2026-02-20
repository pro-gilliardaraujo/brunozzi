import React from 'react'

interface DadosFrota {
  frota: string
  eficiencia: number
  horasElevador: number
  velocidade: number
  gps: number
  manobra: number
  ocioso: number
  disponibilidade: number
}

interface TabelaResumoProps {
  dados: DadosFrota[]
  metas: {
    eficienciaEnergetica: number
    horaElevador: number
    mediaVelocidade: number
    usoGPS: number
    manobras: number
    motorOcioso: number
    disponibilidadeMecanica: number
  }
}

export function TabelaResumo({ dados, metas }: TabelaResumoProps) {
  
  // Função auxiliar para formatar horas decimais em HH:MM
  const formatHour = (decimalHours: number) => {
    const hours = Math.floor(decimalHours)
    const minutes = Math.round((decimalHours - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Função para determinar cor baseada na meta
  const getColor = (valor: number, meta: number, tipo: 'asc' | 'desc', warningThreshold = 0.2) => {
    if (tipo === 'asc') {
      if (valor >= meta) return 'text-green-600'
      if (valor >= meta * (1 - warningThreshold)) return 'text-orange-500'
      return 'text-red-600'
    } else {
      if (valor <= meta) return 'text-green-600'
      if (valor <= meta * (1 + warningThreshold)) return 'text-orange-500'
      return 'text-red-600'
    }
  }

  return (
    <div className="w-full border border-black rounded-lg overflow-hidden text-xs">
      <table className="w-full text-center border-collapse">
        <thead className="bg-slate-100 font-bold">
          <tr>
            <th className="border border-slate-300 p-2">Frota</th>
            <th className="border border-slate-300 p-2">Eficiência</th>
            <th className="border border-slate-300 p-2">Elevador</th>
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
                {d.eficiencia.toFixed(2)}%
              </td>

              {/* Elevador (Maior melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.horasElevador, metas.horaElevador, 'asc', 0.5)}`}>
                {formatHour(d.horasElevador)}
              </td>

              {/* Velocidade (Menor melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.velocidade, metas.mediaVelocidade, 'desc')}`}>
                {d.velocidade.toFixed(2)}
              </td>

              {/* GPS (Maior melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.gps, metas.usoGPS, 'asc')}`}>
                {d.gps.toFixed(2)}%
              </td>

              {/* Manobra (Menor melhor - em minutos) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.manobra, metas.manobras, 'desc')}`}>
                {formatHour(d.manobra / 60)}
              </td>

              {/* Ocioso (Menor melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.ocioso, metas.motorOcioso, 'desc')}`}>
                {d.ocioso.toFixed(2)}%
              </td>

              {/* Disponibilidade (Maior melhor) */}
              <td className={`border border-slate-300 p-2 font-bold ${getColor(d.disponibilidade, metas.disponibilidadeMecanica, 'asc')}`}>
                {d.disponibilidade.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
