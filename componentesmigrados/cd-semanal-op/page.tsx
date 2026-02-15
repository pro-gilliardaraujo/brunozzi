"use client"

import RelatorioDiarioOperadoresCd from "../cd-diario-op/page"

export default function RelatorioSemanalOperadoresCd() {
  return <RelatorioDiarioOperadoresCd searchParams={{ period: "semanal" }} />
}
