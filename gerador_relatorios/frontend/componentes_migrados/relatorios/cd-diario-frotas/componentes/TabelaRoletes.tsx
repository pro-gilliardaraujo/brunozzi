import React from 'react'
import { TabelaRelatorio } from './TabelaRelatorio'

interface ItemRoletes {
  Data: string
  Equipamento: number | string
  Intervalo: string
  "Início": string
  "Fim": string
  "Duração (horas)": number
  "Tempo Total do Dia": number
}

interface TabelaRoletesProps {
  dados: ItemRoletes[]
}

// Helper para formatar horas decimais para HH:mm:ss
const formatarDuracao = (decimal: number) => {
  if (!decimal) return "00:00:00"
  const totalSeconds = Math.round(decimal * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TabelaRoletes({ dados }: TabelaRoletesProps) {
  return (
    <TabelaRelatorio 
      data={dados}
      columns={[
        { header: "DATA", accessor: "Data", align: "center" },
        { header: "EQUIPAMENTO", accessor: (item) => <span className="font-bold">{item.Equipamento}</span>, align: "center" },
        { header: "INTERVALO", accessor: "Intervalo", align: "center" },
        { header: "INÍCIO", accessor: "Início", align: "center" },
        { header: "FIM", accessor: "Fim", align: "center" },
        { header: "DURAÇÃO", accessor: (item) => <span className="font-bold">{formatarDuracao(item["Duração (horas)"])}</span>, align: "center" },
        { header: "TOTAL DO DIA", accessor: (item) => <span className="font-bold">{formatarDuracao(item["Tempo Total do Dia"])}</span>, align: "center", width: "120px" }
      ]}
    />
  )
}
