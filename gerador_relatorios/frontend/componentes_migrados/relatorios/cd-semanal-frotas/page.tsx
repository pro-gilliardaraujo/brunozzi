"use client"

import RelatorioDiarioFrotas from "../cd-diario-frotas/page"

export default function RelatorioSemanalFrotasCd() {
  return <RelatorioDiarioFrotas searchParams={{ period: "semanal" }} />
}
